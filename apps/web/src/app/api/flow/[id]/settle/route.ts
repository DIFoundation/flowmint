import type { PublicClient } from "viem";
import { getAgent, getFlow, saveFlow } from "@/lib/agent-server";
import { jsonResponse } from "@/lib/json-bigint";
import { recordEvent } from "@/lib/metrics-store";
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
    const verification = await executor.verify(
      body.txHash as `0x${string}`,
      {
        token: stablecoin,
        recipient: flow.payment.recipient,
        amount: flow.payment.amount,
      },
      flow.payment.payer,
      // Cast: viem's heavily-generic client types can structurally
      // diverge across separate workspace module-resolution contexts
      // even when the exact same viem version is pinned everywhere
      // (confirmed via `pnpm why viem` — single resolved version, not
      // a real duplicate-package bug). Safe here since verify() only
      // calls documented, version-stable PublicClient methods.
      publicClient as unknown as PublicClient,
    );

    const completed = agent.complete(flow, {
      txHash: body.txHash as `0x${string}`,
      confirmed: verification.confirmed,
      blockNumber: verification.blockNumber,
    });

    saveFlow(completed);

    if (completed.status === "completed") {
      recordEvent({
        type: "flow_completed",
        flowId: completed.id,
        address: flow.payment.payer,
      });
    } else {
      recordEvent({
        type: "flow_failed",
        flowId: completed.id,
        address: flow.payment.payer,
        stage: "settle",
        reason: completed.outcome?.error,
      });
    }

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

    recordEvent({
      type: "flow_failed",
      flowId: failed.id,
      address: flow.payment.payer,
      stage: "settle",
      reason: message,
    });

    return jsonResponse(
      { flowId: failed.id, status: failed.status, error: message },
      { status: 400 },
    );
  }
}
