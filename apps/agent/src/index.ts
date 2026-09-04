import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";

const registry = new ServiceRegistry();

const demoService: Service = {
  id: "demo-service",
  name: "Demo Economic Service",
  description: "Development service used to exercise the FlowMint lifecycle.",
  provider: "0x1111111111111111111111111111111111111111",
  capabilities: ["demo"],
  pricing: {
    currency: "0x2222222222222222222222222222222222222222",
    amount: 1n,
  },
  active: true,
};

registry.register(demoService);

const agent = new FlowMintAgent({
  registry,
  paymentPolicy: {
    maxPayment: 10n,
    allowedCurrencies: [demoService.pricing.currency],
  },
});

const flow = agent.createFlow({
  description: "Execute a demo economic task.",
  maxBudget: 5n,
  constraints: {
    capability: "demo",
  },
});

const evaluatedFlow = agent.evaluate(flow);

console.log(
  JSON.stringify(
    evaluatedFlow,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ),
);
