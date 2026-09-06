export type FlowStatus =
  | "created"
  | "evaluating"
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
  pricing: {
    currency: `0x${string}`;
    amount: bigint;
  };
  active: boolean;
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

export interface Flow {
  id: string;
  intent: FlowIntent;
  status: FlowStatus;

  selectedService?: Service;
  quote?: ServiceQuote;
  decision: ServiceDecision;
  payment?: Payment;
  settlement?: Settlement;
  outcome?: FlowOutcome;

  createdAt: number;
  updatedAt: number;
}
