import { getAgent, getFlow, saveFlow } from "@/lib/agent-server";
import { jsonResponse } from "@/lib/json-bigint";
import { resolveStablecoin, convertStablecoinAmount } from "@flowmint/celo";

interface AuthorizeBody {
  payer?: string;
  settlementCurrency?: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const flow = getFlow(params.id);

  if (!flow) {
    return jsonResponse({ error: "Flow not found." }, { status: 404 });
  }

  if (!flow.quote) {
    return jsonResponse(
      { error: "Flow has no quote to authorize yet." },
      { status: 400 },
    );
  }

  let body: AuthorizeBody;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.payer !== "string" || !body.payer.startsWith("0x")) {
    return jsonResponse(
      { error: "A connected wallet address (payer) is required." },
      { status: 400 },
    );
  }

  const nativeCoin = resolveStablecoin(flow.quote.currency);

  if (!nativeCoin) {
    return jsonResponse(
      { error: "Quote currency is not a recognized FlowMint stablecoin." },
      { status: 500 },
    );
  }

  const settlementCoin = body.settlementCurrency
    ? resolveStablecoin(body.settlementCurrency)
    : nativeCoin;

  if (!settlementCoin) {
    return jsonResponse(
      { error: `Unsupported stablecoin requested: ${body.settlementCurrency}` },
      { status: 400 },
    );
  }

  const authorizedAmount = convertStablecoinAmount(
    flow.quote.amount,
    nativeCoin,
    settlementCoin,
  );

  const agent = getAgent();

  const authorized = agent.authorize(flow, {
    payer: body.payer as `0x${string}`,
    authorizedAmount,
    authorizedToken: settlementCoin.address,
    authorizedRecipient: flow.quote.provider,
    authorizedAt: Date.now(),
  });

  const result =
    authorized.status === "payment_pending"
      ? agent.submitPayment(authorized)
      : authorized;

  saveFlow(result);

  return jsonResponse({
    flowId: result.id,
    status: result.status,
    payment: result.payment,
    error: result.outcome?.error,
  });
}