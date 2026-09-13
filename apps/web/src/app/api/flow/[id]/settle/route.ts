import { getAgent, getFlow, saveFlow } from "@/lib/agent-server";
import { jsonResponse } from "@/lib/json-bigint";
import { createServerCeloPublicClient } from "@/lib/celo-public-client";
import { resolveStablecoin, MainnetCeloPaymentExecutor } from "@flowmint/celo";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const flow = getFlow(params.id);

  if (!flow) {
    return jsonResponse({ error: "Flow not found." }, { status: 404 });
  }

  if (!flow.payment) {
    return jsonResponse(
      { error: "Flow has no submitted payment to settle." },
      { status: 400 },
    );
  }

  let body: { txHash?: string };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.txHash !== "string" || !body.txHash.startsWith("0x")) {
    return jsonResponse({ error: "A transaction hash is required." }, { status: 400 });
  }

  const stablecoin = resolveStablecoin(flow.payment.token);

  if (!stablecoin) {
    return jsonResponse(
      { error: "Payment token is not a recognized FlowMint stablecoin." },
      { status: 500 },
    );
  }

  const agent = getAgent();
  const executor = new MainnetCeloPaymentExecutor();
  const publicClient = createServerCeloPublicClient();

  try {
    const settlement = await executor.verify(
      body.txHash as `0x${string}`,
      {
        token: stablecoin,
        recipient: flow.payment.recipient,
        amount: flow.payment.amount,
      },
      flow.payment.payer,
      publicClient,
    );

    const completed = agent.complete(flow, settlement);

    saveFlow(completed);

    return jsonResponse({
      flowId: completed.id,
      status: completed.status,
      settlement: completed.settlement,
      outcome: completed.outcome,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "On-chain verification failed.";

    const failed = agent.failExecution(flow, message);

    saveFlow(failed);

    return jsonResponse(
      { flowId: failed.id, status: failed.status, error: message },
      { status: 400 },
    );
  }
}