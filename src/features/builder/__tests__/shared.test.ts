/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { generateId, clamp, debounce } from "../shared";

describe("generateId", () => {
  it("returns a string", () => {
    expect(typeof generateId()).toBe("string");
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("contains timestamp prefix", () => {
    const id = generateId();
    expect(id).toMatch(/^\d+_/);
  });
});

describe("clamp", () => {
  it("returns value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps to max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("handles equal bounds", () => {
    expect(clamp(7, 5, 5)).toBe(5);
  });
});

describe("debounce", () => {
  it("calls function after delay", async () => {
    let called = false;
    const fn = debounce(() => { called = true; }, 50);
    fn();
    expect(called).toBe(false);
    await new Promise((r) => setTimeout(r, 100));
    expect(called).toBe(true);
  });

  it("cancels previous pending call", async () => {
    let count = 0;
    const fn = debounce(() => { count++; }, 50);
    fn();
    fn();
    fn();
    await new Promise((r) => setTimeout(r, 100));
    expect(count).toBe(1);
  });
});
