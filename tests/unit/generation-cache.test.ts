import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryGenerationCache } from "@/lib/generation/infrastructure/cache/in-memory-cache";

describe("InMemoryGenerationCache", () => {
  let cache: InMemoryGenerationCache;

  beforeEach(() => {
    cache = new InMemoryGenerationCache();
  });

  it("stores and retrieves values", async () => {
    await cache.set("key1", "value1");
    const result = await cache.get("key1");
    if (result.success) expect(result.data).toBe("value1");
  });

  it("returns null for missing keys", async () => {
    const result = await cache.get("missing");
    if (result.success) expect(result.data).toBeNull();
  });

  it("respects TTL expiration", async () => {
    vi.useFakeTimers();
    await cache.set("key", "val", 100);
    vi.advanceTimersByTime(101);
    const result = await cache.get("key");
    if (result.success) expect(result.data).toBeNull();
    vi.useRealTimers();
  });

  it("invalidates a specific key", async () => {
    await cache.set("key", "val");
    await cache.invalidate("key");
    const result = await cache.get("key");
    if (result.success) expect(result.data).toBeNull();
  });

  it("invalidates by wildcard pattern", async () => {
    await cache.set("gen:123:a", "1");
    await cache.set("gen:123:b", "2");
    await cache.set("other", "3");
    await cache.invalidateByPattern("gen:123:*");
    expect((await cache.get("gen:123:a")).success && (await cache.get("gen:123:a")).data).toBeNull();
    expect((await cache.get("gen:123:b")).success && (await cache.get("gen:123:b")).data).toBeNull();
    expect((await cache.get("other")).success && (await cache.get("other")).data).toBe("3");
  });

  it("exists returns true for valid keys", async () => {
    await cache.set("key", "val");
    const result = await cache.exists("key");
    if (result.success) expect(result.data).toBe(true);
  });

  it("exists returns false for missing keys", async () => {
    const result = await cache.exists("missing");
    if (result.success) expect(result.data).toBe(false);
  });

  it("exists returns false for expired keys", async () => {
    vi.useFakeTimers();
    await cache.set("key", "val", 100);
    vi.advanceTimersByTime(101);
    const result = await cache.exists("key");
    if (result.success) expect(result.data).toBe(false);
    vi.useRealTimers();
  });

  it("clears all entries", async () => {
    await cache.set("a", "1");
    await cache.set("b", "2");
    await cache.clear();
    expect(cache.size).toBe(0);
  });

  it("tracks statistics", async () => {
    await cache.set("k", "v");
    await cache.get("k");
    await cache.get("missing");
    await cache.invalidate("k");
    const s = cache.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
    expect(s.writes).toBe(1);
  });

  it("evicts expired entries on read", async () => {
    vi.useFakeTimers();
    await cache.set("k", "v", 100);
    vi.advanceTimersByTime(101);
    await cache.get("k");
    const s = cache.stats();
    expect(s.evictions).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();
  });
});
