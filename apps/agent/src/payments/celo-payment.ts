import type {
  Account,
  PublicClient,
  WalletClient,
} from "viem";
import type { Payment, Settlement } from "../agent/types";
import {
  createStablecoinPayment,
  type CeloPaymentExecutor,
} from "@flowmint/celo";

export interface AgentPaymentClients {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Account;
}

export class CeloPayment {
  constructor(
    private readonly executor: CeloPaymentExecutor,
  ) {}

  async execute(
    payment: Payment,
    clients: AgentPaymentClients,
  ): Promise<Settlement> {
    const stablecoinPayment = createStablecoinPayment({
      symbol: this.resolveStablecoinSymbol(payment.token),
      recipient: payment.recipient,
      amount: payment.amount,
    });

    const execution = await this.executor.execute(
      stablecoinPayment,
      clients,
    );

    const settlement = await this.executor.verify(
      execution.txHash,
      stablecoinPayment,
      payment.payer,
      clients.publicClient,
    );

    return {
      txHash: execution.txHash,
      confirmed: settlement.confirmed,
      blockNumber: settlement.blockNumber,
      timestamp: Date.now(),
    };
  }

  private resolveStablecoinSymbol(
    token: `0x${string}`,
  ): "USDm" | "USDC" | "USDT" {
    const normalized = token.toLowerCase();

    if (
      normalized ===
      "0x765de816845861e75a25fca122bb6898b8b1282a"
    ) {
      return "USDm";
    }

    if (
      normalized ===
      "0xceba9300f2b948710d2653dd7b07f33a8b32118c"
    ) {
      return "USDC";
    }

    if (
      normalized ===
      "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e"
    ) {
      return "USDT";
    }

    throw new Error(
      `Unsupported Celo stablecoin: ${token}`,
    );
  }
}
