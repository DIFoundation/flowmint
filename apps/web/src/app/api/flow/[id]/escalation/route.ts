import { getAgent, getFlow, saveFlow } from "@/lib/agent-server";
import { jsonResponse } from "@/lib/json-bigint";
import { recordEvent } from "@/lib/metrics-store";

/**
 * NOTE: there is no real reviewer authentication here — this lets
 * whoever is using the demo UI resolve their own escalation, which is
 * fine for testing the flow end-to-end but is not a real human-review
 * gate. A real deployment needs an actual reviewer role before this
 * endpoint means anything as a trust boundary.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const flow = getFlow(params.id);

  if (!flow) {
    return jsonResponse({ error: "Flow not found." }, { status: 404 });
  }

  let body: { approved?: boolean; note?: string };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  const agent = getAgent();

  const resolved = agent.resolveEscalation(flow, {
    approved: Boolean(body.approved),
    reviewer: "demo-ui-self-review",
    note: body.note,
  });

  saveFlow(resolved);

  if (resolved.status === "failed") {
    recordEvent({
      type: "flow_failed",
      flowId: resolved.id,
      stage: "escalation",
      reason: resolved.outcome?.error,
    });
  }

  return jsonResponse({
    flowId: resolved.id,
    status: resolved.status,
    error: resolved.outcome?.error,
  });
}