import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";
import { MockServiceProvider } from "./services/mock-service-provider";
import { validateFlowIntent } from "./agent/validate-intent";

const PROVIDER = "0x1111111111111111111111111111111111111111" as const;
const PROVIDER_2 = "0x4444444444444444444444444444444444444444" as const;
const USDC = "0xceba9300f2b948710d2653dd7b07f33a8b32118c" as const;

function baseService(overrides: Partial<Service> = {}): Service {
  return {
    id: "svc-1",
    name: "Test Economic Service",
    description: "Decision-layer test service.",
    provider: PROVIDER,
    capabilities: ["demo"],
    status: "available",
    pricing: {
      currency: USDC,
      amount: 1_000_000n,
    },
    active: true,
    ...overrides,
  };
}

function createAgent(
  services: Service[],
  maxPayment = 10_000_000n,
): FlowMintAgent {
  const registry = new ServiceRegistry();

  for (const service of services) {
    registry.register(service);
  }

  return new FlowMintAgent({
    registry,
    paymentPolicy: {
      maxPayment,
      allowedCurrencies: [USDC],
    },
    serviceProvider: new MockServiceProvider(),
  });
}

// ============================================================
// NORMAL REQUESTS — should pass straight through to authorization
// ============================================================

// N1. Clear intent, modest amount, budget given → no escalation
{
  const agent = createAgent([baseService()]);

  const result = agent.start({
    description: "I need a demo service completed for my project.",
    maxBudget: 2_000_000n,
    constraints: { capability: "demo" },
  });

  if (result.stage !== "awaiting_authorization") {
    throw new Error("Expected a clean normal request to await authorization.");
  }

  if (result.requiresEscalationReview) {
    throw new Error("Normal request should not require escalation review.");
  }

  if (result.flow.escalation?.required) {
    throw new Error("Normal request should not be flagged for escalation.");
  }

  console.log("✅ [normal] Clear request proceeds without escalation");
}

// N2. Valid raw JSON payload through the hardened entry point
{
  const agent = createAgent([baseService()]);

  const raw: unknown = {
    description: "I need a demo service completed for my project.",
    maxBudget: "2000000",
    constraints: { capability: "demo" },
  };

  const result = agent.startFromUnknown(raw);

  if (result.stage !== "awaiting_authorization") {
    throw new Error("Expected valid raw payload to reach authorization.");
  }

  console.log("✅ [normal] Valid raw payload passes runtime validation");
}

// ============================================================
// AMBIGUOUS REQUESTS — should escalate, not silently proceed or refuse
// ============================================================

// A1. Vague description
{
  const agent = createAgent([baseService()]);

  const result = agent.start({
    description: "help me",
    constraints: { capability: "demo" },
  });

  if (result.stage !== "escalated") {
    throw new Error("Expected vague description to escalate.");
  }

  if (
    !result.flow.escalation?.reasons.some((reason) =>
      reason.includes("too short"),
    )
  ) {
    throw new Error("Expected vague-description escalation reason.");
  }

  console.log("✅ [ambiguous] Vague description escalates for review");
}

// A2. High-value payment relative to the agent's spending limit
{
  const agent = createAgent(
    [baseService({ pricing: { currency: USDC, amount: 4_500_000n } })],
    5_000_000n,
  );

  const result = agent.start({
    description: "Pay for the premium demo service tier.",
    maxBudget: 5_000_000n,
    constraints: { capability: "demo" },
  });

  if (result.stage !== "escalated") {
    throw new Error("Expected high-value payment to escalate.");
  }

  if (
    !result.flow.escalation?.reasons.some((reason) =>
      reason.includes("spending limit"),
    )
  ) {
    throw new Error("Expected high-value escalation reason.");
  }

  console.log("✅ [ambiguous] Near-limit payment escalates for review");
}

// A3. No user-specified budget on a payment above the no-budget threshold
{
  const agent = createAgent([
    baseService({ pricing: { currency: USDC, amount: 3_500_000n } }),
  ]);

  const result = agent.start({
    description: "Get the demo service done, no budget in mind.",
    constraints: { capability: "demo" },
  });

  if (result.stage !== "escalated") {
    throw new Error("Expected missing-budget high-amount request to escalate.");
  }

  if (
    !result.flow.escalation?.reasons.some((reason) =>
      reason.includes("did not specify a budget"),
    )
  ) {
    throw new Error("Expected missing-budget escalation reason.");
  }

  console.log(
    "✅ [ambiguous] Unbudgeted high-value request escalates for review",
  );
}

// A4. Tied top candidates — selection is genuinely ambiguous
{
  const serviceA = baseService({
    id: "svc-a",
    provider: PROVIDER,
    pricing: { currency: USDC, amount: 1_000_000n },
  });

  const serviceB = baseService({
    id: "svc-b",
    provider: PROVIDER_2,
    pricing: { currency: USDC, amount: 1_000_000n },
  });

  const agent = createAgent([serviceA, serviceB]);

  const result = agent.start({
    description: "I need a demo service, either provider is fine.",
    constraints: { capability: "demo" },
  });

  if (result.stage !== "escalated") {
    throw new Error("Expected a tied ranking to escalate.");
  }

  if (
    !result.flow.escalation?.reasons.some((reason) =>
      reason.includes("tied for the top rank"),
    )
  ) {
    throw new Error("Expected tied-ranking escalation reason.");
  }

  console.log("✅ [ambiguous] Tied service ranking escalates for review");
}

