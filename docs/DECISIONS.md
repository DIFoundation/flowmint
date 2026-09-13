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

## 018 — Fail-closed via return, never throw, across the Flow state machine
**Decision:** Every public `FlowMintAgent` method that operates on a `Flow` must return a failed `Flow` (via the private `fail()` helper) on any invalid state or validation failure — never throw an uncaught exception. `fail()` now also records a `flow_failed` audit-trail event centrally, so every failure path gets one automatically.
**Reason:** The M3 recipient-verification and defense-in-depth payment-policy re-checks added to `authorize()`/`submitPayment()` initially used `throw new Error(...)` and an unguarded `flow.quote!` non-null assertion. Running the existing regression suite (not just reading the diff) surfaced a real crash: `submitPayment()` on a freshly-created flow — exactly what `failure-tests.ts` test 6 does on purpose — threw instead of failing gracefully, because the new check ran before the existing state guard and used `flow.quote!` on a genuinely undefined value.
**Alternatives:** Leave the re-checks as throws and require every caller to wrap every call in try/catch (rejected — no caller in this codebase does that today, and it silently breaks the established contract every other method follows).
**Impact:** `apps/agent/src/agent/flowmint-agent.ts` (`authorize()`, `submitPayment()`, `fail()`). No test behavior changed for already-passing cases; the crashing test now passes as originally intended.

## 019 — Agent authority and authorization levels defined explicitly
**Decision:** Two authorization tiers exist today — Standard (direct `authorize()`) and Escalated (must clear `resolveEscalation()` first) — and neither allows the agent to move funds on its own. The agent never calls `authorize()`, `submitPayment()`, or `complete()` on itself; those always require an external caller supplying real authorization/settlement data.
**Reason:** `ARCHITECTURE.md` flagged "define authority in M3" as an open item. This was largely already true in code (nothing in `FlowMintAgent` self-invokes the payment methods) but wasn't stated anywhere as an explicit rule a reviewer could check the codebase against.
**Alternatives:** Add a third, lower-friction tier for repeat/trusted providers (e.g. auto-execute under some threshold). Deferred — no milestone requires it yet and it would meaningfully widen the trust surface; revisit only with evidence of real friction.
**Impact:** Documentation only (`docs/TRUST.md` §2, §4) — codifies an invariant that was already true rather than changing behavior.

## 020 — Transaction preview built only from trusted internal state
**Decision:** `agent.preview(flow)` (`agent/payment-preview.ts`) returns what a human should see before authorizing, built exclusively from `flow.quote`/`flow.selectedService`/`flow.escalation` — the same fields `authorize()` itself uses to construct the real `Payment`. There is no code path that lets a preview be built from caller-supplied override values.
**Reason:** A preview that could diverge from what actually gets authorized is worse than no preview — it would give false confidence. Deriving both from the same source by construction makes drift structurally impossible rather than something to test for after the fact (though it's tested anyway — `payment-preview-tests.ts` includes a drift test).
**Alternatives:** None seriously considered — any design that reconstructs the preview from separate/parallel logic reopens the drift risk this is meant to close.
**Impact:** `apps/agent/src/agent/payment-preview.ts` (new), `FlowMintAgent.preview()`.

## 021 — Failure/recovery documented honestly, including two open gaps
**Decision:** Document exactly what happens at each failure stage (`docs/TRUST.md` §8), including two gaps that are not fixed in M3: no timeout/retry for a flow stuck in `"settling"`, and no escrow/refund path if settlement confirms but service fulfillment subsequently fails (direct-transfer architecture pays the provider before fulfillment is attempted).
**Reason:** M3's exit criterion is that a reviewer can understand what happens on failure — that requires stating the true answer even when the true answer is "there's currently no automated recovery," not implying every failure mode is handled.
**Alternatives:** Build an escrow contract now to close gap #10 (`THREAT_MODEL.md`). Deferred — `DECISIONS.md` 012 sets the bar for contracts at "real security/settlement function, not optics," and this would be exactly that bar being met, but it's a real scope decision for a future milestone, not something to bolt on inside M3's trust-and-verification pass.
**Impact:** `docs/TRUST.md` §8, `docs/THREAT_MODEL.md` #9–#10. No code change — this decision is to document the gap clearly rather than paper over it.

## 022 — Evaluate Self / fee abstraction: not pursued now
**Decision:** Neither "Evaluate Self" nor fee abstraction is implemented in M3.
**Reason:** `PRODUCT.md`'s scope rule explicitly warns against FlowMint becoming "a collection of unrelated Celo features." Nothing in the current roadmap (M1–M8) requires either, and there's no evidenced user problem either one would solve right now.
**Alternatives:** Build a minimal version of one now, "since M3 is already touching trust/authority." Rejected — matches the exact anti-pattern `AGENT.md`'s "before every feature" checklist exists to catch (no milestone requires it, no clear evidence it'd create).
**Impact:** None — explicitly parking scope, same pattern as decision 012.

