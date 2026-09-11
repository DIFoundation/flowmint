import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";
import { MockServiceProvider } from "./services/mock-service-provider";

const USER = "0x2222222222222222222222222222222222222222" as const;
const PROVIDER = "0x1111111111111111111111111111111111111111" as const;
const USDC = "0xceba9300f2b948710d2653dd7b07f33a8b32118c" as const;

function createAgent(amount = 1_000_000n) {
  const service: Service = {
    id: "svc-escalation",
    name: "Escalation Test Service",
    description: "Service used to verify escalation boundaries.",
    provider: PROVIDER,
    capabilities: ["escalation-test"],
    status: "available",
    pricing: {
      currency: USDC,
      amount,
    },
    active: true,
  };

  const registry = new ServiceRegistry();
  registry.register(service);

  return new FlowMintAgent({
    registry,
    paymentPolicy: {
      maxPayment: 10_000_000n,
      allowedCurrencies: [USDC],
    },
    serviceProvider: new MockServiceProvider(),
  });
}

// 1. High-value payment requires escalation
{
  const agent = createAgent(9_000_000n);

  const started = agent.start({
    description: "I need the escalation test service completed professionally.",
    maxBudget: 10_000_000n,
    constraints: { capability: "escalation-test" },
  });

  if (started.stage !== "escalated") {
    throw new Error("Expected high-value payment to require escalation.");
  }

  if (started.flow.status !== "escalated") {
    throw new Error("Expected flow status to be escalated.");
  }

  if (!started.flow.escalation?.required) {
    throw new Error("Expected an escalation decision to be recorded.");
  }

  console.log("✅ high-value payment requires escalation");
}

// 2. Ambiguous/short intent requires escalation
{
  const agent = createAgent();

  const started = agent.start({
    description: "help",
    maxBudget: 2_000_000n,
    constraints: { capability: "escalation-test" },
  });

  if (started.stage !== "escalated") {
    throw new Error("Expected an ambiguous intent to require escalation.");
  }

  if (!started.flow.escalation?.required) {
    throw new Error("Expected an escalation decision for ambiguous intent.");
  }

  console.log("✅ ambiguous intent requires escalation");
}

// 3. Escalated flow cannot be authorized before human resolution
{
  const agent = createAgent(9_000_000n);

  const started = agent.start({
    description: "I need the escalation test service completed professionally.",
    maxBudget: 10_000_000n,
    constraints: { capability: "escalation-test" },
  });

  if (started.stage !== "escalated") {
    throw new Error("Expected setup flow to be escalated.");
  }

  const result = agent.authorize(started.flow, {
    payer: USER,
    authorizedAmount: 9_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (result.status !== "failed") {
    throw new Error(
      "Expected authorization to fail while escalation is unresolved.",
    );
  }

  console.log("✅ escalated flow cannot bypass human resolution");
}

// 4. Human resolution releases the flow back to authorization
{
  const agent = createAgent(9_000_000n);

  const started = agent.start({
    description: "I need the escalation test service completed professionally.",
    maxBudget: 10_000_000n,
    constraints: { capability: "escalation-test" },
  });

  if (started.stage !== "escalated") {
    throw new Error("Expected setup flow to be escalated.");
  }

  const resolved = agent.resolveEscalation(started.flow, {
    approved: true,
    reviewer: "human-reviewer",
    reason: "Approved after human review.",
  });

  if (resolved.status !== "awaiting_authorization") {
    throw new Error(
      "Expected approved escalation to return to awaiting_authorization.",
    );
  }

  if (!resolved.escalationResolution?.approved) {
    throw new Error("Expected escalation approval to be recorded.");
  }

  console.log("✅ human approval resolves escalation");
}

console.log("\n🔥 ALL ESCALATION TESTS PASSED");
