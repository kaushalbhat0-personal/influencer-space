import { describe, it, expect } from "vitest";
import { canonicalPlanCode, resolvePlan, planTierFor, LEGACY_READER_MIGRATION_STATUS } from "@/lib/capabilities/plan-resolution";
import { planTier, isThemeUnlocked, nextTier, tierRank } from "@/lib/theme/access";
import { themeEntitlementDecision } from "@/lib/theme/entitlement";
import { capabilityService } from "@/lib/capabilities";

describe("canonicalPlanCode — maps legacy to canonical commerce codes", () => {
  it("passes canonical codes through", () => {
    expect(canonicalPlanCode("creator_launch")).toBe("creator_launch");
    expect(canonicalPlanCode("creator_grow")).toBe("creator_grow");
    expect(canonicalPlanCode("creator_scale")).toBe("creator_scale");
    expect(canonicalPlanCode("partner_free")).toBe("partner_free");
    expect(canonicalPlanCode("partner_growth")).toBe("partner_growth");
  });

  it("maps legacy DB codes to canonical commerce codes", () => {
    expect(canonicalPlanCode("creator_pro")).toBe("creator_grow");
    expect(canonicalPlanCode("creator_free")).toBe("creator_launch");
    expect(canonicalPlanCode("creator_elite")).toBe("creator_scale");
    expect(canonicalPlanCode("agency_agency")).toBe("partner_growth");
    expect(canonicalPlanCode("agency_studio")).toBe("partner_solo");
    expect(canonicalPlanCode("agency_free")).toBe("partner_free");
  });

  it("resolves legacy string plans to canonical codes", () => {
    expect(canonicalPlanCode("STARTER")).toBe("creator_launch");
    expect(canonicalPlanCode("PRO")).toBe("creator_grow");
    expect(canonicalPlanCode("GROWTH")).toBe("partner_growth");
    expect(canonicalPlanCode("ENTERPRISE")).toBe("partner_enterprise");
    expect(canonicalPlanCode("FREELANCER")).toBe("partner_solo");
  });

  it("returns null for unknown/empty values", () => {
    expect(canonicalPlanCode(null)).toBeNull();
    expect(canonicalPlanCode("")).toBeNull();
    expect(canonicalPlanCode("NONSENSE")).toBeNull();
  });
});

describe("resolvePlan — canonical commerce codes with legacy detection", () => {
  it("resolves legacy STARTER → creator_launch with free tier", () => {
    const r = resolvePlan("STARTER");
    expect(r.code).toBe("creator_launch");
    expect(r.tier).toBe("free");
    expect(r.source).toBe("legacy");
    expect(r.legacy).toBe(true);
    expect(r.displayName).toBe("Creator Launch");
  });

  it("resolves legacy PRO → creator_grow (pro tier)", () => {
    const r = resolvePlan("PRO");
    expect(r.code).toBe("creator_grow");
    expect(r.tier).toBe("pro");
    expect(r.source).toBe("legacy");
  });

  it("detects legacy DB codes and marks them legacy", () => {
    const r = resolvePlan("creator_elite");
    expect(r.code).toBe("creator_scale");
    expect(r.tier).toBe("business");
    expect(r.source).toBe("legacy");
    expect(r.legacy).toBe(true);
    expect(r.plan?.name).toBe("Creator Scale");
  });

  it("resolves canonical codes directly", () => {
    const r = resolvePlan("creator_launch");
    expect(r.code).toBe("creator_launch");
    expect(r.tier).toBe("free");
    expect(r.source).toBe("canonical");
    expect(r.legacy).toBe(false);
    expect(r.plan?.name).toBe("Creator Launch");
  });

  it("returns the none/free default for unknown or missing plans", () => {
    for (const value of [null, undefined, "", "MYSTERY"]) {
      const r = resolvePlan(value);
      expect(r.code).toBeNull();
      expect(r.tier).toBe("free");
      expect(r.source).toBe("none");
      expect(r.displayName).toBe("Free");
    }
  });
});

describe("theme access delegation (canonical mapping)", () => {
  it("planTier works for legacy, canonical, and plan codes", () => {
    expect(planTier("PRO")).toBe("pro");
    expect(planTier("creator_pro")).toBe("pro");
    expect(planTier("creator_grow")).toBe("pro");
    expect(planTier("GROWTH")).toBe("business");
    expect(planTier("partner_growth")).toBe("business");
    expect(planTier("creator_enterprise")).toBe("enterprise");
    expect(planTier(null)).toBe("free");
  });

  it("isThemeUnlocked / nextTier / tierRank stay consistent", () => {
    expect(isThemeUnlocked("pro", "PRO")).toBe(true);
    expect(isThemeUnlocked("business", "PRO")).toBe(false);
    expect(isThemeUnlocked("free", "creator_free")).toBe(true);
    expect(isThemeUnlocked("free", "creator_launch")).toBe(true);
    expect(tierRank("business")).toBeGreaterThan(tierRank("pro"));
    expect(nextTier("creator_grow")).toBe("business");
  });

  it("planTierFor matches planTier (no duplicate mapping)", () => {
    expect(planTierFor("PRO")).toBe(planTier("PRO"));
    expect(planTierFor("creator_grow")).toBe(planTier("creator_grow"));
  });
});

describe("entitlement decisions — premium_themes per plan", () => {
  it("free plans cannot use premium themes; paid plans can", () => {
    expect(capabilityService.can("creator_free", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("creator_launch", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("creator_grow", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("creator_pro", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("creator_scale", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("creator_elite", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("partner_free", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("partner_solo", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("agency_free", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("agency_studio", "premium_themes").allowed).toBe(true);
  });
});

describe("theme server-side entitlement decision", () => {
  it("allows free-tier themes for everyone", () => {
    expect(themeEntitlementDecision("free", null).allowed).toBe(true);
    expect(themeEntitlementDecision("free", "creator_free").allowed).toBe(true);
    expect(themeEntitlementDecision("free", "creator_launch").allowed).toBe(true);
  });

  it("blocks premium themes for free plans and unknown/no plans", () => {
    expect(themeEntitlementDecision("pro", "creator_launch").allowed).toBe(false);
    expect(themeEntitlementDecision("pro", "creator_free").allowed).toBe(false);
    expect(themeEntitlementDecision("pro", null).allowed).toBe(false);
    expect(themeEntitlementDecision("pro", "STARTER").allowed).toBe(false);
  });

  it("allows premium themes only when the plan carries premium_themes", () => {
    expect(themeEntitlementDecision("pro", "creator_grow").allowed).toBe(true);
    expect(themeEntitlementDecision("pro", "creator_pro").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "creator_scale").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "creator_elite").allowed).toBe(true);
    expect(themeEntitlementDecision("enterprise", "creator_enterprise").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "PRO").allowed).toBe(true);
  });
});

describe("diagnostics registry — migration status", () => {
  it("all identified legacy readers are migrated", () => {
    expect(LEGACY_READER_MIGRATION_STATUS.length).toBeGreaterThan(0);
    expect(LEGACY_READER_MIGRATION_STATUS.every((r) => r.migrated)).toBe(true);
  });
});
