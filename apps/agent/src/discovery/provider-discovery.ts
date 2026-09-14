import type { FlowIntent, Service } from "../agent/types";
import { ServiceRegistry } from "../services/service-registry";

export type ProviderDiscoverySource = "catalog" | "web" | "api";

export interface DiscoveredProvider {
  id: string;
  name: string;
  description: string;
  serviceType: string;
  provider: `0x${string}`;
  capabilities: string[];
  amount: string;
  currency: `0x${string}`;
  websiteUrl: string;
  checkoutUrl?: string;
  walletAddress?: `0x${string}`;
  source: ProviderDiscoverySource;
  verificationStatus: "unverified" | "partially_verified" | "verified";
  active?: boolean;
}

export interface ProviderDiscoveryAdapter {
  readonly name: string;
  discover(intent: FlowIntent): Promise<DiscoveredProvider[]>;
}

export interface HttpDiscoveryAdapterConfig {
  endpoint: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Calls a server-side discovery service. The remote service must return
 * { providers: DiscoveredProvider[] }. Never call arbitrary provider URLs
 * from the browser; keep API keys and network access on the server.
 */
export class HttpProviderDiscoveryAdapter implements ProviderDiscoveryAdapter {
  readonly name = "http-discovery";
  private readonly config: HttpDiscoveryAdapterConfig;

  constructor(config: HttpDiscoveryAdapterConfig) {
    this.config = config;
  }

  async discover(intent: FlowIntent): Promise<DiscoveredProvider[]> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const response = await fetchImpl(this.config.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.apiKey
          ? { authorization: `Bearer ${this.config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ intent }),
    });

    if (!response.ok) {
      throw new Error(`Provider discovery failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as { providers?: unknown };
    if (!Array.isArray(payload.providers)) return [];

    return payload.providers.filter(isDiscoveredProvider);
  }
}

export class ProviderDiscovery {
  constructor(private readonly adapters: ProviderDiscoveryAdapter[]) {}

  async discover(intent: FlowIntent): Promise<DiscoveredProvider[]> {
    const results = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.discover(intent)),
    );

    const providers: DiscoveredProvider[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") providers.push(...result.value);
    }

    return deduplicateProviders(providers);
  }

  async discoverAndRegister(
    intent: FlowIntent,
    registry: ServiceRegistry,
  ): Promise<Service[]> {
    const discovered = await this.discover(intent);
    const services = discovered
      .filter((provider) => provider.active !== false)
      .map(toService);

    for (const service of services) registry.register(service);
    return services;
  }
}

function toService(provider: DiscoveredProvider): Service {
  return {
    id: provider.id,
    name: provider.name,
    description: `${provider.description} (${provider.websiteUrl})`,
    provider: provider.walletAddress ?? provider.provider,
    capabilities: provider.capabilities,
    status: "available",
    pricing: {
      currency: provider.currency,
      amount: BigInt(provider.amount),
    },
    active: provider.verificationStatus !== "unverified",
  };
}

function deduplicateProviders(
  providers: DiscoveredProvider[],
): DiscoveredProvider[] {
  const unique = new Map<string, DiscoveredProvider>();
  for (const provider of providers) {
    const key = `${provider.id}:${provider.walletAddress ?? provider.provider}`;
    if (!unique.has(key)) unique.set(key, provider);
  }
  return [...unique.values()];
}

function isDiscoveredProvider(value: unknown): value is DiscoveredProvider {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DiscoveredProvider>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.description === "string" &&
    typeof item.serviceType === "string" &&
    typeof item.provider === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(item.provider) &&
    Array.isArray(item.capabilities) &&
    typeof item.amount === "string" &&
    /^\d+$/.test(item.amount) &&
    typeof item.currency === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(item.currency) &&
    typeof item.websiteUrl === "string" &&
    ["catalog", "web", "api"].includes(item.source ?? "") &&
    ["unverified", "partially_verified", "verified"].includes(
      item.verificationStatus ?? "",
    )
  );
}
