import { describe, it, expect } from "vitest";

import {
  HEALTH_DIMENSION_REGISTRY,
  computeBusinessHealth,
  gradeFor,
  nextMilestoneFor,
  computeTrend,
  trendFrom,
  businessHealthRuntime,
} from "@/modules/business-health";
import type { BusinessHealth, HealthEvalDeps, KnowledgeSnapshot, RuntimeContext } from "@/modules/business-health";
import {
  computeKnowledgeScore,
  computeStorefrontScore,
  knowledgeScoreService,
} from "@/modules/knowledge-runtime";
import {
  recommendedProfile,
  computeGoalAlignment,
  goalBuilderSuggestions,
  goalDashboard,
  countsFromSnapshot,
  commercePriority,
  recommendGoals,
} from "@/modules/goals-runtime";
import { computeHealthLift } from "@/modules/recommendation-runtime";

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

async function makeContext(snapshot: KnowledgeSnapshot, overrides: Partial<RuntimeContext> = {}): Promise<RuntimeContext> {
  const knowledge = await knowledgeScoreService.evaluateFromSnapshot(snapshot);
  const profile = recommendedProfile(snapshot);
  const activeProfile = {
    weights: profile.weights,
    updatedAt: "",
    source: "recommended" as const,
    entityType: profile.entityType,
  };
  const alignment = computeGoalAlignment(activeProfile, snapshot);
  const counts = countsFromSnapshot(snapshot);
  const goals = {
    profile: activeProfile,
    activeProfile,
    recommendations: recommendGoals(snapshot),
    alignment,
    builderSuggestions: goalBuilderSuggestions(activeProfile, snapshot),
    dashboard: goalDashboard(activeProfile, snapshot),
    counts,
    milestones: [],
    commercePriority: commercePriority(activeProfile),
    snapshot,
  };
  const storefrontScore = computeStorefrontScore(snapshot, knowledge.score.overall, { percent: alignment.overall });
  return {
    tenantId: "t1",
    snapshot,
    knowledge,
    goals,
    success: null,
    recommendations: [],
    storefrontScore,
    health: {} as never,
    metrics: {} as never,
    intelligence: { publishState: null, published: false, analyticsActive: false },
    ...overrides,
  } as RuntimeContext;
}

const emptyDeps: HealthEvalDeps = { tenantId: "t1", recommendationHistory: {} };

function completeSnapshot(): KnowledgeSnapshot {
  return makeSnapshot({
    identity: {
      name: "Rahul Fitness", tagline: "Coach", bio: "x".repeat(40),
      avatarUrl: "a", bannerUrl: "b",
    },
    brand: { logoUrl: "l", customTheme: true },
    commerce: {
      productCount: 3, productsWithDescription: 3, productsWithImage: 3, offersPriced: 3, offerCount: 3,
      serviceCount: 1, courseCount: 1, bookingCount: 1,
    },
    content: { galleryCount: 4, galleryWithTitle: 4, galleryWithAltText: 4, faqCount: 3, feedCount: 3 },
    trust: { testimonialCount: 3, timelineCount: 3, gameCount: 0 },
    media: { heroMediaPresent: true, heroTitlePresent: true },
    seo: { title: "Rahul — Coach", description: "x".repeat(40) },
    contact: { email: "r@t.com", phone: "9876543210", location: "Mumbai", languages: ["English"], businessHours: [] },
    social: { socialLinkCount: 3, primaryPlatform: "YouTube", feedConnected: true, affiliateLinkCount: 2 },
    business: { customDomain: "rahul.fit", subdomain: "rahul" },
    declared: { brand_mission: "A real mission.", trust_achievements: "Real achievements.", seo_keywords: ["a", "b", "c"], creator_sponsors: "Nike" },
  });
}

