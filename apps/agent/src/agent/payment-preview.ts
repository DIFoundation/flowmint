import type { Flow } from "./types";
import {
  resolveStablecoin,
  convertStablecoinAmount,
  CELO_STABLECOINS,
} from "@flowmint/celo";

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
  /**
   * The same amount expressed in every FlowMint-supported stablecoin,
   * so a reviewer can see up front what authorizing in a different
   * rail than the one quoted would actually cost — the same
   * conversion `authorize()` itself performs.
   */
  equivalentAmounts: Record<string, bigint>;
  escalationRequired: boolean;
  escalationReasons: string[];
}

export function buildPaymentPreview(flow: Flow): PaymentPreview | null {
  if (!flow.quote || !flow.selectedService) {
    return null;
  }

  const nativeCoin = resolveStablecoin(flow.quote.currency);

  const equivalentAmounts: Record<string, bigint> = {};

  if (nativeCoin) {
    for (const coin of Object.values(CELO_STABLECOINS)) {
      equivalentAmounts[coin.symbol] = convertStablecoinAmount(
        flow.quote.amount,
        nativeCoin,
        coin,
      );
    }
  }

  return {
    flowId: flow.id,
    serviceId: flow.selectedService.id,
    serviceName: flow.selectedService.name,
    provider: flow.quote.provider,
    amount: flow.quote.amount,
    currency: flow.quote.currency,
    equivalentAmounts,
    escalationRequired: flow.escalation?.required ?? false,
    escalationReasons: flow.escalation?.reasons ?? [],
  };
}