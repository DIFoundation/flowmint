import type { Service } from "../agent/types";

export class ServiceRegistry {
  private readonly services = new Map<string, Service>();

  register(service: Service): void {
    this.services.set(service.id, service);
  }

  get(serviceId: string): Service | undefined {
    return this.services.get(serviceId);
  }

  list(): Service[] {
    return Array.from(this.services.values());
  }

  findByCapability(capability: string): Service[] {
    return this.list().filter(
      (service) =>
        service.active &&
        service.capabilities.some(
          (item) => item.toLowerCase() === capability.toLowerCase()
        )
    );
  }
}