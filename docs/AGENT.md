# Coding-Agent Guardrails for FlowMint

You are contributing to FlowMint: a Celo-native product for **autonomous economic execution**.

Read before coding:
1. `docs/PRODUCT.md`
2. `docs/ROADMAP.md`
3. `docs/ARCHITECTURE.md`
4. `docs/HACKATHON.md`
5. `docs/DECISIONS.md`
6. `docs/TASKS.md`

## Non-negotiable
Do not turn FlowMint into a generic AI agent, chatbot, agent directory, Aigora-style marketplace, AI wrapper, generic wallet, or transaction-volume generator.

The agent exists to make a real economic workflow more autonomous, useful and safe.

## Before every feature
Answer:
- What user problem does it solve?
- Which milestone requires it?
- What dependency does it add?
- What evidence will it create?
- Does it strengthen autonomous economic execution?
- Does it improve real-world adoption?

If weak, park it.

## Milestone discipline
Do not implement future-milestone functionality early unless it is a documented blocker. Update `TASKS.md` and `DECISIONS.md` when scope changes.

## Agent rules
Agent must have explicit inputs, tools, authority, bounded actions, deterministic safety rules, refusal conditions, escalation conditions and auditable structured outputs. Never let an LLM response become unrestricted transaction authority.

## Wallet rules
Never request/store seed phrases or private keys. Keep user wallets non-custodial. Bound agent authority. Correctly handle disconnect/account changes and clean up listeners.

## Celo rules
Use mainnet for counted activity. Preserve `celo_c81681d9bae5`. Never manufacture volume/users.

## MiniPay rules
Treat MiniPay as a primary distribution surface. Test detection, injected wallet, mobile UX, confirmation, stablecoin display and account/network changes.

## Done means
Implementation + tests + type-check + UX/error handling + security review + documentation + `TASKS.md` update.

When a request conflicts with these rules, flag the conflict rather than silently changing product direction.
