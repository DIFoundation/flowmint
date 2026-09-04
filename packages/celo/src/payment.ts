import type {
  Account,
  PublicClient,
  WalletClient,
} from "viem";
import { decodeEventLog, encodeFunctionData } from "viem";
import {
  CELO_STABLECOINS,
  type CeloStablecoin,
} from "./tokens";
import { appendAttribution } from "./attribution";
import { FLOWMINT_CHAIN } from "./chains";

export const CELO_MAINNET_CHAIN_ID = FLOWMINT_CHAIN.id;

export const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const ERC20_TRANSFER_EVENT_ABI = [
  {
    type: "event",
    name: "Transfer",
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
] as const;

export interface StablecoinPayment {
  token: CeloStablecoin;
  recipient: `0x${string}`;
  amount: bigint;
}

export interface PaymentExecution {
  txHash: `0x${string}`;
}

export interface CeloPaymentExecutionOptions {
  live: boolean;
}

export function createStablecoinPayment(params: {
  symbol: keyof typeof CELO_STABLECOINS;
  recipient: `0x${string}`;
  amount: bigint;
}): StablecoinPayment {
  if (params.amount <= 0n) {
    throw new Error("Payment amount must be greater than zero.");
  }

  return {
    token: CELO_STABLECOINS[params.symbol],
    recipient: params.recipient,
    amount: params.amount,
  };
}

export function encodeAttributedStablecoinTransfer(
  payment: StablecoinPayment,
): `0x${string}` {
  const transferData = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [payment.recipient, payment.amount],
  });

  return appendAttribution(transferData);
}

export interface CeloPaymentExecutor {
  execute(
    payment: StablecoinPayment,
    clients: {
      publicClient: PublicClient;
      walletClient: WalletClient;
      account: Account;
    },
    options?: CeloPaymentExecutionOptions,
  ): Promise<PaymentExecution>;

  verify(
    txHash: `0x${string}`,
    payment: StablecoinPayment,
    payer: `0x${string}`,
    publicClient: PublicClient,
  ): Promise<{
    confirmed: boolean;
    blockNumber?: bigint;
  }>;
}

export class MainnetCeloPaymentExecutor
  implements CeloPaymentExecutor
{
  async execute(
    payment: StablecoinPayment,
    clients: {
      publicClient: PublicClient;
      walletClient: WalletClient;
      account: Account;
    },
    options?: CeloPaymentExecutionOptions,
  ): Promise<PaymentExecution> {
    const publicChainId = await clients.publicClient.getChainId();

    if (publicChainId !== CELO_MAINNET_CHAIN_ID) {
      throw new Error(
        `Invalid Celo network. Expected Celo mainnet (42220), received ${publicChainId}.`,
      );
    }

    const walletChainId = clients.walletClient.chain?.id;

    if (walletChainId !== CELO_MAINNET_CHAIN_ID) {
      throw new Error(
        `Invalid Celo network. Expected Celo mainnet (${CELO_MAINNET_CHAIN_ID}), received ${walletChainId ?? "unknown"}.`,
      );
    }

    const data = encodeAttributedStablecoinTransfer(payment);

    await clients.publicClient.call({
      account: clients.account.address,
      to: payment.token.address,
      data,
    });

    if (!options?.live) {
      throw new Error(
        "Live execution is disabled. Transaction was simulated but not broadcast.",
      );
    }

    /*
     * Simulate the EXACT calldata that will be broadcast.
     *
     * This deliberately uses `call` instead of `simulateContract`
     * because the calldata contains the ERC-8021 attribution suffix.
     */
    const txHash = await clients.walletClient.sendTransaction({
      account: clients.account,
      chain: clients.walletClient.chain,
      to: payment.token.address,
      data,
    });

    return {
      txHash,
    };
  }

  async verify(
    txHash: `0x${string}`,
    payment: StablecoinPayment,
    payer: `0x${string}`,
    publicClient: PublicClient,
  ): Promise<{
    confirmed: boolean;
    blockNumber?: bigint;
  }> {
    const chainId = await publicClient.getChainId();
    
    if (chainId !== CELO_MAINNET_CHAIN_ID) {
      throw new Error(
        `Invalid verification network. Expected Celo mainnet (${CELO_MAINNET_CHAIN_ID}), received ${chainId}.`,
      );
    }
    
    const receipt =
      await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

    if (receipt.status !== "success") {
      throw new Error(
        `Celo payment transaction failed: ${txHash}`,
      );
    }

    const expectedToken = payment.token.address.toLowerCase();

    const expectedRecipient = payment.recipient.toLowerCase();

    const expectedPayer = payer.toLowerCase();

    let matchedTransfer = false;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== expectedToken) {
        continue;
      }

      if (!log.topics[0]) {
        continue;
      }

      try {
        const decoded = decodeEventLog({
          abi: ERC20_TRANSFER_EVENT_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName !== "Transfer") {
          continue;
        }

        const { from, to, value } = decoded.args;

        if (
          from.toLowerCase() === expectedPayer &&
          to.toLowerCase() === expectedRecipient &&
          value === payment.amount
        ) {
          matchedTransfer = true;
          break;
        }
      } catch {
        /*
         * Ignore logs emitted by the same token contract that
         * do not match the expected Transfer event shape.
         */
      }
    }
    
    if (!matchedTransfer) {
      throw new Error(
        `Settlement verification failed: no matching Transfer event found for ${payment.amount.toString()} tokens to ${payment.recipient}.`,
      );
    }

    return {
      confirmed: true,
      blockNumber: receipt.blockNumber,
    };
  }
}
