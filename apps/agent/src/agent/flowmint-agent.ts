import type { Flow, FlowIntent, Service, ServiceQuote } from "./types";
import { ServiceRegistry } from "../services/service-registry";
import {
  validatePayment,
  type PaymentPolicy,
} from "../policies/payment-policy";
import { rankServices } from "./decision-engine";

export interface FlowMintAgentConfig {
  registry: ServiceRegistry;
  paymentPolicy: PaymentPolicy;
}

export interface PaymentAuthorization {
  payer: `0x${string}`;
}

export class FlowMintAgent {
  private readonly registry: ServiceRegistry;
  private readonly paymentPolicy: PaymentPolicy;

  constructor(config: FlowMintAgentConfig) {
    this.registry = config.registry;
    this.paymentPolicy = config.paymentPolicy;
  }

  createFlow(intent: FlowIntent): Flow {
    const now = Date.now();

    return {
      id: crypto.randomUUID(),
      intent,
      status: "created",
      decision: {
        reasons: [],
        candidates: [],
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  evaluate(flow: Flow): Flow {
    this.updateStatus(flow, "evaluating");

    const services = this.registry.list();

    const rankings = rankServices(flow.intent, services, this.paymentPolicy);

    const selected = rankings.find((candidate) => candidate.eligible);

    if (!selected) {
      flow.decision = {
        reasons: [
          "No eligibility service satisfied the request and payment policy.",
        ],
        candidates: rankings,
      };

      return this.fail(
        flow,
        "No eligible service matches the requested intent.",
      );
    }

    const service = selected.service;
    const quote = this.createQuote(service);

    const validation = validatePayment(flow.intent, quote, this.paymentPolicy);

    if (!validation.allowed) {
      flow.selectedService = service;
      flow.quote = quote;

      flow.decision = {
        selectedServiceId: service.id,
        selectedScore: selected.score,
        reasons: [
          ...selected.reasons,
          validation.reason ?? "Payment rejected.",
        ],
        candidates: rankings,
      };

      return this.fail(flow, validation.reason ?? "Payment rejected.");
    }

    flow.selectedService = service;
    flow.quote = quote;

    flow.decision = {
      selectedServiceId: service.id,
      selectedScore: selected.score,
      reasons: selected.reasons,
      candidates: rankings,
    };

    flow.status = "awaiting_authorization";
    flow.updatedAt = Date.now();

    return flow;
  }

  authorize(flow: Flow, authorization: PaymentAuthorization): Flow {
    if (flow.status !== "awaiting_authorization") {
      return this.fail(
        flow,
        "Flow cannot be authorized from its current state.",
      );
    }

    if (!flow.quote || !flow.selectedService) {
      return this.fail(flow, "Flow is missing service or quote information.");
    }

    flow.payment = {
      token: flow.quote.currency,
      amount: flow.quote.amount,
      payer: authorization.payer,
      recipient: flow.quote.provider,
      status: "authorized",
    };

    flow.status = "payment_pending";
    flow.updatedAt = Date.now();

    return flow;
  }

  private createQuote(service: Service): ServiceQuote {
    return {
      serviceId: service.id,
      provider: service.provider,
      currency: service.pricing.currency,
      amount: service.pricing.amount,
    };
  }

  private updateStatus(flow: Flow, status: Flow["status"]): void {
    flow.status = status;
    flow.updatedAt = Date.now();
  }

  private fail(flow: Flow, error: string): Flow {
    flow.status = "failed";
    flow.outcome = {
      success: false,
      error,
    };
    flow.updatedAt = Date.now();

    return flow;
  }

  submitPayment(flow: Flow): Flow {
    if (flow.status !== "payment_pending") {
      return this.fail(
        flow,
        "Payment cannot be submitted from the current flow state.",
      );
    }

    if (!flow.payment) {
      return this.fail(flow, "Flow has no payment to submit.");
    }

    flow.payment.status = "submitted";
    flow.status = "settling";
    flow.updatedAt = Date.now();

    return flow;
  }

  complete(
    flow: Flow,
    settlement: {
      txHash: `0x${string}`;
      confirmed: boolean;
      blockNumber?: bigint;
    },
  ): Flow {
    if (flow.status !== "settling") {
      return this.fail(
        flow,
        "Flow cannot be completed from the current flow state.",
      );
    }

    if (!settlement.confirmed) {
      return this.fail(flow, "Payment settlement was not confirmed.");
    }

    if (!flow.payment) {
      return this.fail(flow, "Flow has no payment.");
    }

    flow.payment.status = "confirmed";

    flow.settlement = {
      txHash: settlement.txHash,
      confirmed: true,
      blockNumber: settlement.blockNumber,
      timestamp: Date.now(),
    };

    flow.status = "completed";

    flow.outcome = {
      success: true,
      result: {
        serviceId: flow.selectedService?.id,
        txHash: settlement.txHash,
      },
    };

    flow.updatedAt = Date.now();

    return flow;
  }
}
