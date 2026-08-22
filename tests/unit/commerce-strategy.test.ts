import { describe, it, expect } from "vitest";
import {
  COMMERCE_STRATEGY_REGISTRY,
  COMMERCE_STRATEGY_BY_ID,
  DEFAULT_COMMERCE_STRATEGY_ID,
} from "@/modules/commerce-strategy";

describe("RCCF-IMPLEMENTATION-73 — commerce strategy registry", () => {
  it("declares the four canonical strategies", () => {
    const ids = COMMERCE_STRATEGY_REGISTRY.map((s) => s.id);
    expect(ids).toEqual(["PLATFORM_COLLECT", "DIRECT_CREATOR", "MARKETPLACE", "HYBRID"]);
  });

  it("has a complete declarative surface on every strategy", () => {
    for (const s of COMMERCE_STRATEGY_REGISTRY) {
      expect(typeof s.label).toBe("string");
      expect(typeof s.description).toBe("string");
      expect(["platform", "creator"]).toContain(s.merchantOfRecord);
      for (const flag of ["supportsTransfers", "supportsSubscriptions", "supportsProducts", "supportsBookings", "supportsServices", "supportsCourses", "requiresLinkedAccount", "requiresSettlement", "requiresShipping", "requiresDigitalDelivery"] as const) {
        expect(typeof s[flag], `${s.id}.${flag}`).toBe("boolean");
      }
    }
  });

  it("PLATFORM_COLLECT remains the default strategy; DIRECT_CREATOR joined it as active (D.6.5)", () => {
    expect(DEFAULT_COMMERCE_STRATEGY_ID).toBe("PLATFORM_COLLECT");
    // RCCF-72.18D.6.5 modernized this guardrail: pre-flip revisions asserted
    // PLATFORM_COLLECT was the ONLY active strategy. The authorized activation
    // makes DIRECT_CREATOR the second active strategy; platform behavior
    // itself is unchanged.
    const active = COMMERCE_STRATEGY_REGISTRY.filter((s) => s.status === "active").map((s) => s.id);
    expect(active).toEqual(["PLATFORM_COLLECT", "DIRECT_CREATOR"]);
    expect(COMMERCE_STRATEGY_BY_ID["PLATFORM_COLLECT"]!.merchantOfRecord).toBe("platform");
    expect(COMMERCE_STRATEGY_BY_ID["PLATFORM_COLLECT"]!.requiresLinkedAccount).toBe(false);
    expect(COMMERCE_STRATEGY_BY_ID["PLATFORM_COLLECT"]!.requiresSettlement).toBe(false);
  });

  it("DIRECT_CREATOR is active and requires a linked account + settlement", () => {
    const dc = COMMERCE_STRATEGY_BY_ID["DIRECT_CREATOR"];
    expect(dc).toBeDefined();
    // RCCF-72.18D.6.5 — `future` gated the strategy pre-activation; `active`
    // is the canonical state since the authorized flip.
    expect(dc!.status).toBe("active");
    expect(dc!.merchantOfRecord).toBe("creator");
    expect(dc!.requiresLinkedAccount).toBe(true);
    expect(dc!.requiresSettlement).toBe(true);
  });

  it("reserved strategies (MARKETPLACE/HYBRID) are architecture-only", () => {
    expect(COMMERCE_STRATEGY_BY_ID["MARKETPLACE"]!.status).toBe("reserved");
    expect(COMMERCE_STRATEGY_BY_ID["HYBRID"]!.status).toBe("reserved");
    expect(COMMERCE_STRATEGY_BY_ID["MARKETPLACE"]!.supportsTransfers).toBe(true);
  });
});
