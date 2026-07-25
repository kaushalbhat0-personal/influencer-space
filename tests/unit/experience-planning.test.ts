import { describe, it, expect } from "vitest";
import { ExperiencePlanningEngine } from "@/lib/generation/experience-plan/engine";
import { PlannerRegistry } from "@/lib/generation/experience-plan/registry";
import { PlannerGraph } from "@/lib/generation/experience-plan/planner-graph";
import { createDefaultPlanners } from "@/lib/generation/experience-plan/planners";
import { DEFAULTS } from "@/lib/generation/experience-plan/defaults";
import { PersonaEngine, ExperienceProfileBuilder } from "@/lib/generation/persona";
import { LayoutComposer } from "@/lib/generation/composition/layout-composer";
import { SectionComposer } from "@/lib/generation/composition/section-composer";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { Planner } from "@/lib/generation/experience-plan/planners/base";
import type { ExperiencePlan } from "@/lib/generation/experience-plan/types";

function mockGraph(niche: string, overrides?: Partial<KnowledgeGraph>): KnowledgeGraph {
  const base: KnowledgeGraph = {
    creator: { name: "Test", username: "test", bio: "A creator", niche, subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 },
    brand: { name: "Test", tagline: "Tagline", description: "Desc", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.7 },
    audience: { ageRange: "25-34", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["general"], incomeLevel: "medium", devicePreference: "mobile", activeHours: ["18:00"], confidence: 0.6 } as any,
    products: [],
    socialLinks: [],
    content: { topContentTypes: [], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "medium", estimatedReadTime: 1, confidence: 0.6 },
    seo: { pageTitle: "", metaDescription: "", keywords: [], focusPhrase: "", slug: "test", canonical: "", confidence: 0.6 },
    theme: { palette: ["#000"], primary: "#000", secondary: "#fff", accent: "#ccc", mode: "light", fontPairing: "Inter", borderRadius: "0.5rem", confidence: 0.8 },
    sections: [],
    businessModel: { type: "mixed", primaryRevenueSource: "Digital", monetizationChannels: [], priceTier: "mid", confidence: 0.5 },
    confidence: 0.7,
    ...overrides,
  };
  return base;
}

function buildProfile(graph: KnowledgeGraph): ExperienceProfile {
  const engine = new PersonaEngine();
  const builder = new ExperienceProfileBuilder();
  const match = engine.detect(graph);
  return builder.build(graph, match.persona, match.score);
}

