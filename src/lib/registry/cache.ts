export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

export interface CacheStats {
  name: string;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  lastInvalidation: number | null;
  invalidationCount: number;
}

export class RegistryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private name: string;
  private hits = 0;
  private misses = 0;
  private lastInvalidation: number | null = null;
  private invalidationCount = 0;

  constructor(name: string) {
    this.name = name;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.hits++;
      return entry.value;
    }
    this.misses++;
    return undefined;
  }

  set(key: string, value: T): void {
    const now = Date.now();
    const existing = this.cache.get(key);
    this.cache.set(key, {
      value,
      createdAt: existing?.createdAt ?? now,
      lastAccessed: now,
      accessCount: (existing?.accessCount ?? 0) + 1,
    });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.lastInvalidation = Date.now();
    this.invalidationCount++;
    this.cache.clear();
  }

  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.lastInvalidation = Date.now();
      this.invalidationCount++;
    }
    return deleted;
  }

  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.lastInvalidation = Date.now();
      this.invalidationCount++;
    }
    return count;
  }

  stats(): CacheStats {
    const entries = Array.from(this.cache.values());
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const entry of entries) {
      if (oldest === null || entry.createdAt < oldest) oldest = entry.createdAt;
      if (newest === null || entry.createdAt > newest) newest = entry.createdAt;
    }

    return {
      name: this.name,
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100) / 100
        : 0,
      oldestEntry: oldest,
      newestEntry: newest,
      lastInvalidation: this.lastInvalidation,
      invalidationCount: this.invalidationCount,
    };
  }

  get size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}
