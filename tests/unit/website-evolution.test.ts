import { describe, it, expect } from "vitest";

import {
  EVOLUTION_REGISTRY,
  detectOpportunities,
  websiteEvolutionRuntime,
} from "@/modules/website-evolution";
import type { EvolutionHistory, GoalProfile, KnowledgeSnapshot, RuntimeContext } from "@/modules/website-evolution";
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
  profile: GoalProfile | null,
  overrides: Partial<RuntimeContext> = {},
): Promise<RuntimeContext> {
  const knowledge = await knowledgeScoreService.evaluateFromSnapshot(snapshot);
  const recommended = recommendedProfile(snapshot);
  const activeProfile = profile ?? {
    weights: recommended.weights, updatedAt: "", source: "recommended" as const, entityType: recommended.entityType,
  };
  const alignment = computeGoalAlignment(activeProfile, snapshot);
  const counts = countsFromSnapshot(snapshot);
  const goals = {
    profile, activeProfile, recommendations: [],
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

function scaledSnapshot(): KnowledgeSnapshot {
  return makeSnapshot({
    commerce: {
      productCount: 15, productsWithDescription: 15, productsWithImage: 15, offersPriced: 15, offerCount: 15,
      serviceCount: 2, courseCount: 6, bookingCount: 5,
    },
    content: { galleryCount: 35, galleryWithTitle: 35, galleryWithAltText: 35, faqCount: 12, feedCount: 4 },
    trust: { testimonialCount: 25, timelineCount: 4, gameCount: 0 },
  });
}

const emptyDeps = { tenantId: "t1", recommendationHistory: {} };

describe("Website Evolution — Phase 1: Registry", () => {
  it("declares growth-triggered improvements with expected lifts", () => {
    expect(EVOLUTION_REGISTRY.length).toBeGreaterThanOrEqual(9);
    for (const evolution of EVOLUTION_REGISTRY) {
      expect(evolution.title).toBeTruthy();
      expect(evolution.reason).toBeTruthy();
      expect(evolution.expectedLift.health).toBeGreaterThanOrEqual(0);
      expect(evolution.estimatedEffort).toBeGreaterThan(0);
      expect(evolution.change.summary).toBeTruthy();
      expect(typeof evolution.when).toBe("function");
    }
  });
});

describe("Website Evolution — Phase 2: Detection", () => {
  it("detects nothing for a sparse creator", async () => {
    const ctx = await makeContext(makeSnapshot(), null);
    const opportunities = detectOpportunities(ctx, {}, emptyDeps);
    expect(opportunities).toHaveLength(0);
  });

  it("detects growth-triggered improvements for a scaled creator", async () => {
    const ctx = await makeContext(scaledSnapshot(), profileOf(["SELL_PRODUCTS", 60], ["GET_BOOKINGS", 40]));
    const opportunities = detectOpportunities(ctx, {}, emptyDeps);
    const ids = opportunities.map((o) => o.id);
    expect(ids).toContain("PRODUCT_COLLECTIONS");
    expect(ids).toContain("GALLERY_MASONRY");
    expect(ids).toContain("FEATURED_REVIEWS");
    expect(ids).toContain("FAQ_ACCORDION");
    expect(ids).toContain("FEATURED_PRODUCTS");
    expect(ids).toContain("BOOKING_SECTION_UP");
  });

  it("predicts before/after health lifts deterministically", async () => {
    const ctx = await makeContext(scaledSnapshot(), profileOf(["SELL_PRODUCTS", 100]));
    const opportunities = detectOpportunities(ctx, {}, emptyDeps);
    const collections = opportunities.find((o) => o.id === "PRODUCT_COLLECTIONS")!;
    expect(collections.after.health).toBe(collections.before.health + 3);
    expect(collections.after.conversion).toBe(collections.before.conversion + 5);
    expect(collections.roi).toBeGreaterThan(0);
  });

  it("never re-offers applied or rejected improvements", async () => {
    const ctx = await makeContext(scaledSnapshot(), profileOf(["SELL_PRODUCTS", 100]));
    const history: EvolutionHistory = {
      PRODUCT_COLLECTIONS: { status: "applied", detectedAt: new Date().toISOString(), appliedAt: new Date().toISOString() },
      FAQ_ACCORDION: { status: "rejected", detectedAt: new Date().toISOString(), resolvedAt: new Date().toISOString() },
    };
    const ids = detectOpportunities(ctx, history, emptyDeps).map((o) => o.id);
    expect(ids).not.toContain("PRODUCT_COLLECTIONS");
    expect(ids).not.toContain("FAQ_ACCORDION");
  });

  it("sorts opportunities by ROI descending", async () => {
    const ctx = await makeContext(scaledSnapshot(), profileOf(["SELL_PRODUCTS", 100]));
    const opportunities = detectOpportunities(ctx, {}, emptyDeps);
    const rois = opportunities.map((o) => o.roi);
    expect([...rois].sort((a, b) => b - a)).toEqual(rois);
  });
});

describe("Website Evolution — Phase 11: Runtime (RuntimeContext integration)", () => {
  it("detects from a shared context without rebuilding (resilient to history reads)", async () => {
    const ctx = await makeContext(scaledSnapshot(), profileOf(["SELL_PRODUCTS", 60], ["GET_BOOKINGS", 40]));
    const opportunities = await websiteEvolutionRuntime.detectFrom(ctx, "t1");
    expect(opportunities.length).toBeGreaterThan(0);
    // Existing websites unchanged: detection is pure — nothing is written.
  });

  it("returns a change manifest when applying a live opportunity", async () => {
    const ctx = await makeContext(scaledSnapshot(), profileOf(["SELL_PRODUCTS", 100]));
    const opportunities = await websiteEvolutionRuntime.detectFrom(ctx, "t1");
    const target = opportunities.find((o) => o.id === "PRODUCT_COLLECTIONS");
    expect(target?.change.summary).toContain("collections");
  });
});
