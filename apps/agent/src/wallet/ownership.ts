/**
 * Wallet Ownership (M3)
 *
 * FlowMint has exactly two categories of wallet:
 *
 * 1. User / third-party wallets — non-custodial. FlowMint never holds
 *    their keys and never signs on their behalf. When a Flow's payment
 *    is authorized, the address that authorized it must be the same
 *    address that signs the on-chain transfer.
 *
 * 2. The FlowMint agent wallet — a single, registered, service-operated
 *    wallet (private key held server-side via FLOWMINT_PRIVATE_KEY). It
 *    spends only its own funds for FlowMint's own operational purposes
 *    (e.g. preflight checks). It must never appear as the payer/signer
 *    of a user-authorized Flow.
 *
 * This module is the single source of truth for the agent wallet's
 * address, so it is defined once instead of re-typed as a string
 * literal in every runtime script (which is how it existed before this
 * module: duplicated across balance-check.ts, signer-preflight.ts, and
 * several docs).
 */

export const FLOWMINT_AGENT_WALLET_ADDRESS: `0x${string}` =
  "0x03a72b85e54519cd293A77eaa043cA5deeaC73F4";

export type WalletOwner = "flowmint_agent" | "user_or_third_party";

export function classifyWallet(address: `0x${string}`): WalletOwner {
  return address.toLowerCase() === FLOWMINT_AGENT_WALLET_ADDRESS.toLowerCase()
    ? "flowmint_agent"
    : "user_or_third_party";
}

export class WalletOwnershipViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletOwnershipViolation";
  }
}

/**
 * Invariant: the FlowMint agent wallet must never act as a user's payer
 * or authorizer. If this fires, something upstream has conflated the
 * agent's own custody with a user's payment authorization.
 */
export function assertNotAgentWallet(
  address: `0x${string}`,
  context: string,
): void {
  if (classifyWallet(address) === "flowmint_agent") {
    throw new WalletOwnershipViolation(
      `Wallet-ownership violation in ${context}: the FlowMint agent wallet ` +
        `(${FLOWMINT_AGENT_WALLET_ADDRESS}) cannot act as a user's payer or authorizer.`,
    );
  }
}

/**
 * Invariant: when the agent wallet itself signs and broadcasts a
 * transaction (spending its own funds), the derived signer must match
 * the single registered agent wallet address exactly. A mismatch means
 * either misconfiguration (wrong key loaded) or key compromise.
 */
export function assertIsAgentWallet(
  address: `0x${string}`,
  context: string,
): void {
  if (classifyWallet(address) !== "flowmint_agent") {
    throw new WalletOwnershipViolation(
      `Wallet-ownership violation in ${context}: expected the FlowMint agent ` +
        `wallet (${FLOWMINT_AGENT_WALLET_ADDRESS}), got ${address}.`,
    );
  }
}

/**
 * Invariant: whoever signs a payment's on-chain execution must be the
 * same address that was authorized as its payer. This is the core
 * wallet-ownership boundary for settlement — it is what stops the
 * agent wallet from ever silently signing on behalf of a user, and
 * catches wallet-client wiring bugs before gas is spent, rather than
 * discovering the mismatch only after broadcasting (which is where the
 * on-chain `verify()` check in @flowmint/celo would otherwise catch it).
 */
export function assertPayerIsSigner(
  payer: `0x${string}`,
  signer: `0x${string}`,
  context: string,
): void {
  if (payer.toLowerCase() !== signer.toLowerCase()) {
    throw new WalletOwnershipViolation(
      `Wallet-ownership violation in ${context}: payment payer (${payer}) ` +
        `does not match the signing wallet (${signer}).`,
    );
  }
}