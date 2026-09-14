import { getAgent, saveFlow } from "@/lib/agent-server";
import { jsonResponse } from "@/lib/json-bigint";
import { recordEvent } from "@/lib/metrics-store";
import { buildPaymentPreview } from "@flowmint/agent";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Read separately from the untrusted body the agent validates itself —
  // this is only used for usage measurement, never for anything
  // trust-boundary-relevant.
  const address =
    typeof (body as { address?: unknown })?.address === "string"
      ? ((body as { address: string }).address as `0x${string}`)
      : undefined;

  const agent = getAgent();
  const result = agent.startFromUnknown(body);

  if (result.stage === "rejected") {
    return jsonResponse({ error: result.error }, { status: 400 });
  }

  saveFlow(result.flow);

  recordEvent({ type: "flow_created", flowId: result.flow.id, address });

  if (result.flow.escalation?.required) {
    recordEvent({ type: "flow_escalated", flowId: result.flow.id, address });
  }

  if (result.flow.status === "failed") {
    recordEvent({
      type: "flow_failed",
      flowId: result.flow.id,
      address,
      stage: "created",
      reason: result.flow.outcome?.error,
    });
  }

  return jsonResponse({
    flowId: result.flow.id,
    stage: result.stage,
    status: result.flow.status,
    preview: buildPaymentPreview(result.flow),
    escalation: result.flow.escalation,
    error: result.flow.outcome?.error,
  });
}
