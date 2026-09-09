import type { FlowIntent, ServiceQuote, ServiceScore } from "../agent/types";
import type { PaymentPolicy } from "./payment-policy";

export interface EscalationPolicy {
  /**
   * If the quote amount is >= this fraction of the agent's max payment,
   * the flow is escalated even though it is technically within policy.
   * Range: 0-1.
   */
  highValueRatio: number;

  /**
   * Intent descriptions shorter than this are treated as too vague to
   * establish clear, unambiguous intent.
   */
  minDescriptionLength: number;

  /**
   * If the user gave no maxBudget and the quote is at or above this
   * amount, the agent should not decide unsupervised.
   */
  requireBudgetAboveAmount: bigint;
}

export const DEFAULT_ESCALATION_POLICY: EscalationPolicy = {
  highValueRatio: 0.8,
  minDescriptionLength: 8,
  requireBudgetAboveAmount: 3_000_000n,
};

export function evaluateEscalation(
  intent: FlowIntent,
  quote: ServiceQuote,
  paymentPolicy: PaymentPolicy,
  escalationPolicy: EscalationPolicy,
  rankings: ServiceScore[],
): EscalationDecisionResult {
  const reasons: string[] = [];

  if (
    paymentPolicy.maxPayment > 0n &&
    quote.amount * 100n >=
      paymentPolicy.maxPayment * BigInt(Math.round(escalationPolicy.highValueRatio * 100))
  ) {
    reasons.push(
      `Quote (${quote.amount}) is at or above ${Math.round(
        escalationPolicy.highValueRatio * 100,
      )}% of the agent's spending limit (${paymentPolicy.maxPayment}).`,
    );
  }

  if (intent.description.trim().length < escalationPolicy.minDescriptionLength) {
    reasons.push(
      `Request description is too short (${intent.description.trim().length} chars) to establish clear intent.`,
    );
  }

  if (
    intent.maxBudget === undefined &&
    quote.amount >= escalationPolicy.requireBudgetAboveAmount
  ) {
    reasons.push(
      "User did not specify a budget and the quote exceeds the no-budget escalation threshold.",
    );
  }

  const eligible = rankings.filter((candidate) => candidate.eligible);

  if (eligible.length >= 2 && eligible[0].score === eligible[1].score) {
    reasons.push(
      "Multiple eligible services are tied for the top rank; selection is ambiguous.",
    );
  }

  return {
    required: reasons.length > 0,
    reasons,
  };
}

export interface EscalationDecisionResult {
  required: boolean;
  reasons: string[];
}