import { describe, it, expect } from "vitest";

import {
  GOAL_REGISTRY,
  getGoal,
  recommendGoals,
  normalizeGoalWeights,
  applyGoalSectionOrder,
  applyGoalNavigation,
  goalBuilderSuggestions,
  goalDashboard,
  computeGoalAlignment,
  goalMilestones,
  commercePriority,
  validateGoalProfile,
  primaryGoal,
} from "@/modules/goals-runtime";
import type { GoalProfile, KnowledgeSnapshot as _K } from "@/modules/goals-runtime";
import { computeStorefrontScore } from "@/modules/knowledge-runtime";
import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";

function makeSnapshot(overrides: Partial<KnowledgeSnapshot> = {}): KnowledgeSnapshot {
  const base: KnowledgeSnapshot = {
    identity: { name: "", tagline: "", bio: "", avatarUrl: null, bannerUrl: null },
    brand: { logoUrl: null, customTheme: false },
    commerce: {
      productCount: 0, productsWithDescription: 0, productsWithImage: 0,
      offersPriced: 0, offerCount: 0, serviceCount: 0, courseCount: 0, bookingCount: 0,
    },
    content: { galleryCount: 0, galleryWithTitle: 0, galleryWithAltText: 0, faqCount: 0, feedCount: 0 },
    trust: { testimonialCount: 0, timelineCount: 0, gameCount: 0 },
    media: { heroMediaPresent: false, heroTitlePresent: false },
    seo: { title: "", description: "" },
    contact: { email: "", phone: "", location: "", languages: [], businessHours: [] },
    social: { socialLinkCount: 0, primaryPlatform: "", feedConnected: false, affiliateLinkCount: 0 },
    business: { customDomain: null, subdomain: "test" },
    declared: {},
    entityType: "creator",
  };
  return { ...base, ...overrides };
}

function profileOf(...weights: Array<[string, number]>): GoalProfile {
  return {
    weights: weights.map(([goalId, weight]) => ({ goalId, weight } as never)),
    updatedAt: "",
    source: "manual",
    entityType: "creator",
  };
}

function restaurantWithSales(): KnowledgeSnapshot {
  return makeSnapshot({
    entityType: "restaurant",
    commerce: { productCount: 4, productsWithDescription: 4, productsWithImage: 4, offersPriced: 4, offerCount: 4, serviceCount: 0, courseCount: 0, bookingCount: 2 },
    content: { galleryCount: 3, galleryWithTitle: 3, galleryWithAltText: 3, faqCount: 3, feedCount: 0 },
    trust: { testimonialCount: 3, timelineCount: 2, gameCount: 0 },
    media: { heroMediaPresent: true, heroTitlePresent: true },
    seo: { title: "Test Restaurant", description: "x".repeat(40) },
    social: { socialLinkCount: 2, primaryPlatform: "Instagram", feedConnected: true, affiliateLinkCount: 1 },
    declared: {},
  });
}

describe("Goals Runtime — Phase 1: Goal Registry", () => {
  it("defines all 14 canonical goals", () => {
    expect(GOAL_REGISTRY).toHaveLength(14);
    const ids = GOAL_REGISTRY.map((g) => g.id);
    for (const expected of ["GET_BOOKINGS", "SELL_PRODUCTS", "SELL_COURSES", "SELL_SERVICES", "BUILD_EMAIL_LIST", "GROW_YOUTUBE", "BUILD_COMMUNITY", "SHOW_PORTFOLIO", "GENERATE_LEADS", "PROMOTE_EVENTS", "FIND_CLIENTS", "BUILD_BRAND", "INCREASE_TRUST", "MONETIZE_CONTENT"]) {
      expect(ids).toContain(expected);
    }
  });

  it("declares every required attribute per goal", () => {
    for (const goal of GOAL_REGISTRY) {
      expect(goal.id).toBeTruthy();
      expect(goal.label).toBeTruthy();
      expect(goal.description).toBeTruthy();
      expect(goal.icon).toBeTruthy();
      expect(goal.supportedSections.length).toBeGreaterThan(0);
      expect(goal.sectionOrderHint.length).toBeGreaterThan(0);
      expect(goal.navigationPriority.length).toBeGreaterThan(0);
      expect(goal.supportingKnowledge.length).toBeGreaterThan(0);
      expect(goal.milestonePath.length).toBeGreaterThan(0);
    }
  });

  it("looks up goals by id and rejects unknown ids", () => {
    expect(getGoal("GET_BOOKINGS")?.label).toBe("Get Bookings");
    expect(getGoal("NOT_A_GOAL")).toBeUndefined();
  });
});

