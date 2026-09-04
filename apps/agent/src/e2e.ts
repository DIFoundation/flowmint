import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import { CeloPayment } from "./payments/celo-payment";
import type { Service } from "./agent/types";
import {
  MockCeloPaymentExecutor,
} from "@flowmint/celo";

const registry = new ServiceRegistry();

const service: Service = {
  id: "demo-service",
  name: "Demo Economic Service",
  description: "Deterministic test service.",
  provider: "0x1111111111111111111111111111111111111111",
  capabilities: ["demo"],
  pricing: {
    currency:
      "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
    amount: 1_000_000n,
  },
  active: true,
};

registry.register(service);

const agent = new FlowMintAgent({
  registry,
  paymentPolicy: {
    maxPayment: 5_000_000n,
    allowedCurrencies: [service.pricing.currency],
  },
});

const flow = agent.createFlow({
  description: "Pay for a demo economic task.",
  maxBudget: 2_000_000n,
  constraints: {
    capability: "demo",
  },
});

console.log("1. Created:", flow.status);

const evaluated = agent.evaluate(flow);

console.log("2. Evaluated:", evaluated.status);
console.log("3. Quote:", evaluated.quote);

const authorized = agent.authorize(evaluated, {
  payer: "0x2222222222222222222222222222222222222222",
});

console.log("4. Authorized:", authorized.status);
console.log("5. Payment:", authorized.payment);

async function main() {
  const submitted = agent.submitPayment(authorized);

  if (!authorized.payment) {
    throw new Error("Payment was not created.");
  }

  console.log("6. Submitted:", submitted.status);
  console.log("7. Payment:", submitted.payment);

  if (!submitted.payment) {
    throw new Error("Submitted flow has no payment.");
  }

  const paymentExecutor = new MockCeloPaymentExecutor();
  const celoPayment = new CeloPayment(paymentExecutor);

  const settlement = await celoPayment.execute(
    authorized.payment,
    {
      publicClient: {} as never,
      walletClient: {} as never,
      account: {} as never,
    },
  );

  const completed = agent.complete(submitted, settlement);

  console.log("8. Completed:", completed.status);
  console.log("9. Settlement:", completed.settlement);
  console.log("10. Outcome:", completed.outcome);

  if (!settlement.confirmed) {
    throw new Error("Settlement was not confirmed.");
  }

  if (completed.status !== "completed") {
    throw new Error("Flow did not complete.");
  }

  console.log("RESULT: FLOWMINT ECONOMIC FLOW PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