## 023 — Flexible stablecoin settlement, resolved at authorization
**Decision:** A service always quotes in one native stablecoin (unchanged), but `authorize()` now accepts any FlowMint-supported stablecoin (`USDC`, `USDT`, `USDm`) as `authorizedToken`, converting the quoted amount via `convertStablecoinAmount()` (1:1 USD peg, decimal-scaled, rounds up on precision loss) and validating the result against `PaymentPolicy.allowedCurrencies`. `agent.preview()` shows the equivalent amount in every supported rail up front. Also fixed a pre-existing, previously-inert bug: `decision-engine.ts`'s `preferredCurrency` scoring compared a user-facing symbol ("USDC") directly against an on-chain address string, so it could never actually match anything — now resolved through the same `resolveStablecoin()` helper.
**Reason:** Requested directly — settlement currency shouldn't be locked to whatever a provider happens to quote in. The authorization boundary (not the decision/quoting layer) is the correct place for this: `PRODUCT.md`'s workflow already treats authorization as the moment a human's real choice becomes binding, and keeping the quote itself currency-agnostic meant zero changes to M2/M3 decision logic, policy thresholds, or escalation math (all of which assumed a stable decimal base and would have misfired against an 18-decimal token if conversion happened earlier in the pipeline).
**Alternatives:** Let services quote in multiple currencies directly (rejected — needlessly complicates the service model for something the authorization layer already solves cleanly); convert at quote-creation time instead of authorization (rejected — would require every policy/escalation threshold to become decimal-aware).
**Impact:** `packages/celo/src/tokens.ts` (new: `resolveStablecoin`, `convertStablecoinAmount`, `FLOWMINT_STABLECOIN_ADDRESSES`), `agent/flowmint-agent.ts` (`authorize()`), `agent/decision-engine.ts` (fixed currency-preference scoring), `agent/validate-intent.ts` (rejects unsupported `preferredCurrency` at the input boundary), `agent/payment-preview.ts` (`equivalentAmounts`). Evidence: `apps/agent/src/stablecoin-tests.ts` (8 tests).

