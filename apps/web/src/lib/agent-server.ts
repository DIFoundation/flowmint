import "server-only";
import {
  FlowMintAgent,
  ServiceRegistry,
  MockServiceProvider,
  type Flow,
  type Service,
} from "@flowmint/agent";
import { FLOWMINT_STABLECOIN_ADDRESSES, CELO_STABLECOINS } from "@flowmint/celo";

/**
 * NOTE on persistence: this Map is process-local, in-memory state. That's
 * fine for local dev + the ngrok tunnel this is currently tested through
 * (a single long-lived Node process), but it will NOT survive across
 * Vercel serverless cold starts or multiple concurrent instances once
 * this is actually deployed there. This is the same gap TRUST.md §7
 * already flags for the audit trail — a Flow's evidence and state need a
 * real datastore before this runs on Vercel for real. Tracked here so it
 * isn't quietly forgotten when deployment target changes.
 */
const flows = new Map<string, Flow>();

function buildRegistry(): ServiceRegistry {
  const registry = new ServiceRegistry();

  const basicDesign: Service = {
    id: "design-basic",
    name: "Basic Logo Design",
    description: "Simple logo design for small businesses.",
    provider: "0x1111111111111111111111111111111111111111",
    capabilities: ["design"],
    status: "available",
    pricing: {
      currency: CELO_STABLECOINS.USDC.address,
      amount: 2_000n, // 0.002 USDC
    },
    active: true,
  };

  registry.register(basicDesign);

  return registry;
}

let agentInstance: FlowMintAgent | undefined;

export function getAgent(): FlowMintAgent {
  if (!agentInstance) {
    agentInstance = new FlowMintAgent({
      registry: buildRegistry(),
      paymentPolicy: {
        maxPayment: 10_000_000n,
        allowedCurrencies: FLOWMINT_STABLECOIN_ADDRESSES,
      },
      serviceProvider: new MockServiceProvider(),
    });
  }

  return agentInstance;
}

export function saveFlow(flow: Flow): void {
  flows.set(flow.id, flow);
}

export function getFlow(id: string): Flow | undefined {
  return flows.get(id);
}