import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";
import { MockServiceProvider } from "./services/mock-service-provider";

const PROVIDER = "0x1111111111111111111111111111111111111111" as const;
const USDC = "0xceba9300f2b948710d2653dd7b07f33a8b32118c" as const;

const service: Service = {
  id: "svc-evidence",
  name: "Evidence Test Service",
  description: "Service used to test FlowMint audit evidence.",
  provider: PROVIDER,
  capabilities: ["evidence-test"],
  status: "available",
  pricing: {
    currency: USDC,
    amount: 1_000_000n,
  },
  active: true,
};

const registry = new ServiceRegistry();
registry.register(service);

const agent = new FlowMintAgent({
  registry,
  paymentPolicy: {
    maxPayment: 5_000_000n,
    allowedCurrencies: [USDC],
  },
  serviceProvider: new MockServiceProvider(),
});

const result = agent.start({
  description: "I need the evidence test service completed.",
  maxBudget: 2_000_000n,
  constraints: {
    capability: "evidence-test",
  },
});

if (result.stage !== "awaiting_authorization") {
  throw new Error("Expected flow to await authorization.");
}

const events = result.flow.evidence.map((entry) => entry.event);

for (const event of ["flow_created", "decision_made"]) {
  if (!events.includes(event as never)) {
    throw new Error(`Expected evidence event: ${event}`);
  }
}

if (result.flow.evidence.some((entry) => entry.timestamp <= 0)) {
  throw new Error("Expected every evidence entry to have a timestamp.");
}

const decisionEvidence = result.flow.evidence.find(
  (entry) => entry.event === "decision_made",
);

if (decisionEvidence?.details.serviceId !== service.id) {
  throw new Error("Expected decision evidence to identify the selected service.");
}

console.log("✅ flow creation and decision evidence recorded");
console.log("✅ evidence entries contain timestamps");
console.log("✅ decision evidence identifies selected service");

console.log("\n🔥 M3.5 EVIDENCE TESTS PASSED");
