import { describe, it, expect } from "vitest";

import {
  SECTION_INTELLIGENCE_REGISTRY,
  resolveAdaptiveVisibility,
  resolveHomepageOrder,
  contentFromSnapshot,
  ctaFor,
  ctaForProfile,
  themeEmphasisFor,
  computeTrustProfile,
  computeConversionScore,
  computeExperienceIntelligence,
} from "@/modules/experience-intelligence";
import type { GoalProfile, KnowledgeSnapshot, RuntimeContext } from "@/modules/experience-intelligence";
import {
  computeKnowledgeScore,
  computeStorefrontScore,
  knowledgeScoreService,
} from "@/modules/knowledge-runtime";
import {
  recommendedProfile,
  computeGoalAlignment,
  countsFromSnapshot,
  commercePriority,
} from "@/modules/goals-runtime";

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
    weights: weights.map(([goalId, weight]) => ({ goalId, weight }) as never),
    updatedAt: "",
    source: "manual",
    entityType: "creator",
  };
}

async function makeContext(
  snapshot: KnowledgeSnapshot,
  overrides: Partial<RuntimeContext> = {},
): Promise<RuntimeContext> {
  const knowledge = await knowledgeScoreService.evaluateFromSnapshot(snapshot);
  const profile = recommendedProfile(snapshot);
  const activeProfile = { weights: profile.weights, updatedAt: "", source: "recommended" as const, entityType: profile.entityType };
  const alignment = computeGoalAlignment(activeProfile, snapshot);
  const counts = countsFromSnapshot(snapshot);
  const goals = {
    profile: null, activeProfile, recommendations: [],
    alignment, builderSuggestions: [], dashboard: null, counts,
    milestones: [], commercePriority: commercePriority(activeProfile), snapshot,
  };
  const storefrontScore = computeStorefrontScore(snapshot, knowledge.score.overall, { percent: alignment.overall });
  return {
    tenantId: "t1", snapshot, knowledge, goals, success: null, recommendations: [],
    storefrontScore, health: { overallScore: 50 } as never, metrics: {} as never,
    intelligence: { publishState: null, published: false, analyticsActive: false },
    ...overrides,
  } as RuntimeContext;
}

function withProfile(ctx: RuntimeContext, profile: GoalProfile): RuntimeContext {
  return { ...ctx, goals: { ...ctx.goals, profile, activeProfile: profile } };
}

describe("Experience Intelligence — Phase 1: Section Registry", () => {
  it("defines 15 canonical sections with intelligence metadata", () => {
    expect(SECTION_INTELLIGENCE_REGISTRY).toHaveLength(15);
    for (const section of SECTION_INTELLIGENCE_REGISTRY) {
      expect(section.base).toBeTruthy();
      expect(section.priority).toBeGreaterThanOrEqual(0);
      expect(section.conversionWeight).toBeGreaterThanOrEqual(0);
      expect(section.conversionWeight).toBeLessThanOrEqual(1);
      expect(section.mobilePriority).toBeGreaterThan(0);
      expect(typeof section.contentCheck).toBe("function");
    }
  });
});

describe("Experience Intelligence — Phase 3: Adaptive visibility", () => {
  it("hides empty conditional sections only when a goal profile is present", () => {
    const content = contentFromSnapshot(makeSnapshot()); // all empty
    expect(resolveAdaptiveVisibility(content, false)).toEqual([]); // unchanged without goals
    const hidden = resolveAdaptiveVisibility(content, true);
    expect(hidden).toContain("products");
    expect(hidden).toContain("gallery");
    expect(hidden).not.toContain("hero");
    expect(hidden).not.toContain("footer");
    expect(hidden).not.toContain("contact");
  });

  it("keeps sections with content visible", () => {
    const content = contentFromSnapshot(makeSnapshot({
      commerce: { productCount: 3, productsWithDescription: 3, productsWithImage: 3, offersPriced: 3, offerCount: 3, serviceCount: 0, courseCount: 0, bookingCount: 0 },
      content: { galleryCount: 4, galleryWithTitle: 4, galleryWithAltText: 4, faqCount: 3, feedCount: 0 },
    }));
    const hidden = resolveAdaptiveVisibility(content, true);
    expect(hidden).not.toContain("products");
    expect(hidden).not.toContain("gallery");
    expect(hidden).not.toContain("faq");
  });
});

describe("Experience Intelligence — Phase 2: Goal-aware homepage order", () => {
  it("orders hero first, footer last and goal-preferred sections earlier", () => {
    const bases = ["footer", "gallery", "hero", "products", "testimonials"];
    const order = resolveHomepageOrder(profileOf(["SELL_PRODUCTS", 100]), bases as never);
    expect(order[0]).toBe("hero");
    expect(order[order.length - 1]).toBe("footer");
    expect(order.indexOf("products")).toBeLessThan(order.indexOf("gallery"));
  });

  it("returns a stable order without a goal profile", () => {
    const order = resolveHomepageOrder(null, ["gallery", "hero", "products", "footer"] as never);
    expect(order[0]).toBe("hero");
    expect(order[order.length - 1]).toBe("footer");
  });
});

