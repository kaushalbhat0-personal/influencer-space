// ── Runtime Event Bus (Phase 9) ─────────────────────────────
// Internal event bus with a durable AnalyticsEvent record. In-memory
// subscribers (future Insights/Automation/Health runtimes) + a non-blocking
// DB write so the event layer survives restarts. No external queues.

import { prisma } from "@/lib/prisma";
import type { IntelligenceEventType, RuntimeEvent, RuntimeEventSubscriber } from "../domain/types";

class RuntimeEventBus {
  private subscribers = new Map<IntelligenceEventType, RuntimeEventSubscriber[]>();

  /** Subscribe to an event type. Returns an unsubscribe function. */
  subscribe(type: IntelligenceEventType, handler: RuntimeEventSubscriber): () => void {
    if (!this.subscribers.has(type)) this.subscribers.set(type, []);
    this.subscribers.get(type)!.push(handler);
    return () => {
      const list = this.subscribers.get(type);
      if (!list) return;
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
      if (list.length === 0) this.subscribers.delete(type);
    };
  }

  /** Publish an event: fire in-memory handlers, then persist (best-effort). */
  async publish(event: RuntimeEvent): Promise<void> {
    const handlers = this.subscribers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch {
          // a handler failure must never break the platform flow
        }
      }
    }

    try {
      await prisma.analyticsEvent.create({
        data: {
          tenantId: event.tenantId,
          source: "runtime",
          eventType: event.type,
          entityId: event.entityId ?? null,
          payload: (event.payload ?? {}) as never,
          occurredAt: new Date(event.occurredAt),
        },
      });
    } catch {
      // persistence is best-effort — the platform flow continues
    }
  }

  /** Recent events for the given tenant (read model for the event runtime). */
  async list(tenantId: string, limit = 50): Promise<Array<{ type: string; occurredAt: Date; payload: unknown }>> {
    try {
      const rows = await prisma.analyticsEvent.findMany({
        where: { tenantId, source: "runtime" },
        orderBy: { occurredAt: "desc" },
        take: limit,
        select: { eventType: true, occurredAt: true, payload: true },
      });
      return rows.map((r) => ({ type: r.eventType, occurredAt: r.occurredAt, payload: r.payload }));
    } catch {
      return [];
    }
  }
}

export const runtimeEventBus = new RuntimeEventBus();
