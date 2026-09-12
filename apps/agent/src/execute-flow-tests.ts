import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";
import { MockServiceProvider } from "./services/mock-service-provider";
import { CeloPayment } from "./payments/celo-payment";
import { executeFlow } from "./payments/execute-flow";
import { MockCeloPaymentExecutor, CELO_STABLECOINS } from "@flowmint/celo";

const PROVIDER = "0x1111111111111111111111111111111111111111" as const;
const USER = "0x2222222222222222222222222222222222222222" as const;
const USDC = CELO_STABLECOINS.USDC.address;

function createAgent() {
  const service: Service = {
    id: "svc-exec",
    name: "Execution Test Service",
    description: "Service used to verify real payment execution wiring.",
    provider: PROVIDER,
    capabilities: ["exec-test"],
    status: "available",
    pricing: { currency: USDC, amount: 1_000_000n },
    active: true,
  };

  const registry = new ServiceRegistry();
  registry.register(service);

  return new FlowMintAgent({
    registry,
    paymentPolicy: { maxPayment: 5_000_000n, allowedCurrencies: [USDC] },
    serviceProvider: new MockServiceProvider(),
  });
}

async function authorizedFlow(agent: FlowMintAgent) {
  const started = agent.start({
    description: "I need the execution test service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "exec-test" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  const authorized = agent.authorize(started.flow, {
    payer: USER,
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error("Expected authorization to succeed.");
  }

  return authorized;
}

// 1. Happy path: real orchestration takes an authorized flow all the way
// to a completed, on-chain-verified, fulfilled flow.
async function testHappyPath() {
  const agent = createAgent();
  const authorized = await authorizedFlow(agent);

  const celoPayment = new CeloPayment(new MockCeloPaymentExecutor());

  const { flow, broadcastError } = await executeFlow(
    agent,
    authorized,
    celoPayment,
    {
      publicClient: {} as never,
      walletClient: {} as never,
      account: { address: USER } as never,
    },
  );

  if (broadcastError) {
    throw new Error(`Expected no broadcast error, got: ${broadcastError}`);
  }

  if (flow.status !== "completed") {
    throw new Error(`Expected flow to complete, got: ${flow.status} (${flow.outcome?.error})`);
  }

  if (!flow.settlement?.confirmed || !flow.settlement.txHash) {
    throw new Error("Expected a confirmed on-chain settlement.");
  }

  if (flow.serviceOutcome?.success !== true) {
    throw new Error("Expected the service to have been fulfilled.");
  }

  console.log("✅ executeFlow takes an authorized flow to a completed, verified settlement");
}

// 2. Broadcast/signer mismatch throws inside CeloPayment.execute() — the
// flow must be explicitly failed, not left stuck in "settling".
async function testBroadcastFailureDoesNotStrand() {
  const agent = createAgent();
  const authorized = await authorizedFlow(agent);

  const celoPayment = new CeloPayment(new MockCeloPaymentExecutor());

  // Wrong signer: claims to be a different address than the authorized payer.
  const { flow, broadcastError } = await executeFlow(
    agent,
    authorized,
    celoPayment,
    {
      publicClient: {} as never,
      walletClient: {} as never,
      account: { address: PROVIDER } as never,
    },
  );

  if (flow.status !== "failed") {
    throw new Error(`Expected the flow to fail explicitly, got: ${flow.status}`);
  }

  if (flow.status === ("settling" as string)) {
    throw new Error("Flow must never be left stuck in settling on a broadcast failure.");
  }

  if (!broadcastError) {
    throw new Error("Expected executeFlow to report the broadcast error.");
  }

  console.log("✅ A broadcast/signer failure fails the flow explicitly instead of stranding it");
}

// 3. Calling executeFlow on a flow that isn't payment_pending never
// touches the network — submitPayment()'s own guard handles it.
async function testWrongStatePassesThrough() {
  const agent = createAgent();

  const flow = agent.createFlow({
    description: "Not authorized yet.",
  });

  const celoPayment = new CeloPayment(new MockCeloPaymentExecutor());

  const { flow: result, broadcastError } = await executeFlow(
    agent,
    flow,
    celoPayment,
    {
      publicClient: {} as never,
      walletClient: {} as never,
      account: { address: USER } as never,
    },
  );

  if (result.status !== "failed") {
    throw new Error("Expected an unauthorized flow to fail via submitPayment()'s own guard.");
  }

  if (broadcastError) {
    throw new Error("Expected no broadcast attempt for a flow that was never authorized.");
  }

  console.log("✅ executeFlow never reaches the network for a flow that isn't payment_pending");
}

async function main() {
  await testHappyPath();
  await testBroadcastFailureDoesNotStrand();
  await testWrongStatePassesThrough();

  console.log("\n🔥 ALL PAYMENT-EXECUTION TESTS PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});