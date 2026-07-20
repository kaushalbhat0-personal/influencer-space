import type { RenderResult } from "./types";
import type { SurfaceId } from "@/lib/theme/types";

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTLMs: number;
  maxEntries: number;
}

export interface CacheStats {
  name: string;
  entries: number;
  maxEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  memoryBytes: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  defaultTTLMs: 5 * 60 * 1000, // 5 minutes
  maxEntries: 1000,
};

function buildCacheKey(
  tenantId: string,
  surface: SurfaceId,
  options?: { themeId?: string; layoutName?: string; moduleVersions?: string }
): string {
  const parts = [tenantId, surface];
  if (options?.themeId) parts.push(`t:${options.themeId}`);
  if (options?.layoutName) parts.push(`l:${options.layoutName}`);
  if (options?.moduleVersions) parts.push(`mv:${options.moduleVersions}`);
  return parts.join("|");
}

export class RenderCache {
  private cache = new Map<string, CacheEntry<RenderResult>>();
  private config: CacheConfig;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get(tenantId: string, surface: SurfaceId, options?: { themeId?: string; layoutName?: string; moduleVersions?: string }): RenderResult | null {
    const key = buildCacheKey(tenantId, surface, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.evictions++;
      this.misses++;
      return null;
    }

    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.hits++;
    return entry.value;
  }

  set(
    tenantId: string,
    surface: SurfaceId,
    result: RenderResult,
    ttlMs?: number,
    options?: { themeId?: string; layoutName?: string; moduleVersions?: string }
  ): void {
    const key = buildCacheKey(tenantId, surface, options);

    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const entrySize = this.estimateSize(result);
    if (this.totalSize() + entrySize > this.config.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value: result,
      createdAt: now,
      expiresAt: now + (ttlMs ?? this.config.defaultTTLMs),
      lastAccessed: now,
      accessCount: 0,
      size: entrySize,
    });
  }

  invalidate(tenantId: string, surface?: SurfaceId): number {
    let count = 0;
    for (const [key] of Array.from(this.cache.entries())) {
      if (key.startsWith(tenantId)) {
        if (!surface || key.includes(`|${surface}`)) {
          this.cache.delete(key);
          count++;
        }
      }
    }
    this.evictions += count;
    return count;
  }

  invalidateAll(): void {
    this.evictions += this.cache.size;
    this.cache.clear();
  }

  has(tenantId: string, surface: SurfaceId): boolean {
    return this.cache.has(buildCacheKey(tenantId, surface));
  }

  stats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    let oldest: number | null = null;
    let newest: number | null = null;
    let totalSize = 0;

    for (const [, entry] of entries) {
      if (oldest === null || entry.createdAt < oldest) oldest = entry.createdAt;
      if (newest === null || entry.createdAt > newest) newest = entry.createdAt;
      totalSize += entry.size;
    }

    return {
      name: "render-cache",
      entries: this.cache.size,
      maxEntries: this.config.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100) / 100
        : 0,
      evictions: this.evictions,
      memoryBytes: totalSize,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  get size(): number {
    return this.cache.size;
  }

  private totalSize(): number {
    let total = 0;
    for (const entry of Array.from(this.cache.values())) {
      total += entry.size;
    }
    return total;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
    }
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.evictions++;
    }
  }

  private estimateSize(result: RenderResult): number {
    return JSON.stringify(result).length * 2;
  }
}

export const renderCache = new RenderCache();
