import type { BillingEventType, SubscriptionStatus } from "./constants";
import type { BillingEventPayload } from "./types";

export interface BillingEvent {
  id: string;
  type: BillingEventType;
  accountId: string;
  workspaceId?: string;
  payload: BillingEventPayload;
  timestamp: string;
}

export type BillingEventHandler = (event: BillingEvent) => void | Promise<void>;

export interface WebhookMapping {
  providerEvent: string;
  billingEventType: BillingEventType;
  mapper: (payload: Record<string, unknown>) => BillingEventPayload;
}

interface SubscriberEntry {
  handler: BillingEventHandler;
  id: string;
  metadata?: Record<string, unknown>;
}

export class EventRegistry {
  private subscribers = new Map<BillingEventType, SubscriberEntry[]>();
  private webhookMappings: WebhookMapping[] = [];
  private eventHistory: BillingEvent[] = [];
  private maxHistory = 1000;

  on(type: BillingEventType, handler: BillingEventHandler, metadata?: Record<string, unknown>): string {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const existing = this.subscribers.get(type) ?? [];
    existing.push({ handler, id, metadata });
    this.subscribers.set(type, existing);
    return id;
  }

  off(type: BillingEventType, handlerOrId: BillingEventHandler | string): void {
    const existing = this.subscribers.get(type) ?? [];
    this.subscribers.set(
      type,
      existing.filter((entry) => {
        if (typeof handlerOrId === "string") return entry.id !== handlerOrId;
        return entry.handler !== handlerOrId;
      }),
    );
  }

  async emit(event: BillingEvent): Promise<void> {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    const callbacks = this.subscribers.get(event.type) ?? [];
    const results = await Promise.allSettled(
      callbacks.map((entry) => Promise.resolve(entry.handler(event))),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`[EventRegistry] Subscriber error for ${event.type}:`, result.reason);
      }
    }
  }

  registerWebhookMapping(mapping: WebhookMapping): void {
    this.webhookMappings.push(mapping);
  }

  resolveWebhookEvent(provider: string, providerEvent: string, payload: Record<string, unknown>): BillingEvent | null {
    const mapping = this.webhookMappings.find(
      (m) => providerEvent === m.providerEvent,
    );
    if (!mapping) return null;

    return this.createEvent(
      mapping.billingEventType,
      String(payload.accountId ?? payload.customer ?? ""),
      mapping.mapper(payload),
      payload.workspaceId as string | undefined,
    );
  }

  createEvent(
    type: BillingEventType,
    accountId: string,
    payload: BillingEventPayload,
    workspaceId?: string,
  ): BillingEvent {
    return {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      accountId,
      workspaceId,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  getHistory(type?: BillingEventType): BillingEvent[] {
    if (type) return this.eventHistory.filter((e) => e.type === type);
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}

export const billingEventRegistry = new EventRegistry();

export function getEventTypeLabel(type: BillingEventType): string {
  const labels: Record<string, string> = {
    SUBSCRIPTION_CREATED: "Subscription Created",
    CHECKOUT_STARTED: "Checkout Started",
    PAYMENT_SUCCEEDED: "Payment Succeeded",
    PAYMENT_FAILED: "Payment Failed",
    SUBSCRIPTION_ACTIVATED: "Subscription Activated",
    SUBSCRIPTION_RENEWED: "Subscription Renewed",
    SUBSCRIPTION_CANCELLED: "Subscription Cancelled",
    REFUND_CREATED: "Refund Created",
    REFUND_COMPLETED: "Refund Completed",
    INVOICE_ISSUED: "Invoice Issued",
    INVOICE_PAID: "Invoice Paid",
  };
  return labels[type] ?? type;
}

export function getStatusAfterEvent(
  eventType: BillingEventType,
  currentStatus: SubscriptionStatus | null,
): SubscriptionStatus {
  switch (eventType) {
    case "SUBSCRIPTION_CREATED": return "DRAFT";
    case "PAYMENT_SUCCEEDED": return currentStatus === "DRAFT" ? "ACTIVE" : (currentStatus ?? "ACTIVE");
    case "PAYMENT_FAILED": return "PAST_DUE";
    case "SUBSCRIPTION_RENEWED": return "ACTIVE";
    case "SUBSCRIPTION_CANCELLED": return "CANCELLED";
    case "REFUND_COMPLETED": return "CANCELLED";
    default: return currentStatus ?? "DRAFT";
  }
}

export function serializeEventForWebhook(event: BillingEvent): Record<string, unknown> {
  return {
    id: event.id,
    type: event.type,
    account_id: event.accountId,
    workspace_id: event.workspaceId,
    payload: event.payload,
    timestamp: event.timestamp,
  };
}
