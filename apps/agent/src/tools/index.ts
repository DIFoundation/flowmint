import type { FlowIntent } from "../agent/types";
import { ServiceRegistry } from "../services/service-registry";

export function discoverServices(
  registry: ServiceRegistry,
  intent: FlowIntent,
) {
  const capability = intent.constraints?.capability;

  if (capability) {
    return registry.findByCapability(capability);
  }

  return registry.list().filter((service) => service.active);
}
