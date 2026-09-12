# FlowMint Trust & Verification (M3)

This is the single reviewable artifact for M3. Its exit criterion:
**a reviewer can understand why a payment was allowed, who authorized
it, where it went, and what happens on failure.** Sections follow
`ROADMAP.md`'s M3 task order. Each section states what's implemented
today, points at the code and tests that back it, and is explicit about
what's *not* built yet rather than implying it is.

---

## 1. Wallet Ownership

FlowMint has exactly two categories of wallet. Conflating them is the
single biggest trust failure this product could have, so the boundary
is enforced in code, not just documented.

| | User / third-party wallet | FlowMint agent wallet |
|---|---|---|
| **Owner** | The user (or the service provider being paid) | FlowMint (operator) |
| **Custody** | Non-custodial — FlowMint never holds the key | Custodial to FlowMint — key held server-side via `FLOWMINT_PRIVATE_KEY` |
| **Address** | Varies per user/provider | Single registered address: `0x03a72b85e54519cd293A77eaa043cA5deeaC73F4` |
| **Funds it may spend** | Its own funds only | Its own funds only |
| **Role in a Flow** | Always the `payer` on any user-authorized payment | Never the `payer` on a user-authorized payment |
| **What it's used for today** | Authorizing and settling real Flow payments (e.g. `e2e.ts`) | FlowMint's own operational transactions — wallet/RPC preflight checks (`signer-preflight.ts`, `live-payment-preflight.ts`) |

### Invariants (`apps/agent/src/wallet/ownership.ts`)

1. **The agent wallet is never a user's payer or authorizer.**
   Enforced in `FlowMintAgent.authorize()` via `assertNotAgentWallet()`.
2. **Whoever signs a payment's on-chain execution must be the same
   address authorized as its payer** (`authorized payer === signer`).
   Enforced in `CeloPayment.execute()` via `assertPayerIsSigner()`,
   checked *before* broadcasting — defense-in-depth ahead of the
   on-chain `verify()` check in `@flowmint/celo`, which only catches a
   mismatch after a real transaction and gas has already been spent.
3. **When the agent wallet signs for itself, the derived signer must
   match the registered address exactly.** Enforced via
   `assertIsAgentWallet()` in `signer-preflight.ts` and
   `live-payment-preflight.ts`.
4. **FlowMint never requests, stores, or transmits a user's private key
   or seed phrase.**

### What FlowMint does not claim
FlowMint does not currently provide legal identity verification, KYC,
proof an address belongs to a particular human, custodial control of
user wallets, delegated spending authority, or automatic signing on a
user's behalf. The guarantee is narrower and intentional: **a
user-authorized payment can only be executed by the wallet that
authorized it.**

### Not yet implemented (flagged, not silently assumed)
There is no wallet-connection code anywhere in this repository yet —
that lands with `apps/web`'s wallet integration. When it's built, it
must handle, as security-sensitive events:
- **Account changes**: the current payer identity must update; a stale
  authorization must never be reused against a newly connected account.
- **Disconnects**: must invalidate any pending wallet-dependent
  execution state.

Neither of these exists today because there's nothing to change or
disconnect from yet. Treat this as a requirement for whoever builds
that integration, not as something already covered.

### Evidence
`apps/agent/src/wallet-ownership-tests.ts` — 10 tests: classification,
both assertion helpers, `authorize()` refusing the agent wallet as
payer, recipient-substitution rejection, and `CeloPayment.execute()`
refusing/allowing based on signer-payer match.

---

## 2. Agent Authority

The agent may:
- interpret a validated economic intent
- discover and rank eligible services
- evaluate budgets and payment policy
- produce a service quote
- flag when human escalation review is required
- build a payment *proposal* strictly from its own trusted quote data
- verify settlement and trigger service fulfillment

The agent may **not**:
- move funds without an explicit, externally-supplied `PaymentAuthorization`
- use its own wallet as a user's payer
- change an authorized amount, token, or recipient after the fact
- let a flow reach authorization while an escalation is unresolved
- treat any natural-language output as a substitute for authorization

The load-bearing fact, true of every payment regardless of size or
risk: `FlowMintAgent` never calls `authorize()`, `submitPayment()`, or
`complete()` on itself. Every one of those is invoked by an external
caller supplying real authorization/settlement data. The agent decides
*what* to propose; it never decides, on its own, to spend.

### Authority boundaries
```
intent → discovery → decision → quote → [escalation?] → preview
       → explicit authorization → payer/signer validation
       → Celo payment → settlement verification → fulfillment
```
Two boundaries require an external actor before the flow can proceed:
the **escalation boundary** (`resolveEscalation()`, §4) and the
**authorization boundary** (`authorize()`, §1 invariant 2).

