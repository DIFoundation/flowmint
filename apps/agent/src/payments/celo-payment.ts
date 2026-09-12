import type {
  Account,
  PublicClient,
  WalletClient,
} from "viem";
import type { Payment, Settlement } from "../agent/types";
import {
  createStablecoinPayment,
  resolveStablecoin,
  type CeloPaymentExecutor,
} from "@flowmint/celo";
import { assertPayerIsSigner } from "../wallet/ownership";

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
    assertPayerIsSigner(
      payment.payer,
      clients.account.address as `0x${string}`,
      "CeloPayment.execute",
    );
    
    const stablecoin = resolveStablecoin(payment.token);

    if (!stablecoin) {
      throw new Error(`Unsupported Celo stablecoin: ${payment.token}`);
    }

    const stablecoinPayment = createStablecoinPayment({
      symbol: stablecoin.symbol,
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
}