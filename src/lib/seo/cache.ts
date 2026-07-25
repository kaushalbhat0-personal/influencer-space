import type { MetadataCacheEntry, MetadataCacheConfig } from "./types";

export interface SEOMetadataCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, pageType: string): void;
  invalidate(key: string): boolean;
  invalidateByPageType(pageType: string): number;
  invalidateAll(): void;
  warm<T>(entries: Array<{ key: string; value: T; pageType: string }>): void;
  size(): number;
}

const DEFAULT_CACHE_CONFIG: MetadataCacheConfig = {
  defaultTTL: 5 * 60 * 1000,
  maxEntries: 500,
};

export class InMemoryMetadataCache implements SEOMetadataCache {
  private cache = new Map<string, MetadataCacheEntry>();
  private config: MetadataCacheConfig;

  constructor(config: MetadataCacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as MetadataCacheEntry<T> | undefined;
    if (!entry) return undefined;

    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set<T>(key: string, value: T, pageType: string): void {
    if (this.cache.size >= this.config.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    const entry: MetadataCacheEntry<T> = {
      key,
      value,
      pageType,
      createdAt: Date.now(),
      ttl: this.config.defaultTTL,
    };

    this.cache.set(key, entry as MetadataCacheEntry);
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByPageType(pageType: string): number {
    let count = 0;
    this.cache.forEach((entry, key) => {
      if (entry.pageType === pageType) {
        this.cache.delete(key);
        count++;
      }
    });
    return count;
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  warm<T>(entries: Array<{ key: string; value: T; pageType: string }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.pageType);
    }
  }

  size(): number {
    return this.cache.size;
  }
}

export const metadataCache = new InMemoryMetadataCache();
