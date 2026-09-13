import "server-only";
import { createPublicClient, http } from "viem";
import { FLOWMINT_CHAIN } from "@flowmint/celo";

const CELO_RPC_URL = process.env.CELO_RPC_URL ?? "https://forno.celo.org";

export function createServerCeloPublicClient() {
  return createPublicClient({
    chain: FLOWMINT_CHAIN,
    transport: http(CELO_RPC_URL),
  });
}