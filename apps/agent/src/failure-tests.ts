import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";

const PROVIDER = "0x1111111111111111111111111111111111111111" as const;

const USDC = "0xceba9300f2b948710d2653dd7b07f33a8b32118c" as const;

function createAgent(
  service?: Service,
  maxPayment = 5_000_000n,
): FlowMintAgent {
  const registry = new ServiceRegistry();

  if (service) {
    registry.register(service);
  }

  return new FlowMintAgent({
    registry,
    paymentPolicy: {
      maxPayment,
      allowedCurrencies: [USDC],
    },
  });
}

const service: Service = {
  id: "test-service",
  name: "Test Economic Service",
  description: "Failure-path test service.",
  provider: PROVIDER,
  capabilities: ["demo"],
  pricing: {
    currency: USDC,
    amount: 1_000_000n,
  },
  active: true,
};

// 1. No service
{
  const agent = createAgent();

  const flow = agent.createFlow({
    description: "Find a service.",
    constraints: { capability: "demo" },
  });

  const result = agent.evaluate(flow);

  if (result.status !== "failed") {
    throw new Error("Expected no-service flow to fail.");
  }

  console.log("✅ No service rejected");
}

// 2. Agent payment limit exceeded
{
  const expensiveService = {
    ...service,
    pricing: {
      currency: USDC,
      amount: 10_000_000n,
    },
  };

  const agent = createAgent(expensiveService);

  const flow = agent.createFlow({
    description: "Pay for expensive service.",
  });

  const result = agent.evaluate(flow);

  if (result.status !== "failed") {
    throw new Error("Expected payment-limit flow to fail.");
  }

  console.log("✅ Agent payment limit enforced");
}

// 3. User budget exceeded
{
  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Stay within my budget.",
    maxBudget: 500_000n,
  });

  const result = agent.evaluate(flow);

  if (result.status !== "failed") {
    throw new Error("Expected budget-exceeded flow to fail.");
  }

  console.log("✅ User budget enforced");
}

// 4. Unsupported currency
{
  const badCurrencyService = {
    ...service,
    pricing: {
      currency:
        "0x2222222222222222222222222222222222222222" as `0x${string}`,
      amount: 1_000_000n,
    },
  };

  const agent = createAgent(badCurrencyService);

  const flow = agent.createFlow({
    description: "Attempt unsupported currency.",
  });

  const result = agent.evaluate(flow);

  if (result.status !== "failed") {
    throw new Error("Expected unsupported currency to fail.");
  }

  console.log("✅ Unsupported currency rejected");
}

// 5. Cannot authorize unevaluated flow
{
  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Skip evaluation.",
  });

  const result = agent.authorize(flow, {
    payer:
      "0x2222222222222222222222222222222222222222",
  });

  if (result.status !== "failed") {
    throw new Error("Expected invalid authorization to fail.");
  }

  console.log("✅ Invalid authorization state rejected");
}

// 6. Cannot submit before authorization
{
  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Skip authorization.",
  });

  const result = agent.submitPayment(flow);

  if (result.status !== "failed") {
    throw new Error("Expected invalid submission state to fail.");
  }

  console.log("✅ Invalid submission state rejected");
}

console.log("\n🔥 ALL FAILURE-PATH TESTS PASSED");
