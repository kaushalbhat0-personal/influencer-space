import { describe, it, expect } from "vitest";
import { getThemeTier, themeUnlockedForPlan, THEME_TIER_BY_ID } from "@/lib/theme/tiers";
import { themeRegistry } from "@/lib/theme/registry-new";
import { themeEntitlementDecision } from "@/lib/theme/entitlement";
import { THEME_FAMILY_MAP, themeIdForFamily } from "@/lib/generation/intelligence/composition/config";
import { composeStorefront, sourceToCompositionIdentity } from "@/lib/generation/intelligence/composition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { isExperienceAvailableForPlan } from "@/modules/theme/runtime/experience/theme-experience";
import type { ContentSource } from "@/lib/generation/intelligence/types";

function composeForBio(bio: string) {
  const src: ContentSource = {
    platform: "youtube",
    username: "testrestaurant",
    displayName: "Test Restaurant",
    bio,
    avatarUrl: "https://img/avatar.jpg",
    followers: 1000,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: ["https://x.com/testrestaurant"],
  };
  const evidence = buildEvidenceIntelligence({
    sourceText: bio,
    sourceContentTexts: [src.platform],
    followers: src.followers,
    acquisitionCompleteness: 0.9,
    graphNiche: null,
    graphConfidence: 0.5,
    aiEntity: null,
    aiNiches: [],
    aiBusinessModel: null,
    aiUsed: false,
  });
  const relationships = buildRelationshipGraph(bio, [src.platform]);
  const blueprint = buildWebsiteBlueprint({
    evidence,
    relationships,
    identity: { entityType: null, primaryNiche: evidence.primaryNiche, businessModel: null, audience: [], name: src.displayName, username: src.username, subdomain: src.username },
  });
  // Inject archetype-like: local_business would use warm-dining
  // But blueprint already derives archetype from relationships? For restaurant bio, blueprint should be warm-dining
  const identity = sourceToCompositionIdentity(src);
  identity.entityType = blueprint.entity;
  return { blueprint, evidence, relationships, src, identity };
}

