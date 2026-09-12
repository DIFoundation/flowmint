# FlowMint Threat Model (M3)

Threats to the agent's trust boundary, current mitigation, and — where
one exists — the residual risk left over. This is a living document;
update it whenever a mitigation is added or a new class of threat is
identified. Full context for anything referenced here is in
`docs/TRUST.md`.

| # | Threat | Mitigation | Residual risk |
|---|---|---|---|
| 1 | Agent wallet private key compromised or misconfigured | `assertIsAgentWallet()` verifies the derived signer matches the single registered address before any agent-wallet-signed operation | No key rotation procedure documented; no monitoring/alerting if the key is ever used from an unexpected context |
| 2 | Agent wallet silently used as a user's payer (custody conflation) | `assertNotAgentWallet()` in `authorize()` | None known — this is the one invariant with the most direct test coverage |
| 3 | Malformed or adversarial `FlowIntent` (prototype pollution, type confusion, oversized payload, negative budget) | `validate-intent.ts` runtime guard at the `startFromUnknown()` boundary | Callers using the internal `start()` entry point directly (tests, trusted internal code) bypass validation by design — correct for now since there's no external API surface yet, but must be revisited once `apps/web` calls the agent over HTTP |
| 4 | Recipient substitution: authorized/submitted payment goes to a different address than the one quoted | `assertRecipientMatchesService()` / `assertRecipientMatchesQuote()`, re-checked at both `authorize()` and `submitPayment()` | None known within a single process — see #6 for the cross-process gap |
| 5 | Signer/payer mismatch before broadcast (wrong wallet client wired in) | `assertPayerIsSigner()` in `CeloPayment.execute()`, pre-broadcast | None — this is defense-in-depth ahead of `@flowmint/celo`'s on-chain `verify()`, which would also catch it, just after gas is spent |
| 6 | Registry drift (TOCTOU): a `Service`'s provider address changes between quoting and authorization/submission | Registry objects are checked live at each boundary via recipient verification (#4), not from a stale snapshot | If the registry is ever backed by something with weaker consistency than an in-memory `Map` (e.g. a database with eventual consistency), this needs re-verification |
| 7 | Escalation bypass: an ambiguous/high-risk flow reaches authorization without human review | `resolveEscalation()` is the only path out of `"escalated"`; `authorize()` checks `flow.status` and fails closed otherwise | None known — tested directly in `escalation-tests.ts` |
| 8 | Uncaught exception crashes the process on an invalid state transition | Every public `FlowMintAgent` method is expected to *return* a failed `Flow`, never throw. This was violated during initial M3 implementation (`submitPayment()` used `flow.quote!` before checking state, and re-validation threw instead of failing) — found by actually running the test suite, not by reading the code, and fixed | This is a pattern that has to be maintained by convention, not enforced by the type system. Recommend treating "does this method ever throw instead of returning a failed Flow" as a standing review question for every new method |
| 9 | Settlement never confirms — a flow stuck in `"settling"` indefinitely | None | **Open.** No timeout, no retry, no manual recovery path. Flagged for M4. |
| 10 | Provider is paid but fails to deliver the service (no escrow) | None | **Open, and the most consequential gap in the current trust model.** The architecture is direct-transfer: settlement happens, *then* fulfillment is attempted. If fulfillment fails, `complete()` marks the flow failed, but the funds have already moved with no refund path. Worth a deliberate decision before scaling past a demo — likely requires either an escrow contract (`apps/contracts`, per `DECISIONS.md` 012's "only when necessary" bar) or a reputation/dispute mechanism. |
| 11 | Type-checking silently not running, hiding real bugs | Verified in this session: an unpinned global `typescript` install shadowed the project's pinned version and caused `tsc` to exit early on a deprecation notice, meaning "clean type-check" had been a false positive for two prior review passes | Recommend a CI step that runs `pnpm install --frozen-lockfile && pnpm -r type-check && pnpm -r test` so this class of failure can't happen silently again — local ad-hoc tool installs should never be trusted over the lockfile |
| 12 | Audit trail lost on process restart | None — `FlowEvidence` is in-memory only | Acceptable for M3's exit criterion (single-flow reviewability); not acceptable once this runs as a persistent service |

## Out of scope for M3 (explicitly, not by oversight)
- KYC / identity verification of wallet owners
- Wallet-connection security (account changes, disconnects) — no such code exists yet; see `TRUST.md` §1
- Rate limiting / anti-abuse on the intent-submission boundary
- Multi-signature or time-locked authorization for very high-value payments