describe("Goals Runtime — Phase 3: Goal Recommendation Engine", () => {
  it("recommends bookings for restaurants", () => {
    const recs = recommendGoals(makeSnapshot({ entityType: "restaurant" }));
    expect(recs[0]!.goalId).toBe("GET_BOOKINGS");
  });

  it("recommends courses for educators", () => {
    const recs = recommendGoals(makeSnapshot({ entityType: "educator" }));
    expect(recs[0]!.goalId).toBe("SELL_COURSES");
  });

  it("recommends portfolio for photographers", () => {
    const recs = recommendGoals(makeSnapshot({ entityType: "photography" }));
    expect(recs[0]!.goalId).toBe("SHOW_PORTFOLIO");
  });

  it("weights are positive integers summing to exactly 100", () => {
    const recs = recommendGoals(makeSnapshot({ entityType: "fitness" }));
    expect(recs.length).toBeLessThanOrEqual(4);
    expect(recs.reduce((sum, r) => sum + r.weight, 0)).toBe(100);
    for (const r of recs) {
      expect(Number.isInteger(r.weight)).toBe(true);
      expect(r.weight).toBeGreaterThan(0);
    }
  });

  it("adjusts weights from live knowledge signals", () => {
    const plain = recommendGoals(makeSnapshot({ entityType: "creator" }));
    const selling = recommendGoals(makeSnapshot({
      entityType: "creator",
      commerce: { productCount: 5, productsWithDescription: 5, productsWithImage: 5, offersPriced: 5, offerCount: 5, serviceCount: 0, courseCount: 0, bookingCount: 0 },
    }));
    const plainWeight = plain.find((r) => r.goalId === "SELL_PRODUCTS")?.weight ?? 0;
    const sellingWeight = selling.find((r) => r.goalId === "SELL_PRODUCTS")?.weight ?? 0;
    expect(sellingWeight).toBeGreaterThanOrEqual(plainWeight);
  });

  it("normalizes partial weights to exactly 100", () => {
    const normalized = normalizeGoalWeights([
      { goalId: "GET_BOOKINGS", weight: 60 },
      { goalId: "SELL_PRODUCTS", weight: 25 },
      { goalId: "BUILD_EMAIL_LIST", weight: 15 },
    ]);
    expect(normalized.reduce((sum, w) => sum + w.weight, 0)).toBe(100);
    expect(normalized[0]!.goalId).toBe("GET_BOOKINGS");
  });
});

