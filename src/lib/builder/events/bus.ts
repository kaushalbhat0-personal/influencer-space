import type { BuilderEventType, BuilderEvent, BuilderEventPayloads, EventHandler, UnsubscribeFn, SubscriberEntry, EventDiagnostics } from "./types";
import { platformTelemetry } from "@/lib/telemetry/telemetry";
import { logger } from "@/lib/observability/logger";

function generateEventId(): string { return crypto.randomUUID(); }

export class BuilderEventBus {
  private subscribers = new Map<BuilderEventType, SubscriberEntry[]>();
  private history: BuilderEvent[] = [];
  private replayCount = 0;
  private emitted = 0;
  private errors: string[] = [];

  subscribe<T extends BuilderEventType>(
    type: T,
    handler: EventHandler<T>,
    priority = 0
  ): UnsubscribeFn {
    const entry: SubscriberEntry = {
      id: crypto.randomUUID(),
      type,
      priority,
      handler: handler as EventHandler,
    };

    if (!this.subscribers.has(type)) this.subscribers.set(type, []);
    const list = this.subscribers.get(type)!;
    list.push(entry);
    list.sort((a, b) => b.priority - a.priority);

    return () => {
      const idx = list.indexOf(entry);
      if (idx >= 0) list.splice(idx, 1);
      if (list.length === 0) this.subscribers.delete(type);
    };
  }

  once<T extends BuilderEventType>(type: T, handler: EventHandler<T>, priority = 0): UnsubscribeFn {
    const unsub = this.subscribe(type, ((event: BuilderEvent<T>) => {
      unsub();
      handler(event);
    }) as EventHandler<T>, priority);
    return unsub;
  }

  emit<T extends BuilderEventType>(type: T, payload: BuilderEventPayloads[T], transactionId: string | null = null): void {
    const event: BuilderEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      id: generateEventId(),
      correlationId: crypto.randomUUID(),
      transactionId,
    };

    this.emitted++;
    this.history.push(event);
    if (this.history.length > 500) this.history.shift();

    const subs = this.subscribers.get(type);
    if (!subs) return;

    for (const sub of subs) {
      try {
        sub.handler(event);
      } catch (err) {
        const msg = `${type} handler error: ${err instanceof Error ? err.message : String(err)}`;
        this.errors.push(msg);
        logger.error(msg, "builder-event-bus");
      }
    }

    platformTelemetry.counter("builder.event.emitted", 1, { type });
  }

  replay(fromIndex = 0): { count: number; events: BuilderEvent[] } {
    this.replayCount++;
    const events = this.history.slice(fromIndex);
    for (const event of events) {
      const subs = this.subscribers.get(event.type);
      if (subs) {
        for (const sub of subs) sub.handler(event);
      }
    }
    return { count: events.length, events };
  }

  clearHistory(): void { this.history = []; }

  removeAllListeners(type?: BuilderEventType): void {
    if (type) this.subscribers.delete(type);
    else this.subscribers.clear();
  }

  listenerCount(type?: BuilderEventType): number {
    if (type) return this.subscribers.get(type)?.length ?? 0;
    let count = 0;
    for (const subs of Array.from(this.subscribers.values())) count += subs.length;
    return count;
  }

  getHistory(): BuilderEvent[] { return [...this.history]; }

  diagnostics(): EventDiagnostics {
    const byType: Record<string, number> = {};
    for (const [type, subs] of Array.from(this.subscribers.entries())) {
      byType[type] = subs.length;
    }
    return {
      totalEmitted: this.emitted,
      totalHandlers: this.listenerCount(),
      byType,
      replayCount: this.replayCount,
      errors: [...this.errors],
    };
  }

  destroy(): void {
    this.subscribers.clear();
    this.history = [];
    this.errors = [];
    this.emitted = 0;
    this.replayCount = 0;
  }
}

export const builderEvents = new BuilderEventBus();
