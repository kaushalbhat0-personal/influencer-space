import { describe, it, expect } from "vitest";
import { themeEntitlementDecision } from "@/lib/theme/entitlement";
import { THEME_TIER_BY_ID } from "@/lib/theme/tiers";

describe("RCCF-36 — theme server gate is authoritative over the marketplace tier band", () => {
  it("a business-tier theme is blocked for Launch (no premium_themes) even though the marketplace shows tier bands", () => {
    expect(themeEntitlementDecision("business", "creator_launch")).toMatchObject({ allowed: false });
    // The exact theme the provisioning personalizer once assigned to tech/travel:
    expect(THEME_TIER_BY_ID["com.creatos.midnight-ocean"]).toBe("business");
    expect(themeEntitlementDecision(THEME_TIER_BY_ID["com.creatos.midnight-ocean"], "creator_launch")).toMatchObject({ allowed: false });
  });

  it("a business-tier theme is allowed for Scale (premium_themes)", () => {
    expect(themeEntitlementDecision("business", "creator_scale")).toMatchObject({ allowed: true });
  });

  it("free themes are always allowed on any plan", () => {
    expect(themeEntitlementDecision("free", "creator_launch")).toMatchObject({ allowed: true });
    expect(themeEntitlementDecision("free", null)).toMatchObject({ allowed: true });
  });

  it("an unknown plan can never unlock a premium theme", () => {
    expect(themeEntitlementDecision("pro", "unknown_plan")).toMatchObject({ allowed: false });
  });
});
