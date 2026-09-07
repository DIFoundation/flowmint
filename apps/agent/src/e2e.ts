import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import { CeloPayment } from "./payments/celo-payment";
import type { Service } from "./agent/types";
import { MockCeloPaymentExecutor } from "@flowmint/celo";

const USDC = "0xceba9300f2b948710d2653dd7b07f33a8b32118c" as const;

const registry = new ServiceRegistry();

const basicService: Service = {
  id: "design-basic",
  name: "Basic Logo Design",
  description: "Simple logo design for small businesses.",
  provider: "0x1111111111111111111111111111111111111111",
  capabilities: ["design"],
  pricing: {
    currency: USDC,
    amount: 2_000_000n,
  },
  active: true,
};

const professionalService: Service = {
  id: "design-pro",
  name: "Professional Logo Design",
  description: "Professional logo design with faster turnaround.",
  provider: "0x3333333333333333333333333333333333333333",
  capabilities: ["design"],
  pricing: {
    currency: USDC,
    amount: 5_000_000n,
  },
  active: true,
};

const inactiveService: Service = {
  id: "design-inactive",
  name: "Inactive Design Provider",
  description: "Inactive test provider.",
  provider: "0x4444444444444444444444444444444444444444",
  capabilities: ["design"],
  pricing: {
    currency: USDC,
    amount: 1_000_000n,
  },
  active: false,
};

registry.register(basicService);
registry.register(professionalService);
registry.register(inactiveService);

const agent = new FlowMintAgent({
  registry,
  paymentPolicy: {
    maxPayment: 10_000_000n,
    allowedCurrencies: [USDC],
  },
});

const flow = agent.createFlow({
  description: "I need a simple logo designed.",
  maxBudget: 3_000_000n,
  preferredCurrency: USDC,
  constraints: {
    capability: "design",
  },
});

console.log("1. Created:", flow.status);

const evaluated = agent.evaluate(flow);

console.log("2. Evaluated:", evaluated.status);
console.log("3. Selected:", evaluated.selectedService?.name);
console.log("4. Quote:", evaluated.quote);
console.log("5. Decision:", evaluated.decision);

if (evaluated.status !== "awaiting_authorization") {
  throw new Error("Agent failed to select an eligible service.");
}

if (evaluated.selectedService?.id !== "design-basic") {
  throw new Error("Agent selected the wrong service.");
}

if (
  !evaluated.decision?.reasons.some((reason) =>
    reason.includes("within the user's stated budget"),
  )
) {
  throw new Error("Decision did not record budget reasoning.");
}

const authorized = agent.authorize(evaluated, {
  payer: "0x2222222222222222222222222222222222222222",
  authorizedAmount: 2_000_000n,
  authorizedToken: USDC,
  authorizedRecipient: "0x1111111111111111111111111111111111111111",
  authorizedAt: Date.now(),
});

console.log("6. Authorized:", authorized.status);
console.log("7. Payment:", authorized.payment);

async function main() {
  const submitted = agent.submitPayment(authorized);

  if (!authorized.payment) {
    throw new Error("Payment was not created.");
  }

  console.log("8. Submitted:", submitted.status);
  console.log("9. Payment:", submitted.payment);

  if (!submitted.payment) {
    throw new Error("Submitted flow has no payment.");
  }

  const paymentExecutor = new MockCeloPaymentExecutor();

  const celoPayment = new CeloPayment(paymentExecutor);

  const settlement = await celoPayment.execute(authorized.payment, {
    publicClient: {} as never,
    walletClient: {} as never,
    account: {} as never,
  });

  const completed = agent.complete(submitted, settlement);

  console.log("10. Completed:", completed.status);
  console.log("11. Settlement:", completed.settlement);
  console.log("12. Outcome:", completed.outcome);

  if (!settlement.confirmed) {
    throw new Error("Settlement was not confirmed.");
  }

  if (completed.status !== "completed") {
    throw new Error("Flow did not complete.");
  }

  console.log("RESULT: FLOWMINT M2.1 DECISION FLOW PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
