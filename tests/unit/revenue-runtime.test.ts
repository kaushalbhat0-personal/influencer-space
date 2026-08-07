import { describe, it, expect } from "vitest";
import { computeSubscriptionSplit, type RevenueSplit } from "@/lib/commission/runtime";

describe("RCCF-IMPLEMENTATION-72 — subscription revenue split", () => {
  it("computes an 80/20 platform/agency split that sums to the amount", () => {
    const src = { platformPercent: 80, partnerPercent: 20, ruleId: null, source: "default" as const };
    const split = computeSubscriptionSplit(699, src);
    expect(split.platformPercent).toBe(80);
    expect(split.partnerPercent).toBe(20);
    expect(Math.round((split.platformShare + split.partnerShare) * 100) / 100).toBe(699);
    expect(split.partnerShare).toBe(139.8);
    expect(split.platformShare).toBe(559.2);
  });

  it("computes a 70/30 split (CommissionPolicy agencyDefaultShare)", () => {
    const src = { platformPercent: 70, partnerPercent: 30, ruleId: null, source: "policy" as const };
    const split = computeSubscriptionSplit(1000, src);
    expect(split.partnerShare).toBe(300);
    expect(split.platformShare).toBe(700);
  });

  it("handles a partner rule override (e.g. 60/40)", () => {
    const src = { platformPercent: 60, partnerPercent: 40, ruleId: "rule_x", source: "rule" as const };
    const split = computeSubscriptionSplit(2500, src);
    expect(split.partnerShare).toBe(1000);
    expect(split.platformShare).toBe(1500);
    expect(split.ruleId).toBe("rule_x");
  });

  it("never yields a negative partner share and never over-splits", () => {
    const src = { platformPercent: 50, partnerPercent: 50, ruleId: null, source: "default" as const };
    for (const amount of [1, 3, 99, 101, 699, 1999]) {
      const split = computeSubscriptionSplit(amount, src);
      expect(split.partnerShare).toBeGreaterThanOrEqual(0);
      expect(Math.round((split.platformShare + split.partnerShare) * 100) / 100).toBe(Math.round(amount * 100) / 100);
    }
  });

  it("rounds to paise (2dp) consistently", () => {
    const src = { platformPercent: 70, partnerPercent: 30, ruleId: null, source: "policy" as const };
    const split = computeSubscriptionSplit(1999, src);
    expect(split.partnerShare).toBe(599.7);
    expect(split.platformShare).toBe(1399.3);
    expect(split.platformShare + split.partnerShare).toBe(1999);
  });
});
