# FlowMint Trust Model

## Purpose

FlowMint coordinates economic actions on behalf of users while keeping payment authority bounded, explicit and verifiable.

The system separates:

- agent decision-making;
- human authorization;
- wallet control;
- payment execution;
- settlement verification;
- service fulfillment.

## Agent Authority

The FlowMint agent may:

- interpret a validated economic intent;
- discover available services;
- rank eligible services;
- evaluate budgets and payment policy;
- produce a service quote;
- identify when human review is required;
- prepare a payment after explicit authorization;
- execute only within the authorized payment boundary;
- verify settlement;
- trigger the service fulfillment boundary.

The agent may not:

- spend from a user's wallet without authorization;
- use the FlowMint agent wallet as a user's payer;
- change an authorized amount;
- change an authorized token;
- change an authorized recipient;
- bypass an escalation review;
- treat natural-language output as payment authorization;
- continue execution after wallet ownership/control validation fails.

## Authority Boundaries

### Decision boundary

The agent decides whether a service satisfies the intent and payment policy.

### Escalation boundary

High-value, vague or ambiguous requests may require human review.

An escalated flow cannot proceed directly to payment authorization.

### Authorization boundary

A payment requires explicit authorization containing:

- payer;
- amount;
- token;
- recipient;
- authorization timestamp.

The authorization is bound to the generated quote.

### Wallet boundary

For user-authorized payments:

```text
authorized payer === signing wallet