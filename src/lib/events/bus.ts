import { randomUUID } from "crypto";
import type {
  EventType,
  PlatformEvent,
  PlatformEventHandler,
  PlatformEventPayloads,
  UnsubscribeFn,
} from "./types";
import { eventRepository } from "./repositories/event-repository";

function generateEventId(): string {
  return randomUUID();
}

export class PlatformEventBus {
  private subscribers = new Map<EventType, Set<PlatformEventHandler>>();
  private history: PlatformEvent[] = [];
  private maxHistory = 500;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.history = await eventRepository.getHistory();
    this.initialized = true;
  }

  publish<T extends EventType>(
    type: T,
    payload: PlatformEventPayloads[T],
    source = "platform",
    correlationId?: string,
  ): PlatformEvent<T> {
    const event: PlatformEvent<T> = {
      id: generateEventId(),
      type,
      payload,
      correlationId,
      timestamp: new Date().toISOString(),
      source,
    };

    this.history.push(event as PlatformEvent);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    eventRepository.save(event as PlatformEvent).catch((err) => {
      console.error(`[EventBus] Failed to persist event "${type}":`, err);
    });

    const handlers = this.subscribers.get(type);
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        try {
          const result = handler(event as unknown as PlatformEvent);
          if (result instanceof Promise) {
            result.catch((err) => {
              console.error(`[EventBus] Async handler error for "${type}":`, err);
            });
          }
        } catch (err) {
          console.error(`[EventBus] Handler error for "${type}":`, err);
        }
      }
    }

    return event;
  }

  subscribe<T extends EventType>(
    type: T,
    handler: PlatformEventHandler<T>,
  ): UnsubscribeFn {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(handler as PlatformEventHandler);
    return () => {
      const handlers = this.subscribers.get(type);
      if (handlers) {
        handlers.delete(handler as PlatformEventHandler);
        if (handlers.size === 0) this.subscribers.delete(type);
      }
    };
  }

  subscribeMany(
    types: EventType[],
    handler: PlatformEventHandler,
  ): UnsubscribeFn {
    const unsubs = types.map((t) => this.subscribe(t, handler));
    return () => unsubs.forEach((u) => u());
  }

  subscribeAll(handler: PlatformEventHandler): UnsubscribeFn {
    const types = Array.from(this.subscribers.keys()) as EventType[];
    return this.subscribeMany(types, handler);
  }

  unsubscribe(type: EventType, handler: PlatformEventHandler): void {
    const handlers = this.subscribers.get(type);
    if (handlers) {
      handlers.delete(handler as PlatformEventHandler);
      if (handlers.size === 0) this.subscribers.delete(type);
    }
  }

  getHistory(type?: EventType): PlatformEvent[] {
    if (type) return this.history.filter((e) => e.type === type);
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  listenerCount(type?: EventType): number {
    if (type) return this.subscribers.get(type)?.size ?? 0;
    let count = 0;
    const values = Array.from(this.subscribers.values());
    for (let i = 0; i < values.length; i++) count += values[i]!.size;
    return count;
  }

  destroy(): void {
    this.subscribers.clear();
    this.history = [];
  }
}

export const platformEventBus = new PlatformEventBus();
