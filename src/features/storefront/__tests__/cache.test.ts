/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getCached, setCache, invalidateCache, invalidateCacheByPrefix, clearAllCache,
  getCacheStats, buildCacheKey, invalidateAfterPublish, isCacheStale, cacheMetrics,
} from "../cache";

describe("cache operations", () => {
  beforeEach(() => {
    clearAllCache();
    cacheMetrics.hits = 0;
    cacheMetrics.misses = 0;
  });

  it("getCached returns null for missing key", () => {
    expect(getCached("missing")).toBeNull();
  });

  it("setCache and getCached round-trip", () => {
    setCache("key1", { hello: "world" });
    expect(getCached("key1")).toEqual({ hello: "world" });
  });

  it("getCached returns null after TTL expiry", () => {
    setCache("key1", "data", -1);
    expect(getCached("key1")).toBeNull();
  });

  it("invalidateCache removes specific key", () => {
    setCache("key1", "data");
    invalidateCache("key1");
    expect(getCached("key1")).toBeNull();
  });

  it("invalidateCacheByPrefix removes matching keys", () => {
    setCache("snapshot:t1:live", "live");
    setCache("snapshot:t1:v1", "v1");
    setCache("other", "keep");
    invalidateCacheByPrefix("snapshot:t1");
    expect(getCached("snapshot:t1:live")).toBeNull();
    expect(getCached("snapshot:t1:v1")).toBeNull();
    expect(getCached("other")).toBe("keep");
  });

  it("clearAllCache removes everything", () => {
    setCache("a", 1);
    setCache("b", 2);
    clearAllCache();
    expect(getCacheStats().size).toBe(0);
  });

  it("getCacheStats returns size and keys", () => {
    setCache("x", 1);
    setCache("y", 2);
    const stats = getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain("x");
    expect(stats.keys).toContain("y");
  });
});

describe("buildCacheKey", () => {
  it("builds live key without version", () => {
    expect(buildCacheKey("t1")).toBe("snapshot:t1:live");
  });

  it("builds versioned key", () => {
    expect(buildCacheKey("t1", 3)).toBe("snapshot:t1:v3");
  });
});

describe("invalidateAfterPublish", () => {
  it("invalidates all snapshots for tenant", () => {
    setCache("snapshot:t1:live", "live");
    setCache("snapshot:t1:v1", "v1");
    invalidateAfterPublish("t1");
    expect(getCached("snapshot:t1:live")).toBeNull();
    expect(getCached("snapshot:t1:v1")).toBeNull();
  });

  it("does not affect other tenants", () => {
    setCache("snapshot:t2:live", "other");
    invalidateAfterPublish("t1");
    expect(getCached("snapshot:t2:live")).toBe("other");
  });
});

describe("isCacheStale", () => {
  it("returns true for missing entry", () => {
    expect(isCacheStale("missing", 1000)).toBe(true);
  });

  it("returns true for expired entry", () => {
    setCache("key", "data", 60000);
    expect(isCacheStale("key", -1)).toBe(true);
  });

  it("returns false for fresh entry", () => {
    setCache("key", "data", 60000);
    expect(isCacheStale("key", 60000)).toBe(false);
  });
});

describe("cacheMetrics", () => {
  it("hitRate is 0 when no calls", () => {
    expect(cacheMetrics.hitRate).toBe(0);
  });

  it("hitRate calculates correctly", () => {
    cacheMetrics.hits = 3;
    cacheMetrics.misses = 1;
    expect(cacheMetrics.hitRate).toBe(0.75);
  });
});
