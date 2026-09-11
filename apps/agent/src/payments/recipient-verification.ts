import type {
  Payment,
  Service,
  ServiceQuote,
} from "../agent/types";

function normalizeAddress(address: `0x${string}`): string {
  return address.toLowerCase();
}

export function assertRecipientMatchesService(
  recipient: `0x${string}`,
  service: Service,
): void {
  if (
    normalizeAddress(recipient) !==
    normalizeAddress(service.provider)
  ) {
    throw new Error(
      `Payment recipient does not match the selected service provider.`,
    );
  }
}

export function assertRecipientMatchesQuote(
  payment: Payment,
  quote: ServiceQuote,
): void {
  if (
    normalizeAddress(payment.recipient) !==
    normalizeAddress(quote.provider)
  ) {
    throw new Error(
      `Payment recipient does not match the authorized quote.`,
    );
  }
}   