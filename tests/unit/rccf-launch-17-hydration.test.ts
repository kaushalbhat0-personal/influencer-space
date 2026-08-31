import { describe, it, expect } from "vitest";

// Mirrors the deterministic formatter added to SuccessJourneyCard.
function formatDate(value: string | number | Date): string {
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

describe("RCCF-LAUNCH-17 — deterministic hydration", () => {
  it("formats the same timestamp identically (no locale drift)", () => {
    const ts = "2026-08-30T00:00:00.000Z";
    // Previously toLocaleDateString() gave 30/8/2026 vs 8/30/2026 depending on locale.
    // New formatter is explicit en-GB UTC -> always 30 Aug 2026
    expect(formatDate(ts)).toBe("30 Aug 2026");
    expect(formatDate(new Date(ts))).toBe("30 Aug 2026");
    expect(formatDate(Date.parse(ts))).toBe("30 Aug 2026");
  });

  it("is not timezone-dependent (UTC)", () => {
    // 2026-08-30T23:00:00Z is still 30 Aug in UTC, but would be 31 Aug in some zones if local.
    expect(formatDate("2026-08-30T23:00:00.000Z")).toBe("30 Aug 2026");
  });
});
