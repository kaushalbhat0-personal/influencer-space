// ── Communication — Event Wiring ───────────────────────────
// RCCF-TRACK-02 Phase 8. Business runtimes emit events only; this subscriber
// maps canonical Runtime Events → communications. Deterministic, no duplicated
// notification logic.

import { runtimeEventBus, type RuntimeEvent } from "@/modules/event-runtime";
import { sendCommunication } from "./runtime";
import type { Recipient } from "../domain/types";

const CREATOR: Recipient = { audience: "creator", recipientId: "" };

interface EventRule {
  eventType: string;
  templateId?: string;
  /** Extract recipientId + data from the event. Returns null to skip. */
  map(event: RuntimeEvent): { recipient: Recipient; data: Record<string, unknown> } | null;
}

const EVENT_RULES: EventRule[] = [
  // Commerce → creator
  { eventType: "fulfillment.created", templateId: "order.confirmed", map: (e) => ({ recipient: { audience: "creator", recipientId: e.tenantId === "system" ? "" : e.tenantId }, data: { orderId: (e.payload as Record<string, unknown>)?.["orderId"] ?? e.entityId ?? "" } }) },
  { eventType: "download.generated", templateId: "download.ready", map: (e) => ({ recipient: { audience: "creator", recipientId: e.tenantId === "system" ? "" : e.tenantId }, data: { orderId: e.entityId ?? "" } }) },
  { eventType: "shipment.created", templateId: "shipment.update", map: (e) => ({ recipient: { audience: "creator", recipientId: e.tenantId === "system" ? "" : e.tenantId }, data: { orderId: e.entityId ?? "", status: "shipped" } }) },
  { eventType: "shipment.delivered", templateId: "shipment.update", map: (e) => ({ recipient: { audience: "creator", recipientId: e.tenantId === "system" ? "" : e.tenantId }, data: { orderId: e.entityId ?? "", status: "delivered" } }) },

  // Subscription → creator
  { eventType: "subscription.renewed", templateId: "payment.received", map: (e) => ({ recipient: { audience: "creator", recipientId: e.tenantId === "system" ? "" : e.tenantId }, data: { amount: (e.payload as Record<string, unknown>)?.["amount"] ?? "0" } }) },
  { eventType: "subscription.created", templateId: "payment.received", map: (e) => ({ recipient: { audience: "creator", recipientId: e.tenantId === "system" ? "" : e.tenantId }, data: { amount: (e.payload as Record<string, unknown>)?.["amount"] ?? "0" } }) },

  // Commission → agency
  { eventType: "commission.created", templateId: "commission.ready", map: (e) => ({ recipient: { audience: "agency", recipientId: String((e.payload as Record<string, unknown>)?.["partnerId"] ?? "") }, data: { amount: String((e.payload as Record<string, unknown>)?.["partnerShare"] ?? "0") } }) },

  // Customer success → creator
  { eventType: "success.stage.changed", templateId: "success.first_sale", map: (e) => {
    const to = (e.payload as Record<string, unknown>)?.["to"];
    if (to !== "first_sale") return null;
    return { recipient: { audience: "creator", recipientId: e.tenantId === "system" ? "" : e.tenantId }, data: {} };
  } },
  { eventType: "storefront.published", templateId: "success.website_published", map: (e) => ({ recipient: { audience: "creator", recipientId: e.tenantId === "system" ? "" : e.tenantId }, data: {} }) },

  // Communication failures → super admin alert
  { eventType: "commission.failed", templateId: "alert.failed_generation", map: (e) => ({ recipient: { audience: "super_admin", recipientId: "system" }, data: { error: String((e.payload as Record<string, unknown>)?.["error"] ?? "commission failed") } }) },
];

export async function handleRuntimeEvent(event: RuntimeEvent): Promise<void> {
  for (const rule of EVENT_RULES) {
    if (rule.eventType !== event.type || !rule.templateId) continue;
    try {
      const mapped = rule.map(event);
      if (!mapped) continue;
      if (!mapped.recipient.recipientId) continue; // no valid recipient
      await sendCommunication(rule.templateId, mapped.recipient, mapped.data).catch(() => {});
    } catch {
      // wiring failures never break the platform flow
    }
  }
}

let subscribed = false;

/** Idempotent registration of the event → communication subscriber. */
export function subscribeCommunicationEvents(): void {
  if (subscribed) return;
  subscribed = true;
  const types = Array.from(new Set(EVENT_RULES.map((r) => r.eventType)));
  for (const type of types) {
    runtimeEventBus.subscribe(type as never, (event) => {
      void handleRuntimeEvent(event);
    });
  }
}

export { CREATOR };