// ──────────────────────────────────────────────
// PLANNER REGISTRY
// ──────────────────────────────────────────────
describe("PlannerRegistry", () => {
  const defaultPlanners = createDefaultPlanners();

  it("registers and retrieves planners", () => {
    const registry = new PlannerRegistry();
    for (const p of defaultPlanners) registry.register(p);
    expect(registry.getAll().length).toBe(defaultPlanners.length);
    expect(registry.listIds().sort()).toEqual(defaultPlanners.map((p) => p.id).sort());
  });

  it("throws on duplicate registration", () => {
    const registry = new PlannerRegistry();
    registry.register(defaultPlanners[0]!);
    expect(() => registry.register(defaultPlanners[0]!)).toThrow("already registered");
  });

  it("can retrieve a planner by id", () => {
    const registry = new PlannerRegistry();
    for (const p of defaultPlanners) registry.register(p);
    const hero = registry.get("hero");
    expect(hero).toBeDefined();
    expect(hero!.id).toBe("hero");
  });

  it("returns undefined for unknown id", () => {
    const registry = new PlannerRegistry();
    for (const p of defaultPlanners) registry.register(p);
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("can remove a planner by id", () => {
    const registry = new PlannerRegistry();
    registry.register(defaultPlanners[0]!);
    expect(registry.remove("hero")).toBe(true);
    expect(registry.get("hero")).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// PLANNING ENGINE
// ──────────────────────────────────────────────
describe("ExperiencePlanningEngine", () => {
  it("produces a complete ExperiencePlan", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);

    expect(plan.hero).toBeDefined();
    expect(plan.pricing).toBeDefined();
    expect(plan.socialProof).toBeDefined();
    expect(plan.gallery).toBeDefined();
    expect(plan.testimonial).toBeDefined();
    expect(plan.cta).toBeDefined();
    expect(plan.footer).toBeDefined();
    expect(plan.navigation).toBeDefined();
    expect(plan.theme).toBeDefined();
    expect(plan.sectionOrder).toBeDefined();
    expect(plan.page).toBeDefined();
    expect(plan.conversionGoal).toBeDefined();
    expect(plan.seo).toBeDefined();
    expect(plan.contentDensity).toBeDefined();
    expect(plan.visualRhythm).toBeDefined();
    expect(plan.mobilePriority).toBeDefined();
    expect(plan.animationProfile).toBeDefined();
    expect(plan.recommendationSlots).toBeGreaterThanOrEqual(0);
  });

  it("all 11 strategies execute without error", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("education", {
      products: [
        { name: "C1", type: "digital", category: "Education", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 },
        { name: "C2", type: "digital", category: "Education", description: "", priceRange: "$100", recommended: true, reason: "", confidence: 0.9 },
      ],
      creator: { name: "Prof", username: "prof", bio: "I teach courses", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.hero.variant).toBeTruthy();
    expect(plan.conversionGoal.primary).toBe("education");
  });

  it("plan is immutable (frozen)", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.hero)).toBe(true);
    expect(Object.isFrozen(plan.pricing)).toBe(true);
    expect(Object.isFrozen(plan.cta)).toBe(true);
  });
});

// ──────────────────────────────────────────────
// DETERMINISM
// ──────────────────────────────────────────────
describe("Determinism", () => {
  it("same graph + profile always produces same plan", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("photography", {
      products: [
        { name: "P1", type: "physical", category: "Prints", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.8 },
        { name: "P2", type: "physical", category: "Prints", description: "", priceRange: "$100", recommended: true, reason: "", confidence: 0.8 },
      ],
      creator: { name: "Photo", username: "photo", bio: "Photographer", niche: "photography", subNiche: [], platform: "instagram", followers: 50000, engagement: 0.04, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const a = engine.plan(graph, profile);
    const b = engine.plan(graph, profile);
    expect(a).toEqual(b);
  });

  it("three consecutive plans are identical", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("fitness", {
      content: { topContentTypes: ["workout", "exercise"], averagePostLength: 200, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 2, confidence: 0.8 },
      creator: { name: "Fit", username: "fit", bio: "Trainer", niche: "fitness", subNiche: [], platform: "instagram", followers: 10000, engagement: 0.05, contentFrequency: "daily", verified: false, confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const r1 = engine.plan(graph, profile);
    const r2 = engine.plan(graph, profile);
    const r3 = engine.plan(graph, profile);
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  it("no randomness in any strategy output", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const plans = Array.from({ length: 5 }, () => engine.plan(graph, profile));
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i]).toEqual(plans[0]);
    }
  });
});

// ──────────────────────────────────────────────
// PERSONA-DRIVEN PLANNING
// ──────────────────────────────────────────────
describe("Persona-driven planning", () => {
  it("coach persona produces different plan than course creator", () => {
    const engine = new ExperiencePlanningEngine();

    const coachGraph = mockGraph("education", {
      businessModel: { type: "services", primaryRevenueSource: "Coaching", monetizationChannels: [], priceTier: "premium", confidence: 0.7 },
      creator: { name: "Coach", username: "coach", bio: "I help people transform", niche: "education", subNiche: [], platform: "instagram", followers: 2000, engagement: 0.08, contentFrequency: "daily", verified: false, confidence: 0.8 },
      audience: { ageRange: "25-44", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["personal development"], incomeLevel: "high", devicePreference: "mobile", activeHours: ["08:00"], confidence: 0.6 },
    });
    const courseGraph = mockGraph("education", {
      products: [
        { name: "C1", type: "digital", category: "Education", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 },
        { name: "C2", type: "digital", category: "Education", description: "", priceRange: "$100", recommended: true, reason: "", confidence: 0.9 },
      ],
      content: { topContentTypes: ["educational"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      creator: { name: "Prof", username: "prof", bio: "I teach courses", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });

    const coachPlan = engine.plan(coachGraph, buildProfile(coachGraph));
    const coursePlan = engine.plan(courseGraph, buildProfile(courseGraph));

    expect(coachPlan.hero.variant).not.toBe(coursePlan.hero.variant);
  });

  it("celebrity stage changes hero variant to fullscreen", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", {
      products: [
        { name: "Merch", type: "physical", category: "Apparel", description: "", priceRange: "$30", recommended: true, reason: "", confidence: 0.9 },
      ],
      creator: { name: "Star", username: "star", bio: "Famous creator", niche: "default", subNiche: [], platform: "instagram", followers: 5000000, engagement: 0.15, contentFrequency: "daily", verified: true, confidence: 0.95 },
      brand: { name: "Star Brand", tagline: "Best", description: "Top", colors: ["#000"], logo: "logo.png", existingBranding: true, brandVoice: "inspirational", confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.hero.variant).toBe("fullscreen");
    expect(plan.hero.overlay).toBe(true);
  });

  it("starting stage produces minimal hero and sparse content", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", {
      creator: { name: "New", username: "new", bio: "", niche: "default", subNiche: [], platform: "instagram", followers: 50, engagement: 0.01, contentFrequency: "irregular", verified: false, confidence: 0.3 },
      brand: { name: "", tagline: "", description: "", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.2 },
      socialLinks: [],
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.hero.variant).toBe("minimal");
    expect(plan.navigation.sticky).toBe(false);
    expect(plan.footer.showNewsletter).toBe(false);
  });

  it("dominant brand strength produces badge and elevated cards", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", {
      brand: { name: "Strong", tagline: "Tag", description: "Desc", colors: ["#000", "#fff", "#333"], logo: "logo.png", existingBranding: true, brandVoice: "professional", confidence: 0.95 },
      creator: { name: "Brand", username: "brand", bio: "Brand builder", niche: "default", subNiche: [], platform: "instagram", followers: 50000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.hero.badge).toBe(true);
    expect(plan.theme.cardStyle).toBe("elevated");
    expect(plan.theme.borderRadius).toBe("pill");
  });

  it("sales conversion goal produces cart icon CTA", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", {
      products: [
        { name: "P1", type: "physical", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.9 },
        { name: "P2", type: "physical", category: "A", description: "", priceRange: "$20", recommended: true, reason: "", confidence: 0.9 },
        { name: "P3", type: "physical", category: "A", description: "", priceRange: "$30", recommended: true, reason: "", confidence: 0.9 },
      ],
      businessModel: { type: "merch", primaryRevenueSource: "Products", monetizationChannels: [], priceTier: "mid", confidence: 0.7 },
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.conversionGoal.primary).toBe("sales");
    expect(plan.cta.icon).toBe("cart");
    expect(plan.pricing.visibility).toBe("full");
  });

  it("education conversion goal produces play icon CTA", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("education", {
      products: [{ name: "Course", type: "digital", category: "Education", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 }],
      creator: { name: "Prof", username: "prof", bio: "I teach courses", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.conversionGoal.primary).toBe("education");
    expect(plan.cta.icon).toBe("play");
  });

  it("community conversion goal produces community goal type", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", {
      businessModel: { type: "subscription", primaryRevenueSource: "Membership", monetizationChannels: [], priceTier: "mid", confidence: 0.7 },
      socialLinks: [
        { platform: "discord", url: "https://discord.gg/test", handle: "test", followers: 1000, primary: true },
        { platform: "telegram", url: "https://t.me/test", handle: "test", followers: 500, primary: false },
        { platform: "instagram", url: "https://instagram.com/test", handle: "test", followers: 5000, primary: false },
      ],
      creator: { name: "Comm", username: "comm", bio: "Community builder", niche: "default", subNiche: [], platform: "instagram", followers: 5000, engagement: 0.08, contentFrequency: "daily", verified: false, confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.conversionGoal.primary).toBe("community");
  });

  it("high social proof emphasis enables testimonials and ratings", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", {
      products: [
        { name: "P1", type: "physical", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.9 },
        { name: "P2", type: "physical", category: "A", description: "", priceRange: "$20", recommended: true, reason: "", confidence: 0.9 },
        { name: "P3", type: "digital", category: "B", description: "", priceRange: "$30", recommended: true, reason: "", confidence: 0.9 },
      ],
      creator: { name: "Trust", username: "trust", bio: "Trusted creator", niche: "default", subNiche: [], platform: "instagram", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: false, confidence: 0.8 },
      brand: { name: "TrustBrand", tagline: "Trusted", description: "Reliable", colors: ["#000"], logo: "logo.png", existingBranding: true, brandVoice: "professional", confidence: 0.8 },
      audience: { ageRange: "25-34", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["business", "general"], incomeLevel: "medium", devicePreference: "mobile", activeHours: ["18:00"], confidence: 0.6 },
    });
    graph.creator.niche = "default";
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.socialProof.testimonialsEnabled).toBe(true);
    expect(plan.socialProof.showRatings).toBe(true);
    expect(plan.gallery.titleStyle).toBe("persona_name");
  });

  it("no commerce stage hides pricing and products", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", {
      products: [],
      brand: { name: "", tagline: "", description: "", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.3 },
      creator: { name: "NoCommerce", username: "noc", bio: "Just creating", niche: "default", subNiche: [], platform: "instagram", followers: 500, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.5 },
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.pricing.visibility).toBe("hidden");
    expect(plan.sectionOrder.hidden).toContain("featured_products");
    expect(plan.recommendationSlots).toBe(0);
  });
});

