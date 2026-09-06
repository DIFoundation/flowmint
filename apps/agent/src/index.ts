import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";

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

registry.register(basicService);
registry.register(professionalService);

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

const evaluatedFlow = agent.evaluate(flow);

console.log(
  JSON.stringify(
    evaluatedFlow,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ),
);
