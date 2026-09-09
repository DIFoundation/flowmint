import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Payment, Service, ServiceOutcome } from "./agent/types";
import { MockServiceProvider } from "./services/mock-service-provider";
import type { ServiceProvider } from "./services/service-provider";

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
    serviceProvider: new MockServiceProvider(),
  });
}

const service: Service = {
  id: "test-service",
  name: "Test Economic Service",
  description: "Failure-path test service.",
  provider: PROVIDER,
  capabilities: ["demo"],
  status: "available",
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
      currency: "0x2222222222222222222222222222222222222222" as `0x${string}`,
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
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
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

// 7. Capability mismatch
{
  const wrongCapabilityService: Service = {
    ...service,
    capabilities: ["design"],
  };

  const agent = createAgent(wrongCapabilityService);

  const flow = agent.createFlow({
    description: "Find a development service.",
    constraints: {
      capability: "development",
    },
  });

  const result = agent.evaluate(flow);

  if (result.status !== "failed") {
    throw new Error("Expected capability mismatch to fail.");
  }

  if (
    !result.decision?.candidates[0]?.reasons.some((reason) =>
      reason.includes('Missing required capability "development"'),
    )
  ) {
    throw new Error("Expected capability mismatch reason.");
  }

  console.log("✅ Capability mismatch rejected");
}

// 8. Inactive provider
{
  const inactiveService: Service = {
    ...service,
    active: false,
  };

  const agent = createAgent(inactiveService);

  const flow = agent.createFlow({
    description: "Use an inactive provider.",
  });

  const result = agent.evaluate(flow);

  if (result.status !== "failed") {
    throw new Error("Expected inactive provider to fail.");
  }

  console.log("✅ Inactive provider rejected");
}

// 9. Ranking chooses eligible lower-cost provider
{
  const registry = new ServiceRegistry();

  const expensive = {
    ...service,
    id: "expensive-service",
    pricing: {
      currency: USDC,
      amount: 4_000_000n,
    },
  };

  const affordable = {
    ...service,
    id: "affordable-service",
    pricing: {
      currency: USDC,
      amount: 2_000_000n,
    },
  };

  registry.register(expensive);
  registry.register(affordable);

  const agent = new FlowMintAgent({
    registry,
    paymentPolicy: {
      maxPayment: 10_000_000n,
      allowedCurrencies: [USDC],
    },
    serviceProvider: new MockServiceProvider(),
  });

  const flow = agent.createFlow({
    description: "Choose an affordable service.",
    maxBudget: 3_000_000n,
  });

  const result = agent.evaluate(flow);

  if (result.status !== "awaiting_authorization") {
    throw new Error("Expected an eligible service to be selected.");
  }

  if (result.selectedService?.id !== "affordable-service") {
    throw new Error("Decision engine selected the wrong provider.");
  }

  console.log("✅ Decision engine selected eligible provider");
}

// 10. Exact authorization binding
{
  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Authorize exact payment.",
  });

  const evaluated = agent.evaluate(flow);

  if (evaluated.status !== "awaiting_authorization") {
    throw new Error("Expected flow to await authorization.");
  }

  const result = agent.authorize(evaluated, {
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (result.status !== "payment_pending") {
    throw new Error("Expected authorization to succeed.");
  }

  console.log("✅ Exact authorization binding accepted");
}

// 11. Amount tampering
{
  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Prevent amount tampering.",
  });

  const evaluated = agent.evaluate(flow);

  const authorized = agent.authorize(evaluated, {
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error("Expected authorization to succeed.");
  }

  if (!authorized.payment) {
    throw new Error("Expected payment to exist.");
  }

  authorized.payment.amount = 2_000_000n;

  const result = agent.submitPayment(authorized);

  if (result.status !== "failed") {
    throw new Error("Expected amount tampering to fail.");
  }

  if (!result.outcome?.error?.toLowerCase().includes("amount")) {
    throw new Error("Expected amount binding failure reason.");
  }

  console.log("✅ Amount tampering rejected");
}

// 12. Token tampering
{
  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Prevent token tampering.",
  });

  const evaluated = agent.evaluate(flow);

  const authorized = agent.authorize(evaluated, {
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error("Expected authorization to succeed.");
  }

  if (!authorized.payment) {
    throw new Error("Expected payment to exist.");
  }

  authorized.payment.token = "0x3333333333333333333333333333333333333332";

  const result = agent.submitPayment(authorized);

  if (result.status !== "failed") {
    throw new Error("Expected token tampering to fail.");
  }

  if (!result.outcome?.error?.toLowerCase().includes("token")) {
    throw new Error("Expected token binding failure reason.");
  }

  console.log("✅ Token tampering rejected");
}

