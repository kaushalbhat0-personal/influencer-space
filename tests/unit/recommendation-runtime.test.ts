import { describe, it, expect } from "vitest";

import {
  RECOMMENDATION_REGISTRY,
  getRecommendation,
  computeRecommendations,
  scoreRecommendation,
  goalAlignmentTerm,
  knowledgeGapTerm,
  computeStorefrontLift,
  activeImpacts,
  groupByCategory,
} from "@/modules/recommendation-runtime";
import type { GoalProfile, KnowledgeSnapshot, RecommendationContext, RecommendationHistory } from "@/modules/recommendation-runtime";
import { computeKnowledgeScore, computeStorefrontScore } from "@/modules/knowledge-runtime";
import { countsFromSnapshot } from "@/modules/goals-runtime";

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

function makeContext(overrides: Partial<RecommendationContext> = {}): RecommendationContext {
  const snapshot = overrides.snapshot ?? makeSnapshot();
  const knowledgeScore = computeKnowledgeScore(snapshot);
  const storefront = computeStorefrontScore(snapshot, knowledgeScore.overall);
  const counts = overrides.counts ?? countsFromSnapshot(snapshot);
  const derivedMetrics: RecommendationContext["metrics"] = {
    productCount: snapshot.commerce.productCount,
    orderCount: counts.orders,
    bookingCount: snapshot.commerce.bookingCount,
    galleryCount: snapshot.content.galleryCount,
    testimonialCount: snapshot.trust.testimonialCount,
    courseCount: snapshot.commerce.courseCount,
    serviceCount: snapshot.commerce.serviceCount,
    faqCount: snapshot.content.faqCount,
    timelineCount: snapshot.trust.timelineCount,
    affiliateLinkCount: snapshot.social.affiliateLinkCount,
    contentFeedCount: snapshot.content.feedCount,
    publishState: null,
    published: false,
    analyticsActive: false,
  };
  return {
    snapshot,
    activeProfile: null,
    success: null,
    storefront,
    knowledgeScore,
    metrics: overrides.metrics ?? derivedMetrics,
    counts,
    ...overrides,
  };
}

function profileOf(...weights: Array<[string, number]>): GoalProfile {
  return {
    weights: weights.map(([goalId, weight]) => ({ goalId, weight }) as never),
    updatedAt: "",
    source: "manual",
    entityType: "creator",
  };
}

describe("Recommendation Runtime — Phase 1: Registry", () => {
  it("defines the canonical recommendations", () => {
    expect(RECOMMENDATION_REGISTRY.length).toBeGreaterThanOrEqual(24);
    const ids = RECOMMENDATION_REGISTRY.map((r) => r.id);
    for (const expected of ["ADD_LOGO", "UPLOAD_HERO_IMAGE", "CREATE_FIRST_PRODUCT", "ENABLE_BOOKINGS", "UPLOAD_GALLERY", "ADD_TESTIMONIALS", "ENABLE_SEO", "CONNECT_DOMAIN", "CONNECT_YOUTUBE", "WRITE_ABOUT", "CREATE_FAQ", "ADD_REFUND_POLICY", "ENABLE_ANALYTICS", "PUBLISH_SITE", "VERIFY_EMAIL", "CONFIGURE_BRAND", "ADD_SOCIAL_LINKS", "CREATE_COURSE", "CREATE_AFFILIATE_PRODUCT", "CREATE_DIGITAL_PRODUCT", "ENABLE_COMMUNITY", "ADD_TIMELINE", "ENABLE_NEWSLETTER"]) {
      expect(ids).toContain(expected);
    }
  });

  it("declares all required attributes per recommendation", () => {
    for (const rec of RECOMMENDATION_REGISTRY) {
      expect(rec.id).toBeTruthy();
      expect(rec.title).toBeTruthy();
      expect(rec.description).toBeTruthy();
      expect(rec.category).toBeTruthy();
      expect(rec.priority).toBeGreaterThanOrEqual(1);
      expect(rec.priority).toBeLessThanOrEqual(5);
      expect(rec.estimatedTime).toBeGreaterThanOrEqual(0);
      expect(typeof rec.when).toBe("function");
      expect(typeof rec.done).toBe("function");
      expect(rec.dashboardAction.href).toBeTruthy();
      expect(rec.expectedImpact).toBeTruthy();
    }
  });
});

