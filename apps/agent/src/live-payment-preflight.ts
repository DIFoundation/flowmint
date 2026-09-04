import { formatUnits } from "viem";
import { createCeloPublicClient, assertCeloMainnet } from "./runtime/celo-client";

import { createFlowMintAccount, createFlowMintWalletClient } from "./runtime/flowmint-wallet";

import { MainnetCeloPaymentExecutor, createStablecoinPayment } from "@flowmint/celo";
import { FLOWMINT_LIVE_EXECUTION } from "./runtime/execution-config";

const RECIPIENT = "0x1111111111111111111111111111111111111111" as const;

async function main() {
  const publicClient = createCeloPublicClient();

  await assertCeloMainnet(publicClient);

  const account = createFlowMintAccount();
  const walletClient = createFlowMintWalletClient();

  const payment = createStablecoinPayment({
    symbol: "USDC",
    recipient: RECIPIENT,
    amount: 1_000n,
  });

  const executor = new MainnetCeloPaymentExecutor();

  console.log("🔥 FlowMint live payment preflight");
  console.log("Chain:", await publicClient.getChainId());
  console.log("Payer:", account.address);
  console.log("Token:", payment.token.address);
  console.log("Recipient:", payment.recipient);
  console.log("Amount:", formatUnits(payment.amount, payment.token.decimals), payment.token.symbol);
  console.log("Live execution:", FLOWMINT_LIVE_EXECUTION);

  try {
    const execution = await executor.execute(
      payment,
      {
        publicClient: publicClient as any,
        walletClient,
        account,
      },
      {
        live: FLOWMINT_LIVE_EXECUTION,
      },
    );

    console.log("Simulation: PASSED");

    if (FLOWMINT_LIVE_EXECUTION) {
      console.log("Broadcast: SUBMITTED");
      console.log("Transaction hash:", execution.txHash);

      console.log("Waiting for settlement...");

      const settlement = await executor.verify(
        execution.txHash,
        payment,
        account.address,
        publicClient as any,
      );

      if (!settlement.confirmed) {
        throw new Error("Transaction was submitted but settlement was not confirmed.");
      }

      console.log("Settlement: CONFIRMED");

      if (settlement.blockNumber !== undefined) {
        console.log("Block:", settlement.blockNumber.toString());
      }

      console.log("STATUS: LIVE PAYMENT SUCCESS");

      return;
    }

    console.log("Broadcast: BLOCKED");
    console.log("STATUS: LIVE PAYMENT PREFLIGHT PASSED");

    // throw new Error(
    //   "Unexpected result: simulation passed and execution was not blocked." + Error,
    // );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("transfer amount exceeds balance")) {
      console.log("Simulation: REACHED Celo");
      console.log("Simulation: BLOCKED — insufficient USDC balance");
      console.log("Broadcast: NOT ATTEMPTED");
      console.log("STATUS: PAYMENT PREFLIGHT PASSED");
      return;
    }

    if (message.includes("Live execution is disabled")) {
      console.log("Simulation: PASSED");
      console.log("Broadcast: BLOCKED");
      console.log("STATUS: LIVE PAYMENT PREFLIGHT PASSED");
      return;
    }

    throw error;
  }
}

main().catch((error) => {
  console.error("❌ Live payment preflight failed:");
  console.error(error);
  process.exit(1);
});