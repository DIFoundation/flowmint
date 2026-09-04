import type {
  Account,
  PublicClient,
  WalletClient,
} from "viem";

import type {
  CeloPaymentExecutor,
  PaymentExecution,
  StablecoinPayment,
} from "./payment";

export class MockCeloPaymentExecutor
  implements CeloPaymentExecutor
{
  private readonly transactions = new Map<
    `0x${string}`,
    {
      payment: StablecoinPayment;
      payer: `0x${string}`;
    }
  >();

  async execute(
    payment: StablecoinPayment,
    _clients: {
      publicClient: PublicClient;
      walletClient: WalletClient;
      account: Account;
    },
  ): Promise<PaymentExecution> {
    const txHash =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

    this.transactions.set(txHash, {
      payment,
      payer: _clients.account.address,
    });

    return { txHash };
  }

  async verify(
    txHash: `0x${string}`,
    payment: StablecoinPayment,
    payer: `0x${string}`,
    _publicClient: PublicClient,
  ): Promise<{
    confirmed: boolean;
    blockNumber?: bigint;
  }> {

    
    const storedPayment = this.transactions.get(txHash);

    if (!storedPayment) {
      return { confirmed: false };
    }

    if (
      storedPayment.payment.token.address.toLowerCase() !==
        payment.token.address.toLowerCase() ||
      storedPayment.payment.recipient.toLowerCase() !==
        payment.recipient.toLowerCase() ||
      storedPayment.payment.amount !== payment.amount
    ) {
      return { confirmed: false };
    }

    return {
      confirmed: true,
      blockNumber: 1n,
    };
  }
}
