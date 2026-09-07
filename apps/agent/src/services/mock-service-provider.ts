import type {
  Payment,
  Service,
  ServiceOutcome,
} from "../agent/types";
import type { ServiceProvider } from "./service-provider";

export class MockServiceProvider implements ServiceProvider {
  fulfill(
    service: Service,
    payment: Payment,
  ): ServiceOutcome {
    if (payment.status !== "confirmed") {
      return {
        success: false,
        serviceId: service.id,
        provider: service.provider,
        error: "Service cannot be fulfilled before payment confirmation.",
      };
    }

    return {
      success: true,
      serviceId: service.id,
      provider: service.provider,
      completedAt: Date.now(),
      reference: `mock-${service.id}-${payment.txHash ?? "payment"}`,
      result: {
        message: `${service.name} fulfilled successfully.`,
      },
    };
  }
}