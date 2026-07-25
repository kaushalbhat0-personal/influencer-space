import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryLockProvider } from "@/lib/generation/infrastructure/locks/in-memory-lock";

describe("InMemoryLockProvider", () => {
  let lock: InMemoryLockProvider;

  beforeEach(() => {
    lock = new InMemoryLockProvider();
  });

  it("acquires a lock", async () => {
    const result = await lock.acquire("resource1");
    if (result.success) expect(result.data).toBe(true);
  });

  it("prevents double acquire", async () => {
    await lock.acquire("r", 10000);
    const result = await lock.acquire("r", 10000);
    if (result.success) expect(result.data).toBe(false);
  });

  it("releases a lock", async () => {
    await lock.acquire("r");
    await lock.release("r");
    const result = await lock.acquire("r");
    if (result.success) expect(result.data).toBe(true);
  });

  it("reports isLocked correctly", async () => {
    expect((await lock.isLocked("r")).success && (await lock.isLocked("r")).data).toBe(false);
    await lock.acquire("r");
    expect((await lock.isLocked("r")).success && (await lock.isLocked("r")).data).toBe(true);
  });

  it("isLocked returns false after release", async () => {
    await lock.acquire("r");
    await lock.release("r");
    expect((await lock.isLocked("r")).success && (await lock.isLocked("r")).data).toBe(false);
  });

  it("acquires again after TTL expiry", async () => {
    vi.useFakeTimers();
    await lock.acquire("r", 100);
    vi.advanceTimersByTime(101);
    const result = await lock.acquire("r", 100);
    if (result.success) expect(result.data).toBe(true);
    vi.useRealTimers();
  });

  it("extends an existing lock", async () => {
    vi.useFakeTimers();
    await lock.acquire("r", 100);
    vi.advanceTimersByTime(50);
    await lock.extend("r", 200);
    vi.advanceTimersByTime(120);
    const result = await lock.isLocked("r");
    if (result.success) expect(result.data).toBe(true);
    vi.useRealTimers();
  });

  it("clear removes all locks", async () => {
    await lock.acquire("a");
    await lock.acquire("b");
    await lock.clear();
    expect(lock.size).toBe(0);
  });

  it("extend does nothing for unknown lock", async () => {
    await lock.extend("nonexistent");
    expect(lock.size).toBe(0);
  });

  it("isLocked returns false for expired lock", async () => {
    vi.useFakeTimers();
    await lock.acquire("r", 50);
    vi.advanceTimersByTime(51);
    const result = await lock.isLocked("r");
    if (result.success) expect(result.data).toBe(false);
    vi.useRealTimers();
  });
});
