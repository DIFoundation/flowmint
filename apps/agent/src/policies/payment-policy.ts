import type { FlowIntent, ServiceQuote } from "../agent/types";

export interface PaymentPolicy {
  maxPayment: bigint;
  allowedCurrencies: string[];
}

export function validatePayment(
  intent: FlowIntent,
  quote: ServiceQuote,
  policy: PaymentPolicy
): { allowed: boolean; reason?: string } {
  if (quote.amount > policy.maxPayment) {
    return {
      allowed: false,
      reason: "Quote exceeds the agent payment limit.",
    };
  }

  if (!policy.allowedCurrencies.includes(quote.currency)) {
    return {
      allowed: false,
      reason: `Currency ${quote.currency} is not allowed.`,
    };
  }

  if (intent.maxBudget !== undefined && quote.amount > intent.maxBudget) {
    return {
      allowed: false,
      reason: "Quote exceeds the user's stated budget.",
    };
  }

  return {
    allowed: true,
  };
}