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

  it("PLATFORM_COLLECT is the default and the only active strategy", () => {
    expect(DEFAULT_COMMERCE_STRATEGY_ID).toBe("PLATFORM_COLLECT");
    const active = COMMERCE_STRATEGY_REGISTRY.filter((s) => s.status === "active");
    expect(active.map((s) => s.id)).toEqual(["PLATFORM_COLLECT"]);
    expect(active[0]!.merchantOfRecord).toBe("platform");
    expect(active[0]!.requiresLinkedAccount).toBe(false);
    expect(active[0]!.requiresSettlement).toBe(false);
  });

  it("DIRECT_CREATOR is declared future and needs a linked account + settlement", () => {
    const dc = COMMERCE_STRATEGY_BY_ID["DIRECT_CREATOR"];
    expect(dc).toBeDefined();
    expect(dc!.status).toBe("future");
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
