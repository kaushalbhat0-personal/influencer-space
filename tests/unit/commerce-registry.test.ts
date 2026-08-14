import { describe, it, expect } from "vitest";
import {
  COMMERCE_PLANS,
  getMarketingPlans,
  getEnterprisePlan,
  getUpgradeHighlights,
  getPlanMonthlyPrice,
  getAnnualSavingsPercent,
  LEGACY_TO_CANONICAL,
} from "@/config/commerce/plans";

describe("RCCF-IMPLEMENTATION-70 — canonical commerce registry", () => {
  it("has unique plan codes", () => {
    const codes = COMMERCE_PLANS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("restructures the creator lineup (Launch/Growth/Scale/Enterprise)", () => {
    const creator = getMarketingPlans("creator");
    expect(creator.map((p) => p.code)).toEqual(["creator_launch", "creator_grow", "creator_scale"]);
    expect(getMarketingPlans("creator").every((p) => !p.hidden && !p.enterprise)).toBe(true);
    // Enterprise is excluded from the standard comparison but exists separately.
    expect(getEnterprisePlan("creator")?.code).toBe("creator_enterprise");
    expect(getEnterprisePlan("creator")?.enterprise).toBe(true);
  });

  it("restructures the partner lineup (Launch/Solo/Scale/Enterprise; Growth hidden)", () => {
    const partner = getMarketingPlans("partner");
    expect(partner.map((p) => p.code)).toEqual(["partner_free", "partner_solo", "partner_scale"]);
    expect(getMarketingPlans("partner").every((p) => !p.hidden && !p.enterprise)).toBe(true);
    expect(getEnterprisePlan("partner")?.code).toBe("partner_enterprise");
    // Partner Growth is kept for legacy resolution but hidden from marketing.
    const growth = COMMERCE_PLANS.find((p) => p.code === "partner_growth");
    expect(growth?.hidden).toBe(true);
  });

  it("applies the canonical prices", () => {
    expect(getMarketingPlans("creator").find((p) => p.code === "creator_grow")?.price).toBe(999);
    expect(getMarketingPlans("creator").find((p) => p.code === "creator_scale")?.price).toBe(1995);
    expect(getMarketingPlans("partner").find((p) => p.code === "partner_solo")?.price).toBe(4999);
    expect(getMarketingPlans("partner").find((p) => p.code === "partner_scale")?.price).toBe(7999);
  });

  it("exposes per-plan tiered limits via feature overrides", () => {
    const plan = COMMERCE_PLANS.find((p) => p.code === "creator_launch")!;
    expect(plan.featureOverrides?.max_products).toBe(3);
    const grow = COMMERCE_PLANS.find((p) => p.code === "creator_grow")!;
    expect(grow.featureOverrides?.max_products).toBe(-1);
  });

  it("derives annual pricing and savings", () => {
    const grow = getMarketingPlans("creator").find((p) => p.code === "creator_grow")!;
    expect(getPlanMonthlyPrice(grow, "yearly")).toBe(Math.round((grow.annualPrice ?? 0) / 12));
    const savings = getAnnualSavingsPercent(grow);
    expect(savings).not.toBeNull();
    expect(savings).toBeGreaterThan(0);
    expect(savings).toBeLessThanOrEqual(25);
  });

  it("keeps every public highlight backed by a real capability keyword", () => {
    const known = [
      "AI", "website", "domain", "theme", "builder", "products", "services", "gallery",
      "testimonials", "FAQs", "timeline", "links", "feed", "mobile", "support",
      "unlimited", "analytics", "SEO", "components", "API", "webhooks", "automation",
      "team", "credits", "storage", "generation", "commerce", "CRM", "dashboard",
      "client", "workspace", "commission", "white label", "priority", "growth",
      "everything in", "custom domain", "premium", "basic", "advanced",
      "integration", "SLA", "SSO", "audit", "unlimited", "sales", "bulk", "sync",
    ];
    for (const plan of COMMERCE_PLANS) {
      if (!plan.marketingHighlights) continue;
      for (const h of plan.marketingHighlights) {
        // Normalize hyphens ("white-label" → "white label") so tokens match.
        const lower = h.toLowerCase().replace(/-/g, " ");
        expect(known.some((k) => lower.includes(k.toLowerCase())), `Unbacked highlight on ${plan.code}: "${h}"`).toBe(true);
      }
    }
  });

  it("computes upgrade highlights against the next visible tier", () => {
    const upgrades = getUpgradeHighlights("creator_grow");
    expect(upgrades.length).toBeGreaterThan(0);
    expect(upgrades.some((h) => h.toLowerCase().includes("api"))).toBe(true);
    // Top tier has no next tier.
    expect(getUpgradeHighlights("creator_scale")).toEqual([]);
  });

  it("keeps legacy mapping internal only", () => {
    expect(LEGACY_TO_CANONICAL.agency_free).toBe("partner_free");
    expect(LEGACY_TO_CANONICAL.agency_growth).toBe("partner_scale");
    expect(LEGACY_TO_CANONICAL.agency_agency).toBe("partner_growth");
  });
});
