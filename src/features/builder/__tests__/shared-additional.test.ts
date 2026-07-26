/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { generateId, clamp, debounce } from "../shared";

describe("generateId detailed", () => {
  it("never returns empty string", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateId().length).toBeGreaterThan(0);
    }
  });

  it("contains underscore separator", () => {
    expect(generateId()).toContain("_");
  });
});

describe("clamp detailed", () => {
  it("handles negative values", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("handles values above max", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("handles values exactly at boundaries", () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });

  it("handles values at min boundary", () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });
});

describe("debounce detailed", () => {
  it("delays execution", async () => {
    let called = false;
    const fn = debounce(() => { called = true; }, 100);
    fn();
    expect(called).toBe(false);
    await new Promise((r) => setTimeout(r, 50));
    expect(called).toBe(false);
    await new Promise((r) => setTimeout(r, 100));
    expect(called).toBe(true);
  });

  it("uses latest arguments", async () => {
    let lastArg = "";
    const fn = debounce((arg: unknown) => { lastArg = arg as string; }, 50);
    fn("first");
    fn("second");
    await new Promise((r) => setTimeout(r, 100));
    expect(lastArg).toBe("second");
  });

  it("can be called multiple times sequentially", async () => {
    let count = 0;
    const fn = debounce(() => { count++; }, 30);
    fn();
    await new Promise((r) => setTimeout(r, 50));
    expect(count).toBe(1);
    fn();
    await new Promise((r) => setTimeout(r, 50));
    expect(count).toBe(2);
  });
});
