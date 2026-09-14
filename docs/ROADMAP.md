# FlowMint M1→M8 Roadmap

**Rule:** Complete the current milestone's exit criteria before advancing.

| Milestone | Goal | Primary output |
|---|---|---|
| M1 | Economic workflow | One sharply defined real-world use case |
| M2 | Agent decision layer | Agent safely reasons about the workflow |
| M3 | Trust & verification | Permission, policy and verification model |
| M4 | Payment execution | Real Celo mainnet settlement |
| M5 | MiniPay distribution | Mobile-first usable experience |
| M6 | Real-world loop | Independent users and repeat economic activity |
| M7 | Autonomous network | Strong agent↔human / agent↔agent demonstration |
| M8 | Hackathon evidence | Verified, reproducible submission package |

## M1 — Economic Workflow
**Objective:** Lock the exact real-world economic workflow before feature expansion.

**Tasks**
- [x] Define primary user.
- [x] Define primary economic problem.
- [x] Define economic event/payment.
- [x] Define sender, recipient and independence.
- [x] Document current manual workflow.
- [x] Define agent responsibility.
- [x] Define forbidden agent actions.
- [x] Define minimum verification.
- [x] Define authorization model.
- [x] Define successful real-world outcome.
- [x] Define first distribution/acquisition path.
- [x] Write canonical user journey.

**Do not build:** multiple use cases, generic agent marketplace, tokenomics, artificial volume, advanced orchestration.

**Exit:** product can be explained in one paragraph and the user→agent→verification→payment→outcome flow is unambiguous.

## M2 — Agent Decision Layer
**Tasks**
- [x] Input schema
- [x] Tools
- [x] Decisions
- [x] Hard rules
- [x] Spending limits
- [x] Refusal conditions
- [x] Escalation conditions
- [x] Smallest useful agent loop
- [x] Normal/ambiguous/malicious-request tests

**Exit:** valid requests produce safe structured execution plans; unsafe/out-of-authority requests are refused.

## M3 — Trust & Verification

### Status

**Complete**

### Tasks

- [x] Wallet ownership
- [x] Agent authority
- [x] Spending limits
- [x] Authorization levels
- [x] Recipient verification
- [x] Transaction preview
- [x] Audit/activity records
- [x] Failure/recovery
- [x] Threat model
- [x] Evaluate Self/fee abstraction — decided not to pursue now (`DECISIONS.md` 022)

Full detail and evidence for every item: `docs/TRUST.md`. Threats and
residual risk: `docs/THREAT_MODEL.md`.

### Known gaps carried forward (not blockers for M3's own exit criterion, but real)
- No persistence for the audit trail — in-memory only, doesn't survive a restart
- No timeout/retry for a flow stuck in `"settling"`
- No escrow/refund path if settlement confirms but service fulfillment fails
- No account-change/disconnect handling yet — there's no wallet-connection code to test against until `apps/web`'s integration is built

### Exit

A reviewer can understand:

1. who authorized a payment;
2. which wallet is authorized;
3. which wallet signs;
4. why the payment was allowed;
5. where funds are sent;
6. how settlement is verified;
7. what happens when verification fails.

