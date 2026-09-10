# FlowMint Wallet Control & Ownership

## Purpose

FlowMint is non-custodial for user payments.

The system must ensure that a wallet authorized to spend funds is the same wallet that signs and executes the corresponding on-chain payment.

FlowMint does not request, store, or control user private keys.

## Wallet Roles

FlowMint recognizes two operational wallet roles.

### 1. User / External Wallet

A user or external participant controls their own wallet.

FlowMint may receive the public address, but it does not possess the private key and cannot independently sign transactions for that wallet.

A user-authorized payment must therefore be signed by the same wallet address that was authorized as the payer.

### 2. FlowMint Agent Wallet

FlowMint operates one dedicated agent wallet for its own service-level blockchain operations.

Current registered address:

`0x03a72b85e54519cd293A77eaa043cA5deeaC73F4`

The agent wallet may spend its own funds for FlowMint operational purposes, but it must never silently become the payer of a user-authorized payment.

## Core Security Invariants

### Invariant 1 — Agent wallet cannot become a user payer

A payment authorization using the FlowMint agent wallet as the user payer must be rejected.

```text
agent wallet → user authorization → REJECT
```

This prevents accidental or malicious conflation of FlowMint's own custody with user authorization.

### Invariant 2 — Authorized payer must equal transaction signer

Before a user-authorized payment is executed:

```text
authorized payer === signing wallet
```

If the addresses differ, execution must stop before broadcasting.

This protects against:

* incorrect wallet-client wiring
* stale connected-account state
* account switching
* accidental use of the agent signer
* authorization/payment mismatch

### Invariant 3 — On-chain execution remains authoritative

The final transaction is signed by the wallet that controls the payer account.

The blockchain therefore remains the authoritative settlement layer.

Application-level validation provides an early safety boundary, while the transaction signature provides cryptographic control at execution time.

## Authorization Boundary

FlowMint separates decision-making from payment authorization.

```text
User intent
    ↓
Service discovery
    ↓
Deterministic decision
    ↓
Quote
    ↓
Explicit authorization
    ↓
Payer/signer validation
    ↓
Celo payment
    ↓
Settlement verification
    ↓
Service fulfillment
```

The agent cannot cross the authorization boundary merely because it has selected a service.

## Account Changes

Wallet integrations must treat account changes as security-sensitive events.

When the connected account changes:

1. The current payer identity must be updated.
2. Any stale authorization must not be reused for the new account.
3. Pending wallet-dependent actions must be revalidated.
4. The newly connected account must be used for subsequent signing.

Disconnects must similarly invalidate wallet-dependent execution state.

## What FlowMint Does Not Claim

FlowMint does not currently provide:

* legal identity verification
* KYC
* proof that an address belongs to a particular human
* custodial control of user wallets
* unrestricted delegated spending authority
* automatic transaction signing on behalf of users

The security guarantee is narrower and intentional:

> A user-authorized payment can only be executed by the wallet that authorized that payment.

## Implementation

Wallet ownership/control boundaries are implemented in:

* `apps/agent/src/wallet/ownership.ts`
* `apps/agent/src/agent/flowmint-agent.ts`
* `apps/agent/src/payments/celo-payment.ts`

Important guards include:

* `assertNotAgentWallet()`
* `assertIsAgentWallet()`
* `assertPayerIsSigner()`

## Testing Requirements

Wallet-control tests must cover at minimum:

1. Agent wallet classification.
2. External wallet classification.
3. Agent wallet rejected as user payer.
4. Matching payer and signer accepted.
5. Mismatched payer and signer rejected.
6. Account-change behavior.
7. Disconnect behavior.
8. Payment authorization remaining bound to the original payer.

## Design Principle

FlowMint should always prefer explicit authorization, deterministic validation, and cryptographic settlement over assumptions about wallet identity.

The system does not need to know who owns a wallet in the real-world sense to enforce the critical payment invariant.

It needs to ensure that:

**the wallet authorized to spend is the wallet that actually signs.**
