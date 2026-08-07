import { describe, it, expect } from "vitest";
import { mergeRuntimePlan, type PlanRuntimeConfig } from "@/modules/pricing/application/runtime";
import { COMMERCE_PLANS } from "@/config/commerce/plans";

const grow = COMMERCE_PLANS.find((p) => p.code === "creator_grow")!;

describe("RCCF-IMPLEMENTATION-71 — runtime pricing merge", () => {
  it("falls back to registry defaults when no runtime config exists", () => {
    const plan = mergeRuntimePlan(grow);
    expect(plan.name).toBe(grow.name);
    expect(plan.price).toBe(699);
    expect(plan.capabilities).toEqual(grow.capabilities);
    expect(plan.highlights).toEqual(grow.marketingHighlights ?? []);
  });

  it("overrides marketing, pricing and limits from the runtime config", () => {
    const rc: PlanRuntimeConfig = {
      marketing: { description: "Runtime description", badge: "New Badge", trialDays: 30, highlights: ["Runtime highlight"], comparisonOrder: 5, popular: true },
      pricing: { price: 799, annualPrice: 7990 },
      featureOverrides: { max_products: 25 },
      capabilities: ["custom_domain"],
    };
    const plan = mergeRuntimePlan(grow, rc);
    expect(plan.marketingDescription).toBe("Runtime description");
    expect(plan.badge).toBe("New Badge");
    expect(plan.trialDays).toBe(30);
    expect(plan.price).toBe(799);
    expect(plan.annualPrice).toBe(7990);
    expect(plan.featureOverrides.max_products).toBe(25);
    expect(plan.capabilities).toEqual(["custom_domain"]);
    expect(plan.popular).toBe(true);
    expect(plan.comparisonOrder).toBe(5);
  });

  it("applies the pricing schedule with the effective price", async () => {
    const rc: PlanRuntimeConfig = {
      pricing: { price: 699, schedule: [{ price: 999, annualPrice: null, effectiveAt: "2020-01-01T00:00:00Z" }] },
    };
    const plan = mergeRuntimePlan(grow, rc);
    expect(plan.scheduled.length).toBe(1);
    expect(plan.scheduled[0]!.price).toBe(999);
  });

  it("keeps hidden/enterprise flags from the runtime config", () => {
    const rc: PlanRuntimeConfig = { marketing: { hidden: true, enterprise: false } };
    expect(mergeRuntimePlan(grow, rc).hidden).toBe(true);
  });
});
