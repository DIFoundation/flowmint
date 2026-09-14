import "server-only";
import {
  HttpProviderDiscoveryAdapter,
  ProviderDiscovery,
  type DiscoveredProvider,
  type ProviderDiscoveryAdapter,
} from "@flowmint/agent";
import type { FlowIntent } from "@flowmint/agent";
import { CELO_STABLECOINS } from "@flowmint/celo";

const DEMO_PROVIDERS: DiscoveredProvider[] = [
  {
    id: "flowmint-logo-studio",
    name: "FlowMint Logo Studio",
    description: "Simple business logo design delivered digitally.",
    serviceType: "design",
    provider: "0x1111111111111111111111111111111111111111",
    capabilities: ["design", "logo", "branding"],
    amount: "2000000",
    currency: CELO_STABLECOINS.USDC.address,
    websiteUrl: "https://example.com/flowmint-logo-studio",
    source: "catalog",
    verificationStatus: "verified",
  },
  {
    id: "flowmint-brand-lab",
    name: "FlowMint Brand Lab",
    description: "Logo and basic brand identity package.",
    serviceType: "design",
    provider: "0x2222222222222222222222222222222222222222",
    capabilities: ["design", "logo", "branding"],
    amount: "3000000",
    currency: CELO_STABLECOINS.USDC.address,
    websiteUrl: "https://example.com/flowmint-brand-lab",
    source: "catalog",
    verificationStatus: "verified",
  },
  {
    id: "flowmint-quick-design",
    name: "FlowMint Quick Design",
    description: "Fast single-concept logo design.",
    serviceType: "design",
    provider: "0x3333333333333333333333333333333333333333",
    capabilities: ["design", "logo"],
    amount: "1500000",
    currency: CELO_STABLECOINS.USDC.address,
    websiteUrl: "https://example.com/flowmint-quick-design",
    source: "catalog",
    verificationStatus: "verified",
  },
];

class StaticProviderDiscoveryAdapter {
  readonly name = "local-catalog";

  async discover(_intent: FlowIntent): Promise<DiscoveredProvider[]> {
    return DEMO_PROVIDERS;
  }
}

let discovery: ProviderDiscovery | undefined;

export function getProviderDiscovery(): ProviderDiscovery {
  if (discovery) return discovery;

  const adapters: ProviderDiscoveryAdapter[] = [new StaticProviderDiscoveryAdapter()];
  const endpoint = process.env.FLOWMINT_PROVIDER_DISCOVERY_URL;

  if (endpoint) {
    adapters.push(
      new HttpProviderDiscoveryAdapter({
        endpoint,
        apiKey: process.env.FLOWMINT_PROVIDER_DISCOVERY_API_KEY,
      }),
    );
  }

  discovery = new ProviderDiscovery(adapters);
  return discovery;
}
