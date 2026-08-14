/**
 * Razorpay webhook → Billing v2 mapping — IMPLEMENTATION-34.
 *
 * Pure, testable mapping from Razorpay webhook events to BillingEvents and
 * subscription states. Every webhook becomes a BillingEvent → subscription
 * update → entitlement (capability) refresh. Payments never unlock features
 * directly.
 */
import type { SubscriptionStatus } from "./types";
import type { BillingEventType } from "./events";
import { canTransition } from "./lifecycle";

export type WebhookAction =
  | "activate"
  | "renew"
  | "cancel"
  | "pause"
  | "resume"
  | "past_due"
  | "ignored";

export interface WebhookMapping {
  eventType: BillingEventType;
  action: WebhookAction;
}

export const RAZORPAY_EVENT_MAP: Record<string, WebhookMapping> = {
  "subscription.activated": { eventType: "SUBSCRIPTION_ACTIVATED", action: "activate" },
  "subscription.charged": { eventType: "SUBSCRIPTION_RENEWED", action: "renew" },
  "subscription.completed": { eventType: "SUBSCRIPTION_CANCELLED", action: "cancel" },
  "subscription.cancelled": { eventType: "SUBSCRIPTION_CANCELLED", action: "cancel" },
  "subscription.paused": { eventType: "SUBSCRIPTION_PAUSED", action: "pause" },
  "subscription.resumed": { eventType: "SUBSCRIPTION_RESUMED", action: "resume" },
  "payment.failed": { eventType: "PAYMENT_FAILED", action: "past_due" },
  "payment.captured": { eventType: "PAYMENT_SUCCEEDED", action: "activate" },
  "order.paid": { eventType: "PAYMENT_SUCCEEDED", action: "activate" },
};

export function mappingForRazorpayEvent(eventName: string): WebhookMapping | null {
  return RAZORPAY_EVENT_MAP[eventName] ?? null;
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string } };
    subscription?: { entity?: { id?: string } };
    refund?: { entity?: { id?: string } };
  };
}

/**
 * RCCF-37 (P1) — canonical idempotency key for a Razorpay webhook.
 *
 * A single payment can raise SEVERAL events (subscription.activated +
 * subscription.charged + payment.captured, or order.paid + payment.captured)
 * that all describe ONE financial occurrence. Keying on the payment id
 * collapses them so a charge is never processed twice (double invoice / double
 * partner commission). Events without a payment fall back to event+reference.
 *
 * RCCF-41 — refunds are keyed on the PROVIDER REFUND id (a refund is its own
 * financial occurrence and there can be multiple refunds per payment).
 */
export function buildRazorpayIdempotencyKey(payload: RazorpayWebhookPayload, event: string, ref: string): string {
  const refundId = payload.payload?.refund?.entity?.id;
  if (refundId) return `razorpay_refund_${refundId}`;
  const paymentId = payload.payload?.payment?.entity?.id;
  if (paymentId) return `razorpay_payment_${paymentId}`;
  if (ref) return `razorpay_${event}_${ref}`;
  return `razorpay_${event}_${Date.now()}`;
}

export function targetStatusForAction(action: WebhookAction): SubscriptionStatus {
  switch (action) {
    case "activate":
    case "renew":
    case "resume":
      return "ACTIVE";
    case "cancel":
      return "CANCELLED";
    case "pause":
      return "PAST_DUE";
    case "past_due":
      return "PAST_DUE";
    default:
      return "ACTIVE";
  }
}

/**
 * Resolve the resulting subscription status for a webhook action, honoring the
 * lifecycle state machine. Returns null when the transition is illegal (the
 * event is recorded but the state is not mutated).
 */
export function statusForWebhookEvent(
  eventName: string,
  currentStatus: SubscriptionStatus | null,
): SubscriptionStatus | null {
  const mapping = mappingForRazorpayEvent(eventName);
  if (!mapping) return null;
  const target = targetStatusForAction(mapping.action);
  const from = currentStatus ?? "DRAFT";
  if (canTransition(from, target)) return target;
  // Same-state events (renewal while ACTIVE) are no-ops that keep the state.
  if (from === target) return target;
  return null;
}
