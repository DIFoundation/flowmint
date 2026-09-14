import assert from "node:assert/strict";
import type { FlowIntent } from "../agent/types";
import { ServiceRegistry } from "../services/service-registry";
import {
  ProviderDiscovery,
  type DiscoveredProvider,
  type ProviderDiscoveryAdapter,
} from "./provider-discovery";

const intent: FlowIntent = {
  description: "Find a logo designer",
  constraints: { capability: "logo-design" },
};

const providers: DiscoveredProvider[] = [
  {
    id: "designer-a",
    name: "Designer A",
    description: "Logo design",
    serviceType: "design",
    provider: "0x1111111111111111111111111111111111111111",
    capabilities: ["logo-design"],
    amount: "2000000",
    currency: "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
    websiteUrl: "https://example.com/a",
    source: "web",
    verificationStatus: "verified",
  },
  {
    id: "designer-b",
    name: "Designer B",
    description: "Logo design",
    serviceType: "design",
    provider: "0x2222222222222222222222222222222222222222",
    capabilities: ["logo-design"],
    amount: "3000000",
    currency: "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
    websiteUrl: "https://example.com/b",
    source: "api",
    verificationStatus: "verified",
  },
];

const adapter: ProviderDiscoveryAdapter = {
  name: "test",
  async discover() {
    return providers;
  },
};

async function runTests() {
  const discovery = new ProviderDiscovery([adapter, adapter]);
  const registry = new ServiceRegistry();
  const discovered = await discovery.discoverAndRegister(intent, registry);

  assert.equal(discovered.length, 2);
  assert.equal(registry.list().length, 2);
  assert.equal(registry.get("designer-a")?.name, "Designer A");
  console.log("✅ provider discovery tests passed");
}

runTests();
