import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";
import { MockServiceProvider } from "./services/mock-service-provider";
import { CeloPayment } from "./payments/celo-payment";
import { MockCeloPaymentExecutor } from "@flowmint/celo";
import {
  FLOWMINT_AGENT_WALLET_ADDRESS,
  WalletOwnershipViolation,
  assertIsAgentWallet,
  assertNotAgentWallet,
  assertPayerIsSigner,
  classifyWallet,
} from "./wallet/ownership";

const USER = "0x2222222222222222222222222222222222222222" as const;
const PROVIDER = "0x1111111111111111111111111111111111111111" as const;
const USDC = "0xceba9300f2b948710d2653dd7b07f33a8b32118c" as const;

// 1. classifyWallet distinguishes agent vs everyone else
{
  if (classifyWallet(FLOWMINT_AGENT_WALLET_ADDRESS) !== "flowmint_agent") {
    throw new Error("Expected the agent wallet address to classify as flowmint_agent.");
  }

  if (classifyWallet(USER) !== "user_or_third_party") {
    throw new Error("Expected a non-agent address to classify as user_or_third_party.");
  }

  // Case-insensitivity
  if (
    classifyWallet(FLOWMINT_AGENT_WALLET_ADDRESS.toLowerCase() as `0x${string}`) !==
    "flowmint_agent"
  ) {
    throw new Error("Expected classification to be case-insensitive.");
  }

  console.log("✅ classifyWallet distinguishes agent vs. user wallets");
}

// 2. assertNotAgentWallet
{
  assertNotAgentWallet(USER, "test"); // should not throw

  let threw = false;

  try {
    assertNotAgentWallet(FLOWMINT_AGENT_WALLET_ADDRESS, "test");
  } catch (error) {
    threw = error instanceof WalletOwnershipViolation;
  }

  if (!threw) {
    throw new Error("Expected assertNotAgentWallet to reject the agent wallet.");
  }

  console.log("✅ assertNotAgentWallet rejects the agent wallet, allows others");
}

// 3. assertIsAgentWallet
{
  assertIsAgentWallet(FLOWMINT_AGENT_WALLET_ADDRESS, "test"); // should not throw

  let threw = false;

  try {
    assertIsAgentWallet(USER, "test");
  } catch (error) {
    threw = error instanceof WalletOwnershipViolation;
  }

  if (!threw) {
    throw new Error("Expected assertIsAgentWallet to reject a non-agent address.");
  }

  console.log("✅ assertIsAgentWallet rejects non-agent addresses, allows the agent wallet");
}

// 4. assertPayerIsSigner
{
  assertPayerIsSigner(USER, USER, "test"); // should not throw

  let threw = false;

  try {
    assertPayerIsSigner(USER, FLOWMINT_AGENT_WALLET_ADDRESS, "test");
  } catch (error) {
    threw = error instanceof WalletOwnershipViolation;
  }

  if (!threw) {
    throw new Error("Expected assertPayerIsSigner to reject a payer/signer mismatch.");
  }

  console.log("✅ assertPayerIsSigner rejects payer/signer mismatches");
}

// 5. Agent refuses to authorize a flow where the payer is the agent wallet
{
  const service: Service = {
    id: "svc-1",
    name: "Test Service",
    description: "Wallet-ownership test service.",
    provider: PROVIDER,
    capabilities: ["demo"],
    status: "available",
    pricing: { currency: USDC, amount: 1_000_000n },
    active: true,
  };

  const registry = new ServiceRegistry();
  registry.register(service);

  const agent = new FlowMintAgent({
    registry,
    paymentPolicy: { maxPayment: 5_000_000n, allowedCurrencies: [USDC] },
    serviceProvider: new MockServiceProvider(),
  });

  const started = agent.start({
    description: "I need the demo service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "demo" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  const result = agent.authorize(started.flow, {
    payer: FLOWMINT_AGENT_WALLET_ADDRESS,
    authorizedAmount: 1_000_000n,
    authorizedToken: USDC,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (result.status !== "failed") {
    throw new Error("Expected authorization with the agent wallet as payer to fail.");
  }

  if (!result.outcome?.error?.toLowerCase().includes("wallet-ownership")) {
    throw new Error("Expected a wallet-ownership failure reason.");
  }

  console.log("✅ FlowMintAgent.authorize() refuses the agent wallet as payer");
}

// 6. CeloPayment.execute() refuses to broadcast when the signer isn't the payer
async function testSignerMismatchRejected() {
  const executor = new MockCeloPaymentExecutor();
  const celoPayment = new CeloPayment(executor);

  const payment = {
    token: USDC,
    amount: 1_000_000n,
    payer: USER,
    recipient: PROVIDER,
    status: "authorized" as const,
  };

  let threw = false;

  try {
    await celoPayment.execute(payment, {
      publicClient: {} as never,
      walletClient: {} as never,
      // Wrong signer: claims to be a different address than the payer.
      account: { address: FLOWMINT_AGENT_WALLET_ADDRESS } as never,
    });
  } catch (error) {
    threw = error instanceof WalletOwnershipViolation;
  }

  if (!threw) {
    throw new Error("Expected CeloPayment.execute() to reject a signer/payer mismatch.");
  }

  console.log("✅ CeloPayment.execute() refuses to broadcast on a signer/payer mismatch");
}

// 7. CeloPayment.execute() proceeds when the signer matches the payer
async function testSignerMatchProceeds() {
  const executor = new MockCeloPaymentExecutor();
  const celoPayment = new CeloPayment(executor);

  const payment = {
    token: USDC,
    amount: 1_000_000n,
    payer: USER,
    recipient: PROVIDER,
    status: "authorized" as const,
  };

  const settlement = await celoPayment.execute(payment, {
    publicClient: {} as never,
    walletClient: {} as never,
    account: { address: USER } as never,
  });

  if (!settlement.confirmed) {
    throw new Error("Expected a matching signer/payer to settle successfully.");
  }

  console.log("✅ CeloPayment.execute() proceeds when signer matches payer");
}

async function main() {
  await testSignerMismatchRejected();
  await testSignerMatchProceeds();

  console.log("\n🔥 ALL WALLET-OWNERSHIP TESTS PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});