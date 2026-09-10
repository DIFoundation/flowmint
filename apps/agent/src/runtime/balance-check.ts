import {
  createCeloPublicClient,
  assertCeloMainnet,
} from "./celo-client";

import { CELO_STABLECOINS } from "@flowmint/celo";
import { formatUnits } from "viem";
import { FLOWMINT_AGENT_WALLET_ADDRESS } from "../wallet/ownership";

const FLOWMINT_WALLET = FLOWMINT_AGENT_WALLET_ADDRESS;

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
    ],
    outputs: [
      { name: "balance", type: "uint256" },
    ],
  },
] as const;

async function main() {
  const client = createCeloPublicClient();

  await assertCeloMainnet(client);

  console.log("🔥 FlowMint wallet preflight");
  console.log("Wallet:", FLOWMINT_WALLET);
  console.log("Chain:", await client.getChainId());
  console.log(
    "Native CELO:",
    formatUnits(
      await client.getBalance({
        address: FLOWMINT_WALLET,
      }),
      18,
    ),
  );

  for (const token of Object.values(CELO_STABLECOINS)) {
    const balance = await client.readContract({
      address: token.address,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [FLOWMINT_WALLET],
    });

    console.log(
      `${token.symbol}:`,
      formatUnits(balance, token.decimals),
    );
  }

  console.log("STATUS: WALLET READ SUCCESS");
}

main().catch((error) => {
  console.error("❌ Balance check failed:");
  console.error(error);
  process.exit(1);
});