## 024 — Real payment execution wired via a dedicated orchestration function, not agent self-execution
**Decision:** `payments/execute-flow.ts` (`executeFlow()`) chains `agent.submitPayment()` → `CeloPayment.execute()` (real broadcast + on-chain verify) → `agent.complete()` as a single tested path. A thrown broadcast/verification error now explicitly fails the flow via a new public `agent.failExecution()`, rather than leaving it stuck in `"settling"`. This lives outside `FlowMintAgent` itself, not as a method on it.
**Reason:** M4's exit criterion needed a real, tested, end-to-end path — previously this choreography only existed as hand-assembled glue in `e2e.ts`/`live-payment-preflight.ts`, duplicated per script with no shared failure handling. Keeping it as a standalone function (not a new `FlowMintAgent` method) preserves the agent's chain-agnostic design — `FlowMintAgent` still knows nothing about Celo/viem directly — and preserves Decision 019's agent-authority boundary: the agent doesn't gain any new ability to decide to spend, it only gets a tested way to *execute* a payment a human already authorized via `authorize()`.
**Alternatives:** Make `submitPayment()` itself async and broadcast internally (rejected — would force every existing call site and test across the whole state machine to become async for no benefit, and would blur the chain-agnostic boundary `payments/` exists to hold). Poll/retry on unconfirmed settlement inside this function (rejected for now — that's a distinct, unresolved design question about polling strategy/timeout, not something to bolt on silently; still open, `THREAT_MODEL.md` #9).
**Impact:** `apps/agent/src/payments/execute-flow.ts` (new), `agent/flowmint-agent.ts` (`failExecution()`), `payments/celo-payment.ts` (refactored to use `resolveStablecoin()` instead of a hardcoded duplicate address-matching method — same cleanup pattern as Decision 017's single-source-of-truth fix). Evidence: `apps/agent/src/execute-flow-tests.ts` (3 tests).

## 025 — Phone-number lookup: not pursued, MiniPay already covers it
**Decision:** Not building phone-number → wallet-address lookup for M5.
**Reason:** MiniPay itself already provides phone-number-to-wallet resolution as a wallet feature. Building a parallel lookup inside FlowMint would duplicate something the primary distribution channel (M5's own subject) already solves, with no clear benefit and a real duplication/consistency risk (two systems resolving the same phone number could disagree).
**Alternatives:** Build our own for non-MiniPay mobile browsers. Deferred — no evidence yet that a meaningful share of users will arrive via a browser without MiniPay's resolution available; revisit if that changes.
**Impact:** None — explicitly parking scope, same pattern as Decision 022.

## 026 — Mobile UI wired end-to-end to the real agent, with a globalThis flow-store fix found by testing
**Decision:** `apps/web` now has a real FlowMint experience (`page.tsx` + `use-flow-mint.ts`) wired through new API routes (`/api/flow`, `/api/flow/[id]`, `/api/flow/[id]/authorize`, `/api/flow/[id]/settle`, `/api/flow/[id]/escalation`) to `@flowmint/agent` (new `public-api.ts` entrypoint — the package previously had no proper library export, only a demo script). The client signs the real ERC-8021-attributed transfer itself via the connected wallet (`encodeAttributedStablecoinTransfer` from `@flowmint/celo`, called client-side — safe, no secrets); the server never holds a signing key for user payments, only a read-only public client to verify settlement, preserving the wallet-ownership invariants from Decision 017 into the real UI for the first time.
**Reason:** M5's exit criterion is a first-time mobile user completing the core workflow. That requires all of M1–M4's backend work to actually be reachable from a browser, which it wasn't — `apps/web` didn't even depend on `@flowmint/agent`.
**A real bug found and fixed by testing, not assuming:** the first implementation used a plain module-level `Map` for in-flight Flow state. Testing the actual HTTP routes end-to-end (not just type-checking) showed a flow created via `POST /api/flow` was invisible to `POST /api/flow/[id]/authorize` moments later, in the same dev server process — Next.js's dev compiler can re-instantiate route modules independently. Fixed by anchoring both the agent instance and the flow store to `globalThis`, the standard fix for this exact class of Next.js singleton problem.
**Alternatives:** Build a real datastore now instead of an in-memory store. Deferred — correctly scoped as a known, documented gap (`DEPLOY.md`) rather than solved prematurely; local dev + ngrok (this milestone's actual target, per direct instruction) doesn't need it, and building it blind before knowing the real Vercel persistence requirements would be guessing.
**Impact:** `apps/agent/src/public-api.ts` (new), `apps/agent/package.json` (`main`/`types`/`exports`), `apps/web/src/lib/*` (new: `agent-server.ts`, `celo-public-client.ts`, `use-flow-mint.ts`, `json-bigint.ts`), `apps/web/src/app/page.tsx` (replaced scaffold), 5 new API routes, `docs/DEPLOY.md` (new). Also fixed a discriminated-union bug found while wiring this up: `AgentExecutionStage` included `"rejected"`, which also appears in the separate `IntentRejection` type, preventing TypeScript from narrowing `AgentExecutionResult | IntentRejection` correctly — removed, since `start()` never actually produces that stage.

## 027 — cUSD → USDm naming fixed in the web app; verified via search, not assumed
**Decision:** `user-balance.tsx` labeled a token "cUSD"; `packages/celo/tokens.ts` labels the identical address "USDm". Verified via CeloScan and Mento's own rebrand announcement that these are the same contract — Celo's stablecoins rebranded from cUSD/cEUR/etc. to the Mento family (USDm and friends). Relabeled the web app to the current name for consistency with `packages/celo`.
**Reason:** Initially looked like a serious address-mislabeling bug (same address, two different token names in two parts of the same codebase) — worth verifying properly rather than assuming either file was right, since a wrong stablecoin address is a fund-safety issue. Turned out to be a naming/rebrand issue, not a contract bug, but the inconsistency was real and worth fixing before shipping the Stablecoin UX work this milestone adds.
**Alternatives:** None — this is a factual correction, not a design choice.
**Impact:** `apps/web/src/components/user-balance.tsx`.

## New decision template
`Decision NNN | Title | Status | Decision | Reason | Alternatives | Impact`