## M4 — Payment Execution
**Tasks**
- [x] Celo mainnet — `runtime/celo-client.ts` (`assertCeloMainnet`), exercised for real in `live-payment-preflight.ts`
- [x] Stablecoin rails
- [x] Transaction construction — `packages/celo/src/payment.ts` (`createStablecoinPayment`)
- [x] Attribution tagging — `packages/celo/src/attribution.ts`, wired into every constructed payment
- [x] Status tracking — `payments/execute-flow.ts` wires `submitPayment()` → real broadcast/verify → `complete()` as a single tested path; Flow/Payment/Settlement transitions now reflect real execution, not just manual choreography. (Still in-memory only — no persistence, per M3.)
- [x] Failure handling — a thrown broadcast/verification error now explicitly fails the flow via `agent.failExecution()` instead of leaving it stuck in `"settling"`. (The other stuck-settlement case — broadcasts but never confirms, no throw — remains open; see `THREAT_MODEL.md` #9.)
- [x] On-chain verification — `payment.ts` (`verify()`), checks the real Transfer event's `from`/`to`/`amount`
- [x] Controlled mainnet test — real 0.001 USDC mainnet tx already produced and logged (M1 evidence)

**Exit:** a real payment works end-to-end and is independently verifiable on-chain. **Met** — `execute-flow-tests.ts` demonstrates authorize → submit → broadcast → on-chain verify → complete → fulfill as one path (mock executor in tests; `live-payment-preflight.ts` already proved the same primitives against real mainnet).

## M5 — MiniPay Distribution
**Tasks**
- [x] MiniPay detection
- [x] Injected wallet flow
- [x] Mobile UI — real intent → quote → preview → authorize → pay → settle flow, wired to `@flowmint/agent` for the first time (`DECISIONS.md` 026)
- [x] Stablecoin UX — pick USDC/USDT/USDm at authorization, equivalent amounts shown before paying
- [x] Evaluate phone-number lookup — not pursued, MiniPay already resolves phone numbers to wallets (`DECISIONS.md` 025)
- [x] Evaluate fee abstraction — not pursued (`DECISIONS.md` 022, still holds)
- [x] HTTPS deployment — local + ngrok working now; Vercel target documented with its real persistence blocker, not silently deferred (`docs/DEPLOY.md`)
- [x] MiniPay test — needs an actual phone; can't be done from this environment
- [x] Mobile browser test — same

**Exit:** a first-time mobile user can complete the core workflow without developer knowledge. **Mechanically verified** via direct HTTP requests through the full route sequence (create → authorize → settle, including graceful failure handling).

## M6 — Real-World Loop
**Tasks**
- [ ] First independent users
- [ ] Genuine transactions
- [ ] Observe friction — **instrumentation ready**: `flowsFailed`/`failuresByStage`/`flowsAbandoned` in `/api/metrics`, populated automatically as real flows run
- [ ] Fix highest-impact issues — depends on real friction data existing first
- [ ] Measure distinct users — **instrumentation ready**, `distinctUsers` in `/api/metrics`; reads 0 until real people use it
- [ ] Measure returning users — **instrumentation ready**, `returningUsers`; needs the persistence gap below resolved to mean anything past a single deploy
- [ ] Measure signers/authorizers — **instrumentation ready**, `distinctSigners`
- [ ] Document real outcomes — can't be written until the above produce real numbers

**Exit:** evidence of genuine use by people other than the builder, with repeat use where feasible. **Not met, and can't be by me** — this requires real independent people actually using the deployed app. See `DECISIONS.md` 028 for what's built to capture that evidence once it happens, and its own real blocker: the metrics store is in-memory only, so "returning users" can't be trusted in production until a real datastore replaces it — this is no longer a deferred nice-to-have, it's the actual precondition for this milestone's exit criterion meaning anything on Vercel.

## M7 — Autonomous Network
**Tasks**
- [ ] Strongest agent↔human scenario
- [ ] Evaluate agent↔agent scenario
- [ ] Implement only if it strengthens the thesis
- [ ] Bounded autonomous execution
- [ ] Real settlement
- [ ] Verification/accountability

**Exit:** the demo proves why an agent is needed rather than merely adding AI to a payment form.

## M8 — Evidence & Submission
**Tasks**
- [ ] Verify attribution
- [ ] Verify agent wallet
- [ ] Verify mainnet activity
- [ ] Verify independent users
- [ ] Verify repeat activity
- [ ] Verify stablecoin usage
- [ ] Verify contracts
- [ ] Final app URL
- [ ] Public GitHub
- [ ] Demo video
- [ ] X post
- [ ] Celo Builders submission
- [ ] Anti-farming audit
- [ ] Final QA
- [ ] Scope freeze

**Exit:** submission is complete, reproducible and supported by on-chain/user evidence.

## Priority order
1. Current-milestone blockers
2. Reliability
3. Security/trust
4. Evidence-producing functionality
5. Celo/MiniPay integration
6. Visual polish
7. Nice-to-haves

Never reverse this because a feature looks impressive.