import "server-only";

export type UsageEventType =
  | "flow_created"
  | "flow_escalated"
  | "flow_authorized"
  | "flow_completed"
  | "flow_failed";

export interface UsageEvent {
  type: UsageEventType;
  flowId: string;
  address?: `0x${string}`;
  timestamp: number;
  stage?: string;
  reason?: string;
}

/**
 * Storage interface kept separate from the recording/query logic on
 * purpose: the in-memory implementation below is the same documented
 * gap as apps/web/src/lib/agent-server.ts (won't survive Vercel
 * serverless cold starts or multiple instances). Once a real datastore
 * is chosen, only this interface needs a new implementation — the event
 * schema and the metrics computed from it don't change.
 */
export interface MetricsStore {
  record(event: UsageEvent): void;
  all(): UsageEvent[];
}

declare global {
  // eslint-disable-next-line no-var
  var __flowmintMetrics: UsageEvent[] | undefined;
}

class InMemoryMetricsStore implements MetricsStore {
  private events(): UsageEvent[] {
    if (!globalThis.__flowmintMetrics) {
      globalThis.__flowmintMetrics = [];
    }

    return globalThis.__flowmintMetrics;
  }

  record(event: UsageEvent): void {
    this.events().push(event);
  }

  all(): UsageEvent[] {
    return this.events();
  }
}

let store: MetricsStore | undefined;

export function getMetricsStore(): MetricsStore {
  if (!store) {
    store = new InMemoryMetricsStore();
  }

  return store;
}

export function recordEvent(event: Omit<UsageEvent, "timestamp">): void {
  getMetricsStore().record({ ...event, timestamp: Date.now() });
}

function dayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export interface UsageSummary {
  distinctUsers: number;
  returningUsers: number;
  distinctSigners: number;
  genuineTransactions: number;
  flowsCreated: number;
  flowsEscalated: number;
  flowsAuthorized: number;
  flowsCompleted: number;
  flowsFailed: number;
  flowsAbandoned: number;
  failuresByStage: Record<string, number>;
  events: UsageEvent[];
}

/**
 * Computes every metric on read from the raw event log rather than
 * maintaining separate running counters. At demo scale this is simpler
 * and can't drift from the underlying events; revisit if event volume
 * ever makes recomputing on every request too slow.
 */
export function summarizeUsage(): UsageSummary {
  const events = getMetricsStore().all();

  const usersByAddress = new Map<string, Set<string>>(); // address -> set of day keys
  const signers = new Set<string>();
  const flowStatus = new Map<string, "created" | "authorized" | "completed" | "failed">();
  const failuresByStage: Record<string, number> = {};

  let flowsCreated = 0;
  let flowsEscalated = 0;
  let flowsAuthorized = 0;
  let flowsCompleted = 0;
  let flowsFailed = 0;

  for (const event of events) {
    if (event.address) {
      const addr = event.address.toLowerCase();
      const days = usersByAddress.get(addr) ?? new Set<string>();
      days.add(dayKey(event.timestamp));
      usersByAddress.set(addr, days);
    }

    switch (event.type) {
      case "flow_created":
        flowsCreated += 1;
        flowStatus.set(event.flowId, "created");
        break;
      case "flow_escalated":
        flowsEscalated += 1;
        break;
      case "flow_authorized":
        flowsAuthorized += 1;
        flowStatus.set(event.flowId, "authorized");
        if (event.address) {
          signers.add(event.address.toLowerCase());
        }
        break;
      case "flow_completed":
        flowsCompleted += 1;
        flowStatus.set(event.flowId, "completed");
        break;
      case "flow_failed":
        flowsFailed += 1;
        flowStatus.set(event.flowId, "failed");
        if (event.stage) {
          failuresByStage[event.stage] = (failuresByStage[event.stage] ?? 0) + 1;
        }
        break;
    }
  }

  let flowsAbandoned = 0;
  for (const status of flowStatus.values()) {
    if (status === "created" || status === "authorized") {
      flowsAbandoned += 1;
    }
  }

  let returningUsers = 0;
  for (const days of usersByAddress.values()) {
    if (days.size > 1) {
      returningUsers += 1;
    }
  }

  return {
    distinctUsers: usersByAddress.size,
    returningUsers,
    distinctSigners: signers.size,
    genuineTransactions: flowsCompleted,
    flowsCreated,
    flowsEscalated,
    flowsAuthorized,
    flowsCompleted,
    flowsFailed,
    flowsAbandoned,
    failuresByStage,
    events,
  };
}