/**
 * Billing v2 — Event Service
 *
 * Immutable, append-only event log.
 * Provides idempotency via unique idempotencyKey.
 * Duplicate events are silently ignored.
 *
 * Events trigger: subscription state transitions, invoice updates, webhook processing.
 */

import type { SubscriptionStatus } from "./types";

export type BillingEventType =
  | "SUBSCRIPTION_CREATED"
  | "CHECKOUT_STARTED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_CANCELLED"
  | "REFUND_CREATED"
  | "REFUND_COMPLETED"
  | "INVOICE_ISSUED"
  | "INVOICE_PAID";

export interface BillingEventPayload {
  accountId: string;
  planCode?: string;
  subscriptionId?: string;
  invoiceId?: string;
  providerReference?: string;
  amount?: number;
  currency?: string;
  previousStatus?: SubscriptionStatus;
  newStatus?: SubscriptionStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Determines the resulting subscription status after an event.
 */
export function statusAfterEvent(
  event: BillingEventType,
  currentStatus: SubscriptionStatus | null
): SubscriptionStatus {
  switch (event) {
    case "SUBSCRIPTION_CREATED":
      return "DRAFT";
    case "PAYMENT_SUCCEEDED":
      return currentStatus === "DRAFT" ? "ACTIVE" : currentStatus ?? "ACTIVE";
    case "PAYMENT_FAILED":
      return "PAST_DUE";
    case "SUBSCRIPTION_RENEWED":
      return "ACTIVE";
    case "SUBSCRIPTION_CANCELLED":
      return "CANCELLED";
    case "REFUND_COMPLETED":
      return "CANCELLED";
    default:
      return currentStatus ?? "DRAFT";
  }
}
