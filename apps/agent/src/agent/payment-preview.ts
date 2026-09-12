import type { Flow } from "./types";

/**
 * What a human is shown before they authorize a payment. Built strictly
 * from `flow.quote` / `flow.selectedService` — the same trusted values
 * `authorize()` uses to construct the actual Payment — so the preview
 * cannot drift from what gets authorized. There is deliberately no path
 * that lets a preview be built from caller-supplied override values.
 */
export interface PaymentPreview {
  flowId: string;
  serviceId: string;
  serviceName: string;
  provider: `0x${string}`;
  amount: bigint;
  currency: `0x${string}`;
  escalationRequired: boolean;
  escalationReasons: string[];
}

export function buildPaymentPreview(flow: Flow): PaymentPreview | null {
  if (!flow.quote || !flow.selectedService) {
    return null;
  }

  return {
    flowId: flow.id,
    serviceId: flow.selectedService.id,
    serviceName: flow.selectedService.name,
    provider: flow.quote.provider,
    amount: flow.quote.amount,
    currency: flow.quote.currency,
    escalationRequired: flow.escalation?.required ?? false,
    escalationReasons: flow.escalation?.reasons ?? [],
  };
}