describe("Experience Intelligence — Phase 5: CTA", () => {
  it("maps goals to deterministic CTAs", () => {
    expect(ctaFor("GET_BOOKINGS").primary).toBe("Book Now");
    expect(ctaFor("SELL_PRODUCTS").primary).toBe("Buy Now");
    expect(ctaFor("SHOW_PORTFOLIO").primary).toBe("Contact Me");
  });

  it("derives the primary CTA from the weighted profile", () => {
    expect(ctaForProfile(profileOf(["SELL_COURSES", 100])).primary).toBe("Start Learning");
    expect(ctaForProfile(null).primary).toBe("Get Started");
  });
});

describe("Experience Intelligence — Phase 11: Theme emphasis", () => {
  it("combines theme emphasis with the primary goal", () => {
    expect(themeEmphasisFor(profileOf(["SHOW_PORTFOLIO", 100])).mediaEmphasis).toBe("high");
    expect(themeEmphasisFor(profileOf(["BUILD_BRAND", 100])).whitespace).toBe("high");
    expect(themeEmphasisFor(null).whitespace).toBe("medium");
  });
});

describe("Experience Intelligence — Phase 4: Trust", () => {
  it("scores trust from present sources", () => {
    expect(computeTrustProfile({ testimonialCount: 0, timelineCount: 0, socialLinkCount: 0, achievementsPresent: false, communityPresent: false, businessHealth: 0, recommendationCompletion: 0, verifiedBadge: false }).score).toBe(0);
    const strong = computeTrustProfile({ testimonialCount: 3, timelineCount: 2, socialLinkCount: 3, achievementsPresent: true, communityPresent: true, businessHealth: 85, recommendationCompletion: 60, verifiedBadge: false });
    expect(strong.score).toBeGreaterThan(0);
    expect(strong.sources).toHaveLength(7);
  });
});

describe("Experience Intelligence — Phase 8: Conversion score", () => {
  it("computes 8 weighted dimensions, low for empty and high for complete", async () => {
    const empty = computeConversionScore(await makeContext(makeSnapshot()));
    expect(empty.dimensions).toHaveLength(8);
    expect(empty.overall).toBeLessThan(60);

    const full = computeConversionScore(await makeContext(makeSnapshot({
      commerce: { productCount: 3, productsWithDescription: 3, productsWithImage: 3, offersPriced: 3, offerCount: 3, serviceCount: 1, courseCount: 1, bookingCount: 1 },
      content: { galleryCount: 4, galleryWithTitle: 4, galleryWithAltText: 4, faqCount: 3, feedCount: 3 },
      trust: { testimonialCount: 3, timelineCount: 2, gameCount: 0 },
      media: { heroMediaPresent: true, heroTitlePresent: true },
      seo: { title: "Rahul — Coach", description: "x".repeat(40) },
      contact: { email: "r@t.com", phone: "9876543210", location: "Mumbai", languages: [], businessHours: [] },
      social: { socialLinkCount: 2, primaryPlatform: "YouTube", feedConnected: true, affiliateLinkCount: 1 },
    })));
    expect(full.overall).toBeGreaterThan(empty.overall);
  });
});

describe("Experience Intelligence — Runtime (RuntimeContext integration)", () => {
  it("builds a full experience plan from the context without rebuilds", async () => {
    const ctx = await makeContext(makeSnapshot());
    const withGoals = withProfile(ctx, profileOf(["GET_BOOKINGS", 100]));
    const intelligence = computeExperienceIntelligence(withGoals);

    expect(intelligence.hiddenBases).toContain("products"); // empty + goals present
    expect(intelligence.cta.primary).toBe("Book Now");
    expect(intelligence.conversionScore.overall).toBeGreaterThanOrEqual(0);
    expect(intelligence.trust.score).toBeGreaterThanOrEqual(0);
    expect(intelligence.themeEmphasis).toBeTruthy();
    expect(intelligence.mobile.length).toBe(15);
    expect(intelligence.homepageOrder[0]).toBe("hero");
    expect(intelligence.homepageOrder[intelligence.homepageOrder.length - 1]).toBe("footer");
    // every registered section has a plan entry
    expect(Object.keys(intelligence.sectionPlan).length).toBe(15);
  });

  it("keeps adaptive visibility disabled without a persisted goal profile", async () => {
    const ctx = await makeContext(makeSnapshot());
    const intelligence = computeExperienceIntelligence(ctx);
    expect(intelligence.hiddenBases).toEqual([]); // no persisted profile → unchanged
  });
});
