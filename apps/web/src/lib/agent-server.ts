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
 *
 * The globalThis anchor below is NOT about that Vercel gap — it's a
 * separate, more immediate fix: Next.js's dev-mode compiler can
 * re-instantiate route modules independently (confirmed by testing —
 * a flow created via POST /api/flow was not visible to a different
 * route file's plain module-level Map moments later, in the SAME dev
 * server process). Anchoring to globalThis survives that.
 */
declare global {
  // eslint-disable-next-line no-var
  var __flowmintAgent: FlowMintAgent | undefined;
  // eslint-disable-next-line no-var
  var __flowmintFlows: Map<string, Flow> | undefined;
}

function getFlowStore(): Map<string, Flow> {
  if (!globalThis.__flowmintFlows) {
    globalThis.__flowmintFlows = new Map<string, Flow>();
  }

  return globalThis.__flowmintFlows;
}

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
      amount: 2_000_000n, // 2 USDC
    },
    active: true,
  };

  registry.register(basicDesign);

  return registry;
}

let agentInstance: FlowMintAgent | undefined;

export function getAgent(): FlowMintAgent {
  if (!globalThis.__flowmintAgent) {
    globalThis.__flowmintAgent = new FlowMintAgent({
      registry: buildRegistry(),
      paymentPolicy: {
        maxPayment: 10_000_000n,
        allowedCurrencies: FLOWMINT_STABLECOIN_ADDRESSES,
      },
      serviceProvider: new MockServiceProvider(),
    });
  }

  return globalThis.__flowmintAgent;
}

export function saveFlow(flow: Flow): void {
  getFlowStore().set(flow.id, flow);
}

export function getFlow(id: string): Flow | undefined {
  return getFlowStore().get(id);
}