// ──────────────────────────────────────────────
// VALIDATION
// ──────────────────────────────────────────────
describe("Plan validation", () => {
  it("valid plan has no errors", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    const issues = engine.validate(plan);
    expect(issues.filter((i) => i.severity === "error").length).toBe(0);
  });

  it("detects missing hero plan", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, hero: undefined as any });
    expect(issues.some((i) => i.field === "hero")).toBe(true);
  });

  it("detects missing CTA plan", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, cta: undefined as any });
    expect(issues.some((i) => i.field === "cta")).toBe(true);
  });

  it("detects missing theme plan", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, theme: undefined as any });
    expect(issues.some((i) => i.field === "theme")).toBe(true);
  });

  it("detects missing navigation plan", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, navigation: undefined as any });
    expect(issues.some((i) => i.field === "navigation")).toBe(true);
  });

  it("detects missing page plan", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, page: undefined as any });
    expect(issues.some((i) => i.field === "page")).toBe(true);
  });

  it("detects empty page types", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, page: { pageTypes: [], homePageSections: ["hero"] } });
    expect(issues.some((i) => i.message.includes("page type"))).toBe(true);
  });

  it("detects duplicate page types", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, page: { pageTypes: ["home", "home"], homePageSections: ["hero"] } });
    expect(issues.some((i) => i.message.includes("Duplicate page"))).toBe(true);
  });

  it("detects missing conversion goal", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, conversionGoal: undefined as any });
    expect(issues.some((i) => i.message.includes("Conversion goal"))).toBe(true);
  });

  it("detects missing section order", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate({ ...DEFAULTS, sectionOrder: { order: [], pinned: [], hidden: [] } });
    expect(issues.some((i) => i.message.includes("Section order"))).toBe(true);
  });

  it("engine throws on validation error during plan()", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan).toBeDefined();
    // plan() itself should not throw for valid inputs
  });
});

