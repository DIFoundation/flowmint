import {
  createFlowMintAccount,
} from "./flowmint-wallet";

import {
  createCeloPublicClient,
  assertCeloMainnet,
} from "./celo-client";

const EXPECTED_FLOWMINT_WALLET =
  "0x03a72b85e54519cd293A77eaa043cA5deeaC73F4";

async function main() {
  const client = createCeloPublicClient();

  await assertCeloMainnet(client);

  const account = createFlowMintAccount();

  console.log("🔥 FlowMint signer preflight");
  console.log("Chain ID:", await client.getChainId());
  console.log("Derived address:", account.address);
  console.log(
    "Expected address:",
    EXPECTED_FLOWMINT_WALLET,
  );

  if (
    account.address.toLowerCase() !==
    EXPECTED_FLOWMINT_WALLET.toLowerCase()
  ) {
    throw new Error(
      "Signer address does not match the FlowMint agent wallet.",
    );
  }

  console.log("Signer:", account.address);
  console.log("STATUS: FLOWMINT SIGNER VERIFIED");
}

main().catch((error) => {
  console.error("❌ Signer preflight failed:");
  console.error(error);
  process.exit(1);
});