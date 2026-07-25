export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface QueuedRequest {
  resolve: (allowed: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class ProviderRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private queues = new Map<string, QueuedRequest[]>();

  constructor(
    private defaultLimit: number = 30,
    private windowMs: number = 60000,
  ) {}

  private checkSync(key: string, limit?: number): boolean {
    const now = Date.now();
    const actualLimit = limit ?? this.defaultLimit;
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count < actualLimit) {
      entry.count++;
      return true;
    }

    return false;
  }

  async check(key: string, limit?: number): Promise<boolean> {
    const now = Date.now();
    const actualLimit = limit ?? this.defaultLimit;
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count < actualLimit) {
      entry.count++;
      return true;
    }

    return false;
  }

  async enqueue(key: string, timeoutMs: number = 30000, limit?: number): Promise<boolean> {
    const allowed = this.checkSync(key, limit);
    if (allowed) return true;

    return new Promise<boolean>((resolve) => {
      const queue = this.queues.get(key) ?? [];
      const timeout = setTimeout(() => {
        const idx = this.queues.get(key)?.indexOf(qe) ?? -1;
        if (idx !== -1) this.queues.get(key)?.splice(idx, 1);
        resolve(false);
      }, timeoutMs);

      const qe: QueuedRequest = { resolve, timeout };
      queue.push(qe);
      this.queues.set(key, queue);
    });
  }

  releaseSlot(key: string): void {
    const queue = this.queues.get(key);
    if (queue && queue.length > 0) {
      const next = queue.shift()!;
      clearTimeout(next.timeout);
      next.resolve(true);
      if (queue.length === 0) this.queues.delete(key);
    }
  }

  reset(key?: string): void {
    if (key) {
      this.limits.delete(key);
      this.drainQueue(key);
    } else {
      this.limits.clear();
      for (const k of Array.from(this.queues.keys())) this.drainQueue(k);
    }
  }

  private drainQueue(key: string): void {
    const queue = this.queues.get(key);
    if (queue) {
      for (const qe of queue) {
        clearTimeout(qe.timeout);
        qe.resolve(false);
      }
      this.queues.delete(key);
    }
  }
}