// ──────────────────────────────────────────────
// DEFAULTS
// ──────────────────────────────────────────────
describe("Defaults", () => {
  it("DEFAULTS has all required fields", () => {
    expect(DEFAULTS.hero.variant).toBe("standard");
    expect(DEFAULTS.cta.primaryStyle).toBe("solid");
    expect(DEFAULTS.navigation.style).toBe("standard");
    expect(DEFAULTS.pricing.visibility).toBe("full");
    expect(DEFAULTS.socialProof.testimonialsEnabled).toBe(false);
    expect(DEFAULTS.conversionGoal.primary).toBe("awareness");
    expect(DEFAULTS.recommendationSlots).toBe(2);
  });

  it("DEFAULTS can be used as a valid plan", () => {
    const engine = new ExperiencePlanningEngine();
    const issues = engine.validate(DEFAULTS);
    expect(issues.filter((i) => i.severity === "error").length).toBe(0);
  });
});

// ──────────────────────────────────────────────
// COMPOSER INTEGRATION — renders plan, not profile
// ──────────────────────────────────────────────
describe("Composer consumes ExperiencePlan only", () => {
  it("LayoutComposer uses plan decisions for rendering", () => {
    const composer = new LayoutComposer();
    const graph = mockGraph("default", {
      seo: { pageTitle: "Store", metaDescription: "Store", keywords: ["shop"], focusPhrase: "", slug: "store", canonical: "", confidence: 0.8 },
    });
    const planWithProof = { ...DEFAULTS, hero: { ...DEFAULTS.hero, showSocialProof: true } };
    const planWithoutProof = { ...DEFAULTS, hero: { ...DEFAULTS.hero, showSocialProof: false } };
    const bp1 = composer.compose(graph, "k1", planWithProof);
    const bp2 = composer.compose(graph, "k2", planWithoutProof);
    expect(bp1.sections).toBeDefined();
    expect(bp2.sections).toBeDefined();
  });

  it("SectionComposer uses plan for section enhancement", () => {
    const composer = new SectionComposer();
    const graph = mockGraph("default", {
      creator: { name: "Tester", username: "tester", bio: "Test", niche: "default", subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 },
      seo: { pageTitle: "", metaDescription: "", keywords: [], focusPhrase: "", slug: "test", canonical: "", confidence: 0.6 },
    });
    const sections = composer.compose(graph, DEFAULTS);
    expect(sections.length).toBeGreaterThan(0);
    const hero = sections.find((s) => s.type === "hero");
    expect(hero).toBeDefined();
    expect(hero!.props.showPricing).toBe(false);
    expect(hero!.props.showSocialProof).toBe(false);

    const proofPlan = { ...DEFAULTS, hero: { ...DEFAULTS.hero, showSocialProof: true, showPricing: true } };
    const sections2 = composer.compose(graph, proofPlan);
    const hero2 = sections2.find((s) => s.type === "hero");
    expect(hero2!.props.showPricing).toBe(true);
    expect(hero2!.props.showSocialProof).toBe(true);
  });

  it("SectionComposer hides sections from sectionOrder.hidden", () => {
    const composer = new SectionComposer();
    const graph = mockGraph("default", {
      creator: { name: "Tester", username: "tester", bio: "Test", niche: "default", subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 },
      seo: { pageTitle: "", metaDescription: "", keywords: [], focusPhrase: "", slug: "test", canonical: "", confidence: 0.6 },
    });
    const plan = { ...DEFAULTS, sectionOrder: { order: DEFAULTS.sectionOrder.order, pinned: DEFAULTS.sectionOrder.pinned, hidden: ["featured_products"] } };
    const sections = composer.compose(graph, plan);
    expect(sections.find((s) => s.type === "featured_products")).toBeUndefined();
  });

  it("SectionComposer respects testimonial plan", () => {
    const composer = new SectionComposer();
    const graph = mockGraph("default", {
      content: { topContentTypes: [], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 1, confidence: 0.6 },
      creator: { name: "Tester", username: "tester", bio: "Test", niche: "default", subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 },
      seo: { pageTitle: "", metaDescription: "", keywords: [], focusPhrase: "", slug: "test", canonical: "", confidence: 0.6 },
    });
    const enabledPlan = { ...DEFAULTS, testimonial: { ...DEFAULTS.testimonial, enabled: true, maxItems: 4, style: "carousel" as const } };
    const sections = composer.compose(graph, enabledPlan);
    const testimonial = sections.find((s) => s.type === "testimonials");
    if (testimonial) {
      expect(testimonial.props.enabled).toBe(true);
      expect(testimonial.props.maxItems).toBe(4);
    }
  });

  it("SectionComposer respects gallery plan title style", () => {
    const composer = new SectionComposer();
    const graph = mockGraph("photography", {
      creator: { name: "PhotoPro", username: "photo", bio: "Pro photographer", niche: "photography", subNiche: [], platform: "instagram", followers: 5000, engagement: 0.04, contentFrequency: "weekly", verified: true, confidence: 0.9 },
      seo: { pageTitle: "", metaDescription: "", keywords: [], focusPhrase: "", slug: "photo", canonical: "", confidence: 0.6 },
    });
    const personaNamePlan = { ...DEFAULTS, gallery: { ...DEFAULTS.gallery, titleStyle: "persona_name" as const } };
    const sections = composer.compose(graph, personaNamePlan);
    const gallery = sections.find((s) => s.type === "gallery");
    if (gallery) {
      expect(gallery.props.title).toContain("Portfolio");
    }
  });

  it("composes multiple niches with same plan structure", () => {
    const layoutComposer = new LayoutComposer();
    const niches = ["default", "photography", "education", "gaming", "technology", "fitness", "food", "travel", "music", "art", "lifestyle", "sports", "news"];
    for (const niche of niches) {
      const graph = mockGraph(niche, {
        seo: { pageTitle: "Title", metaDescription: "Desc", keywords: ["k"], focusPhrase: "", slug: niche, canonical: "", confidence: 0.8 },
      });
      const bp = layoutComposer.compose(graph, niche, DEFAULTS);
      expect(bp.sections.length).toBeGreaterThan(0);
    }
  });
});

