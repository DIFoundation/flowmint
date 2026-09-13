import { getAgent, saveFlow } from "@/lib/agent-server";
import { jsonResponse } from "@/lib/json-bigint";
import { buildPaymentPreview } from "@flowmint/agent";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  const agent = getAgent();
  const result = agent.startFromUnknown(body);

  if (result.stage === "rejected") {
    return jsonResponse({ error: result.error }, { status: 400 });
  }

  saveFlow(result.flow);

  return jsonResponse({
    flowId: result.flow.id,
    stage: result.stage,
    status: result.flow.status,
    preview: buildPaymentPreview(result.flow),
    escalation: result.flow.escalation,
    error: result.flow.outcome?.error,
  });
}