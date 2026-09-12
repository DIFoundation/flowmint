# FlowMint Decision Log

Important product/architecture decisions. Do not casually reverse them.

## 001 — Product name
**Decision:** FlowMint  
**Reason:** Brandable and broad enough for future economic flows without locking the product to one payment feature.

## 002 — Primary track
**Decision:** Real World Adoption  
**Reason:** Optimize around genuine users, repeat use and distinct signers/authorisers.

## 003 — Product thesis
**Decision:** Autonomous economic execution.  
**Reason:** The agent must provide meaningful decision-making/orchestration in a real payment workflow.

## 004 — Not an Aigora-style marketplace
**Decision:** FlowMint must not become a generic agent/service marketplace.  
**Reason:** Differentiation is the economic execution workflow, not merely connecting users to agents/services.

## 005 — MiniPay-first distribution
**Decision:** MiniPay is a primary distribution surface.  
**Reason:** It provides a direct mobile channel aligned with Celo's everyday-payment direction.

## 006 — Non-custodial user wallet
**Decision:** Users retain wallet control.  
**Reason:** Security, trust and clear authorization boundaries.

## 007 — Registered agent wallet
**Decision:** `0x03a72b85e54519cd293A77eaa043cA5deeaC73F4`  
**Reason:** Registered with Celo Builders for attribution/tracking.

## 008 — ERC-8004
**Decision:** Agent identity is ERC-8004 #9793.  
**URL:** `https://8004scan.io/agents/celo/9793`

## 009 — Attribution
**Decision:** `celo_c81681d9bae5`  
**Reason:** Assigned by Celo Builders and required for counted attribution.

## 010 — Mainnet evidence
**Decision:** Hackathon evidence uses Celo mainnet.  
**Reason:** Supplied hackathon rules state testnet activity counts for nothing.

## 011 — Real users over farming
**Decision:** Never optimize around artificial volume or builder-controlled users.  
**Reason:** Explicit hackathon independence/anti-farming rules.

## 012 — Smart contracts only when necessary
**Decision:** Do not deploy contracts for optics.  
**Reason:** Complexity adds security risk.

## 013 — Stablecoin-first
**Decision:** Stablecoins are the primary payment rail.  
**Reason:** Practical economic activity requires predictable payment value.

## 014 — M1→M8 scope control
**Decision:** Roadmap controls product scope.  
**Reason:** Prevent feature drift and preserve execution speed.

## 015 — Escalation as a distinct third path
**Decision:** The agent's decision layer can escalate a flow for human review, separate from refuse/proceed. Triggers: quote ≥80% of the agent's spending limit, intent description <8 chars, no user-specified budget on a quote ≥3,000,000 (base units), or a tied top-ranked service candidate. An escalated flow can only reach authorization via `resolveEscalation()`; it cannot be authorized directly.
**Reason:** `docs/AGENT.md` requires refusal conditions *and* escalation conditions as distinct agent rules. Without escalation, the decision layer only had two outcomes (refuse or proceed), so genuinely ambiguous or high-risk requests were either silently auto-approved for authorization or incorrectly auto-refused.
**Alternatives:** Route ambiguous cases through refusal (rejected — throws away legitimate requests that just need clarification/oversight, not denial).
**Impact:** `apps/agent/src/policies/escalation-policy.ts`, `agent/flowmint-agent.ts`, `agent/types.ts`. Thresholds are policy-configurable and will need tuning once real usage data exists (M6).

## 016 — Runtime validation at the agent boundary
**Decision:** Add `validateFlowIntent()` / `agent.startFromUnknown()` as a hardened entry point that validates untrusted input (HTTP bodies, LLM tool-call arguments) before any `Flow` is created, rejecting non-object payloads, forbidden keys (`__proto__`, `constructor`, `prototype`), malformed budgets, and oversized fields.
**Reason:** `FlowIntent` was previously a TypeScript interface only — compile-time safety, no runtime protection. Once `apps/web` calls the agent over an API boundary, TypeScript types provide zero protection against malformed or adversarial JSON.
**Alternatives:** Add a schema library (zod). Deferred — the validation surface is currently small enough that a hand-written guard avoids a new dependency; revisit if the schema grows materially.
**Impact:** `apps/agent/src/agent/validate-intent.ts`. `agent.start()` (the pre-existing typed entry point) is unchanged and still used internally/in tests.

## 017 — Wallet ownership as a code-enforced invariant
**Decision:** FlowMint's agent wallet (`0x03a72b85e54519cd293A77eaa043cA5deeaC73F4`) and user/third-party wallets are formally distinct, with the boundary enforced in code (`apps/agent/src/wallet/ownership.ts`), not just documented: (1) the agent wallet can never be a user's payer/authorizer, (2) a payment's signer must match its declared payer, checked before broadcasting, (3) when the agent wallet signs for itself, the derived address must match the registered address exactly.
**Reason:** `ARCHITECTURE.md` already stated "do not assume the agent has unrestricted control over user funds — define authority in M3," but nothing in code enforced it. The agent wallet's private key already exists and can sign/broadcast real mainnet transactions (`runtime/flowmint-wallet.ts`); without an explicit invariant, a future bug (e.g. wrong wallet client wired into `CeloPayment.execute()`) could let the agent wallet silently act as a user's payer with no error until the on-chain `verify()` step caught the mismatch after gas was already spent.
**Alternatives:** Rely solely on the post-broadcast on-chain `verify()` check in `@flowmint/celo` (rejected — fails late, after a real transaction and gas cost, rather than before broadcasting).
**Impact:** `apps/agent/src/wallet/ownership.ts` (new), `agent/flowmint-agent.ts` (`authorize()`), `payments/celo-payment.ts` (`execute()`), `runtime/signer-preflight.ts`, `runtime/balance-check.ts`, `live-payment-preflight.ts` now import the single agent-wallet-address constant instead of duplicating the literal. Documented in `docs/TRUST.md` §1.

## New decision template
`Decision NNN | Title | Status | Decision | Reason | Alternatives | Impact`
