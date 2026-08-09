// ── Theme Entitlement by Canonical Plan Code — RCCF-LAUNCH-TRACK-06 (Phase 5)
// The Builder theme picker must unlock every entitled theme. Regression: the
// builder previously received the plan DISPLAY name ("Creator Growth") which
// resolvePlan() mapped to "free", locking ALL premium themes for Grow/Scale.

import { describe, it, expect } from "vitest";
import { resolvePlan } from "@/lib/capabilities/plan-resolution";
import { themeUnlockedForPlan } from "@/lib/theme/tiers";

describe("theme entitlement resolves canonical plan codes", () => {
  it("canonical codes map to the correct tier (not the display name)", () => {
    expect(resolvePlan("creator_launch").tier).toBe("free");
    expect(resolvePlan("creator_grow").tier).toBe("pro");
    expect(resolvePlan("creator_scale").tier).toBe("business");
  });

  it("Grow users unlock pro-tier premium themes", () => {
    expect(themeUnlockedForPlan({ id: "test-theme", tier: "pro" }, "creator_grow")).toBe(true);
  });

  it("Scale users unlock business-tier (all) themes", () => {
    expect(themeUnlockedForPlan({ id: "test-theme", tier: "business" }, "creator_scale")).toBe(true);
    expect(themeUnlockedForPlan({ id: "test-theme", tier: "pro" }, "creator_scale")).toBe(true);
  });

  it("Free users stay locked from premium themes", () => {
    expect(themeUnlockedForPlan({ id: "test-theme", tier: "pro" }, "creator_launch")).toBe(false);
  });

  it("the display name no longer locks everyone out (regression guard)", () => {
    // resolvePlan("Creator Growth") == free — if the builder passed the display
    // name this assertion proves the bug; the fix passes the canonical code.
    expect(themeUnlockedForPlan({ id: "test-theme", tier: "pro" }, "Creator Growth")).toBe(false);
    expect(themeUnlockedForPlan({ id: "test-theme", tier: "pro" }, "creator_grow")).toBe(true);
  });
});
