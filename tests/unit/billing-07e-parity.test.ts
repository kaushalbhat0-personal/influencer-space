// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMMERCE_PLANS, isOneTimePlan, getCommercePlan } from "@/config/commerce/plans";
import { getMarketingPlans, getEnterprisePlan } from "@/config/commerce/plans";
import { getPlan, getAllPlans } from "@/lib/capabilities/plans";
import { getAnnualSavings, getDisplayPrice, getComparisonFeatureIds } from "@/components/marketing/Pricing/data";
import { getAllFeatureIds } from "@/lib/capabilities";
import { mergeRuntimePlan } from "@/modules/pricing/application/runtime";

const pricingIndexPath = resolve("src/components/marketing/Pricing/index.tsx");
const pricingCenterPath = resolve("src/app/super-admin/pricing/_components/pricing-center-client.tsx");
const dataPath = resolve("src/components/marketing/Pricing/data.ts");

describe("RCCF-BILLING-07E — pricing parity contract (marketing ↔ billing ↔ Pricing Center)", () => {
  it("plan identity: every marketed plan exists in COMMERCE_PLANS, billing capability plans, and marketing lists", () => {
    const marketedCreator = getMarketingPlans("creator");
    const marketedPartner = getMarketingPlans("partner");
    const allCodes = new Set([...marketedCreator, ...marketedPartner].map((p) => p.code));
    // All marketed codes must be in COMMERCE_PLANS and in capability plans
    for (const code of allCodes) {
      expect(getCommercePlan(code), `COMMERCE_PLANS missing ${code}`).toBeDefined();
      expect(getPlan(code), `capability getPlan missing ${code}`).toBeDefined();
    }
    // Hidden/enterprise not in marketed but still in registry
    const hidden = COMMERCE_PLANS.filter((p) => p.hidden || p.enterprise);
    for (const p of hidden) {
      expect(allCodes.has(p.code)).toBe(false);
      expect(getCommercePlan(p.code)).toBeDefined();
    }
    // Enterprise plans separately via getEnterprisePlan
    expect(getEnterprisePlan("creator")?.code).toBe("creator_enterprise");
    expect(getEnterprisePlan("partner")?.code).toBe("partner_enterprise");
  });

  // FINANCE-04: partner plans are manual renewal one-time (no Razorpay Subscription)
  it("billing model: partner one-time vs creator recurring agrees across registry and helper", () => {
    // Registry is authority — FINANCE-04 partner is one_time manual renewal
    expect(isOneTimePlan("partner_solo")).toBe(true);
    expect(isOneTimePlan("partner_scale")).toBe(true);
    expect(getCommercePlan("partner_solo")?.billingForm).toBe("one_time");
    expect(getCommercePlan("partner_scale")?.billingForm).toBe("one_time");

    expect(isOneTimePlan("creator_grow")).toBe(false);
    expect(isOneTimePlan("creator_scale")).toBe(false);
    expect(isOneTimePlan("creator_launch")).toBe(false);
    expect(isOneTimePlan("partner_free")).toBe(false);

    // Marketing and billing must agree: isOneTimePlan is single source, no second billingForm list
    for (const p of COMMERCE_PLANS) {
      const expected = p.billingForm === "one_time";
      expect(isOneTimePlan(p.code)).toBe(expected);
    }
  });

  it("price: marketing display price, billing plan price, and runtime merge agree (no second price list)", () => {
    for (const cfg of COMMERCE_PLANS.filter((p) => !p.hidden && !p.enterprise)) {
      const marketing = getMarketingPlans(cfg.family as "creator" | "partner").find((m) => m.code === cfg.code);
      expect(marketing, `marketing missing ${cfg.code}`).toBeDefined();
      expect(marketing!.price).toBe(cfg.price);
      expect(marketing!.currency).toBe(cfg.currency);

      const billing = getPlan(cfg.code);
      expect(billing, `billing getPlan missing ${cfg.code}`).toBeDefined();
      // billing price comes from COMMERCE_PLANS via plans.ts
      expect(billing!.price).toBe(cfg.price ?? 0);

      // Runtime merge with no runtimeConfig must equal registry (Pricing Center single source)
      const merged = mergeRuntimePlan(cfg, undefined);
      expect(merged.price).toBe(cfg.price);
      expect(merged.code).toBe(cfg.code);
      expect(merged.family).toBe(cfg.family);
    }
  });

  it("annual pricing: savings derived via getAnnualSavings, never hardcoded 17%", () => {
    // For creator plans with annualPrice, savings must be derived
    const growCfg = getCommercePlan("creator_grow")!;
    expect(growCfg.price).toBe(999);
    expect(growCfg.annualPrice).toBe(9990);
    // data.ts helper works on ResolvedPlan shape; simulate
    const fakeResolved = { price: growCfg.price, annualPrice: growCfg.annualPrice } as any;
    expect(getAnnualSavings(fakeResolved)).toBe(17);
    // Toggle badge must be derived, not hardcoded
    const pricingSrc = readFileSync(pricingIndexPath, "utf8");
    expect(pricingSrc).not.toContain("Save ~17%");
    expect(pricingSrc).toContain("getAnnualSavings");
    expect(pricingSrc).toContain("Math.max");
    expect(pricingSrc).toMatch(/Save \{maxSavings\}%/);
    expect(pricingSrc).toContain("maxSavings");

    // FINANCE-02: partner plans now have yearly pricing (10× monthly)
    const soloCfg = getCommercePlan("partner_solo")!;
    expect(soloCfg.annualPrice).toBe(49990);
    const soloResolved = { price: soloCfg.price, annualPrice: (soloCfg as any).annualPrice } as any;
    expect(getAnnualSavings(soloResolved)).toBe(17);
    const scaleCfg = getCommercePlan("partner_scale")!;
    expect(scaleCfg.annualPrice).toBe(149990);
    expect(getAnnualSavings({ price: scaleCfg.price, annualPrice: scaleCfg.annualPrice } as any)).toBe(17);
  });

  it("Pricing Center grace presentation disabled for one-time, preserved in data", () => {
    const src = readFileSync(pricingCenterPath, "utf8");
    expect(src).toContain("isOneTimePlan(form.code)");
    expect(src).toContain("Grace period (days)");
    expect(src).toContain("not applicable (one-time)");
    expect(src).toContain("One-time purchase — no renewal grace");
    expect(src).toContain("disabled={oneTime}");
    // Data still saved: savePlanConfig still sends gracePeriodDays even when disabled
    expect(src).toContain("gracePeriodDays: num(form.gracePeriodDays");
    // Schema preserved: CenterPlan still has gracePeriodDays field
    expect(src).toContain("gracePeriodDays: number");
  });

  it("comparison presentation is filtered vocabulary, not entitlement authority", () => {
    const src = readFileSync(dataPath, "utf8");
    // Audit comment must exist
    expect(src).toContain("AUDIT 07E");
    expect(src).toContain("presentation");
    expect(src).toContain("not entitlement authority");
    expect(src).toContain("CREATOR_EXCLUDED");
    expect(src).toContain("PARTNER_ALLOWED");

    // Both sets must be subsets of capability catalog (no phantom ids)
    const allIds = new Set(getAllFeatureIds());
    // Ensure comparison ids are subset of catalog (presentation, not entitlement)
    const creatorIds = getComparisonFeatureIds("creator");
    const partnerIds = getComparisonFeatureIds("partner");
    for (const id of creatorIds) expect(allIds.has(id), `creator comparison id ${id} not in catalog`).toBe(true);
    for (const id of partnerIds) expect(allIds.has(id), `partner comparison id ${id} not in catalog`).toBe(true);

    // Partner presentation must not include creator storage, creator must not include partner client limits that are partner-only presentation
    expect(creatorIds).not.toContain("max_clients");
    expect(creatorIds).not.toContain("storage_gb");
    expect(partnerIds).toContain("max_clients");
    expect(partnerIds).not.toContain("storage_gb");
    expect(partnerIds).not.toContain("max_products"); // partner presentation intentionally excludes creator-commerce limits

    // Entitlement authority still lives in COMMERCE_PLANS / capabilityEngine, not in these sets
    // Check that creator_grow actually has max_products unlimited via billing authority, even though partner comparison hides it
    expect(getPlan("creator_grow")!.features["max_products"]).toBe(-1);
    expect(getPlan("partner_solo")!.features["max_clients"]).toBe(5);
  });

  it("display price respects cycle via getDisplayPrice (monthly vs yearly)", () => {
    const grow = { price: 999, annualPrice: 9990 } as any;
    expect(getDisplayPrice(grow, "monthly")).toBe(999);
    expect(getDisplayPrice(grow, "yearly")).toBe(833); // 9990/12=832.5→833
    const launch = { price: 0, annualPrice: null } as any;
    expect(getDisplayPrice(launch, "yearly")).toBe(0);
    const custom = { price: null, annualPrice: null } as any;
    expect(getDisplayPrice(custom, "monthly")).toBeNull();
  });
});
