import type { FlowIntent, Service, ServiceScore } from "./types";
import type { PaymentPolicy } from "../policies/payment-policy";
import { resolveStablecoin } from "@flowmint/celo";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasCapability(service: Service, capability: string): boolean {
  const requested = normalize(capability);

  return service.capabilities.some((item) => normalize(item) === requested);
}

export function rankServices(
  intent: FlowIntent,
  services: Service[],
  policy: PaymentPolicy,
): ServiceScore[] {
  const requestedCapability = intent.constraints?.capability;

  const preferredStablecoin = intent.preferredCurrency
    ? resolveStablecoin(intent.preferredCurrency)
    : undefined;

  const scored = services.map((service): ServiceScore => {
    let score = 0;
    let eligible = true;
    const reasons: string[] = [];

    if (!service.active) {
      eligible = false;
      reasons.push("Provider is inactive.");
    } else {
      reasons.push("Provider is active.");
    }

    if (requestedCapability) {
      if (hasCapability(service, requestedCapability)) {
        score += 50;
        reasons.push(`Capability "${requestedCapability}" matches.`);
      } else {
        eligible = false;
        reasons.push(`Missing required capability "${requestedCapability}".`);
      }
    }

    if (service.pricing.amount > policy.maxPayment) {
      eligible = false;
      reasons.push("Price exceeds the agent payment limit.");
    } else {
      score += 10;
      reasons.push("Price is within the agent payment limit.");
    }

    if (
      intent.maxBudget !== undefined &&
      service.pricing.amount > intent.maxBudget
    ) {
      eligible = false;
      reasons.push("Price exceeds the user's stated budget.");
    } else if (intent.maxBudget !== undefined) {
      score += 30;
      reasons.push("Price is within the user's stated budget.");
    }

    const currencyAllowed = policy.allowedCurrencies.some(
      (currency) => normalize(currency) === normalize(service.pricing.currency),
    );

    if (!currencyAllowed) {
      eligible = false;
      reasons.push(`Currency ${service.pricing.currency} is not allowed.`);
    } else {
      reasons.push("Currency is allowed by policy.");
    }

    if (preferredStablecoin) {
      if (
        normalize(service.pricing.currency) ===
        preferredStablecoin.address.toLowerCase()
      ) {
        score += 10;
        reasons.push("Matches the user's preferred stablecoin natively (no conversion needed).");
      } else {
        reasons.push(
          "Priced in a different stablecoin than preferred; settlement will convert at authorization.",
        );
      }
    }

    return {
      service,
      score,
      eligible,
      reasons,
    };
  });

  return scored.sort((a, b) => {
    if (a.eligible !== b.eligible) {
      return a.eligible ? -1 : 1;
    }

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (a.service.pricing.amount !== b.service.pricing.amount) {
      return a.service.pricing.amount < b.service.pricing.amount ? -1 : 1;
    }

    return a.service.id.localeCompare(b.service.id);
  });
}
