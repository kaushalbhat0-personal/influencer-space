import { prisma } from "@/lib/prisma";
import type { PlatformEvent, EventType, PlatformEventPayloads } from "../types";
async function tryDb<T>(fn: () => Promise<T>, fallback: T): Promise<T> { try { return await fn(); } catch { return fallback; } }

export class EventRepository {
  async save(event: PlatformEvent): Promise<void> {
    await tryDb(async () => {
      await prisma.platformEvent.create({
        data: { id: event.id, eventType: event.type, payload: JSON.parse(JSON.stringify(event.payload)), aggregateId: this.extractAggregateId(event), source: event.source, correlationId: event.correlationId ?? null, occurredAt: new Date(event.timestamp) },
      });
    }, undefined);
  }

  async getHistory(eventType?: string): Promise<PlatformEvent[]> {
    return tryDb(async () => {
      const where = eventType ? { eventType } : undefined;
      const records = await prisma.platformEvent.findMany({ where, orderBy: { occurredAt: "desc" }, take: 500 });
      return records.map((r) => ({ id: r.id, type: r.eventType as EventType, payload: r.payload as PlatformEventPayloads[EventType], correlationId: r.correlationId ?? undefined, timestamp: r.occurredAt.toISOString(), source: r.source }));
    }, []);
  }

  private extractAggregateId(event: PlatformEvent): string | undefined {
    const p = event.payload as Record<string, unknown>;
    return (p.tenantId ?? p.workspaceId ?? p.partnerId ?? p.invoiceId ?? p.batchId) as string | undefined;
  }
}

export const eventRepository = new EventRepository();