describe("Goals Runtime — Phase 4: Website Composition", () => {
  const sections = [
    { id: "s1", moduleId: "hero.default", order: 0, visible: true },
    { id: "s2", moduleId: "gallery.grid", order: 1, visible: true },
    { id: "s3", moduleId: "products.grid", order: 2, visible: true },
    { id: "s4", moduleId: "testimonials.default", order: 3, visible: true },
    { id: "s5", moduleId: "footer.default", order: 4, visible: true },
  ];

  it("promotes products sections for a SELL_PRODUCTS profile", () => {
    const pages = [{ id: "home", sections }];
    const ordered = applyGoalSectionOrder(pages, profileOf(["SELL_PRODUCTS", 100]));
    const order = ordered[0]!.sections.map((s) => s.moduleId);
    expect(order[0]).toBe("hero.default");
    expect(order[order.length - 1]).toBe("footer.default");
    expect(order.indexOf("products.grid")).toBeLessThan(order.indexOf("gallery.grid"));
  });

  it("promotes gallery for a SHOW_PORTFOLIO profile", () => {
    const pages = [{ id: "home", sections }];
    const ordered = applyGoalSectionOrder(pages, profileOf(["SHOW_PORTFOLIO", 100]));
    const order = ordered[0]!.sections.map((s) => s.moduleId);
    expect(order.indexOf("gallery.grid")).toBeLessThan(order.indexOf("products.grid"));
  });

  it("keeps hero first and footer last always", () => {
    const pages = [{ id: "home", sections }];
    const ordered = applyGoalSectionOrder(pages, profileOf(["BUILD_EMAIL_LIST", 100]));
    expect(ordered[0]!.sections[0]!.moduleId).toBe("hero.default");
    expect(ordered[0]!.sections.at(-1)!.moduleId).toBe("footer.default");
  });

  it("returns input unchanged without a profile (existing storefronts unaffected)", () => {
    const pages = [{ id: "home", sections }];
    expect(applyGoalSectionOrder(pages, null)).toBe(pages);
    expect(applyGoalSectionOrder(pages, profileOf()).map((p) => p.sections)).toEqual([sections]);
  });
});

describe("Goals Runtime — Phase 5: Navigation Runtime", () => {
  const nav = [
    { id: "hero", label: "Home", href: "#hero" },
    { id: "gallery", label: "Gallery", href: "#gallery" },
    { id: "products", label: "Products", href: "#products" },
    { id: "testimonials", label: "Testimonials", href: "#testimonials" },
    { id: "faq", label: "FAQ", href: "#faq" },
    { id: "contact", label: "Contact", href: "#contact" },
  ];

  it("moves products earlier and keeps home first / contact last", () => {
    const ordered = applyGoalNavigation(nav, profileOf(["SELL_PRODUCTS", 100]));
    const order = ordered.map((n) => n.id);
    expect(order[0]).toBe("hero");
    expect(order[order.length - 1]).toBe("contact");
    expect(order.indexOf("products")).toBeLessThan(order.indexOf("gallery"));
    expect(order.indexOf("testimonials")).toBeLessThan(order.indexOf("gallery"));
  });

  it("returns input unchanged without a profile", () => {
    expect(applyGoalNavigation(nav, null)).toBe(nav);
  });
});

describe("Goals Runtime — Phase 6: Dashboard", () => {
  it("returns primary goal, progress, missing items and CTA", () => {
    const profile = profileOf(["GET_BOOKINGS", 60], ["SELL_PRODUCTS", 25], ["BUILD_EMAIL_LIST", 15]);
    const data = goalDashboard(profile, makeSnapshot());
    expect(data).not.toBeNull();
    expect(data!.primary.goalId).toBe("GET_BOOKINGS");
    expect(data!.primary.progress).toBe(0);
    expect(data!.primary.missing.some((m) => m.fieldId === "commerce.bookings")).toBe(true);
    expect(data!.primary.cta?.href).toBe("/admin/bookings");
    expect(data!.commercePriority).toBe("bookings");
    expect(data!.secondary).toHaveLength(2);
  });

  it("reports 100% progress when supporting knowledge is complete", () => {
    const profile = profileOf(["SELL_PRODUCTS", 100]);
    const data = goalDashboard(profile, restaurantWithSales());
    expect(data!.primary.progress).toBe(100);
    expect(data!.primary.missing).toHaveLength(0);
  });
});