// 13. Recipient tampering
{
  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Prevent recipient tampering.",
  });

  const evaluated = agent.evaluate(flow);

  const authorized = agent.authorize(evaluated, {
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error("Expected authorization to succeed.");
  }

  if (!authorized.payment) {
    throw new Error("Expected payment to exist.");
  }

  authorized.payment.recipient = "0x3333333333333333333333333333333333333333";

  const result = agent.submitPayment(authorized);

  if (result.status !== "failed") {
    throw new Error("Expected recipient tampering to fail.");
  }

  if (!result.outcome?.error?.toLowerCase().includes("recipient")) {
    throw new Error("Expected recipient binding failure reason.");
  }

  console.log("✅ Recipient tampering rejected");
}

// 14. Payer tampering
{
  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Prevent payer tampering.",
  });

  const evaluated = agent.evaluate(flow);

  const authorized = agent.authorize(evaluated, {
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error("Expected authorization to succeed.");
  }

  if (!authorized.payment) {
    throw new Error("Expected payment to exist.");
  }

  authorized.payment.payer = "0x3333333333333333333333333333333333333333";

  const result = agent.submitPayment(authorized);

  if (result.status !== "failed") {
    throw new Error("Expected payer tampering to fail.");
  }

  if (!result.outcome?.error?.toLowerCase().includes("payer")) {
    throw new Error("Expected payer binding failure reason.");
  }

  console.log("✅ Payer tampering rejected");
}

// 15. Failing service provider
{
  class FailingServiceProvider implements ServiceProvider {
    fulfill(service: Service, payment: Payment): ServiceOutcome {
      return {
        success: false,
        serviceId: service.id,
        provider: service.provider,
        error: "Service fulfillment intentionally failed.",
      };
    }
  }

  const registry = new ServiceRegistry();
  registry.register(service);

  const agent = new FlowMintAgent({
    registry,
    paymentPolicy: {
      maxPayment: 5_000_000n,
      allowedCurrencies: [USDC],
    },
    serviceProvider: new FailingServiceProvider(),
  });

  const flow = agent.createFlow({
    description: "Test failing service provider.",
  });

  const evaluated = agent.evaluate(flow);

  if (evaluated.status !== "awaiting_authorization") {
    throw new Error("Expected flow to await authorization.");
  }

  const authorized = agent.authorize(evaluated, {
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error("Expected authorization to succeed.");
  }

  const submitted = agent.submitPayment(authorized);

  if (submitted.status !== "settling") {
    throw new Error("Expected payment to be submitted.");
  }

  const result = agent.complete(submitted, {
    txHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    confirmed: true,
    blockNumber: 1n,
  });

  if (result.status !== "failed") {
    throw new Error("Expected service fulfillment to fail.");
  }

  if (!result.outcome?.error?.toLowerCase().includes("fulfill")) {
    throw new Error("Expected service fulfillment failure reason.");
  }

  console.log("✅ Failing service provider rejected");
}

// 16. Service fulfillment with unconfirmed payment
{
  service.status = "available";

  const agent = createAgent(service);

  const flow = agent.createFlow({
    description: "Test service fulfillment with unconfirmed payment.",
  });

  const evaluated = agent.evaluate(flow);

  if (evaluated.status !== "awaiting_authorization") {
    throw new Error("Expected flow to await authorization.");
  }

  const authorized = agent.authorize(evaluated, {
    payer: "0x2222222222222222222222222222222222222222",
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error("Expected authorization to succeed.");
  }

  const submitted = agent.submitPayment(authorized);

  if (submitted.status !== "settling") {
    throw new Error("Expected payment to be submitted.");
  }

  const result = agent.complete(submitted, {
    txHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    confirmed: false,
  });

  if (result.payment?.status !== "submitted") {
    throw new Error(
      "Payment should remain submitted when settlement is unconfirmed.",
    );
  }

  if (result.serviceOutcome) {
    throw new Error(
      "Service must not be fulfilled when settlement is unconfirmed.",
    );
  }

  if (result.selectedService?.status !== "available") {
    throw new Error(
      "Service must remain available when payment is unconfirmed.",
    );
  }

  if (result.status !== "failed") {
    throw new Error("Expected unconfirmed settlement to fail.");
  }

  console.log("✅ Service fulfillment with unconfirmed payment rejected");
}

// 17. Agent loop stops at authorization boundary
{
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
    description: "Start an economic service flow.",
    maxBudget: 3_000_000n,
    preferredCurrency: USDC,
    constraints: {
      capability: "demo",
    },
  });

  if (result.stage !== "awaiting_authorization") {
    throw new Error("Expected agent loop to stop at authorization boundary.");
  }

  if (!result.requiresAuthorization) {
    throw new Error("Expected agent loop to require explicit authorization.");
  }

  if (result.flow.selectedService?.id !== service.id) {
    throw new Error("Expected agent loop to select the service.");
  }

  if (!result.flow.quote) {
    throw new Error("Expected agent loop to produce a service quote.");
  }

  if (result.flow.payment) {
    throw new Error("Payment must not exist before explicit authorization.");
  }

  console.log("✅ Agent loop stopped at authorization boundary");
}

console.log("\n🔥 ALL FAILURE-PATH TESTS PASSED");