describe("RCCF-17E — Restaurant warm-dining availability on Launch (free)", () => {
  it("THEME_FAMILY_MAP warm-dining still points to modern-restaurant", () => {
    expect(THEME_FAMILY_MAP["warm-dining"]).toBe("com.creatos.modern-restaurant");
    expect(themeIdForFamily("warm-dining")).toBe("com.creatos.modern-restaurant");
    expect(themeRegistry.getById("com.creatos.modern-restaurant")).toBeTruthy();
  });

  it("modern-restaurant tier is now free (was business)", () => {
    expect(THEME_TIER_BY_ID["com.creatos.modern-restaurant"]).toBe("free");
    expect(getThemeTier({ id: "com.creatos.modern-restaurant" })).toBe("free");
  });

  it("modern-restaurant remains warm-dining appropriate (family, colors, dark-mode, premium unchanged)", () => {
    const t = themeRegistry.getById("com.creatos.modern-restaurant")!;
    expect(t.family).toBe("minimal");
    expect(t.supportsDarkMode).toBe(true);
    expect(t.premium).toBe(false);
    expect(t.industries).toContain("food & restaurant");
    expect(t.supportedBlueprints).toContain("com.creatos.restaurant");
    expect(t.category).toBe("food & restaurant");
    // Light warm beige/brown palette
    const light = t.variants.find((v) => v.mode === "light")?.tokens.colors;
    expect(light?.primary).toBe("#78350F");
    expect(light?.background).toBe("#FFFBEB");
    // Dark variant exists
    const dark = t.variants.find((v) => v.mode === "dark")?.tokens.colors;
    expect(dark?.background).toBe("#1C1917");
  });

  it("Launch (free) unlocks modern-restaurant — no neon-dark fallback", () => {
    expect(themeUnlockedForPlan({ id: "com.creatos.modern-restaurant" }, "creator_launch")).toBe(true);
    expect(themeUnlockedForPlan({ id: "com.creatos.modern-restaurant" }, "FREE")).toBe(true);
    expect(themeUnlockedForPlan({ id: "com.creatos.modern-restaurant" }, null)).toBe(true);
    // Entitlement server gate also allows free tier for free plan
    expect(themeEntitlementDecision("free", "creator_launch").allowed).toBe(true);
    expect(themeEntitlementDecision("free", null).allowed).toBe(true);
  });

  it("Launch restaurant composition resolves warm-dining → modern-restaurant (not neon-dark)", () => {
    const { blueprint, identity, evidence, relationships } = composeForBio(
      "Restaurant with a menu, table reservations and local dining. Best pasta in town, open daily."
    );
    // Blueprint for local_business archetype or restaurant entity should be warm-dining
    // Even if archetype confidence falls back, restaurant entity is warm-dining
    expect(blueprint.theme.family).toBe("warm-dining");
    expect(blueprint.entity).toBe("restaurant");
    const input = { blueprint, identity, evidence, relationships };
    const c = composeStorefront(input);
    expect(c.theme.themeId).toBe("com.creatos.modern-restaurant");
    expect(c.theme.themeId).not.toBe("com.creatos.neon-dark");
    expect(c.diagnostics.themeMapping).toBe("warm-dining → com.creatos.modern-restaurant");
    expect(c.layout).toBe("restaurant");
  });

  it("Launch does NOT fall back to neon-dark for restaurant (regression)", () => {
    // Before RCCF-17E, Launch + restaurant fell back to neon-dark because modern-restaurant was business.
    // Now the entitlement for modern-restaurant is free, so provisioning would NOT downgrade.
    const tier = getThemeTier({ id: "com.creatos.modern-restaurant" });
    expect(tier).toBe("free");
    // Simulate provisioning-service gate: if tier != free and entitlement fails, fallback to neon-dark.
    // For modern-restaurant on Launch, no fallback should occur.
    const needsFallback = tier !== "free" && !themeEntitlementDecision(tier, "creator_launch").allowed;
    expect(needsFallback).toBe(false);
    // Contrast: a true business tier theme still requires fallback/downgrade on Launch
    const fineDiningTier = getThemeTier({ id: "com.creatos.fine-dining" });
    expect(fineDiningTier).toBe("business");
    expect(themeUnlockedForPlan({ id: "com.creatos.fine-dining" }, "creator_launch")).toBe(false);
    expect(themeEntitlementDecision(fineDiningTier, "creator_launch").allowed).toBe(false);
  });

  it("Launch still receives capability-based experience downgrade (premium experiences remain locked)", () => {
    // modern-restaurant maps to minimal experience which is free — no downgrade needed, but
    // premium experiences (e.g. luxury for fine-dining) must still be unavailable on Launch.
    // This preserves the existing capability gating: only theme identity/colors stays restaurant-appropriate.
    // minimal is free/launch-available; luxury requires scale
    expect(isExperienceAvailableForPlan("minimal", "creator_launch")).toBe(true);
    expect(isExperienceAvailableForPlan("luxury", "creator_launch")).toBe(false);
    expect(isExperienceAvailableForPlan("cyber", "creator_launch")).toBe(false);
    // Growth/Scale unlock premium appropriately
    expect(isExperienceAvailableForPlan("luxury", "creator_scale")).toBe(true);
    expect(isExperienceAvailableForPlan("cyber", "creator_scale")).toBe(true);
  });

  it("Growth (pro) and Scale (business) behavior remains correct", () => {
    // Growth = pro tier, Scale = business tier (per plan-resolution PLAN_TO_TIER)
    // modern-restaurant (free) unlocked for both
    expect(themeUnlockedForPlan({ id: "com.creatos.modern-restaurant" }, "creator_grow")).toBe(true);
    expect(themeUnlockedForPlan({ id: "com.creatos.modern-restaurant" }, "creator_scale")).toBe(true);
    // pro theme unlocked for Grow and Scale, locked for Launch
    expect(themeUnlockedForPlan({ id: "com.creatos.creator-gold", tier: "pro" }, "creator_grow")).toBe(true);
    expect(themeUnlockedForPlan({ id: "com.creatos.creator-gold", tier: "pro" }, "creator_launch")).toBe(false);
    // business theme unlocked only for Scale, not Grow
    expect(themeUnlockedForPlan({ id: "com.creatos.fine-dining" }, "creator_grow")).toBe(false);
    expect(themeUnlockedForPlan({ id: "com.creatos.fine-dining" }, "creator_scale")).toBe(true);
    expect(themeUnlockedForPlan({ id: "com.creatos.forest-canopy" }, "creator_grow")).toBe(false);
    expect(themeUnlockedForPlan({ id: "com.creatos.forest-canopy" }, "creator_scale")).toBe(true);
  });

  it("creator archetype fallback remains unchanged (creator-lifestyle → creator-studio)", () => {
    expect(THEME_FAMILY_MAP["creator-lifestyle"]).toBe("com.creatos.creator-studio");
    expect(themeIdForFamily("creator-lifestyle")).toBe("com.creatos.creator-studio");
    expect(themeIdForFamily(null)).toBe("com.creatos.neon-dark");
    expect(themeIdForFamily("unknown-family")).toBe("com.creatos.neon-dark");
    expect(getThemeTier({ id: "com.creatos.creator-studio" })).toBe("free");
    expect(themeUnlockedForPlan({ id: "com.creatos.creator-studio" }, "creator_launch")).toBe(true);
  });

  it("does not make other restaurant themes free — only modern-restaurant", () => {
    // forest-canopy, fine-dining, bistro remain business tier
    expect(getThemeTier({ id: "com.creatos.forest-canopy" })).toBe("business");
    expect(getThemeTier({ id: "com.creatos.fine-dining" })).toBe("business");
    expect(getThemeTier({ id: "com.creatos.bistro" })).toBe("business");
    expect(themeUnlockedForPlan({ id: "com.creatos.bistro" }, "creator_launch")).toBe(false);
  });

  it("no schema/enum/registry rewrite — all themes still resolvable, no duplicates", () => {
    // Registry is 55 with visual foundation (50 original + 5 visual). The THEME_TIER_BY_ID map still covers 50,
    // with visual themes declaring tier inline. We verify no id was removed and count did not shrink.
    expect(themeRegistry.count()).toBe(55);
    // All restaurant themes remain registered
    expect(themeRegistry.getById("com.creatos.modern-restaurant")).toBeTruthy();
    expect(themeRegistry.getById("com.creatos.forest-canopy")).toBeTruthy();
    expect(themeRegistry.getById("com.creatos.fine-dining")).toBeTruthy();
    expect(themeRegistry.getById("com.creatos.bistro")).toBeTruthy();
    expect(themeRegistry.getById("com.creatos.neon-dark")).toBeTruthy();
  });
});
