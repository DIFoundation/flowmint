import { jsonResponse } from "@/lib/json-bigint";
import { getProviderDiscovery } from "@/lib/provider-discovery";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  const description =
    typeof (body as { description?: unknown })?.description === "string"
      ? (body as { description: string }).description.trim()
      : "";

  if (!description) {
    return jsonResponse({ error: "A service description is required." }, { status: 400 });
  }

  const budget = Number((body as { maxBudgetUsd?: unknown })?.maxBudgetUsd ?? 0);
  const intent = {
    description,
    ...(Number.isFinite(budget) && budget > 0
      ? { maxBudget: BigInt(Math.round(budget * 1_000_000)) }
      : {}),
  };

  try {
    const providers = await getProviderDiscovery().discover(intent);
    return jsonResponse({ providers });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Provider discovery failed." },
      { status: 502 },
    );
  }
}
