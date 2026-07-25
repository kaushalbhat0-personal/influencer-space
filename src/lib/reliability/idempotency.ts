import { prisma } from "@/lib/prisma";

const DEFAULT_TTL_MS = 86_400_000;

const inMemoryStore = new Map<string, { result: unknown; timestamp: number }>();

export class IdempotencyService {
  private ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  async isDuplicate(key: string): Promise<boolean> {
    const cached = inMemoryStore.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) return true;
    const existing = await prisma.billingEvent.findUnique({ where: { idempotencyKey: key }, select: { id: true } }).catch(() => null);
    if (existing) { inMemoryStore.set(key, { result: null, timestamp: Date.now() }); return true; }
    return false;
  }

  async markProcessed(key: string, result?: unknown): Promise<void> {
    inMemoryStore.set(key, { result, timestamp: Date.now() });
  }

  getResult<T>(key: string): T | undefined {
    const cached = inMemoryStore.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) return cached.result as T;
    return undefined;
  }

  clear(): void { inMemoryStore.clear(); }
  get size(): number { return inMemoryStore.size; }
}

export const idempotencyService = new IdempotencyService();
