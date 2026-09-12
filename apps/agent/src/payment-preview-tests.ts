import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";
import { MockServiceProvider } from "./services/mock-service-provider";

const PROVIDER = "0x1111111111111111111111111111111111111111" as const;
const USER = "0x2222222222222222222222222222222222222222" as const;
const USDC = "0xceba9300f2b948710d2653dd7b07f33a8b32118c" as const;

function createAgent(amount = 1_000_000n, maxPayment = 5_000_000n) {
  const service: Service = {
    id: "svc-preview",
    name: "Preview Test Service",
    description: "Service used to verify transaction preview.",
    provider: PROVIDER,
    capabilities: ["preview-test"],
    status: "available",
    pricing: { currency: USDC, amount },
    active: true,
  };

  const registry = new ServiceRegistry();
  registry.register(service);

  return new FlowMintAgent({
    registry,
    paymentPolicy: { maxPayment, allowedCurrencies: [USDC] },
    serviceProvider: new MockServiceProvider(),
  });
}

// 1. No preview before a flow has been evaluated
{
  const agent = createAgent();
  const flow = agent.createFlow({
    description: "Not evaluated yet.",
    constraints: { capability: "preview-test" },
  });

  if (agent.preview(flow) !== null) {
    throw new Error("Expected no preview before evaluation.");
  }

  console.log("✅ No preview before a flow has a quote");
}

// 2. Preview matches the quote and service once evaluated
{
  const agent = createAgent();

  const started = agent.start({
    description: "I need the preview test service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "preview-test" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  const preview = agent.preview(started.flow);

  if (!preview) {
    throw new Error("Expected a preview once a quote exists.");
  }

  if (
    preview.provider !== PROVIDER ||
    preview.amount !== 1_000_000n ||
    preview.currency !== USDC ||
    preview.serviceId !== "svc-preview" ||
    preview.escalationRequired !== false
  ) {
    throw new Error("Preview does not match the quote/service.");
  }

  console.log("✅ Preview matches the quote and selected service");
}

// 3. Preview reflects escalation state
{
  const agent = createAgent(4_500_000n, 5_000_000n);

  const started = agent.start({
    description: "Pay for the premium preview test tier.",
    maxBudget: 5_000_000n,
    constraints: { capability: "preview-test" },
  });

  if (started.stage !== "escalated") {
    throw new Error("Expected setup flow to escalate.");
  }

  const preview = agent.preview(started.flow);

  if (!preview?.escalationRequired || preview.escalationReasons.length === 0) {
    throw new Error("Expected preview to reflect the escalation.");
  }

  console.log("✅ Preview reflects escalation state and reasons");
}

// 4. Preview cannot drift from what actually gets authorized
{
  const agent = createAgent();

  const started = agent.start({
    description: "I need the preview test service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "preview-test" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  const preview = agent.preview(started.flow);

  if (!preview) {
    throw new Error("Expected a preview.");
  }

  const authorized = agent.authorize(started.flow, {
    payer: USER,
    authorizedAmount: preview.amount,
    authorizedToken: preview.currency,
    authorizedRecipient: preview.provider,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error("Expected authorization built from the preview to succeed.");
  }

  if (
    authorized.payment?.amount !== preview.amount ||
    authorized.payment?.recipient !== preview.provider ||
    authorized.payment?.token !== preview.currency
  ) {
    throw new Error("Authorized payment drifted from what the preview showed.");
  }

  console.log("✅ What the preview shows is exactly what gets authorized");
}

console.log("\n🔥 ALL TRANSACTION-PREVIEW TESTS PASSED");