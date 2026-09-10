# FlowMint Task Board

**Current milestone: M3 — Trust & Verification**

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

### Completed

- [x] Wallet ownership/control boundary
- [x] Agent wallet identity
- [x] Agent wallet exclusion from user payments
- [x] Payer/signer equality validation
- [x] Wallet ownership failure tests

### Next

- [ ] Define agent authority
- [ ] Enforce spending limits through execution
- [ ] Verify recipients before payment
- [ ] Build transaction preview
- [ ] Add activity/audit record
- [ ] Define failure and recovery states
- [ ] Add account-change/disconnect integration tests
- [ ] Write threat model

## M4
- [ ] Mainnet config.
- [ ] Stablecoin config.
- [ ] Payment construction.
- [ ] Attribution.
- [ ] Status.
- [ ] Failure handling.
- [ ] On-chain verification.
- [ ] Controlled mainnet test.
- [ ] M4 exit criteria.

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