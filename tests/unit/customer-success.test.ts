import { describe, it, expect } from "vitest";
import { computeFromSignals } from "@/modules/customer-success";
import { computeSuccessScore } from "@/modules/customer-success";
import type { SuccessSignals } from "@/modules/customer-success";

function signals(overrides: Partial<SuccessSignals> = {}): SuccessSignals {
  return {
    tenantId: "t1",
    createdAt: new Date(Date.now() - 30 * 86400000),
    lastActivityAt: new Date(),
    productCount: 0,
    orderCount: 0,
    galleryCount: 0,
    published: false,
    healthScore: null,
    knowledgeScore: null,
    goalAlignment: null,
    successCompletion: null,
    completedRecommendations: 0,
    paymentReady: false,
    paymentIncomplete: true,
    subscriptionStatus: null,
    trialEndsAt: null,
    hasProducts: false,
    hasOrders: false,
    analyticsActive: false,
    seoConfigured: false,
    planCode: "creator_launch",
    commerceStrategy: "PLATFORM_COLLECT",
    ...overrides,
  };
}

describe("RCCF-EPIC-09 — success score", () => {
  it("scores a new creator low and a grown creator high", () => {
    const fresh = computeSuccessScore(signals());
    const grown = computeSuccessScore(signals({ published: true, hasProducts: true, productCount: 12, hasOrders: true, orderCount: 30, paymentReady: true, paymentIncomplete: false, healthScore: 82, knowledgeScore: 88, goalAlignment: 90, completedRecommendations: 3 }));
    expect(fresh.overall).toBeLessThan(40);
    expect(grown.overall).toBeGreaterThan(70);
  });

  it("returns all nine dimensions summing within bounds", () => {
    const r = computeSuccessScore(signals({ published: true, hasProducts: true, productCount: 5, hasOrders: true, orderCount: 5, paymentReady: true }));
    expect(Object.keys(r.dimensions)).toHaveLength(9);
    for (const v of Object.values(r.dimensions)) expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe("RCCF-EPIC-09 — journey engine", () => {
  it("starts at signed_up and advances through first_sale", () => {
    expect(computeFromSignals(signals()).stage).toBe("signed_up");
    expect(computeFromSignals(signals({ published: true, hasProducts: true, productCount: 2, paymentReady: true })).stage).toBe("first_product");
    expect(computeFromSignals(signals({ published: true, hasProducts: true, productCount: 2, hasOrders: true, orderCount: 2 })).stage).toBe("first_sale");
  });

  it("reports the next milestone and completion", () => {
    const r = computeFromSignals(signals({ published: true }));
    expect(r.nextMilestone).not.toBeNull();
    expect(r.completionPercent).toBeGreaterThan(0);
  });
});

describe("RCCF-EPIC-09 — risk engine", () => {
  it("flags a stalled account as high risk", () => {
    const r = computeFromSignals(signals());
    expect(["high", "critical"]).toContain(r.risk);
    expect(r.riskFindings.some((f) => f.key === "no_publish")).toBe(true);
    expect(r.riskFindings.some((f) => f.key === "no_products")).toBe(true);
  });

  it("flags a trial ending within 3 days", () => {
    const r = computeFromSignals(signals({ trialEndsAt: new Date(Date.now() + 2 * 86400000) }));
    expect(r.riskFindings.some((f) => f.key === "trial_ending")).toBe(true);
  });

  it("returns low risk for a healthy grown creator", () => {
    const r = computeFromSignals(signals({ published: true, hasProducts: true, productCount: 5, hasOrders: true, orderCount: 10, paymentReady: true, paymentIncomplete: false, healthScore: 80, lastActivityAt: new Date() }));
    expect(r.risk).toBe("low");
  });
});

describe("RCCF-EPIC-09 — opportunity engine", () => {
  it("detects the growth upgrade for a live launch creator", () => {
    const r = computeFromSignals(signals({ published: true, hasProducts: true, productCount: 2, planCode: "creator_launch" }));
    expect(r.opportunities.some((o) => o.type === "upgrade_growth")).toBe(true);
  });

  it("shows the growth upgrade for a workspace with no plan (free tier)", () => {
    const r = computeFromSignals(signals({ published: true, hasProducts: true, productCount: 2, planCode: null }));
    expect(r.opportunities.some((o) => o.type === "upgrade_growth")).toBe(true);
  });

  it("hides the growth upgrade for paid creator plans", () => {
    for (const planCode of ["creator_grow", "creator_scale", "creator_enterprise"]) {
      const r = computeFromSignals(signals({ published: true, hasProducts: true, productCount: 2, planCode }));
      expect(r.opportunities.some((o) => o.type === "upgrade_growth")).toBe(false);
    }
  });

  it("detects scale for revenue and SEO when missing", () => {
    const r = computeFromSignals(signals({ published: true, hasProducts: true, productCount: 5, hasOrders: true, orderCount: 12 }));
    expect(r.opportunities.some((o) => o.type === "upgrade_scale")).toBe(true);
    expect(r.opportunities.some((o) => o.type === "seo_opportunity")).toBe(true);
  });
});
