import { describe, it, expect } from "vitest";
import { canonicalPlanCode, resolvePlan, planTierFor, LEGACY_READER_MIGRATION_STATUS } from "@/lib/capabilities/plan-resolution";
import { planTier, isThemeUnlocked, nextTier, tierRank } from "@/lib/theme/access";
import { themeEntitlementDecision } from "@/lib/theme/entitlement";
import { capabilityService } from "@/lib/capabilities";

describe("canonicalPlanCode — one mapping", () => {
  it("passes canonical codes through", () => {
    expect(canonicalPlanCode("creator_pro")).toBe("creator_pro");
    expect(canonicalPlanCode("creator_free")).toBe("creator_free");
    expect(canonicalPlanCode("agency_agency")).toBe("agency_agency");
  });

  it("resolves legacy strings to canonical codes", () => {
    expect(canonicalPlanCode("STARTER")).toBe("creator_free");
    expect(canonicalPlanCode("PRO")).toBe("creator_pro");
    expect(canonicalPlanCode("GROWTH")).toBe("agency_growth");
    expect(canonicalPlanCode("ENTERPRISE")).toBe("agency_agency");
    expect(canonicalPlanCode("FREELANCER")).toBe("agency_starter");
  });

  it("returns null for unknown/empty values", () => {
    expect(canonicalPlanCode(null)).toBeNull();
    expect(canonicalPlanCode("")).toBeNull();
    expect(canonicalPlanCode("NONSENSE")).toBeNull();
  });
});

describe("resolvePlan — single resolver", () => {
  it("resolves legacy STARTER → canonical free plan with tier band", () => {
    const r = resolvePlan("STARTER");
    expect(r.code).toBe("creator_free");
    expect(r.tier).toBe("free");
    expect(r.source).toBe("legacy");
    expect(r.legacy).toBe(true);
    expect(r.displayName).toBe("Starter");
  });

  it("resolves legacy PRO → creator_pro (pro tier)", () => {
    const r = resolvePlan("PRO");
    expect(r.code).toBe("creator_pro");
    expect(r.tier).toBe("pro");
    expect(r.source).toBe("legacy");
  });

  it("resolves canonical codes and marks them canonical", () => {
    const r = resolvePlan("creator_elite");
    expect(r.code).toBe("creator_elite");
    expect(r.tier).toBe("business");
    expect(r.source).toBe("canonical");
    expect(r.legacy).toBe(false);
    expect(r.plan?.name).toBe("Elite");
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

describe("theme access delegation (consolidated mapping)", () => {
  it("planTier works for legacy and canonical values", () => {
    expect(planTier("PRO")).toBe("pro");
    expect(planTier("creator_pro")).toBe("pro");
    expect(planTier("GROWTH")).toBe("business");
    expect(planTier("agency_agency")).toBe("enterprise");
    expect(planTier(null)).toBe("free");
  });

  it("isThemeUnlocked / nextTier / tierRank stay consistent", () => {
    expect(isThemeUnlocked("pro", "PRO")).toBe(true);
    expect(isThemeUnlocked("business", "PRO")).toBe(false);
    expect(isThemeUnlocked("free", "creator_free")).toBe(true);
    expect(tierRank("business")).toBeGreaterThan(tierRank("pro"));
    expect(nextTier("creator_pro")).toBe("business");
  });

  it("planTierFor matches planTier (no duplicate mapping)", () => {
    expect(planTierFor("PRO")).toBe(planTier("PRO"));
    expect(planTierFor("creator_pro")).toBe(planTier("creator_pro"));
  });
});

describe("entitlement decisions — premium_themes per plan", () => {
  it("free plans cannot use premium themes; paid plans can", () => {
    expect(capabilityService.can("creator_free", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("creator_pro", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("creator_elite", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("agency_free", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("agency_studio", "premium_themes").allowed).toBe(true);
  });
});

describe("theme server-side entitlement decision", () => {
  it("allows free-tier themes for everyone", () => {
    expect(themeEntitlementDecision("free", null).allowed).toBe(true);
    expect(themeEntitlementDecision("free", "creator_free").allowed).toBe(true);
  });

  it("blocks premium themes for free plans and unknown/no plans", () => {
    expect(themeEntitlementDecision("pro", "creator_free").allowed).toBe(false);
    expect(themeEntitlementDecision("pro", null).allowed).toBe(false);
    expect(themeEntitlementDecision("pro", "STARTER").allowed).toBe(false);
  });

  it("allows premium themes only when the plan carries premium_themes", () => {
    expect(themeEntitlementDecision("pro", "creator_pro").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "creator_elite").allowed).toBe(true);
    expect(themeEntitlementDecision("enterprise", "agency_agency").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "PRO").allowed).toBe(true); // legacy resolves to creator_pro
  });
});

describe("diagnostics registry — migration status", () => {
  it("all identified legacy readers are migrated", () => {
    expect(LEGACY_READER_MIGRATION_STATUS.length).toBeGreaterThan(0);
    expect(LEGACY_READER_MIGRATION_STATUS.every((r) => r.migrated)).toBe(true);
  });
});
