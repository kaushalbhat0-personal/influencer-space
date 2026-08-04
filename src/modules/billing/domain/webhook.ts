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
