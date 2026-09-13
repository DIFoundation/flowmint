"use client";

import { useState, useCallback } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { resolveStablecoin, encodeAttributedStablecoinTransfer } from "@flowmint/celo";

export interface PreviewData {
  flowId: string;
  serviceId: string;
  serviceName: string;
  provider: `0x${string}`;
  amount: string;
  currency: `0x${string}`;
  equivalentAmounts: Record<string, string>;
  escalationRequired: boolean;
  escalationReasons: string[];
}

export type FlowStage =
  | "idle"
  | "submitting"
  | "quoted"
  | "awaiting_escalation"
  | "authorizing"
  | "waiting_for_wallet"
  | "settling"
  | "completed"
  | "failed";

export function useFlowMint() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  const [stage, setStage] = useState<FlowStage>("idle");
  const [flowId, setFlowId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStage("idle");
    setFlowId(null);
    setPreview(null);
    setError(null);
    setTxHash(null);
    setOutcome(null);
  }, []);

  const submitIntent = useCallback(
    async (description: string, maxBudgetUsd: number) => {
      setStage("submitting");
      setError(null);

      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          maxBudget: String(Math.round(maxBudgetUsd * 1_000_000)),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Could not process that request.");
        setStage("failed");
        return;
      }

      setFlowId(data.flowId);
      setPreview(data.preview);

      if (data.escalation?.required) {
        setStage("awaiting_escalation");
      } else if (data.stage === "awaiting_authorization") {
        setStage("quoted");
      } else {
        setError(data.error ?? "This request couldn't be matched to a service.");
        setStage("failed");
      }
    },
    [],
  );

  const approveEscalation = useCallback(async () => {
    if (!flowId) return;

    const res = await fetch(`/api/flow/${flowId}/escalation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });

    const data = await res.json();

    if (!res.ok || data.status !== "awaiting_authorization") {
      setError(data.error ?? "Escalation could not be approved.");
      setStage("failed");
      return;
    }

    setStage("quoted");
  }, [flowId]);

  const authorizeAndPay = useCallback(
    async (settlementCurrency: string) => {
      if (!flowId || !address) return;

      setStage("authorizing");
      setError(null);

      const authRes = await fetch(`/api/flow/${flowId}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payer: address, settlementCurrency }),
      });

      const authData = await authRes.json();

      if (!authRes.ok || authData.error || !authData.payment) {
        setError(authData.error ?? "Authorization failed.");
        setStage("failed");
        return;
      }

      const stablecoin = resolveStablecoin(authData.payment.token);

      if (!stablecoin) {
        setError("Server returned an unrecognized settlement currency.");
        setStage("failed");
        return;
      }

      setStage("waiting_for_wallet");

      let hash: `0x${string}`;

      try {
        const data = encodeAttributedStablecoinTransfer({
          token: stablecoin,
          recipient: authData.payment.recipient,
          amount: BigInt(authData.payment.amount),
        });

        hash = await sendTransactionAsync({
          to: stablecoin.address,
          data,
        });
      } catch (walletError) {
        setError(
          walletError instanceof Error
            ? walletError.message
            : "The wallet rejected or failed to send the transaction.",
        );
        setStage("failed");
        return;
      }

      setTxHash(hash);
      setStage("settling");

      const settleRes = await fetch(`/api/flow/${flowId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash }),
      });

      const settleData = await settleRes.json();

      if (!settleRes.ok || settleData.status !== "completed") {
        setError(settleData.error ?? "Settlement could not be verified.");
        setStage("failed");
        return;
      }

      setOutcome(JSON.stringify(settleData.outcome));
      setStage("completed");
    },
    [flowId, address, sendTransactionAsync],
  );

  return {
    stage,
    preview,
    error,
    txHash,
    outcome,
    submitIntent,
    approveEscalation,
    authorizeAndPay,
    reset,
  };
}