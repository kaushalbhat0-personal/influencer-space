import { describe, it, expect } from "vitest";
import { computePublishPeriod } from "@/lib/publishing/publish-period";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const CREATED = new Date("2026-01-10T08:30:00.000Z");

describe("computePublishPeriod — RCCF-31", () => {
  it("uses a stable lifetime period anchored at the tenant creation time", () => {
    const p = computePublishPeriod("lifetime", CREATED, NOW);
    expect(p.periodStart).toEqual(CREATED);
    expect(p.periodEnd).toBeNull();
  });

  it("uses the current calendar-month window for monthly plans", () => {
    const p = computePublishPeriod("monthly", CREATED, NOW);
    expect(p.periodStart).toEqual(new Date("2026-08-01T00:00:00.000Z"));
    expect(p.periodEnd!.getUTCMonth()).toBe(7); // August
    expect(p.periodEnd!.getUTCDate()).toBe(31);
  });

  it("produces a distinct window for the next month (immutable history)", () => {
    const aug = computePublishPeriod("monthly", CREATED, new Date("2026-08-01T00:00:00.000Z"));
    const sep = computePublishPeriod("monthly", CREATED, new Date("2026-09-01T00:00:00.000Z"));
    expect(sep.periodStart.getTime()).toBeGreaterThan(aug.periodStart.getTime());
  });
});