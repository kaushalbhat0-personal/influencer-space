import { success } from "../helpers/result";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
}

export class InMemoryGenerationCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private stats_: CacheStats = { hits: 0, misses: 0, writes: 0, evictions: 0 };

  async get<T>(key: string) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats_.misses++;
      return success(null);
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats_.evictions++;
      this.stats_.misses++;
      return success(null);
    }
    this.stats_.hits++;
    return success(entry.value as T);
  }

  async set<T>(key: string, value: T, ttlMs = 300000) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    this.stats_.writes++;
    return success(undefined);
  }

  async invalidate(key: string) {
    if (this.store.delete(key)) this.stats_.evictions++;
    return success(undefined);
  }

  async invalidateByPattern(pattern: string) {
    const regex = new RegExp(pattern.replace(/\*/g, ".*").replace(/\?/g, "."));
    for (const key of Array.from(this.store.keys())) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.stats_.evictions++;
      }
    }
    return success(undefined);
  }

  async exists(key: string) {
    const entry = this.store.get(key);
    if (!entry) return success(false);
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats_.evictions++;
      return success(false);
    }
    return success(true);
  }

  async clear() {
    this.store.clear();
    return success(undefined);
  }

  get size(): number {
    return this.store.size;
  }

  stats(): CacheStats {
    return { ...this.stats_ };
  }
}
