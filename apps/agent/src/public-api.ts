export { FlowMintAgent, type FlowMintAgentConfig } from "./agent/flowmint-agent";
export { ServiceRegistry } from "./services/service-registry";
export { MockServiceProvider } from "./services/mock-service-provider";
export type { ServiceProvider } from "./services/service-provider";

export type {
  Flow,
  FlowIntent,
  FlowStatus,
  Service,
  ServiceQuote,
  ServiceScore,
  ServiceDecision,
  Payment,
  Settlement,
  PaymentAuthorization,
  EscalationDecision,
  EscalationResolution,
  FlowEvidence,
  AgentExecutionResult,
  AgentExecutionStage,
  IntentRejection,
} from "./agent/types";

export type { PaymentPolicy } from "./policies/payment-policy";
export {
  DEFAULT_ESCALATION_POLICY,
  type EscalationPolicy,
} from "./policies/escalation-policy";

export { buildPaymentPreview, type PaymentPreview } from "./agent/payment-preview";
export { validateFlowIntent } from "./agent/validate-intent";

export { CeloPayment, type AgentPaymentClients } from "./payments/celo-payment";
export { executeFlow, type ExecuteFlowResult } from "./payments/execute-flow";