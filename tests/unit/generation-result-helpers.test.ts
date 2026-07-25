import { describe, it, expect } from "vitest";
import { success, failure, isSuccess, isFailure, map, flatMap, combine, unwrap, unwrapOr } from "@/lib/generation/infrastructure/helpers/result";

describe("Result helpers", () => {
  describe("success", () => {
    it("creates a success result", () => {
      const r = success(42);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toBe(42);
    });
  });

  describe("failure", () => {
    it("creates a failure result", () => {
      const r = failure(new Error("nope"));
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.message).toBe("nope");
    });
  });

  describe("isSuccess / isFailure", () => {
    it("discriminates success", () => {
      expect(isSuccess(success(1))).toBe(true);
      expect(isSuccess(failure("err"))).toBe(false);
    });

    it("discriminates failure", () => {
      expect(isFailure(failure("err"))).toBe(true);
      expect(isFailure(success(1))).toBe(false);
    });
  });

  describe("map", () => {
    it("transforms success data", () => {
      const r = map(success(3), (x) => x * 2);
      if (r.success) expect(r.data).toBe(6);
    });

    it("passes through failure", () => {
      const r = map(failure("err"), (x: number) => x * 2);
      expect(r.success).toBe(false);
    });
  });

  describe("flatMap", () => {
    it("chains on success", () => {
      const r = flatMap(success(3), (x) => success(x * 2));
      if (r.success) expect(r.data).toBe(6);
    });

    it("passes through failure", () => {
      const r = flatMap(failure("err"), (x: number) => success(x * 2));
      expect(r.success).toBe(false);
    });

    it("short-circuits on inner failure", () => {
      const r = flatMap(success(3), () => failure("inner"));
      expect(r.success).toBe(false);
    });
  });

  describe("combine", () => {
    it("collects all successes", () => {
      const r = combine([success(1), success(2), success(3)]);
      if (r.success) expect(r.data).toEqual([1, 2, 3]);
    });

    it("returns first failure", () => {
      const r = combine([success(1), failure("err"), success(3)]);
      expect(r.success).toBe(false);
    });

    it("returns empty array for empty input", () => {
      const r = combine([]);
      if (r.success) expect(r.data).toEqual([]);
    });
  });

  describe("unwrap", () => {
    it("returns data on success", () => {
      expect(unwrap(success(42))).toBe(42);
    });

    it("throws on failure", () => {
      expect(() => unwrap(failure(new Error("boom")))).toThrow("boom");
    });
  });

  describe("unwrapOr", () => {
    it("returns data on success", () => {
      expect(unwrapOr(success(42), 0)).toBe(42);
    });

    it("returns fallback on failure", () => {
      expect(unwrapOr(failure("err"), 0)).toBe(0);
    });
  });
});
