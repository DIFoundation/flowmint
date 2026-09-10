# FlowMint Architecture

## Goal
Support:
`real user intent → agent decision → bounded authorization → Celo stablecoin settlement → real-world outcome`

## High-level
```text
MiniPay / Mobile Web
        ↓
FlowMint Next.js App
        ↓
Agent Decision Layer ←→ Wallet Layer
        ↓
Trust / Policy / Verification
        ↓
Celo Mainnet + Stablecoin Rail
        ↓
Independent Recipient
        ↓
Real-world Outcome
```

## Repository
```text
flowmint/
├── apps/
│   ├── agent/
│   │   └── src/
│   │       ├── agent/          # Flow lifecycle and orchestration
│   │       ├── services/       # Service registry/provider boundary
│   │       ├── payments/       # Celo payment execution
│   │       ├── wallet/         # Wallet ownership/control boundaries
│   │       ├── policies/       # Payment and spending policies
│   │       └── runtime/        # Celo runtime/preflight infrastructure
│   │
│   ├── web/                    # User-facing application
│   └── contracts/              # Contracts where required by product/security
│
├── packages/
│   ├── celo/                   # Celo-specific primitives
│   ├── config/                 # Shared configuration
│   └── types/                  # Shared domain types
│
└── docs/
    ├── PRODUCT.md
    ├── ARCHITECTURE.md
    ├── AGENT.md
    ├── WALLET-OWNERSHIP.md
    ├── DECISIONS.md
    ├── ROADMAP.md
    ├── TASKS.md
    └── HACKATHON.md
```

## Web boundaries
- `app/`: routes/pages only.
- `components/`: presentation and interactions.
- `hooks/`: reusable client behavior.
- `lib/celo/`: chain/token/contract/attribution configuration.
- `lib/payments/`: payment construction and lifecycle.
- `lib/agent/`: schemas, decisions and orchestration.
- `types/`: domain types.
- `providers/`: application providers.

Do not put financial business logic directly in page components.

## Contracts
Deploy contracts only when they provide a real security, authorization, settlement or product function. Do not deploy for hackathon optics.

## Wallet model
FlowMint is non-custodial for user-authorized payments.

There are two operational wallet roles:

1. **User/external wallet**
   - controlled by the user or external participant
   - private key remains outside FlowMint
   - must sign its own authorized payment

2. **FlowMint agent wallet**
   - dedicated operational wallet
   - used only for FlowMint-owned operations
   - must never become the payer of a user-authorized flow

The critical invariant is:

```text
authorized payer === transaction signer
```

User wallet is non-custodial. The registered agent wallet is:
`0x03a72b85e54519cd293A77eaa043cA5deeaC73F4`

Do not assume the agent has unrestricted control over user funds. Define authority in M3.

## Celo
Prefer Celo mainnet, Viem/Wagmi, stablecoins, MiniPay injected wallet, fee abstraction where useful, phone-number lookup where useful, and x402 only where it contributes to the core workflow.

## Attribution
Preserve `celo_c81681d9bae5` on applicable transactions.

## Security
Never request seed phrases/private keys. Never store private keys in frontend code. Never give the agent unrestricted user-wallet authority. Natural-language output is not transaction authorization.

## Activity record
Where needed, make actions understandable through intent, recipient, amount, asset, authorization status, transaction hash, outcome and timestamp.

## Testing
Unit → component → wallet/account lifecycle → agent decisions → contracts → mainnet verification → MiniPay/mobile → end-to-end real-user testing.

## Architecture rule
If architecture becomes more complicated than the economic workflow requires, simplify it.
