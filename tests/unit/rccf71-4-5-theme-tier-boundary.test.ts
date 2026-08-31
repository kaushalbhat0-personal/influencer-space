import { describe, it, expect } from "vitest";
import { themeEntitlementDecision } from "@/lib/theme/entitlement";
import { isThemeUnlocked, planTier } from "@/lib/theme/access";
import { themeUnlockedForPlan, THEME_TIER_BY_ID } from "@/lib/theme/tiers";

/**
 * RCCF-71.4.5 (F2) — server-side theme tier enforcement.
 *
 * Invariant under test: the server decision (themeEntitlementDecision) and the
 * marketplace/UI tier-band lock (isThemeUnlocked / themeUnlockedForPlan) MUST
 * agree for every tier/plan boundary. No UI-allowed theme may be server-denied
 * and no server-allowed theme may be UI-locked.
 */

const theme = (tier: Parameters<typeof themeUnlockedForPlan>[0]["tier"], id = `t-${tier}`) => ({ id, tier });

const UI = {
  unlocked: (tier: Parameters<typeof themeUnlockedForPlan>[0]["tier"], plan: string | null | undefined) =>
    isThemeUnlocked(tier, plan),
  unlockedForPlan: (t: Parameters<typeof themeUnlockedForPlan>[0], plan: string | null | undefined) =>
    themeUnlockedForPlan(t, plan),
};

const agree = (tier: Parameters<typeof themeEntitlementDecision>[0], plan: string | null | undefined) => {
  const server = themeEntitlementDecision(tier, plan).allowed;
  const ui = UI.unlocked(tier, plan);
  return { server, ui, agree: server === ui };
};

describe("RCCF-71.4.5 F2 — server theme tier enforcement matches the UI tier band", () => {
  it("Launch (creator_launch) cannot apply any premium theme (capability + tier)", () => {
    expect(themeEntitlementDecision("pro", "creator_launch").allowed).toBe(false);
    expect(themeEntitlementDecision("business", "creator_launch").allowed).toBe(false);
    expect(themeEntitlementDecision("enterprise", "creator_launch").allowed).toBe(false);
    // midnight-ocean is a business-tier catalog theme.
    expect(themeEntitlementDecision(THEME_TIER_BY_ID["com.creatos.midnight-ocean"], "creator_launch").allowed).toBe(false);
  });

  it("Growth (creator_grow) can apply pro-level themes but not business/enterprise-only themes", () => {
    expect(themeEntitlementDecision("pro", "creator_grow").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "creator_grow").allowed).toBe(false);
    expect(themeEntitlementDecision("enterprise", "creator_grow").allowed).toBe(false);
  });

  it("Scale (creator_scale) can apply business themes and business-tier catalog themes", () => {
    expect(themeEntitlementDecision("business", "creator_scale").allowed).toBe(true);
    expect(themeEntitlementDecision(THEME_TIER_BY_ID["com.creatos.midnight-ocean"], "creator_scale").allowed).toBe(true);
    expect(themeEntitlementDecision("pro", "creator_scale").allowed).toBe(true);
  });

  it("Enterprise (creator_enterprise) can apply enterprise themes (canonical registry)", () => {
    expect(themeEntitlementDecision("enterprise", "creator_enterprise").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "creator_enterprise").allowed).toBe(true);
  });

  it("free-tier themes are always allowed for everyone", () => {
    expect(themeEntitlementDecision("free", "creator_launch").allowed).toBe(true);
    expect(themeEntitlementDecision("free", "creator_grow").allowed).toBe(true);
    expect(themeEntitlementDecision("free", null).allowed).toBe(true);
  });

  it("the exact boundary (theme tier == plan tier) is allowed", () => {
    expect(themeEntitlementDecision("pro", "creator_pro").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "creator_elite").allowed).toBe(true);
    expect(themeEntitlementDecision("pro", "partner_solo").allowed).toBe(true);
    expect(themeEntitlementDecision("enterprise", "partner_enterprise").allowed).toBe(true);
  });

  it("server decision and UI tier-band lock agree across the whole matrix", () => {
    const tiers: Array<Parameters<typeof themeEntitlementDecision>[0]> = ["free", "starter", "pro", "business", "enterprise"];
    const plans: Array<string | null> = [
      null,
      "creator_launch",
      "creator_free",
      "creator_grow",
      "creator_pro",
      "creator_scale",
      "creator_elite",
      "creator_enterprise",
      "partner_solo",
      "PRO",
      "GROWTH",
    ];
    for (const tier of tiers) {
      for (const plan of plans) {
        const result = agree(tier, plan);
        expect(result.agree, `server=${result.server} ui=${result.ui} mismatch for tier=${tier} plan=${plan}`).toBe(true);
      }
    }
  });

  it("themeUnlockedForPlan (theme-object surface) also agrees with the server decision", () => {
    for (const [id, tier] of Object.entries(THEME_TIER_BY_ID)) {
      const plan = "creator_grow"; // pro band
      expect(UI.unlockedForPlan(theme(tier, id), plan), `ui lock mismatch for ${id}`).toBe(
        themeEntitlementDecision(tier, plan).allowed,
      );
      // planTier of the canonical band must equal the decision's tier floor.
      expect(planTier("creator_grow")).toBe("pro");
    }
  });
});