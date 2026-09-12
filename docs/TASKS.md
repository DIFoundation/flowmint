# FlowMint Task Board

**Current milestone: M4 — Payment Execution**

Only advance when the current milestone's exit criteria in `ROADMAP.md` are satisfied.

## M1
### Product definition
- [x] Define primary user.
- [x] Define primary economic problem.
- [x] Define exact economic event.
- [x] Define sender/recipient and independence.
- [x] Define current manual workflow.
- [x] Define FlowMint workflow.
- [x] Define agent responsibility.
- [x] Define human responsibility.
- [x] Define forbidden agent actions.
- [x] Define minimum verification.
- [x] Define authorization model.
- [x] Define successful real-world outcome.
- [x] Define first distribution path.

### Flow
- [x] Happy path.
- [x] Insufficient funds.
- [x] Invalid recipient.
- [x] Authorization rejected.
- [x] Agent refusal.
- [x] Transaction failure.
- [x] Canonical user journey.

### Exit review
- [x] One-paragraph product explanation.
- [x] Unambiguous user journey.
- [x] Unambiguous agent role.
- [x] Unambiguous payment role.
- [x] No generic-agent drift.
- [x] M1 exit criteria satisfied.

```
Network:        Celo Mainnet
Chain ID:       42220
FlowMint Agent: 0x03a72b85e54519cd293A77eaa043cA5deeaC73F4
Token:          USDC
Amount:         0.001 USDC
Transaction:    0xefd7f0b182cf91fffca426678ff35991237bced46ef2f305dc91426e2fe32162
Block:          76652277
Settlement:     Confirmed
Attribution:    celo_c81681d9bae5
```

## M2
- [x] Agent input schema. (`agent/types.ts` FlowIntent + runtime validation in `agent/validate-intent.ts`)
- [x] Tools. (`tools/index.ts`)
- [x] Decisions. (`agent/decision-engine.ts`)
- [x] Hard rules. (`policies/payment-policy.ts`)
- [x] Spending limits. (`paymentPolicy.maxPayment`, `intent.maxBudget`)
- [x] Refusal conditions. (ineligible service, policy violation — see `failure-tests.ts`)
- [x] Escalation conditions. (`policies/escalation-policy.ts`: high-value, vague intent, no-budget-on-high-value, tied ranking)
- [x] Agent loop. (`start()` halts at authorization boundary; `resolveEscalation()` halts at review boundary)
- [x] Decision tests. (`decision-tests.ts`)
- [x] Ambiguous/malicious tests. (`decision-tests.ts`: normal/ambiguous/malicious sections, 16 tests)
- [x] M2 exit criteria.

```
M2 evidence: apps/agent/src/decision-tests.ts (16/16 passing)
             apps/agent/src/failure-tests.ts (17/17 passing)
             pnpm --filter @flowmint/agent test
```

## M3 — Trust & Verification
- [x] Wallet ownership. (`docs/TRUST.md` §1, `wallet/ownership.ts`, `wallet-ownership-tests.ts`)
- [x] Agent authority. (`docs/TRUST.md` §2)
- [x] Spending limits. (`docs/TRUST.md` §3, `policies/payment-policy.ts` — already existed from M2, cross-referenced here)
- [x] Authorization levels. (`docs/TRUST.md` §4, `escalation-tests.ts`)
- [x] Recipient verification. (`docs/TRUST.md` §5, `payments/recipient-verification.ts`, `recipient-verification-tests.ts`)
- [x] Transaction preview. (`docs/TRUST.md` §6, `agent/payment-preview.ts`, `payment-preview-tests.ts`)
- [x] Audit trail. (`docs/TRUST.md` §7, `FlowEvidence` in `agent/types.ts`, `evidence-tests.ts`)
- [x] Failure/recovery. (`docs/TRUST.md` §8 — includes two documented open gaps: no settlement timeout, no escrow/refund path)
- [x] Threat model. (`docs/THREAT_MODEL.md`)
- [x] Evaluate Self. (`DECISIONS.md` 022 — not pursued now)
- [x] Evaluate fee abstraction. (`DECISIONS.md` 022 — not pursued now)
- [x] M3 exit criteria.

```
M3 evidence: apps/agent/src/wallet-ownership-tests.ts   (10/10)
             apps/agent/src/escalation-tests.ts          (4/4)
             apps/agent/src/evidence-tests.ts             (3/3)
             apps/agent/src/recipient-verification-tests.ts (1 suite)
             apps/agent/src/payment-preview-tests.ts      (4/4)
             apps/agent/src/failure-tests.ts + decision-tests.ts (from M2, still passing)
             pnpm --filter @flowmint/agent test
```

## M4
- [x] Mainnet config. (`runtime/celo-client.ts`, exercised in `live-payment-preflight.ts`)
- [x] Stablecoin config. (`packages/celo/src/tokens.ts`: `resolveStablecoin`/`convertStablecoinAmount` — user picks USDC/USDT/USDm at authorization; see `DECISIONS.md` 023, `apps/agent/src/stablecoin-tests.ts`)
- [x] Payment construction. (`packages/celo/src/payment.ts`: `createStablecoinPayment`)
- [x] Attribution. (`packages/celo/src/attribution.ts`)
- [ ] Status. (in-memory Flow/Payment status transitions exist; no live polling or persistence)
- [ ] Failure handling. (fail-closed on invalid states; stuck-settlement timeout and escrow/refund gaps from M3 still open)
- [x] On-chain verification. (`payment.ts` `verify()` — checks the real Transfer event)
- [x] Controlled mainnet test. (real 0.001 USDC mainnet tx, logged in M1 evidence)
- [ ] M4 exit criteria. (blocked on wiring `FlowMintAgent.submitPayment()` to the real executor — currently a manual, external step)

## M5
- [ ] MiniPay detection.
- [ ] Injected wallet.
- [ ] Mobile UI.
- [ ] Stablecoin UX.
- [ ] Phone-number lookup evaluation.
- [ ] Fee abstraction evaluation.
- [ ] HTTPS.
- [ ] MiniPay test.
- [ ] Mobile browser test.
- [ ] M5 exit criteria.

## M6
- [ ] Independent users.
- [ ] Genuine transactions.
- [ ] Friction collection.
- [ ] Fix highest-impact issues.
- [ ] Distinct users.
- [ ] Returning users.
- [ ] Distinct signers/authorisers.
- [ ] User outcomes.
- [ ] M6 exit criteria.

## M7
- [ ] Agent↔human flow.
- [ ] Agent↔agent evaluation.
- [ ] Bounded autonomy.
- [ ] Real settlement.
- [ ] Verification.
- [ ] M7 exit criteria.

## M8
- [ ] Attribution verification.
- [ ] Agent wallet verification.
- [ ] Mainnet verification.
- [ ] Independent-user verification.
- [ ] Repeat-activity verification.
- [ ] Stablecoin verification.
- [ ] Contract verification.
- [ ] App URL.
- [ ] GitHub.
- [ ] Demo.
- [ ] X post.
- [ ] Celo Builders submission.
- [ ] Anti-farming audit.
- [ ] Final QA.
- [ ] Scope freeze.
- [ ] Submit.

## Parking lot
- [ ] Additional workflows.
- [ ] Generic agent marketplace.
- [ ] Token/reward system.
- [ ] Social features.
- [ ] Unnecessary DeFi integrations.
- [ ] Additional chains.
- [ ] Unnecessary contracts.

Do not implement parking-lot items without an explicit roadmap/decision update.