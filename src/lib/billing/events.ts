import { billingEventRegistry, getStatusAfterEvent } from "./event-registry";
import type { BillingEvent, BillingEventHandler } from "./event-registry";
import type { BillingEventPayload } from "./types";
import type { BillingEventType, SubscriptionStatus } from "./constants";

export type { BillingEvent, BillingEventHandler };
export type { BillingEventPayload };

export const billingEventBus = billingEventRegistry;

export function createBillingEvent(
  type: BillingEventType,
  accountId: string,
  payload: BillingEventPayload,
  workspaceId?: string,
): BillingEvent {
  return billingEventRegistry.createEvent(type, accountId, payload, workspaceId);
}

export function statusAfterEvent(
  eventType: BillingEventType,
  currentStatus: SubscriptionStatus | null,
): SubscriptionStatus {
  return getStatusAfterEvent(eventType, currentStatus);
}