describe("Business Health — Phase 1/2: Registry", () => {
  it("defines 12 dimensions whose default weights sum to 100", () => {
    expect(HEALTH_DIMENSION_REGISTRY).toHaveLength(12);
    const total = HEALTH_DIMENSION_REGISTRY.reduce((sum, d) => sum + d.weight, 0);
    expect(total).toBe(100);
    for (const d of HEALTH_DIMENSION_REGISTRY) {
      expect(typeof d.scoreExtractor).toBe("function");
      expect(typeof d.dataAvailable).toBe("function");
      expect(d.healthyThreshold).toBeGreaterThan(d.warningThreshold);
      expect(d.warningThreshold).toBeGreaterThan(d.criticalThreshold);
    }
  });
});

describe("Business Health — Phase 3: Engine", () => {
  it("computes a weighted overall score from the runtime context (no duplicates)", async () => {
    const ctx = await makeContext(completeSnapshot());
    const health = computeBusinessHealth(ctx, emptyDeps);

    // Knowledge dimension reads the knowledge score directly (never recomputed).
    const knowledgeDim = health.dimensions.find((d) => d.id === "knowledge")!;
    expect(knowledgeDim.score).toBe(ctx.knowledge.score.overall);

    expect(health.overallScore).toBeGreaterThan(0);
    expect(health.overallScore).toBeLessThanOrEqual(100);
    expect(health.dimensions).toHaveLength(12);
    expect(health.strongestAreas.length).toBeGreaterThan(0);
    expect(health.weakestAreas.length).toBeGreaterThan(0);
  });

  it("scores a sparse creator low and a complete one high", async () => {
    const empty = computeBusinessHealth(await makeContext(makeSnapshot()), emptyDeps);
    const full = computeBusinessHealth(await makeContext(completeSnapshot()), emptyDeps);
    expect(empty.overallScore).toBeLessThan(full.overallScore);
  });

  it("recommends a focus on the weakest weighted area", async () => {
    const health: BusinessHealth = computeBusinessHealth(await makeContext(makeSnapshot()), emptyDeps);
    expect(health.recommendedFocus).toMatch(/^Increase /);
    expect(health.nextMilestone).toBeGreaterThan(0);
  });
});

describe("Business Health — Phase 4: Grades", () => {
  it("maps scores to grade bands", () => {
    expect(gradeFor(95)).toBe("A+");
    expect(gradeFor(90)).toBe("A");
    expect(gradeFor(85)).toBe("B");
    expect(gradeFor(75)).toBe("C");
    expect(gradeFor(65)).toBe("D");
    expect(gradeFor(50)).toBe("F");
  });

  it("computes the next milestone", () => {
    expect(nextMilestoneFor(86)).toBe(90);
    expect(nextMilestoneFor(94)).toBe(100);
    expect(nextMilestoneFor(12)).toBe(20);
  });
});

describe("Business Health — Phase 5: Trend", () => {
  it("detects improving / stable / declining / new", () => {
    expect(computeTrend(80, 70)).toBe("improving");
    expect(computeTrend(80, 79)).toBe("stable");
    expect(computeTrend(80, 90)).toBe("declining");
    expect(computeTrend(80, null)).toBe("new");
  });

  it("produces a trend result", () => {
    const result = trendFrom(82, 75, 4);
    expect(result.trend).toBe("improving");
    expect(result.delta).toBe(7);
    expect(result.historyLength).toBe(4);
  });
});

describe("Business Health — Phase 7: Recommendation health lift", () => {
  it("maps expected impact to a deterministic health lift", () => {
    const lift = computeHealthLift({ trust: 14, goalAlignment: 12, knowledge: 6 });
    expect(lift).toBeGreaterThan(0);
    expect(lift).toBe(Math.round((14 + 12 + 6) / 20));
  });
});

describe("Business Health — Phase 16: Public API", () => {
  it("evaluates and compares deterministically", async () => {
    const empty = await businessHealthRuntime.evaluateFrom(await makeContext(makeSnapshot()), "t1");
    const full = await businessHealthRuntime.evaluateFrom(await makeContext(completeSnapshot()), "t1");
    expect(empty.health.overallScore).toBeLessThan(full.health.overallScore);
    expect(["improving", "stable", "declining", "new"]).toContain(full.trend.trend);
  });
});