describe("Recommendation Runtime — Phase 2: Scoring", () => {
  it("produces deterministic 0-100 scores", () => {
    const ctx = makeContext();
    for (const rec of RECOMMENDATION_REGISTRY) {
      if (!rec.when(ctx)) continue;
      const score = scoreRecommendation(rec, ctx);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(scoreRecommendation(rec, ctx)).toBe(score);
    }
  });

  it("boosts booking goals for booking affinity", () => {
    const booking = profileOf(["GET_BOOKINGS", 100]);
    const product = profileOf(["SELL_PRODUCTS", 100]);
    const bookings = getRecommendation("ENABLE_BOOKINGS")!;
    expect(goalAlignmentTerm(bookings.goalAffinity, booking)).toBeGreaterThan(
      goalAlignmentTerm(bookings.goalAffinity, product),
    );
  });

  it("measures knowledge gap as missing dependencies", () => {
    const ctx = makeContext();
    const rec = getRecommendation("CREATE_FIRST_PRODUCT")!;
    expect(knowledgeGapTerm(rec.knowledgeDependencies, ctx)).toBeGreaterThan(0);
  });
});

describe("Recommendation Runtime — Engine", () => {
  it("returns recommendations for a sparse creator and sorts by score", () => {
    const recommendations = computeRecommendations(makeContext(), {});
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.find((r) => r.id === "CREATE_FIRST_PRODUCT")).toBeDefined();
    expect(recommendations.find((r) => r.id === "PUBLISH_SITE")).toBeDefined();
    const scores = recommendations.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("does not recommend content the creator already has (knowledge integration)", () => {
    const ctx = makeContext({
      snapshot: makeSnapshot({
        identity: { name: "R", tagline: "Coach", bio: "x".repeat(40), avatarUrl: "a", bannerUrl: "b" },
        brand: { logoUrl: "l", customTheme: true },
        commerce: { productCount: 3, productsWithDescription: 3, productsWithImage: 3, offersPriced: 3, offerCount: 3, serviceCount: 0, courseCount: 0, bookingCount: 0 },
        content: { galleryCount: 4, galleryWithTitle: 4, galleryWithAltText: 4, faqCount: 3, feedCount: 0 },
        trust: { testimonialCount: 3, timelineCount: 2, gameCount: 0 },
        media: { heroMediaPresent: true, heroTitlePresent: true },
        seo: { title: "Rahul — Coach", description: "x".repeat(40) },
        social: { socialLinkCount: 2, primaryPlatform: "YouTube", feedConnected: true, affiliateLinkCount: 0 },
      }),
    });
    const ids = computeRecommendations(ctx, {}).map((r) => r.id);
    expect(ids).not.toContain("CREATE_FIRST_PRODUCT");
    expect(ids).not.toContain("UPLOAD_HERO_IMAGE");
    expect(ids).not.toContain("ADD_TESTIMONIALS");
    expect(ids).not.toContain("WRITE_ABOUT");
  });

  it("hides PUBLISH_SITE once the site is live (success integration)", () => {
    const ctx = makeContext({ metrics: { ...makeContext().metrics, published: true, publishState: "live" } });
    const ids = computeRecommendations(ctx, {}).map((r) => r.id);
    expect(ids).not.toContain("PUBLISH_SITE");
  });

  it("recommends product polish only after a product exists (commerce integration)", () => {
    const noProducts = computeRecommendations(makeContext(), {}).map((r) => r.id);
    expect(noProducts).not.toContain("CREATE_DIGITAL_PRODUCT");

    const withProducts = makeContext({
      snapshot: makeSnapshot({
        commerce: { productCount: 1, productsWithDescription: 0, productsWithImage: 0, offersPriced: 1, offerCount: 1, serviceCount: 0, courseCount: 0, bookingCount: 0 },
      }),
    });
    const ids = computeRecommendations(withProducts, {}).map((r) => r.id);
    expect(ids).toContain("CREATE_DIGITAL_PRODUCT");
  });

  it("surfaces commerce recs for commerce goals and portfolio recs for portfolio goals (goal integration)", () => {
    const commerce = makeContext({ activeProfile: profileOf(["SELL_PRODUCTS", 100]) });
    const portfolio = makeContext({ activeProfile: profileOf(["SHOW_PORTFOLIO", 100]) });

    const commerceIds = computeRecommendations(commerce, {}).map((r) => r.id);
    const portfolioIds = computeRecommendations(portfolio, {}).map((r) => r.id);

    const bookingScore = commerceIds.includes("ENABLE_BOOKINGS") ? computeRecommendations(commerce, {}).find((r) => r.id === "ENABLE_BOOKINGS")!.score : 0;
    const productScore = computeRecommendations(commerce, {}).find((r) => r.id === "CREATE_FIRST_PRODUCT")!.score;
    expect(productScore).toBeGreaterThan(bookingScore);

    expect(portfolioIds).toContain("UPLOAD_GALLERY");
  });
});

describe("Recommendation Runtime — Phase 11: History integration", () => {
  it("never recommends dismissed or completed items", () => {
    const history: RecommendationHistory = {
      ADD_TESTIMONIALS: { status: "dismissed", dismissedAt: new Date().toISOString() },
      CREATE_FIRST_PRODUCT: { status: "completed", completedAt: new Date().toISOString() },
    };
    const ids = computeRecommendations(makeContext(), history).map((r) => r.id);
    expect(ids).not.toContain("ADD_TESTIMONIALS");
    expect(ids).not.toContain("CREATE_FIRST_PRODUCT");
  });

  it("resurfaces ignored items after refresh", () => {
    const ignored: RecommendationHistory = {
      ENABLE_SEO: { status: "ignored", ignoredAt: new Date().toISOString() },
    };
    expect(computeRecommendations(makeContext(), ignored).map((r) => r.id)).not.toContain("ENABLE_SEO");
    // After refresh (ignored cleared), the recommendation returns.
    expect(computeRecommendations(makeContext(), {}).map((r) => r.id)).toContain("ENABLE_SEO");
  });

  it("respects prerequisites", () => {
    // CREATE_DIGITAL_PRODUCT requires CREATE_FIRST_PRODUCT to be complete.
    const ids = computeRecommendations(makeContext(), {}).map((r) => r.id);
    expect(ids).not.toContain("CREATE_DIGITAL_PRODUCT");
  });
});

describe("Recommendation Runtime — Phase 3: Categories", () => {
  it("groups recommendations by category in priority order", () => {
    const recommendations = computeRecommendations(makeContext(), {});
    const groups = groupByCategory(recommendations);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]!.label).toBe("Critical");
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
      const scores = group.items.map((r) => r.score);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    }
  });
});

describe("Recommendation Runtime — Phase 8: Expected Impact", () => {
  it("computes storefront lift and non-zero impact dimensions", () => {
    const impact = { trust: 14, goalAlignment: 12, knowledge: 6 };
    expect(computeStorefrontLift(impact)).toBeGreaterThan(0);
    const active = activeImpacts(impact);
    expect(active.map((a) => a.id)).toEqual(["knowledge", "trust", "goalAlignment"]);
  });
});

describe("Recommendation Runtime — Existing runtimes unchanged", () => {
  it("keeps the storefront score at 7 dimensions without goal alignment", () => {
    expect(computeStorefrontScore(makeSnapshot()).dimensions).toHaveLength(7);
  });
});
