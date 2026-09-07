import type { Flow, FlowIntent, PaymentAuthorization, Service, ServiceQuote } from "./types";
import { ServiceRegistry } from "../services/service-registry";
import { validatePayment, type PaymentPolicy } from "../policies/payment-policy";
import { rankServices } from "./decision-engine";
import type { ServiceProvider } from "../services/service-provider";

export interface FlowMintAgentConfig {
  registry: ServiceRegistry;
  paymentPolicy: PaymentPolicy;
  serviceProvider: ServiceProvider;
}

export class FlowMintAgent {
  private readonly registry: ServiceRegistry;
  private readonly paymentPolicy: PaymentPolicy;
  private readonly serviceProvider: ServiceProvider;

  constructor(config: FlowMintAgentConfig) {
    this.registry = config.registry;
    this.paymentPolicy = config.paymentPolicy;
    this.serviceProvider = config.serviceProvider;
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
      return this.fail(flow, `Flow ${flow.id} is not awaiting authorization.`);
    }

    if (!flow.quote || !flow.selectedService) {
      return this.fail(
        flow,
        "Cannot authorize a flow without a selected service and quote.",
      );
    }

    if (authorization.authorizedAmount !== flow.quote.amount) {
      return this.fail(
        flow,
        "Authorized amount does not match the service quote.",
      );
    }

    if (authorization.authorizedToken !== flow.quote.currency) {
      return this.fail(
        flow,
        "Authorized token does not match the service quote currency.",
      );
    }

    if (authorization.authorizedRecipient !== flow.quote.provider) {
      return this.fail(
        flow,
        "Authorized recipient does not match the service provider.",
      );
    }

    if (authorization.authorizedAt <= 0) {
      return this.fail(flow, "Authorization timestamp must be valid.");
    }

    flow.authorization = authorization;

    flow.payment = {
      token: authorization.authorizedToken,
      amount: authorization.authorizedAmount,
      payer: authorization.payer,
      recipient: authorization.authorizedRecipient,
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

  private validateAuthorizationBinding(flow: Flow): void {
    if (!flow.authorization) {
      throw new Error("Payment authorization is missing.");
    }

    if (!flow.payment) {
      throw new Error("Payment is missing.");
    }

    const authorization = flow.authorization;
    const payment = flow.payment;

    if (payment.payer !== authorization.payer) {
      throw new Error("Payment payer does not match authorization.");
    }

    if (payment.amount !== authorization.authorizedAmount) {
      throw new Error("Payment amount does not match authorization.");
    }

    if (payment.token !== authorization.authorizedToken) {
      throw new Error("Payment token does not match authorization.");
    }

    if (payment.recipient !== authorization.authorizedRecipient) {
      throw new Error("Payment recipient does not match authorization.");
    }
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

    try {
      this.validateAuthorizationBinding(flow);
    } catch (error) {
      return this.fail(
        flow,
        error instanceof Error
          ? error.message
          : "Authorization binding validation failed.",
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

    if (!flow.selectedService) {
      return this.fail(flow, "Flow has no selected service.");
    }

    flow.payment.status = "confirmed";

    flow.settlement = {
      txHash: settlement.txHash,
      confirmed: true,
      blockNumber: settlement.blockNumber,
      timestamp: Date.now(),
    };

    flow.selectedService.status = "paid";

    const serviceOutcome = this.serviceProvider.fulfill(
      flow.selectedService,
      flow.payment,
    );

    flow.serviceOutcome = serviceOutcome;

    if (!serviceOutcome.success) {
      flow.selectedService.status = "failed";

      return this.fail(
        flow,
        serviceOutcome.error ?? "Service fulfillment failed.",
      );
    }

    flow.selectedService.status = "fulfilled";

    flow.status = "completed";

    flow.outcome = {
      success: true,
      result: serviceOutcome.result,
    };

    flow.updatedAt = Date.now();

    return flow;
  }
}
