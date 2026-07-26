import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { PlatformEvent, EventType, PlatformEventPayloads } from "../types";
import { InfrastructureError } from "@/lib/errors/infrastructure-error";

export class EventRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async save(event: PlatformEvent, tx?: Prisma.TransactionClient): Promise<void> {
    try {
      await this.client(tx).platformEvent.create({
        data: {
          id: event.id,
          eventType: event.type,
          payload: JSON.parse(JSON.stringify(event.payload)),
          aggregateId: this.extractAggregateId(event),
          source: event.source,
          correlationId: event.correlationId ?? null,
          occurredAt: new Date(event.timestamp),
        },
      });
    } catch (err) {
      throw new InfrastructureError("EventRepository.save", `Failed to save event ${event.id}`, err);
    }
  }

  async getHistory(eventType?: string, tx?: Prisma.TransactionClient): Promise<PlatformEvent[]> {
    try {
      const where = eventType ? { eventType } : undefined;
      const records = await this.client(tx).platformEvent.findMany({ where, orderBy: { occurredAt: "desc" }, take: 500 });
      return records.map((r) => ({
        id: r.id,
        type: r.eventType as EventType,
        payload: r.payload as PlatformEventPayloads[EventType],
        correlationId: r.correlationId ?? undefined,
        timestamp: r.occurredAt.toISOString(),
        source: r.source,
      }));
    } catch (err) {
      throw new InfrastructureError("EventRepository.getHistory", "Failed to get event history", err);
    }
  }

  private extractAggregateId(event: PlatformEvent): string | undefined {
    const p = event.payload as Record<string, unknown>;
    return (p.tenantId ?? p.workspaceId ?? p.partnerId ?? p.invoiceId ?? p.batchId) as string | undefined;
  }
}

export const eventRepository = new EventRepository();
