# FlowMint Trust & Verification (M3)

This document is the reviewable artifact for M3. Its exit criterion is:
**a reviewer can understand why a payment was allowed, who authorized it,
where it went, and what happens on failure.** Each M3 task gets its own
section below, added in the order defined in `ROADMAP.md`, so the model
builds up without gaps.

## 1. Wallet Ownership

FlowMint has exactly two categories of wallet. Conflating them is the
single biggest trust failure this product could have, so the boundary is
enforced in code, not just in docs.

| | User / third-party wallet | FlowMint agent wallet |
|---|---|---|
| **Owner** | The user (or the service provider being paid) | FlowMint (operator) |
| **Custody** | Non-custodial — FlowMint never holds the key | Custodial to FlowMint — key held server-side via `FLOWMINT_PRIVATE_KEY` |
| **Address** | Varies per user/provider | Single registered address: `0x03a72b85e54519cd293A77eaa043cA5deeaC73F4` |
| **Funds it may spend** | Its own funds only | Its own funds only |
| **Role in a Flow** | Always the `payer` on any user-authorized payment | Never the `payer` on a user-authorized payment |
| **What it's used for today** | Authorizing and settling real Flow payments (e.g. `e2e.ts`) | FlowMint's own operational transactions — wallet/RPC preflight checks (`signer-preflight.ts`, `live-payment-preflight.ts`) |

### Invariants (enforced in `apps/agent/src/wallet/ownership.ts`)

1. **The agent wallet is never a user's payer or authorizer.**
   Enforced in `FlowMintAgent.authorize()` via `assertNotAgentWallet()`.
   If a `PaymentAuthorization.payer` ever equals the agent wallet address,
   the flow fails immediately rather than proceeding.

2. **Whoever signs a payment's on-chain execution must be the same
   address that was authorized as its payer.**
   Enforced in `CeloPayment.execute()` via `assertPayerIsSigner()`, checked
   *before* broadcasting. This is defense-in-depth ahead of the on-chain
   check `@flowmint/celo`'s `verify()` already performs after settlement
   (it confirms the `Transfer` event's `from` matches the claimed payer) —
   catching a mismatch here means failing fast instead of discovering it
   only after a real transaction has been broadcast and gas spent.

3. **When the agent wallet signs for itself, the derived signer must
   match the single registered address exactly.**
   Enforced via `assertIsAgentWallet()` in `signer-preflight.ts`,
   `live-payment-preflight.ts`, and referenced from `balance-check.ts`. A
   mismatch means either misconfiguration (wrong key loaded) or the key
   has been compromised/rotated without updating the registered address.

4. **FlowMint never requests, stores, or transmits a user's private key
   or seed phrase.** (Stated in `AGENT.md`.) No code path in this
   repository currently handles user key material at all — there is no
   user-wallet integration yet (that lands with the `apps/web` wallet
   connection, likely M4/M5). This is flagged here as an open item: when
   that integration is built, it must go through an injected
   provider/MiniPay signing flow, never a form field or API parameter
   that accepts a raw key.

### Evidence
`apps/agent/src/wallet-ownership-tests.ts` — 7 tests covering
classification, both assertion helpers, `authorize()` refusing the agent
wallet as payer, and `CeloPayment.execute()` refusing/allowing based on
signer-payer match. Run via `pnpm --filter @flowmint/agent test`.

<!-- Next section to add, per ROADMAP.md M3 order: 2. Agent Authority -->