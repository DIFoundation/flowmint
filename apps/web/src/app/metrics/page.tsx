"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageSummary {
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
  events: Array<{
    type: string;
    flowId: string;
    address?: string;
    timestamp: number;
    stage?: string;
    reason?: string;
  }>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default function MetricsPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  const [data, setData] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = key ? `/api/metrics?key=${encodeURIComponent(key)}` : "/api/metrics";

    fetch(url)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed to load metrics.");
        setData(body);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load metrics."));
  }, [key]);

  return (
    <main className="flex-1">
      <div className="container px-4 mx-auto max-w-2xl py-10 space-y-6">
        <h1 className="text-2xl font-bold">M6 Usage</h1>

        {error && (
          <p className="text-sm text-destructive">
            {error} {!key && "— try adding ?key=YOUR_METRICS_ACCESS_KEY to the URL."}
          </p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Distinct users" value={data.distinctUsers} />
              <Stat label="Returning users" value={data.returningUsers} />
              <Stat label="Distinct signers" value={data.distinctSigners} />
              <Stat label="Genuine transactions" value={data.genuineTransactions} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funnel</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Stat label="Created" value={data.flowsCreated} />
                <Stat label="Escalated" value={data.flowsEscalated} />
                <Stat label="Authorized" value={data.flowsAuthorized} />
                <Stat label="Completed" value={data.flowsCompleted} />
                <Stat label="Failed" value={data.flowsFailed} />
                <Stat label="Abandoned (stuck)" value={data.flowsAbandoned} />
              </CardContent>
            </Card>

            {Object.keys(data.failuresByStage).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Failures by stage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {Object.entries(data.failuresByStage).map(([stage, count]) => (
                    <div key={stage} className="flex justify-between">
                      <span className="text-muted-foreground">{stage}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs font-mono max-h-96 overflow-y-auto">
                {[...data.events]
                  .reverse()
                  .slice(0, 100)
                  .map((event, i) => (
                    <div key={i} className="border-b pb-1">
                      {new Date(event.timestamp).toISOString()} — {event.type}
                      {event.address ? ` — ${event.address.slice(0, 8)}...` : ""}
                      {event.reason ? ` — ${event.reason}` : ""}
                    </div>
                  ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}