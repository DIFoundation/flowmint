import assert from "node:assert/strict";
import {
  assertRecipientMatchesService,
  assertRecipientMatchesQuote,
} from "./payments/recipient-verification";
import { Service } from "./agent/types";

const provider =
  "0x2222222222222222222222222222222222222222" as `0x${string}`;

const attacker =
  "0x3333333333333333333333333333333333333333" as `0x${string}`;

const service: Service = {
  id: "logo-basic",
  name: "Logo Design",
  description: "Basic logo design service",
  provider: provider,
  active: true,
  capabilities: ["logo-design"],
  status: "available",
  pricing: {
    currency:
      "0xceba9300f2b948710d2653dd7b07f33a8b32118c" as `0x${string}`,
    amount: 2_000_000n,
  },
};

const quote = {
  serviceId: service.id,
  provider: service.provider,
  currency: service.pricing.currency,
  amount: service.pricing.amount,
};

const payment = {
  token: quote.currency,
  amount: quote.amount,
  payer:
    "0x4444444444444444444444444444444444444444" as `0x${string}`,
  recipient: provider,
  status: "authorized" as const,
};

assert.doesNotThrow(() =>
  assertRecipientMatchesService(provider, service),
);

assert.throws(
  () => assertRecipientMatchesService(attacker, service),
  /selected service provider/,
);

assert.doesNotThrow(() =>
  assertRecipientMatchesQuote(payment, quote),
);

assert.throws(
  () =>
    assertRecipientMatchesQuote(
      {
        ...payment,
        recipient: attacker,
      },
      quote,
    ),
  /authorized quote/,
);

console.log("✅ M3.3 recipient verification tests passed");