import { jsonResponse } from "@/lib/json-bigint";
import { summarizeUsage } from "@/lib/metrics-store";

// Must never be statically prerendered — this reads live process state.
// Confirmed necessary: `next build` marked this route static (○) without
// this, which would have frozen every response at whatever the build-time
// snapshot happened to be.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accessKey = process.env.METRICS_ACCESS_KEY;

  if (accessKey) {
    const provided = new URL(request.url).searchParams.get("key");

    if (provided !== accessKey) {
      return jsonResponse({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const summary = summarizeUsage();

  return jsonResponse(summary);
}