// A5. Escalated flow cannot be authorized directly (bypass attempt fails closed)
{
  const agent = createAgent([baseService()]);

  const result = agent.start({
    description: "help me",
    constraints: { capability: "demo" },
  });

  if (result.stage !== "escalated") {
    throw new Error("Expected setup flow to escalate.");
  }

  const bypassAttempt = agent.authorize(result.flow, {
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (bypassAttempt.status !== "failed") {
    throw new Error(
      "Expected direct authorization of an escalated flow to fail.",
    );
  }

  console.log(
    "✅ [ambiguous] Escalation cannot be bypassed with direct authorization",
  );
}

// A5b. Escalated flow resolves to authorization once a reviewer approves it
{
  const agent = createAgent([baseService()]);

  const result = agent.start({
    description: "help me",
    constraints: { capability: "demo" },
  });

  if (result.stage !== "escalated") {
    throw new Error("Expected setup flow to escalate.");
  }

  const approved = agent.resolveEscalation(result.flow, {
    approved: true,
    reviewer: "ops-reviewer",
    note: "Manually confirmed intent with the user.",
  });

  if (approved.status !== "awaiting_authorization") {
    throw new Error("Expected approved escalation to reach authorization.");
  }

  console.log("✅ [ambiguous] Approved escalation reaches authorization");
}

// A6. A reviewer can also reject an escalated flow
{
  const agent = createAgent([baseService()]);

  const result = agent.start({
    description: "help me",
    constraints: { capability: "demo" },
  });

  if (result.stage !== "escalated") {
    throw new Error("Expected setup flow to escalate.");
  }

  const rejected = agent.resolveEscalation(result.flow, {
    approved: false,
    reviewer: "ops-reviewer",
    note: "Could not confirm intent with the user.",
  });

  if (rejected.status !== "failed") {
    throw new Error("Expected rejected escalation to fail the flow.");
  }

  console.log("✅ [ambiguous] Reviewer rejection fails the flow");
}

// ============================================================
// MALICIOUS REQUESTS — must be rejected before reaching the decision layer
// ============================================================

// M1. Prototype-pollution attempt via constraints
{
  const raw = JSON.parse(
    '{"description":"legit looking request","constraints":{"__proto__":{"polluted":true}}}',
  );

  const result = validateFlowIntent(raw);

  if (result.valid) {
    throw new Error("Expected prototype-pollution attempt to be rejected.");
  }

  console.log("✅ [malicious] Prototype-pollution key rejected");
}

// M2. Negative budget
{
  const result = validateFlowIntent({
    description: "Please pay this out.",
    maxBudget: -1_000_000,
  });

  if (result.valid) {
    throw new Error("Expected negative maxBudget to be rejected.");
  }

  console.log("✅ [malicious] Negative maxBudget rejected");
}

// M3. Non-string description (type confusion)
{
  const result = validateFlowIntent({
    description: { toString: () => "looks like a string" },
  });

  if (result.valid) {
    throw new Error("Expected non-string description to be rejected.");
  }

  console.log("✅ [malicious] Non-string description rejected");
}

// M4. Oversized description (payload-bloat / DoS attempt)
{
  const result = validateFlowIntent({
    description: "x".repeat(5000),
  });

  if (result.valid) {
    throw new Error("Expected oversized description to be rejected.");
  }

  console.log("✅ [malicious] Oversized description rejected");
}

// M5. Non-object payload entirely
{
  const result = validateFlowIntent("drop table services;");

  if (result.valid) {
    throw new Error("Expected non-object payload to be rejected.");
  }

  console.log("✅ [malicious] Non-object payload rejected");
}

// M6. Malicious payload never creates a Flow via the agent boundary
// (constructed via JSON.parse, since a JS object literal's __proto__ key
// sets the prototype rather than an enumerable own property — the real
// attack surface is JSON arriving over the wire, e.g. an HTTP body.)
{
  const agent = createAgent([baseService()]);

  const raw = JSON.parse(
    '{"description":"legit looking request","constraints":{"__proto__":{"polluted":true}}}',
  );

  const result = agent.startFromUnknown(raw);

  if (result.stage !== "rejected") {
    throw new Error(
      "Expected malicious payload to be rejected at the agent boundary.",
    );
  }

  if ("flow" in result) {
    throw new Error("Rejected payload must not produce a Flow.");
  }

  console.log(
    "✅ [malicious] Agent boundary rejects malicious payload without creating a Flow",
  );
}

// M7. Oversized constraints object (excess-key flooding)
{
  const constraints: Record<string, string> = {};

  for (let i = 0; i < 50; i += 1) {
    constraints[`key${i}`] = "value";
  }

  const result = validateFlowIntent({
    description: "Legitimate looking request text.",
    constraints,
  });

  if (result.valid) {
    throw new Error("Expected oversized constraints object to be rejected.");
  }

  console.log("✅ [malicious] Oversized constraints object rejected");
}

console.log("\n🔥 ALL DECISION-LAYER TESTS PASSED");
