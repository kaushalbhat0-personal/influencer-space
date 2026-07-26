/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { formatVersionDate } from "../versions";

describe("formatVersionDate", () => {
  it("formats valid ISO date string", () => {
    const result = formatVersionDate("2026-07-26T12:00:00.000Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("returns input string for invalid date", () => {
    expect(formatVersionDate("not-a-date")).toBe("not-a-date");
  });

  it("returns non-empty for valid date", () => {
    expect(formatVersionDate("2026-01-01T00:00:00.000Z").length).toBeGreaterThan(0);
  });

  it("handles empty string", () => {
    expect(formatVersionDate("")).toBe("");
  });
});
