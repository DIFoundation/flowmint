import type { Flow } from "../agent/types";
import type { FlowMintAgent } from "../agent/flowmint-agent";
import { CeloPayment, type AgentPaymentClients } from "./celo-payment";

export interface ExecuteFlowResult {
  flow: Flow;
  broadcastError?: string;
}

/**
 * Executes an already-authorized Flow for real:
 * submitPayment() -> broadcast + on-chain verify (CeloPayment) -> complete().
 *
 * This does not give the agent any new authority. `flow` must already be
 * `payment_pending` from a prior human `authorize()` call — this function
 * only carries out a payment someone already explicitly authorized. It
 * replaces what was previously hand-assembled, ad hoc choreography in
 * demo/test scripts with a single, reusable, tested path.
 *
 * If the broadcast/verification step itself throws (wallet-ownership
 * violation, RPC failure, on-chain verify() mismatch), the flow is
 * explicitly failed via `agent.failExecution()` rather than being left
 * stuck in "settling" — closing that failure mode from THREAT_MODEL.md
 * #9. A payment that broadcasts successfully but never confirms (neither
 * throws nor resolves) is a distinct, still-open gap: there is no
 * timeout/retry here, by design — that requires a decision about polling
 * strategy this function doesn't make on its own.
 */
export async function executeFlow(
  agent: FlowMintAgent,
  flow: Flow,
  celoPayment: CeloPayment,
  clients: AgentPaymentClients,
): Promise<ExecuteFlowResult> {
  const submitted = agent.submitPayment(flow);

  if (submitted.status !== "settling" || !submitted.payment) {
    // submitPayment() already failed the flow (wrong state, missing
    // quote, policy violation, recipient tampering, etc.) — nothing to
    // execute.
    return { flow: submitted };
  }

  try {
    const settlement = await celoPayment.execute(submitted.payment, clients);

    const completed = agent.complete(submitted, settlement);

    return { flow: completed };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "On-chain execution failed.";

    return {
      flow: agent.failExecution(submitted, message),
      broadcastError: message,
    };
  }
}