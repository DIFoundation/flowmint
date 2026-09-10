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

**In progress**

### Completed

- [x] Wallet role separation
- [x] Registered FlowMint agent wallet
- [x] Agent wallet cannot act as user payer
- [x] Authorized payer must match signing wallet
- [x] Pre-execution signer validation
- [x] Defense-in-depth payment validation
- [x] Wallet ownership/control failure tests

### Remaining

- [ ] Agent authority model
- [ ] Spending-limit enforcement across the full execution path
- [ ] Recipient verification
- [ ] Transaction preview
- [ ] Activity/audit records
- [ ] Failure/recovery model
- [ ] Threat model
- [ ] Account-change/disconnect integration tests

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
- [ ] Celo mainnet
- [ ] Stablecoin rails
- [ ] Transaction construction
- [ ] Attribution tagging
- [ ] Status tracking
- [ ] Failure handling
- [ ] On-chain verification
- [ ] Controlled mainnet test

**Exit:** a real payment works end-to-end and is independently verifiable on-chain.

## M5 — MiniPay Distribution
**Tasks**
- [ ] MiniPay detection
- [ ] Injected wallet flow
- [ ] Mobile UI
- [ ] Stablecoin UX
- [ ] Evaluate phone-number lookup
- [ ] Evaluate fee abstraction
- [ ] HTTPS deployment
- [ ] MiniPay test
- [ ] Mobile browser test

**Exit:** a first-time mobile user can complete the core workflow without developer knowledge.

## M6 — Real-World Loop
**Tasks**
- [ ] First independent users
- [ ] Genuine transactions
- [ ] Observe friction
- [ ] Fix highest-impact issues
- [ ] Measure distinct users
- [ ] Measure returning users
- [ ] Measure signers/authorizers
- [ ] Document real outcomes

**Exit:** evidence of genuine use by people other than the builder, with repeat use where feasible.

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
