import "dotenv/config";
import {
  createPublicClient,
  http,
} from "viem";
import { celo } from "viem/chains";

export const CELO_RPC_URL = process.env.CELO_RPC_URL ?? "https://forno.celo.org";

export function createCeloPublicClient() {
  return createPublicClient({
    chain: celo,
    transport: http(CELO_RPC_URL),
  });
}

export async function assertCeloMainnet(
  client: ReturnType<typeof createCeloPublicClient>,
): Promise<void> {
  const chainId = await client.getChainId();

  if (chainId !== 42220) {
    throw new Error(
      `Expected Celo mainnet (42220), received ${chainId}.`,
    );
  }
}