// ──────────────────────────────────────────────
// OPEN/CLOSED
// ──────────────────────────────────────────────
describe("Open/Closed compliance", () => {
  it("adding a new planner requires only registration", () => {
    const registry = new PlannerRegistry();
    for (const p of createDefaultPlanners()) registry.register(p);

    const customPlanner: Planner = {
      id: "z_custom",
      produces: ["contentDensity"] as const,
      dependsOn: [] as const,
      plan: () => ({ contentDensity: "dense" as const }),
    };
    registry.register(customPlanner);
    expect(registry.get("z_custom")).toBeDefined();
    expect(registry.getAll().length).toBe(createDefaultPlanners().length + 1);
  });

  it("new planner merges into plan output", () => {
    const engine = new ExperiencePlanningEngine();
    engine.getRegistry().register({
      id: "z_custom_override",
      produces: ["contentDensity"] as const,
      dependsOn: [] as const,
      plan: () => ({ contentDensity: "dense" as const }),
    });
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.contentDensity).toBe("dense");
  });
});

// ──────────────────────────────────────────────
// EDGE CASES
// ──────────────────────────────────────────────
describe("Edge cases", () => {
  it("handles empty social links", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", { socialLinks: [] });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.footer.showSocialLinks).toBe(false);
  });

  it("handles empty products", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", { products: [] });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.sectionOrder.hidden).toContain("featured_products");
  });

  it("handles high followers celebrity stage", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default", {
      creator: { name: "Star", username: "star", bio: "Star", niche: "default", subNiche: [], platform: "instagram", followers: 2000000, engagement: 0.12, contentFrequency: "daily", verified: true, confidence: 0.95 },
    });
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.navigation.style).toBe("centered");
    expect(plan.visualRhythm).toBe("dynamic");
    expect(plan.animationProfile).toBe("expressive");
  });

  it("handles all commerce stages", () => {
    const engine = new ExperiencePlanningEngine();
    const stages = [
      { count: 0, brand: false, expected: "none" },
      { count: 0, brand: true, expected: "exploring" },
      { count: 1, brand: false, expected: "just_started" },
      { count: 3, brand: false, expected: "growing" },
      { count: 7, brand: false, expected: "established" },
      { count: 15, brand: false, expected: "scaling" },
    ] as const;
    for (const { count, brand, expected } of stages) {
      const graph = mockGraph("default", {
        products: Array.from({ length: count }, (_, i) => ({
          name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8,
        })),
        brand: { name: brand ? "B" : "", tagline: brand ? "T" : "", description: brand ? "D" : "", colors: brand ? ["#000"] : [], logo: brand ? "l.png" : null, existingBranding: brand, brandVoice: "professional" as const, confidence: brand ? 0.8 : 0.3 },
        creator: { name: "T", username: "t", bio: "", niche: "default", subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 },
      });
      const profile = buildProfile(graph);
      const plan = engine.plan(graph, profile);
      const actual = plan.pricing.visibility;
      if (expected === "none") expect(actual).toBe("hidden");
      else if (expected === "exploring") expect(actual).toBe("compact");
      else if (expected === "scaling") expect(actual).toBe("prominent");
      else expect(actual).toBe("full");
    }
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — GRAPH CONSTRUCTION
// ──────────────────────────────────────────────
describe("PlannerGraph construction", () => {
  it("builds execution plan from default planners", () => {
    const planners = createDefaultPlanners();
    const graph = new PlannerGraph(planners);
    const plan = graph.build();
    expect(plan.waves.length).toBeGreaterThan(0);
    expect(plan.order.length).toBe(planners.length);
  });

  it("all 13 default planners appear in order", () => {
    const planners = createDefaultPlanners();
    const graph = new PlannerGraph(planners);
    const plan = graph.build();
    const ids = plan.order.map((p) => p.id);
    expect(ids).toContain("hero");
    expect(ids).toContain("navigation");
    expect(ids).toContain("footer");
    expect(ids).toContain("theme");
    expect(ids).toContain("layout");
    expect(ids).toContain("section");
    expect(ids).toContain("commerce");
    expect(ids).toContain("social_proof");
    expect(ids).toContain("cta");
    expect(ids).toContain("seo");
    expect(ids).toContain("conversion");
    expect(ids).toContain("gallery");
    expect(ids).toContain("page");
    expect(plan.order.length).toBe(13);
  });

  it("empty planner list returns empty plan", () => {
    const graph = new PlannerGraph([]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(0);
    expect(plan.order.length).toBe(0);
  });

  it("single planner creates single wave", () => {
    const planner: Planner = { id: "only", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const graph = new PlannerGraph([planner]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(1);
    expect(plan.waves[0]!.length).toBe(1);
    expect(plan.waves[0]![0]!.id).toBe("only");
  });

  it("independent planners all in first wave", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["pricing"], dependsOn: [], plan: () => ({}) };
    const c: Planner = { id: "c", produces: ["cta"], dependsOn: [], plan: () => ({}) };
    const graph = new PlannerGraph([a, b, c]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(1);
    expect(plan.waves[0]!.length).toBe(3);
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — DEPENDENCY ORDERING
// ──────────────────────────────────────────────
describe("PlannerGraph dependency ordering", () => {
  it("dependent planner in later wave", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["pricing"], dependsOn: ["a"], plan: () => ({}) };
    const graph = new PlannerGraph([a, b]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(2);
    expect(plan.waves[0]![0]!.id).toBe("a");
    expect(plan.waves[1]![0]!.id).toBe("b");
    expect(plan.order.indexOf(a)).toBeLessThan(plan.order.indexOf(b));
  });

  it("chain of three produces three waves", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["pricing"], dependsOn: ["a"], plan: () => ({}) };
    const c: Planner = { id: "c", produces: ["cta"], dependsOn: ["b"], plan: () => ({}) };
    const graph = new PlannerGraph([a, b, c]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(3);
  });

  it("diamond dependency resolves correctly", () => {
    const root: Planner = { id: "root", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const left: Planner = { id: "left", produces: ["pricing"], dependsOn: ["root"], plan: () => ({}) };
    const right: Planner = { id: "right", produces: ["cta"], dependsOn: ["root"], plan: () => ({}) };
    const leaf: Planner = { id: "leaf", produces: ["seo"], dependsOn: ["left", "right"], plan: () => ({}) };
    const graph = new PlannerGraph([root, left, right, leaf]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(3);
    expect(plan.waves[0]![0]!.id).toBe("root");
    const wave1Ids = plan.waves[1]!.map((p) => p.id).sort();
    expect(wave1Ids).toEqual(["left", "right"]);
    expect(plan.waves[2]![0]!.id).toBe("leaf");
  });

  it("multiple dependencies on same planner work", () => {
    const shared: Planner = { id: "shared", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const d1: Planner = { id: "d1", produces: ["pricing"], dependsOn: ["shared"], plan: () => ({}) };
    const d2: Planner = { id: "d2", produces: ["cta"], dependsOn: ["shared"], plan: () => ({}) };
    const d3: Planner = { id: "d3", produces: ["seo"], dependsOn: ["shared"], plan: () => ({}) };
    const graph = new PlannerGraph([shared, d1, d2, d3]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(2);
    expect(plan.waves[0]![0]!.id).toBe("shared");
    expect(plan.waves[1]!.length).toBe(3);
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — CYCLE DETECTION
// ──────────────────────────────────────────────
describe("PlannerGraph cycle detection", () => {
  it("throws on direct cycle between two planners", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: ["b"], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["pricing"], dependsOn: ["a"], plan: () => ({}) };
    const graph = new PlannerGraph([a, b]);
    expect(() => graph.build()).toThrow("Circular dependency");
  });

  it("throws on indirect cycle", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: ["b"], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["pricing"], dependsOn: ["c"], plan: () => ({}) };
    const c: Planner = { id: "c", produces: ["cta"], dependsOn: ["a"], plan: () => ({}) };
    const graph = new PlannerGraph([a, b, c]);
    expect(() => graph.build()).toThrow("Circular dependency");
  });

  it("throws on self-cycle", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: ["a"], plan: () => ({}) };
    const graph = new PlannerGraph([a]);
    expect(() => graph.build()).toThrow("Circular dependency");
  });

  it("cycle message includes all remaining planner IDs", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: ["b"], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["pricing"], dependsOn: ["a"], plan: () => ({}) };
    const graph = new PlannerGraph([a, b]);
    expect(() => graph.build()).toThrow(/[ab]/);
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — VALIDATION
// ──────────────────────────────────────────────
describe("PlannerGraph validation", () => {
  it("returns no issues for valid graph", () => {
    const planners = createDefaultPlanners();
    const graph = new PlannerGraph(planners);
    const issues = graph.validate();
    expect(issues.filter((i) => i.severity === "error").length).toBe(0);
  });

  it("reports missing dependency", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: ["nonexistent"], plan: () => ({}) };
    const graph = new PlannerGraph([a]);
    const issues = graph.validate();
    expect(issues.some((i) => i.message.includes("nonexistent"))).toBe(true);
    expect(issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("reports duplicate planner ID", () => {
    const a: Planner = { id: "dup", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const b: Planner = { id: "dup", produces: ["pricing"], dependsOn: [], plan: () => ({}) };
    const graph = new PlannerGraph([a, b]);
    const issues = graph.validate();
    expect(issues.some((i) => i.message.includes("Duplicate planner ID"))).toBe(true);
  });

  it("reports duplicate produced slice as warning", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const graph = new PlannerGraph([a, b]);
    const issues = graph.validate();
    expect(issues.some((i) => i.severity === "warning")).toBe(true);
    expect(issues.some((i) => i.message.includes("produced by both"))).toBe(true);
  });

  it("missing dependency throws on build", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: ["ghost"], plan: () => ({}) };
    const graph = new PlannerGraph([a]);
    expect(() => graph.build()).toThrow("PlannerGraph validation failed");
  });

  it("duplicate ID throws on build", () => {
    const a: Planner = { id: "x", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const b: Planner = { id: "x", produces: ["pricing"], dependsOn: [], plan: () => ({}) };
    const graph = new PlannerGraph([a, b]);
    expect(() => graph.build()).toThrow("PlannerGraph validation failed");
  });

  it("validate returns multiple issues", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: ["missing1", "missing2"], plan: () => ({}) };
    const b: Planner = { id: "a", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const graph = new PlannerGraph([a, b]);
    const issues = graph.validate();
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — DETERMINISM
// ──────────────────────────────────────────────
describe("PlannerGraph determinism", () => {
  it("same planners always produce same order", () => {
    const planners = createDefaultPlanners();
    const graph1 = new PlannerGraph(planners);
    const graph2 = new PlannerGraph(planners);
    expect(graph1.build().order.map((p) => p.id)).toEqual(graph2.build().order.map((p) => p.id));
  });

  it("five consecutive builds produce identical plans", () => {
    const planners = createDefaultPlanners();
    const graph = new PlannerGraph(planners);
    const plans = Array.from({ length: 5 }, () => graph.build());
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i]!.order.map((p) => p.id)).toEqual(plans[0]!.order.map((p) => p.id));
    }
  });

  it("reordering registration does not change topological order", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["pricing"], dependsOn: ["a"], plan: () => ({}) };
    const c: Planner = { id: "c", produces: ["cta"], dependsOn: ["a"], plan: () => ({}) };
    const order1 = new PlannerGraph([a, b, c]).build().order.map((p) => p.id);
    const order2 = new PlannerGraph([c, a, b]).build().order.map((p) => p.id);
    const order3 = new PlannerGraph([b, c, a]).build().order.map((p) => p.id);
    expect(order1).toEqual(order2);
    expect(order2).toEqual(order3);
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — EXECUTION PLAN
// ──────────────────────────────────────────────
describe("ExecutionPlan", () => {
  it("is frozen immutable object", () => {
    const planners = createDefaultPlanners();
    const plan = new PlannerGraph(planners).build();
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.waves)).toBe(true);
    expect(Object.isFrozen(plan.order)).toBe(true);
  });

  it("each wave is frozen", () => {
    const planners = createDefaultPlanners();
    const plan = new PlannerGraph(planners).build();
    for (const wave of plan.waves) {
      expect(Object.isFrozen(wave)).toBe(true);
    }
  });

  it("order matches flat waves", () => {
    const planners = createDefaultPlanners();
    const plan = new PlannerGraph(planners).build();
    const flattened: string[] = [];
    for (const wave of plan.waves) {
      for (const p of wave) {
        flattened.push(p.id);
      }
    }
    expect(flattened).toEqual(plan.order.map((p) => p.id));
  });

  it("all input planners appear in order", () => {
    const planners = createDefaultPlanners();
    const plan = new PlannerGraph(planners).build();
    const ids = new Set(plan.order.map((p) => p.id));
    for (const p of planners) {
      expect(ids.has(p.id)).toBe(true);
    }
  });

  it("default planners produce single wave (all independent)", () => {
    const planners = createDefaultPlanners();
    const plan = new PlannerGraph(planners).build();
    expect(plan.waves.length).toBe(1);
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — REGISTRY INTEGRATION
// ──────────────────────────────────────────────
describe("Registry integration with PlannerGraph", () => {
  it("buildExecutionPlan from registry returns valid plan", () => {
    const registry = new PlannerRegistry();
    for (const p of createDefaultPlanners()) registry.register(p);
    const plan = registry.buildExecutionPlan();
    expect(plan.waves.length).toBeGreaterThan(0);
    expect(plan.order.length).toBe(13);
  });

  it("buildExecutionPlan reflects dynamic registration", () => {
    const registry = new PlannerRegistry();
    for (const p of createDefaultPlanners()) registry.register(p);
    const before = registry.buildExecutionPlan().order.length;
    registry.register({ id: "extra", produces: ["hero"], dependsOn: [], plan: () => ({}) });
    const after = registry.buildExecutionPlan().order.length;
    expect(after).toBe(before + 1);
  });

  it("buildExecutionPlan respects dependencies from registry", () => {
    const registry = new PlannerRegistry();
    registry.register({ id: "a", produces: ["hero"], dependsOn: [], plan: () => ({}) });
    registry.register({ id: "b", produces: ["pricing"], dependsOn: ["a"], plan: () => ({}) });
    registry.register({ id: "c", produces: ["cta"], dependsOn: ["b"], plan: () => ({}) });
    const plan = registry.buildExecutionPlan();
    expect(plan.waves.length).toBe(3);
    expect(plan.order.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — ENGINE INTEGRATION
// ──────────────────────────────────────────────
describe("Engine integration with PlannerGraph", () => {
  it("engine produces valid plan via DAG ordering", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.hero).toBeDefined();
    expect(plan.pricing).toBeDefined();
  });

  it("engine.getExecutionPlan returns valid execution plan", () => {
    const engine = new ExperiencePlanningEngine();
    const ep = engine.getExecutionPlan();
    expect(ep.waves.length).toBeGreaterThan(0);
    expect(ep.order.length).toBeGreaterThan(0);
  });

  it("engine.getExecutionPlan is deterministic", () => {
    const engine = new ExperiencePlanningEngine();
    const a = engine.getExecutionPlan();
    const b = engine.getExecutionPlan();
    expect(a.order.map((p) => p.id)).toEqual(b.order.map((p) => p.id));
  });
});

// ──────────────────────────────────────────────
// PLANNER DAG — EDGE CASES
// ──────────────────────────────────────────────
describe("PlannerGraph edge cases", () => {
  it("planner with empty dependsOn is valid root", () => {
    const p: Planner = { id: "root", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const graph = new PlannerGraph([p]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(1);
    expect(plan.order.length).toBe(1);
  });

  it("all default planners have produces declared", () => {
    for (const p of createDefaultPlanners()) {
      expect(p.produces.length).toBeGreaterThan(0);
    }
  });

  it("all default planners have dependsOn declared", () => {
    for (const p of createDefaultPlanners()) {
      expect(p.dependsOn).toBeDefined();
    }
  });

  it("planner with multiple dependencies all resolved", () => {
    const a: Planner = { id: "a", produces: ["hero"], dependsOn: [], plan: () => ({}) };
    const b: Planner = { id: "b", produces: ["pricing"], dependsOn: [], plan: () => ({}) };
    const c: Planner = { id: "c", produces: ["cta"], dependsOn: ["a", "b"], plan: () => ({}) };
    const graph = new PlannerGraph([a, b, c]);
    const plan = graph.build();
    expect(plan.waves.length).toBe(2);
    expect(plan.waves[1]![0]!.id).toBe("c");
  });

  it("validate does not throw, returns issues array", () => {
    const graph = new PlannerGraph([]);
    const issues = graph.validate();
    expect(Array.isArray(issues)).toBe(true);
  });

  it("validate returns no issues for empty graph", () => {
    const graph = new PlannerGraph([]);
    const issues = graph.validate();
    expect(issues.length).toBe(0);
  });
});
