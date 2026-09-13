import { getFlow } from "@/lib/agent-server";
import { jsonResponse } from "@/lib/json-bigint";
import { buildPaymentPreview } from "@flowmint/agent";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const flow = getFlow(params.id);

  if (!flow) {
    return jsonResponse({ error: "Flow not found." }, { status: 404 });
  }

  return jsonResponse({
    flowId: flow.id,
    status: flow.status,
    preview: buildPaymentPreview(flow),
    payment: flow.payment,
    settlement: flow.settlement,
    outcome: flow.outcome,
    escalation: flow.escalation,
  });
}