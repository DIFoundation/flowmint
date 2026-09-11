export type FlowStatus =
  | "created"
  | "evaluating"
  | "escalated"
  | "awaiting_authorization"
  | "payment_pending"
  | "settling"
  | "completed"
  | "failed";

export type PaymentStatus =
  | "quoted"
  | "authorized"
  | "submitted"
  | "confirmed"
  | "failed";

export type ServiceStatus =
  | "available"
  | "reserved"
  | "paid"
  | "fulfilled"
  | "failed"
  | "refunded";

export type AgentExecutionStage =
  | "escalated"
  | "awaiting_authorization"
  | "payment_pending"
  | "settling"
  | "completed"
  | "failed"
  | "rejected";

export interface FlowIntent {
  description: string;
  maxBudget?: bigint;
  preferredCurrency?: string;
  constraints?: Record<string, string>;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  provider: `0x${string}`;
  capabilities: string[];

  status: ServiceStatus;

  pricing: {
    currency: `0x${string}`;
    amount: bigint;
  };
  active: boolean;
}

export interface ServiceOutcome {
  success: boolean;
  serviceId: string;
  provider: `0x${string}`;
  completedAt?: number;
  reference?: string;
  result?: unknown;
  error?: string;
}

export interface ServiceQuote {
  serviceId: string;
  provider: `0x${string}`;
  currency: `0x${string}`;
  amount: bigint;
  estimatedDuration?: number;
  expiresAt?: number;
}

export interface ServiceScore {
  service: Service;
  score: number;
  eligible: boolean;
  reasons: string[];
}

export interface ServiceDecision {
  selectedServiceId?: string;
  selectedScore?: number;
  reasons: string[];
  candidates: ServiceScore[];
}

export interface EscalationDecision {
  required: boolean;
  reasons: string[];
}

export interface EscalationResolution {
  approved: boolean;
  reviewer: string;
  note?: string;
  resolvedAt: number;
}

export interface PaymentAuthorization {
  payer: `0x${string}`;
  authorizedAmount: bigint;
  authorizedToken: `0x${string}`;
  authorizedRecipient: `0x${string}`;
  authorizedAt: number;
}

export interface Payment {
  token: `0x${string}`;
  amount: bigint;
  payer: `0x${string}`;
  recipient: `0x${string}`;
  status: PaymentStatus;
  txHash?: `0x${string}`;
}

export interface Settlement {
  txHash: `0x${string}`;
  confirmed: boolean;
  blockNumber?: bigint;
  timestamp?: number;
}

export interface FlowOutcome {
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface AgentExecutionResult {
  flow: Flow;
  stage: AgentExecutionStage;
  requiresAuthorization: boolean;
  requiresEscalationReview: boolean;
}

export interface IntentRejection {
  stage: "rejected";
  error: string;
}

export interface FlowEvidence {
  event:
    | "flow_created"
    | "decision_made"
    | "escalation_required"
    | "escalation_resolved"
    | "authorization_granted"
    | "payment_submitted"
    | "settlement_confirmed"
    | "service_completed"
    | "flow_failed";

  timestamp: number;
  details: Record<string, unknown>;
}

export interface Flow {
  id: string;
  intent: FlowIntent;
  status: FlowStatus;

  selectedService?: Service;
  quote?: ServiceQuote;
  decision: ServiceDecision;

  escalation?: EscalationDecision;
  escalationResolution?: EscalationResolution;
  
  authorization?: PaymentAuthorization;

  payment?: Payment;
  settlement?: Settlement;

  serviceOutcome?: ServiceOutcome;

  outcome?: FlowOutcome;

  evidence: FlowEvidence[];

  createdAt: number;
  updatedAt: number;
}
