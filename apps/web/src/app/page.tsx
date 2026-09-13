"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserBalance } from "@/components/user-balance";
import { useFlowMint } from "@/lib/use-flow-mint";

const STABLECOIN_OPTIONS = ["USDC", "USDT", "USDm"] as const;

function formatAmount(raw: string, decimalsGuess = 6): string {
  // Reasonable display for both 6- and 18-decimal amounts without
  // needing the full CeloStablecoin metadata client-side.
  const asNumber = Number(raw) / 10 ** decimalsGuess;
  return Number.isFinite(asNumber) ? asNumber.toFixed(4) : raw;
}

export default function Home() {
  const { isConnected } = useAccount();
  const {
    stage,
    preview,
    error,
    txHash,
    submitIntent,
    approveEscalation,
    authorizeAndPay,
    reset,
  } = useFlowMint();

  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("3");
  const [currency, setCurrency] = useState<(typeof STABLECOIN_OPTIONS)[number]>("USDC");

  const busy =
    stage === "submitting" ||
    stage === "authorizing" ||
    stage === "waiting_for_wallet" ||
    stage === "settling";

  return (
    <main className="flex-1">
      <section className="py-12 lg:py-20">
        <div className="container px-4 mx-auto max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">
            FlowMint
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Tell it what you need. Review the price. Pay from your own wallet.
          </p>

          <UserBalance />

          {!isConnected && (
            <p className="text-center text-sm text-muted-foreground mb-6">
              Connect your wallet above to get started.
            </p>
          )}

          {stage === "idle" && isConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What do you need?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  rows={3}
                  placeholder="e.g. I need a simple logo designed for my business."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex items-center justify-between gap-4">
                  <label className="text-sm text-muted-foreground">
                    Budget (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="w-28 rounded-md border px-3 py-2 text-sm bg-background text-right"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!description.trim()}
                  onClick={() => submitIntent(description, Number(budget))}
                >
                  Find a match
                </Button>
              </CardContent>
            </Card>
          )}

          {stage === "submitting" && (
            <p className="text-center text-sm text-muted-foreground">
              Finding a match...
            </p>
          )}

          {stage === "awaiting_escalation" && preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This needs a quick review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {preview.escalationReasons.join(" ")}
                </p>
                <Button className="w-full" onClick={() => approveEscalation()}>
                  Approve and continue
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Demo note: this is a self-review step. A real deployment
                  needs an actual reviewer, not the requester approving
                  their own request.
                </p>
              </CardContent>
            </Card>
          )}

          {(stage === "quoted" ||
            stage === "authorizing" ||
            stage === "waiting_for_wallet" ||
            stage === "settling") &&
            preview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{preview.serviceName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-mono text-xs">
                      {preview.provider.slice(0, 6)}...{preview.provider.slice(-4)}
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Pay with</span>
                    <div className="grid grid-cols-3 gap-2">
                      {STABLECOIN_OPTIONS.map((symbol) => (
                        <button
                          key={symbol}
                          type="button"
                          disabled={busy}
                          onClick={() => setCurrency(symbol)}
                          className={`rounded-md border px-2 py-2 text-sm ${
                            currency === symbol
                              ? "border-primary bg-primary/10 font-medium"
                              : "border-input"
                          }`}
                        >
                          <div>{symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatAmount(
                              preview.equivalentAmounts[symbol] ?? "0",
                              symbol === "USDm" ? 18 : 6,
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={() => authorizeAndPay(currency)}
                  >
                    {stage === "waiting_for_wallet"
                      ? "Confirm in your wallet..."
                      : stage === "settling"
                        ? "Verifying on-chain..."
                        : stage === "authorizing"
                          ? "Authorizing..."
                          : `Pay ${formatAmount(
                              preview.equivalentAmounts[currency] ?? "0",
                              currency === "USDm" ? 18 : 6,
                            )} ${currency}`}
                  </Button>
                </CardContent>
              </Card>
            )}

          {stage === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">Paid ✅</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-center">
                {txHash && (
                  <a
                    href={`https://celoscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline break-all"
                  >
                    View transaction on CeloScan
                  </a>
                )}
                <Button variant="outline" className="w-full" onClick={reset}>
                  Start another
                </Button>
              </CardContent>
            </Card>
          )}

          {stage === "failed" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">
                  Couldn&apos;t complete that
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" className="w-full" onClick={reset}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