### Evidence
`apps/agent/src/failure-tests.ts` ("Agent loop stopped at authorization
boundary"), `escalation-tests.ts` ("escalated flow cannot bypass human
resolution").

---

## 3. Spending Limits

Two independent ceilings, both enforced in `policies/payment-policy.ts`
(`validatePayment()`), re-checked at both `authorize()` and
`submitPayment()` — not just once at evaluation time:

1. **Agent-level ceiling** — `PaymentPolicy.maxPayment`. A hard cap the
   agent operator sets; no quote above it is ever eligible.
2. **User-level ceiling** — `FlowIntent.maxBudget`. What the requester
   said they're willing to spend for *this* request.

A quote must clear both. Re-validating at authorize/submit (not just
at evaluate) matters because a flow can sit `awaiting_authorization`
for real wall-clock time — policy re-checks catch drift rather than
trusting a stale evaluation.

### Evidence
`failure-tests.ts` ("Agent payment limit enforced", "User budget
enforced").

---

## 4. Authorization Levels

FlowMint has exactly two tiers today, both requiring explicit human
sign-off — there is no auto-execute tier:

| Tier | Trigger | Path to payment |
|---|---|---|
| **Standard** | Evaluation clears without escalation | Direct `authorize()` call with a real `PaymentAuthorization` |
| **Escalated** | High-value (≥80% of spending limit), vague intent (<8 char description), no user budget on a high quote, or a tied service ranking | Must pass `resolveEscalation()` with an explicit reviewer decision *before* `authorize()` becomes reachable at all |

Attempting to `authorize()` an escalated flow directly fails closed —
there is no bypass.

### Evidence
`escalation-tests.ts`, `decision-tests.ts` (ambiguous-request section).

---

## 5. Recipient Verification

`apps/agent/src/payments/recipient-verification.ts` provides two
checks, both re-run at each state transition that has a real time gap
between it and the last check (evaluate→authorize, authorize→submit):

- `assertRecipientMatchesService(recipient, service)` — catches drift
  if the shared, mutable `Service` object's provider address changes
  between when it was quoted and when it's authorized/submitted
  (`ServiceRegistry` returns live object references, not snapshots).
- `assertRecipientMatchesQuote(payment, quote)` — catches drift if
  `flow.payment` is mutated after `authorize()` sets it (a real test —
  `wallet-ownership-tests.ts` test 10 — deliberately mutates
  `payment.recipient` after authorization and confirms `submitPayment()`
  rejects it).

Both are wrapped in try/catch at both call sites and fail the flow via
`this.fail()` rather than throwing uncaught (fixed in this pass — see
`DECISIONS.md`).

### Evidence
`recipient-verification-tests.ts` (unit-level), `wallet-ownership-tests.ts`
tests 8–10 (integration-level, including the tamper scenario).

---

## 6. Transaction Preview

`apps/agent/src/agent/payment-preview.ts` — `agent.preview(flow)`.
Read-only; never changes flow state; returns `null` until a flow has a
quote. Built exclusively from `flow.quote` / `flow.selectedService` /
`flow.escalation` — the exact same trusted fields `authorize()` uses to
construct the real `Payment` — so there is no code path where what a
human is shown could differ from what they end up authorizing.

### Evidence
`payment-preview-tests.ts` — includes a drift test that builds a
preview, authorizes using only the preview's own values, and asserts
the resulting `Payment` matches the preview field-for-field.

---

## 7. Audit Trail

Every `Flow` carries `evidence: FlowEvidence[]` — timestamped,
append-only events recorded at each transition: `flow_created`,
`decision_made`, `escalation_required`, `escalation_resolved`,
`authorization_granted`, `payment_submitted`, `settlement_confirmed`,
`service_completed`, and `flow_failed` (recorded centrally in the
private `fail()` method, so every failure path gets one automatically
rather than relying on each call site to remember).

This lines up with `ARCHITECTURE.md`'s activity-record spec (intent,
recipient, amount, asset, authorization status, tx hash, outcome,
timestamp) — a `Flow`'s evidence array plus its `outcome`/`settlement`
fields covers all of it.

**Known gap**: evidence lives only in-memory on the `Flow` object for
the life of the process. There is no persistence layer yet — nothing
survives a restart. That's fine for M3 (the exit criterion is about a
reviewer being able to follow *one* flow's reasoning, not durable
storage), but it's a real limitation for anything beyond a demo and
should be picked up when `apps/web`/API persistence is built.

### Evidence
`evidence-tests.ts`.

---

## 8. Failure & Recovery

What happens depends on which stage a flow fails at:

| Stage at failure | Funds moved? | Recovery |
|---|---|---|
| Before authorization (no eligible service, policy violation, escalation rejected) | No | Safe — start a new flow |
| Authorization rejected (wallet-ownership violation, recipient mismatch, tampering) | No | Safe — `flow.authorization` was never set to a valid value; start a new flow |
| Payment authorized but not yet submitted | No | Safe — nothing has been broadcast |
| Submitted, settlement never confirms | **Depends** | **No timeout or retry mechanism exists.** A flow can sit in `"settling"` indefinitely. Flagged as a known gap for M4. |
| Settlement confirmed, service fulfillment fails | **Yes — payment already settled** | **No refund path exists.** The current architecture is direct-transfer, not escrow: `complete()` marks the flow failed with the fulfillment error, but the provider has already been paid. This is the most consequential open gap in the trust model — see `THREAT_MODEL.md`. |

Every failure, regardless of stage, is recorded as a `flow_failed`
evidence event with the specific reason (§7), so a reviewer can always
answer "why did this fail" — even for the two gaps above, where the
honest answer today is "the money already moved and there's no
automated way back."

---

## 9. Evaluate Self / Fee Abstraction

Not pursued in M3. See `DECISIONS.md` 022 for the explicit reasoning —
in short, neither is required by anything in the current roadmap, and
`PRODUCT.md`'s scope rule explicitly warns against becoming "a
collection of unrelated Celo features." Revisit only if a concrete,
evidenced user need shows up.   