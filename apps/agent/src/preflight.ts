import {
  createCeloPublicClient,
  assertCeloMainnet,
  CELO_RPC_URL,
} from "./runtime/celo-client";

async function main() {
  const client = createCeloPublicClient();

  await assertCeloMainnet(client);

  const blockNumber = await client.getBlockNumber();

  console.log("🔥 FlowMint Celo preflight");
  console.log("RPC:", CELO_RPC_URL);
  console.log("Chain ID:", await client.getChainId());
  console.log("Latest block:", blockNumber.toString());
  console.log("STATUS: CELO MAINNET CONNECTION OK");
}

main().catch((error) => {
  console.error("❌ Celo preflight failed:");
  console.error(error);
  process.exit(1);
});
