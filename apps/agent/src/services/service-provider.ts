import type {
  Payment,
  Service,
  ServiceOutcome,
} from "../agent/types";

export interface ServiceProvider {
  fulfill(
    service: Service,
    payment: Payment,
  ): ServiceOutcome;
}