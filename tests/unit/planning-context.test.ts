import { describe, it, expect } from "vitest";
import { PlanningContextEngine } from "@/lib/generation/planning-context/engine";
import { ContextStrategyRegistry } from "@/lib/generation/planning-context/registry";
import { createDefaultContextStrategies } from "@/lib/generation/planning-context/strategies";
import { DEFAULTS } from "@/lib/generation/planning-context/defaults";
import { ExperiencePlanningEngine } from "@/lib/generation/experience-plan/engine";
import { PersonaEngine, ExperienceProfileBuilder } from "@/lib/generation/persona";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { ContextStrategy } from "@/lib/generation/planning-context/strategies/base";

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
// CONTEXT STRATEGY REGISTRY
// ──────────────────────────────────────────────
describe("ContextStrategyRegistry", () => {
  const defaultStrategies = createDefaultContextStrategies();

  it("registers and retrieves strategies", () => {
    const registry = new ContextStrategyRegistry();
    for (const s of defaultStrategies) registry.register(s);
    expect(registry.getAll().length).toBe(defaultStrategies.length);
    expect(registry.listIds().sort()).toEqual(defaultStrategies.map((s) => s.id).sort());
  });

  it("throws on duplicate registration", () => {
    const registry = new ContextStrategyRegistry();
    registry.register(defaultStrategies[0]!);
    expect(() => registry.register(defaultStrategies[0]!)).toThrow("already registered");
  });

  it("retrieves strategy by id", () => {
    const registry = new ContextStrategyRegistry();
    for (const s of defaultStrategies) registry.register(s);
    const auth = registry.get("authority");
    expect(auth).toBeDefined();
    expect(auth!.id).toBe("authority");
  });

  it("returns undefined for unknown id", () => {
    const registry = new ContextStrategyRegistry();
    for (const s of defaultStrategies) registry.register(s);
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("lists all strategy ids", () => {
    const registry = new ContextStrategyRegistry();
    for (const s of defaultStrategies) registry.register(s);
    const ids = registry.listIds();
    expect(ids).toContain("authority");
    expect(ids).toContain("trust");
    expect(ids).toContain("commerce");
    expect(ids).toContain("branding");
    expect(ids).toContain("audience");
    expect(ids).toContain("content");
    expect(ids).toContain("conversion");
    expect(ids).toContain("community");
    expect(ids).toContain("growth");
    expect(ids).toContain("recommendation");
    expect(ids).toContain("page");
    expect(ids).toContain("seo_context");
    expect(ids.length).toBe(12);
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT ENGINE — BUILD
// ──────────────────────────────────────────────
describe("PlanningContextEngine build", () => {
  it("produces complete PlanningContext with all 18 fields", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.authorityLevel).toBeDefined();
    expect(ctx.trustLevel).toBeDefined();
    expect(ctx.commerceReadiness).toBeDefined();
    expect(ctx.marketingMaturity).toBeDefined();
    expect(ctx.audienceEngagement).toBeDefined();
    expect(ctx.visualComplexity).toBeDefined();
    expect(ctx.contentAuthority).toBeDefined();
    expect(ctx.conversionIntent).toBeDefined();
    expect(ctx.monetizationFocus).toBeDefined();
    expect(ctx.communityStrength).toBeDefined();
    expect(ctx.productConfidence).toBeDefined();
    expect(ctx.socialPresence).toBeDefined();
    expect(ctx.growthPotential).toBeDefined();
    expect(ctx.recommendationReadiness).toBeDefined();
    expect(ctx.brandingConsistency).toBeDefined();
    expect(ctx.pageComplexity).toBeDefined();
    expect(ctx.seoMaturity).toBeDefined();
    expect(ctx.expansionPotential).toBeDefined();
  });

  it("builds context from default strategies without error", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("education", {
      products: [{ name: "C1", type: "digital", category: "E", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.9 }],
      creator: { name: "Prof", username: "prof", bio: "I teach", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx).toBeDefined();
  });

  it("context is deeply frozen", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  it("same input produces identical context (determinism)", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("photography");
    const profile = buildProfile(graph);
    const a = engine.build(graph, profile);
    const b = engine.build(graph, profile);
    expect(a).toEqual(b);
  });

  it("five consecutive builds are identical", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const results = Array.from({ length: 5 }, () => engine.build(graph, profile));
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT — AUTHORITY & TRUST
// ──────────────────────────────────────────────
describe("PlanningContext authority and trust", () => {
  it("celebrity creator has high authority", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: [{ name: "P", type: "physical", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.9 }],
      creator: { name: "Star", username: "star", bio: "Famous", niche: "default", subNiche: [], platform: "instagram", followers: 5000000, engagement: 0.15, contentFrequency: "daily", verified: true, confidence: 0.95 },
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.authorityLevel).toBe("high");
  });

  it("professional creator has medium authority", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      creator: { name: "Pro", username: "pro", bio: "Pro", niche: "default", subNiche: [], platform: "instagram", followers: 100000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.authorityLevel).toBe("medium");
  });

  it("small creator has low authority", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      creator: { name: "New", username: "new", bio: "", niche: "default", subNiche: [], platform: "instagram", followers: 100, engagement: 0.01, contentFrequency: "weekly", verified: false, confidence: 0.3 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.authorityLevel).toBe("low");
  });

  it("dominant brand strength produces high trust", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      brand: { name: "Strong", tagline: "Tag", description: "Desc", colors: ["#000", "#fff", "#333"], logo: "logo.png", existingBranding: true, brandVoice: "professional", confidence: 0.95 },
      creator: { name: "B", username: "b", bio: "Brand", niche: "default", subNiche: [], platform: "instagram", followers: 50000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.trustLevel).toBe("high");
  });

  it("no brand produces none trust", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      brand: { name: "", tagline: "", description: "", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.3 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.trustLevel).toBe("none");
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT — COMMERCE & PRODUCTS
// ──────────────────────────────────────────────
describe("PlanningContext commerce and products", () => {
  it("scaling commerce stage produces high commerceReadiness", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: Array.from({ length: 15 }, (_, i) => ({ name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })),
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.8 },
      creator: { name: "T", username: "t", bio: "", niche: "default", subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.commerceReadiness).toBe("high");
  });

  it("no products and no brand produces none commerceReadiness", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: [],
      brand: { name: "", tagline: "", description: "", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.3 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.commerceReadiness).toBe("none");
  });

  it("10+ products produces high productConfidence", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: Array.from({ length: 10 }, (_, i) => ({ name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })),
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.productConfidence).toBe("high");
  });

  it("no products produces none productConfidence", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", { products: [] });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.productConfidence).toBe("none");
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT — AUDIENCE & COMMUNITY
// ──────────────────────────────────────────────
describe("PlanningContext audience and community", () => {
  it("high engagement produces high audienceEngagement", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      creator: { name: "E", username: "e", bio: "", niche: "default", subNiche: [], platform: "instagram", followers: 5000, engagement: 0.15, contentFrequency: "daily", verified: false, confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.audienceEngagement).toBe("high");
  });

  it("many followers and links produces high socialPresence", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      socialLinks: [
        { platform: "youtube", url: "https://youtube.com/@a", handle: "a", followers: 10000, primary: true },
        { platform: "instagram", url: "https://instagram.com/a", handle: "a", followers: 50000, primary: false },
        { platform: "twitter", url: "https://twitter.com/a", handle: "a", followers: 20000, primary: false },
      ],
      creator: { name: "P", username: "p", bio: "Popular", niche: "default", subNiche: [], platform: "instagram", followers: 200000, engagement: 0.08, contentFrequency: "daily", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.socialPresence).toBe("high");
  });

  it("4+ links with community interest produces high communityStrength", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      socialLinks: [
        { platform: "discord", url: "https://discord.gg/a", handle: "a", followers: 1000, primary: true },
        { platform: "telegram", url: "https://t.me/a", handle: "a", followers: 500, primary: false },
        { platform: "instagram", url: "https://instagram.com/a", handle: "a", followers: 5000, primary: false },
        { platform: "youtube", url: "https://youtube.com/@a", handle: "a", followers: 3000, primary: false },
      ],
      audience: { ageRange: "25-34", primaryGender: "female", primaryLanguage: "en", topCountries: ["US"], interests: ["community", "networking"], incomeLevel: "medium", devicePreference: "mobile", activeHours: ["18:00"], confidence: 0.6 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.communityStrength).toBe("high");
  });

  it("no social links produces none communityStrength", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", { socialLinks: [] });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.communityStrength).toBe("none");
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT — CONTENT & VISUAL
// ──────────────────────────────────────────────
describe("PlanningContext content and visual", () => {
  it("inspirational content style produces high visualComplexity", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("art", {
      content: { topContentTypes: ["inspirational"], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 1, confidence: 0.8 },
      creator: { name: "A", username: "a", bio: "Artist", niche: "art", subNiche: [], platform: "instagram", followers: 5000, engagement: 0.04, contentFrequency: "weekly", verified: false, confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.visualComplexity).toBe("high");
  });

  it("educational content with high quality produces medium contentAuthority", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("education", {
      content: { topContentTypes: ["educational"], averagePostLength: 500, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "high", estimatedReadTime: 5, confidence: 0.8 },
      creator: { name: "E", username: "e", bio: "Teacher", niche: "education", subNiche: [], platform: "youtube", followers: 5000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.contentAuthority).toBe("medium");
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT — CONVERSION & MONETIZATION
// ──────────────────────────────────────────────
describe("PlanningContext conversion and monetization", () => {
  it("direct sales business model produces high conversionIntent", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: [{ name: "P", type: "physical", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.9 }],
      businessModel: { type: "merch", primaryRevenueSource: "Products", monetizationChannels: [], priceTier: "mid", confidence: 0.7 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.conversionIntent).toBe("high");
  });

  it("scaling commerce produces high monetizationFocus", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: Array.from({ length: 15 }, (_, i) => ({ name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })),
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.monetizationFocus).toBe("high");
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT — GROWTH & RECOMMENDATIONS
// ──────────────────────────────────────────────
describe("PlanningContext growth and recommendations", () => {
  it("high followers and engagement produces high growthPotential", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      creator: { name: "G", username: "g", bio: "Growing", niche: "default", subNiche: [], platform: "instagram", followers: 200000, engagement: 0.08, contentFrequency: "daily", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.growthPotential).toBe("high");
  });

  it("scaling commerce produces high expansionPotential", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: Array.from({ length: 15 }, (_, i) => ({ name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })),
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.expansionPotential).toBe("high");
  });

  it("5+ products produces high recommendationReadiness", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: Array.from({ length: 5 }, (_, i) => ({ name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })),
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.recommendationReadiness).toBe("high");
  });

  it("no products produces none recommendationReadiness", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", { products: [] });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.recommendationReadiness).toBe("none");
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT — BRANDING & MARKETING
// ──────────────────────────────────────────────
describe("PlanningContext branding and marketing", () => {
  it("dominant brand produces high brandingConsistency", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      brand: { name: "Strong", tagline: "Tag", description: "Desc", colors: ["#000", "#fff", "#333"], logo: "logo.png", existingBranding: true, brandVoice: "professional", confidence: 0.95 },
      creator: { name: "B", username: "b", bio: "Brand", niche: "default", subNiche: [], platform: "instagram", followers: 50000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.brandingConsistency).toBe("high");
  });

  it("scaling commerce produces high marketingMaturity", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: Array.from({ length: 15 }, (_, i) => ({ name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })),
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.marketingMaturity).toBe("high");
  });
});

// ──────────────────────────────────────────────
// PLANNING CONTEXT — PAGE & SEO
// ──────────────────────────────────────────────
describe("PlanningContext page and SEO", () => {
  it("celebrity produces high pageComplexity", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: [{ name: "P", type: "physical", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.9 }],
      creator: { name: "Star", username: "star", bio: "Famous", niche: "default", subNiche: [], platform: "instagram", followers: 5000000, engagement: 0.15, contentFrequency: "daily", verified: true, confidence: 0.95 },
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.pageComplexity).toBe("high");
  });

  it("scaling commerce produces high seoMaturity", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      products: Array.from({ length: 15 }, (_, i) => ({ name: `P${i}`, type: "digital" as const, category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })),
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.8 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.seoMaturity).toBe("high");
  });
});

// ──────────────────────────────────────────────
// VALIDATION
// ──────────────────────────────────────────────
describe("PlanningContext validation", () => {
  it("validate returns no errors for complete context", () => {
    const engine = new PlanningContextEngine();
    const ctx = engine.build(mockGraph("default"), buildProfile(mockGraph("default")));
    const issues = engine.validate(ctx);
    expect(issues.filter((i) => i.severity === "error").length).toBe(0);
  });

  it("validate reports missing authorityLevel as error", () => {
    const engine = new PlanningContextEngine();
    const ctx = { ...DEFAULTS, authorityLevel: undefined as any };
    const issues = engine.validate(ctx as any);
    expect(issues.some((i) => i.field === "authorityLevel")).toBe(true);
  });

  it("validate reports missing commerceReadiness as error", () => {
    const engine = new PlanningContextEngine();
    const ctx = { ...DEFAULTS, commerceReadiness: undefined as any };
    const issues = engine.validate(ctx as any);
    expect(issues.some((i) => i.field === "commerceReadiness")).toBe(true);
  });

  it("validate checks all 18 required fields", () => {
    const engine = new PlanningContextEngine();
    const ctx = {} as any;
    const issues = engine.validate(ctx);
    expect(issues.filter((i) => i.severity === "error").length).toBe(18);
  });
});

// ──────────────────────────────────────────────
// DEFAULTS
// ──────────────────────────────────────────────
describe("PlanningContext defaults", () => {
  it("DEFAULTS has all 18 fields", () => {
    expect(DEFAULTS.authorityLevel).toBe("low");
    expect(DEFAULTS.trustLevel).toBe("low");
    expect(DEFAULTS.commerceReadiness).toBe("none");
    expect(DEFAULTS.marketingMaturity).toBe("low");
    expect(DEFAULTS.audienceEngagement).toBe("low");
    expect(DEFAULTS.visualComplexity).toBe("low");
    expect(DEFAULTS.contentAuthority).toBe("low");
    expect(DEFAULTS.conversionIntent).toBe("none");
    expect(DEFAULTS.monetizationFocus).toBe("none");
    expect(DEFAULTS.communityStrength).toBe("none");
    expect(DEFAULTS.productConfidence).toBe("none");
    expect(DEFAULTS.socialPresence).toBe("low");
    expect(DEFAULTS.growthPotential).toBe("low");
    expect(DEFAULTS.recommendationReadiness).toBe("none");
    expect(DEFAULTS.brandingConsistency).toBe("none");
    expect(DEFAULTS.pageComplexity).toBe("low");
    expect(DEFAULTS.seoMaturity).toBe("low");
    expect(DEFAULTS.expansionPotential).toBe("none");
  });

  it("DEFAULTS is a valid PlanningContext", () => {
    const engine = new PlanningContextEngine();
    const issues = engine.validate(DEFAULTS);
    expect(issues.filter((i) => i.severity === "error").length).toBe(0);
  });
});

// ──────────────────────────────────────────────
// PLANNER INTEGRATION
// ──────────────────────────────────────────────
describe("Planner integration with PlanningContext", () => {
  it("planner output changes when authorityLevel changes", () => {
    const engine = new ExperiencePlanningEngine();

    const lowAuth = mockGraph("default", {
      creator: { name: "New", username: "new", bio: "", niche: "default", subNiche: [], platform: "instagram", followers: 100, engagement: 0.01, contentFrequency: "weekly", verified: false, confidence: 0.3 },
    });
    const highAuth = mockGraph("default", {
      products: [{ name: "P", type: "physical", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.9 }],
      creator: { name: "Star", username: "star", bio: "Famous", niche: "default", subNiche: [], platform: "instagram", followers: 5000000, engagement: 0.15, contentFrequency: "daily", verified: true, confidence: 0.95 },
      brand: { name: "B", tagline: "T", description: "D", colors: ["#000"], logo: "l.png", existingBranding: true, brandVoice: "professional", confidence: 0.9 },
    });

    const lowPlan = engine.plan(lowAuth, buildProfile(lowAuth));
    const highPlan = engine.plan(highAuth, buildProfile(highAuth));
    expect(lowPlan.hero.variant).not.toBe(highPlan.hero.variant);
  });

  it("planner output changes when brandingConsistency changes", () => {
    const engine = new ExperiencePlanningEngine();

    const noBrand = mockGraph("default", { brand: { name: "", tagline: "", description: "", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.3 } });
    const strongBrand = mockGraph("default", {
      brand: { name: "Strong", tagline: "Tag", description: "Desc", colors: ["#000", "#fff", "#333"], logo: "logo.png", existingBranding: true, brandVoice: "professional", confidence: 0.95 },
      creator: { name: "B", username: "b", bio: "Brand", niche: "default", subNiche: [], platform: "instagram", followers: 50000, engagement: 0.05, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });

    const lowPlan = engine.plan(noBrand, buildProfile(noBrand));
    const highPlan = engine.plan(strongBrand, buildProfile(strongBrand));
    expect(lowPlan.hero.badge).not.toBe(highPlan.hero.badge);
  });

  it("engine builds and passes context to all planners", () => {
    const engine = new ExperiencePlanningEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const plan = engine.plan(graph, profile);
    expect(plan.hero).toBeDefined();
    expect(plan.navigation).toBeDefined();
    expect(plan.footer).toBeDefined();
    expect(plan.theme).toBeDefined();
    expect(plan.sectionOrder).toBeDefined();
    expect(plan.testimonial).toBeDefined();
    expect(plan.pricing).toBeDefined();
    expect(plan.socialProof).toBeDefined();
    expect(plan.cta).toBeDefined();
    expect(plan.seo).toBeDefined();
    expect(plan.conversionGoal).toBeDefined();
    expect(plan.gallery).toBeDefined();
    expect(plan.page).toBeDefined();
  });
});

// ──────────────────────────────────────────────
// OPEN/CLOSED
// ──────────────────────────────────────────────
describe("Open/Closed compliance", () => {
  it("custom context strategy can be registered", () => {
    const registry = new ContextStrategyRegistry();
    const custom: ContextStrategy = {
      id: "custom_context",
      produces: ["authorityLevel"],
      compute: () => ({ authorityLevel: "high" as const }),
    };
    registry.register(custom);
    expect(registry.get("custom_context")).toBeDefined();
  });

  it("custom strategy output is included in context", () => {
    const engine = new PlanningContextEngine();
    engine.getRegistry().register({
      id: "custom_context",
      produces: ["authorityLevel"],
      compute: () => ({ authorityLevel: "high" as const }),
    });
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    // Custom strategy overrides authorityLevel
    expect(ctx.authorityLevel).toBe("high");
  });
});

// ──────────────────────────────────────────────
// DETERMINISM
// ──────────────────────────────────────────────
describe("PlanningContext determinism", () => {
  it("same graph + profile always produces same context", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("photography", {
      products: [{ name: "P", type: "physical", category: "Prints", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.8 }],
      creator: { name: "Photo", username: "photo", bio: "Photographer", niche: "photography", subNiche: [], platform: "instagram", followers: 50000, engagement: 0.04, contentFrequency: "weekly", verified: true, confidence: 0.9 },
    });
    const profile = buildProfile(graph);
    const a = engine.build(graph, profile);
    const b = engine.build(graph, profile);
    expect(a).toEqual(b);
  });

  it("ten consecutive contexts are identical", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default");
    const profile = buildProfile(graph);
    const results = Array.from({ length: 10 }, () => engine.build(graph, profile));
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });
});

// ──────────────────────────────────────────────
// EDGE CASES
// ──────────────────────────────────────────────
describe("PlanningContext edge cases", () => {
  it("handles empty social links", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", { socialLinks: [] });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.socialPresence).toBe("low");
    expect(ctx.communityStrength).toBe("none");
  });

  it("handles empty products", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", { products: [] });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.productConfidence).toBe("none");
    expect(ctx.recommendationReadiness).toBe("none");
  });

  it("handles high follower celebrity with no products", () => {
    const engine = new PlanningContextEngine();
    const graph = mockGraph("default", {
      creator: { name: "Star", username: "star", bio: "Star", niche: "default", subNiche: [], platform: "instagram", followers: 2000000, engagement: 0.12, contentFrequency: "daily", verified: true, confidence: 0.95 },
    });
    const profile = buildProfile(graph);
    const ctx = engine.build(graph, profile);
    expect(ctx.authorityLevel).toBe("high");
    expect(ctx.commerceReadiness).toBe("none");
  });

  it("all default strategies produce unique fields", () => {
    const allSlices = new Map<string, string>();
    const conflicts: string[] = [];
    for (const s of createDefaultContextStrategies()) {
      for (const slice of s.produces) {
        if (allSlices.has(slice)) {
          conflicts.push(`${slice} (${allSlices.get(slice)} vs ${s.id})`);
        } else {
          allSlices.set(slice, s.id);
        }
      }
    }
    expect(conflicts).toEqual([]);
  });

  it("engine.getRegistry returns the registry", () => {
    const engine = new PlanningContextEngine();
    const registry = engine.getRegistry();
    expect(registry.getAll().length).toBe(createDefaultContextStrategies().length);
  });
});
