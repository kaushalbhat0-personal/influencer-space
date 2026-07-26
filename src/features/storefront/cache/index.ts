import type { CacheEntry } from "../types";

const snapshotCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 60000;

export function getCached<T>(key: string): T | null {
  const entry = snapshotCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > entry.ttl) {
    snapshotCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  snapshotCache.set(key, { data, cachedAt: Date.now(), ttl });
}

export function invalidateCache(key: string): void {
  snapshotCache.delete(key);
}

export function invalidateCacheByPrefix(prefix: string): void {
  Array.from(snapshotCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      snapshotCache.delete(key);
    }
  });
}

export function clearAllCache(): void {
  snapshotCache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return { size: snapshotCache.size, keys: Array.from(snapshotCache.keys()) };
}

export function buildCacheKey(tenantId: string, version?: number): string {
  return version ? `snapshot:${tenantId}:v${version}` : `snapshot:${tenantId}:live`;
}

export function invalidateAfterPublish(tenantId: string): void {
  invalidateCacheByPrefix(`snapshot:${tenantId}`);
}

export function isCacheStale(key: string, maxAge: number): boolean {
  const entry = snapshotCache.get(key);
  if (!entry) return true;
  return Date.now() - entry.cachedAt > maxAge;
}

export const cacheMetrics = {
  hits: 0,
  misses: 0,
  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  },
};
