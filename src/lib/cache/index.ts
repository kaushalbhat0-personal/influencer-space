type CacheEntry<T> = { value: T; expiresAt: number };

export class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(private ttlMs: number = 5000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (Date.now() > entry.expiresAt) { this.store.delete(key); this.misses++; return undefined; }
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  stats(): { size: number; hits: number; misses: number } {
    return { size: this.store.size, hits: this.hits, misses: this.misses };
  }
}

// Shared caches for common lookups
export const tenantCache = new SimpleCache<{ id: string; subdomain: string; customDomain: string | null }>(3000);
export const websiteCache = new SimpleCache<{ id: string; tenantId: string; themePackageId: string }>(5000);
export const userCache = new SimpleCache<{ id: string; tenantId: string | null; role: string }>(3000);
