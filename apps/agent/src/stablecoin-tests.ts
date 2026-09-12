import { FlowMintAgent } from "./agent/flowmint-agent";
import { ServiceRegistry } from "./services/service-registry";
import type { Service } from "./agent/types";
import { MockServiceProvider } from "./services/mock-service-provider";
import { validateFlowIntent } from "./agent/validate-intent";
import {
  CELO_STABLECOINS,
  resolveStablecoin,
  convertStablecoinAmount,
} from "@flowmint/celo";

const PROVIDER = "0x1111111111111111111111111111111111111111" as const;
const USER = "0x2222222222222222222222222222222222222222" as const;
const USDC = CELO_STABLECOINS.USDC.address;
const USDT = CELO_STABLECOINS.USDT.address;
const USDM = CELO_STABLECOINS.USDm.address;

function createAgent(amount = 1_000_000n) {
  const service: Service = {
    id: "svc-stable",
    name: "Stablecoin Test Service",
    description: "Service used to verify flexible stablecoin settlement.",
    provider: PROVIDER,
    capabilities: ["stable-test"],
    status: "available",
    pricing: { currency: USDC, amount },
    active: true,
  };

  const registry = new ServiceRegistry();
  registry.register(service);

  return new FlowMintAgent({
    registry,
    paymentPolicy: {
      maxPayment: 5_000_000n,
      allowedCurrencies: [USDC, USDT, USDM],
    },
    serviceProvider: new MockServiceProvider(),
  });
}

// 1. resolveStablecoin — symbol, case-insensitive, address, and unknown
{
  if (resolveStablecoin("usdc")?.symbol !== "USDC") {
    throw new Error("Expected case-insensitive symbol resolution.");
  }

  if (resolveStablecoin(USDT)?.symbol !== "USDT") {
    throw new Error("Expected address resolution.");
  }

  if (resolveStablecoin("DOGE") !== undefined) {
    throw new Error("Expected an unsupported symbol to resolve to undefined.");
  }

  console.log("✅ resolveStablecoin resolves by symbol and address, rejects unknowns");
}

// 2. convertStablecoinAmount — same-decimal, scale-up, scale-down with rounding
{
  const usdc = CELO_STABLECOINS.USDC; // 6 decimals
  const usdt = CELO_STABLECOINS.USDT; // 6 decimals
  const usdm = CELO_STABLECOINS.USDm; // 18 decimals

  if (convertStablecoinAmount(1_000_000n, usdc, usdt) !== 1_000_000n) {
    throw new Error("Expected a 1:1 conversion between equal-decimal stablecoins.");
  }

  if (
    convertStablecoinAmount(1_000_000n, usdc, usdm) !==
    1_000_000n * 10n ** 12n
  ) {
    throw new Error("Expected correct scale-up from 6 to 18 decimals.");
  }

  // 1 wei of USDm (smallest possible unit) has no exact 6-decimal
  // representation; conversion must round UP so the recipient is never
  // shortchanged.
  if (convertStablecoinAmount(1n, usdm, usdc) !== 1n) {
    throw new Error("Expected precision-loss conversion to round up, not truncate to zero.");
  }

  console.log("✅ convertStablecoinAmount handles same-decimal, scale-up, and rounds up on scale-down");
}

// 3. Intent validation rejects an unsupported stablecoin symbol
{
  const result = validateFlowIntent({
    description: "Pay in a coin FlowMint doesn't support.",
    preferredCurrency: "DOGE",
  });

  if (result.valid) {
    throw new Error("Expected an unsupported preferredCurrency to be rejected.");
  }

  console.log("✅ validateFlowIntent rejects an unsupported stablecoin symbol");
}

// 4. Authorizing in a different (but supported) stablecoin than the quote converts correctly
{
  const agent = createAgent(1_000_000n); // quoted in USDC

  const started = agent.start({
    description: "I need the stablecoin test service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "stable-test" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  const expectedUsdtAmount = convertStablecoinAmount(
    1_000_000n,
    CELO_STABLECOINS.USDC,
    CELO_STABLECOINS.USDT,
  );

  const authorized = agent.authorize(started.flow, {
    payer: USER,
    authorizedAmount: expectedUsdtAmount,
    authorizedToken: USDT,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "payment_pending") {
    throw new Error(
      `Expected authorization in a different supported stablecoin to succeed, got: ${authorized.outcome?.error}`,
    );
  }

  if (authorized.payment?.token !== USDT) {
    throw new Error("Expected the settled payment to use the authorized stablecoin.");
  }

  console.log("✅ Authorizing settlement in a different supported stablecoin converts correctly");
}

// 5. Authorizing with a wrong (unconverted) amount for the chosen stablecoin fails
{
  const agent = createAgent(1_000_000n);

  const started = agent.start({
    description: "I need the stablecoin test service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "stable-test" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  // Settling in USDm (18 decimals) but supplying the raw 6-decimal amount
  // instead of the converted 18-decimal equivalent.
  const authorized = agent.authorize(started.flow, {
    payer: USER,
    authorizedAmount: 1_000_000n,
    authorizedToken: USDM,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "failed") {
    throw new Error("Expected an unconverted amount for a different-decimal stablecoin to fail.");
  }

  console.log("✅ Authorizing with an unconverted amount for a different-decimal stablecoin fails");
}

// 6. Authorizing in a stablecoin FlowMint doesn't recognize at all fails
{
  const agent = createAgent();

  const started = agent.start({
    description: "I need the stablecoin test service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "stable-test" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  const authorized = agent.authorize(started.flow, {
    payer: USER,
    authorizedAmount: 1_000_000n,
    authorizedToken: "0x9999999999999999999999999999999999999999",
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "failed") {
    throw new Error("Expected an unrecognized stablecoin to be rejected.");
  }

  console.log("✅ Authorizing in an unrecognized stablecoin is rejected");
}

// 7. A recognized stablecoin not permitted by this agent's policy is rejected
{
  const service: Service = {
    id: "svc-restricted",
    name: "USDC-only Service",
    description: "Policy only allows USDC for this agent.",
    provider: PROVIDER,
    capabilities: ["stable-test"],
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
    description: "I need the restricted service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "stable-test" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  const authorized = agent.authorize(started.flow, {
    payer: USER,
    authorizedAmount: 1_000_000n,
    authorizedToken: USDT,
    authorizedRecipient: PROVIDER,
    authorizedAt: Date.now(),
  });

  if (authorized.status !== "failed") {
    throw new Error("Expected a policy-disallowed stablecoin to be rejected even if recognized.");
  }

  console.log("✅ A recognized but policy-disallowed stablecoin is rejected");
}

// 8. Preview shows equivalent amounts across all supported stablecoins
{
  const agent = createAgent(1_000_000n);

  const started = agent.start({
    description: "I need the stablecoin test service completed.",
    maxBudget: 2_000_000n,
    constraints: { capability: "stable-test" },
  });

  if (started.stage !== "awaiting_authorization") {
    throw new Error("Expected setup flow to await authorization.");
  }

  const preview = agent.preview(started.flow);

  if (
    preview?.equivalentAmounts.USDC !== 1_000_000n ||
    preview?.equivalentAmounts.USDT !== 1_000_000n ||
    preview?.equivalentAmounts.USDm !== 1_000_000n * 10n ** 12n
  ) {
    throw new Error("Expected the preview to show correct equivalent amounts for every rail.");
  }

  console.log("✅ Preview shows equivalent amounts across every supported stablecoin");
}

console.log("\n🔥 ALL STABLECOIN-FLEXIBILITY TESTS PASSED");