import "dotenv/config";

import {
  createWalletClient,
  http,
  type Account,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

import { CELO_RPC_URL } from "./celo-client";

const FLOWMINT_PRIVATE_KEY =
  process.env.FLOWMINT_PRIVATE_KEY;

if (!FLOWMINT_PRIVATE_KEY) {
  throw new Error(
    "FLOWMINT_PRIVATE_KEY is not configured.",
  );
}

if (!/^0x[a-fA-F0-9]{64}$/.test(FLOWMINT_PRIVATE_KEY)) {
  throw new Error(
    "FLOWMINT_PRIVATE_KEY must be a 32-byte hex private key.",
  );
}

export function createFlowMintAccount(): Account {
  return privateKeyToAccount(
    FLOWMINT_PRIVATE_KEY as `0x${string}`,
  );
}

export function createFlowMintWalletClient(): WalletClient {
  return createWalletClient({
    account: createFlowMintAccount(),
    chain: celo,
    transport: http(CELO_RPC_URL),
  });
}