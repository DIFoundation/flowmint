import {
  createFlowMintAccount,
} from "./flowmint-wallet";

import {
  createCeloPublicClient,
  assertCeloMainnet,
} from "./celo-client";

import {
  FLOWMINT_AGENT_WALLET_ADDRESS,
  assertIsAgentWallet,
} from "../wallet/ownership";

async function main() {
  const client = createCeloPublicClient();

  await assertCeloMainnet(client);

  const account = createFlowMintAccount();

  console.log("🔥 FlowMint signer preflight");
  console.log("Chain ID:", await client.getChainId());
  console.log("Derived address:", account.address);
  console.log(
    "Expected address:",
    FLOWMINT_AGENT_WALLET_ADDRESS,
  );

  assertIsAgentWallet(
    account.address as `0x${string}`,
    "signer-preflight",
  );

  console.log("Signer:", account.address);
  console.log("STATUS: FLOWMINT SIGNER VERIFIED");
}

main().catch((error) => {
  console.error("❌ Signer preflight failed:");
  console.error(error);
  process.exit(1);
});