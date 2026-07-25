import { success } from "../helpers/result";

type EventHandler = (payload: Record<string, unknown>) => void | Promise<void>;

interface Subscription {
  pattern: RegExp;
  handler: EventHandler;
  once: boolean;
}

export class InProcessEventPublisher {
  private subscribers: Subscription[] = [];
  private history: Array<{ eventType: string; payload: Record<string, unknown>; timestamp: string }> = [];
  private maxHistory = 500;

  async publish(eventType: string, payload: Record<string, unknown>) {
    this.history.push({ eventType, payload, timestamp: new Date().toISOString() });
    if (this.history.length > this.maxHistory) this.history.shift();

    const toRemove: number[] = [];
    for (let i = 0; i < this.subscribers.length; i++) {
      const sub = this.subscribers[i]!;
      if (sub.pattern.test(eventType)) {
        try {
          const result = sub.handler(payload);
          if (result instanceof Promise) result.catch((err) => console.error("[Events] Handler error:", err));
        } catch (err) {
          console.error("[Events] Handler error:", err);
        }
        if (sub.once) toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.subscribers.splice(toRemove[i]!, 1);
    }
    return success(undefined);
  }

  subscribe(pattern: string, handler: EventHandler): () => void {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    const sub: Subscription = { pattern: regex, handler, once: false };
    this.subscribers.push(sub);
    return () => {
      const idx = this.subscribers.indexOf(sub);
      if (idx !== -1) this.subscribers.splice(idx, 1);
    };
  }

  once(pattern: string, handler: EventHandler): () => void {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    const sub: Subscription = { pattern: regex, handler, once: true };
    this.subscribers.push(sub);
    return () => {
      const idx = this.subscribers.indexOf(sub);
      if (idx !== -1) this.subscribers.splice(idx, 1);
    };
  }

  unsubscribeAll(): void {
    this.subscribers = [];
  }

  getHistory(eventType?: string): Array<{ eventType: string; payload: Record<string, unknown>; timestamp: string }> {
    if (eventType) return this.history.filter((e) => e.eventType === eventType);
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  subscriberCount(): number {
    return this.subscribers.length;
  }
}