describe("Goals Runtime — Phase 7: Builder Suggestions", () => {
  it("only suggests missing knowledge for active goals", () => {
    const suggestions = goalBuilderSuggestions(profileOf(["INCREASE_TRUST", 100]), makeSnapshot());
    expect(suggestions.some((s) => s.moduleId === "testimonials")).toBe(true);
    expect(suggestions.some((s) => s.goalId === "INCREASE_TRUST")).toBe(true);
  });

  it("keeps quiet when the goal's knowledge is complete", () => {
    const snapshot = restaurantWithSales();
    const suggestions = goalBuilderSuggestions(profileOf(["INCREASE_TRUST", 100]), snapshot);
    expect(suggestions.some((s) => s.moduleId === "testimonials")).toBe(false);
  });
});

describe("Goals Runtime — Phase 9: Goal-Aware Milestones", () => {
  it("resolves done states from goal counts", () => {
    const milestones = goalMilestones("GET_BOOKINGS", {
      products: 0, bookings: 5, orders: 0, courses: 0, services: 0,
      testimonials: 0, gallery: 0, timeline: 0, faq: 0, contentFeed: 0, affiliateLinks: 0,
    });
    expect(milestones[0]!.id).toBe("bookings_configured");
    expect(milestones[0]!.done).toBe(true);
    expect(milestones.find((m) => m.id === "bookings_25")!.done).toBe(false);
  });
});

describe("Goals Runtime — Phase 10: Goal Alignment", () => {
  it("computes weighted alignment across the profile", () => {
    const alignment = computeGoalAlignment(profileOf(["SELL_PRODUCTS", 100]), restaurantWithSales());
    expect(alignment.items[0]!.percent).toBe(100);
    expect(alignment.overall).toBe(100);
  });

  it("returns 0 when nothing is in place", () => {
    const alignment = computeGoalAlignment(profileOf(["SELL_PRODUCTS", 100]), makeSnapshot());
    expect(alignment.overall).toBe(0);
  });
});

describe("Goals Runtime — Phase 8: Commerce Ordering", () => {
  it("exposes the commerce surface a goal leads with", () => {
    expect(commercePriority(profileOf(["GET_BOOKINGS", 100]))).toBe("bookings");
    expect(commercePriority(profileOf(["SELL_PRODUCTS", 100]))).toBe("products");
    expect(commercePriority(profileOf(["SHOW_PORTFOLIO", 100]))).toBeNull();
  });
});

describe("Goals Runtime — Phase 2: Profile Validation", () => {
  it("accepts a valid weighted profile", () => {
    const result = validateGoalProfile({ weights: [{ goalId: "GET_BOOKINGS", weight: 60 }], source: "manual" });
    expect(result.valid).toBe(true);
  });

  it("rejects over-100 sums and unknown goals", () => {
    expect(validateGoalProfile({ weights: [{ goalId: "GET_BOOKINGS", weight: 101 }], source: "manual" }).valid).toBe(false);
    expect(validateGoalProfile({ weights: [{ goalId: "FAKE_GOAL", weight: 100 }], source: "manual" }).valid).toBe(false);
    expect(validateGoalProfile({ weights: [], source: "manual" }).valid).toBe(false);
  });

  it("primaryGoal returns the highest weighted goal", () => {
    const profile = profileOf(["SELL_PRODUCTS", 25], ["GET_BOOKINGS", 60]);
    expect(primaryGoal(profile)!.goalId).toBe("GET_BOOKINGS");
  });
});

describe("Goals Runtime — Storefront Score Integration (Knowledge unchanged)", () => {
  it("keeps 7 dimensions without a goal alignment (existing behaviour)", () => {
    expect(computeStorefrontScore(makeSnapshot()).dimensions).toHaveLength(7);
  });

  it("appends a Goal Alignment dimension when provided", () => {
    const storefront = computeStorefrontScore(makeSnapshot(), undefined, { percent: 80, label: "Goal Alignment" });
    expect(storefront.dimensions).toHaveLength(8);
    expect(storefront.dimensions.at(-1)!.label).toBe("Goal Alignment");
    expect(storefront.dimensions.at(-1)!.score).toBe(80);
  });
});
