# FlowMint

> Autonomous economic execution on Celo.

FlowMint is a Celo-native economic agent that helps users discover services, evaluate options against explicit constraints, obtain authorization, execute stablecoin payments, verify settlement, and complete real-world service outcomes.

## The Problem

Most AI agents can recommend or communicate, but they stop before the economic action.

FlowMint focuses on the missing layer:

```text
Intent
  ↓
Decision
  ↓
Quote
  ↓
Authorization
  ↓
Wallet validation
  ↓
Celo payment
  ↓
Settlement verification
  ↓
Service fulfillment
```

## Core Principle

FlowMint is not a generic chatbot and not a generic wallet.

It is an economic-flow agent.

The agent may reason about:

* what the user wants;
* which available service best satisfies the request;
* whether the service fits the user's budget;
* whether the payment satisfies FlowMint's policy;
* what authorization is required.

The agent may not bypass explicit payment authorization or silently spend from a user's wallet.

## Wallet Security

FlowMint uses a non-custodial user-wallet model.

The critical invariant is:

```text
authorized payer === signing wallet
```

The FlowMint agent wallet is separate from user wallets and cannot act as the payer of a user-authorized flow.

See [`docs/WALLET-OWNERSHIP.md`](docs/WALLET-OWNERSHIP.md).

## Current Capabilities

### M1 — Celo Payment Rail

* Celo mainnet
* stablecoin payment execution
* transaction simulation
* balance and signer preflight
* settlement verification
* transaction attribution

### M2 — Agent Economic Flow

* intent creation
* deterministic service ranking
* budget enforcement
* payment policy enforcement
* explicit authorization
* authorization binding
* payment lifecycle
* settlement lifecycle
* service fulfillment
* failure-path testing
* agent execution loop

### M3 — Trust & Verification

Current work includes:

* wallet role separation
* payer/signer validation
* agent-wallet protection
* bounded authority
* recipient verification
* transaction preview
* activity records
* failure/recovery

## Architecture

See:

* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
* [`docs/AGENT.md`](docs/AGENT.md)
* [`docs/WALLET-OWNERSHIP.md`](docs/WALLET-OWNERSHIP.md)
* [`docs/DECISIONS.md`](docs/DECISIONS.md)
* [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Repository

```text
apps/agent      Agent runtime and economic execution
apps/web        User-facing application
apps/contracts  Product/security contracts where required
packages/celo   Celo primitives
packages/config Shared configuration
packages/types  Shared types
docs            Product and engineering documentation
```

## Development

```bash
pnpm install
```

Agent checks:

```bash
pnpm --filter @flowmint/agent type-check
pnpm --filter @flowmint/agent exec tsx src/e2e.ts
pnpm --filter @flowmint/agent exec tsx src/failure-tests.ts
```

## Security

FlowMint:

* never requests seed phrases;
* never stores user private keys;
* does not assume unrestricted control of user wallets;
* requires explicit authorization;
* validates payer/signer equality;
* verifies settlement before fulfillment;
* keeps agent-owned spending separate from user-authorized spending.

## Celo

FlowMint is built around Celo stablecoin payments and preserves the project's transaction attribution requirements.

## Status

FlowMint is an active hackathon-stage project focused on demonstrating safe, observable and useful autonomous economic execution on Celo.

The implementation is intentionally milestone-driven rather than feature-maximal.
