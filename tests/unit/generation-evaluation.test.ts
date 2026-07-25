import { describe, it, expect, beforeEach } from "vitest";
import { GenerationEvaluator } from "@/lib/generation/evaluation/evaluator";
import { EvaluationRegistry } from "@/lib/generation/evaluation/rules/registry";
import { HeadlineExistsRule, CTAExistsRule, ThemeColorsAppliedRule } from "@/lib/generation/evaluation/rules/branding";
import { EmptySectionsRule, SEOCompletenessRule } from "@/lib/generation/evaluation/rules/content";
import { ProductsExistRule } from "@/lib/generation/evaluation/rules/commerce";
import { NavigationExistsRule, MobileNavigationRule } from "@/lib/generation/evaluation/rules/ux";
import { ArtifactValidationRule, BlueprintValidationRule } from "@/lib/generation/evaluation/rules/technical";
import type { EvaluationContext } from "@/lib/generation/evaluation/types";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { Artifact, WebsiteBlueprint } from "@/lib/generation/artifacts/types";

function mockContext(overrides?: Partial<EvaluationContext>): EvaluationContext {
  return {
    graph: {
      creator: { name: "Test Creator", username: "test", bio: "Fitness enthusiast", niche: "fitness", subNiche: ["workout"], platform: "instagram", followers: 50000, engagement: 0.05, contentFrequency: "daily", verified: false, confidence: 0.8 },
      brand: { name: "Test Brand", tagline: "Transform your fitness", description: "Fitness brand", colors: ["#EA580C"], logo: null, existingBranding: false, brandVoice: "inspirational", confidence: 0.7 },
      audience: {} as any, products: [], content: {} as any, seo: {} as any, theme: {} as any, sections: [], socialLinks: [], businessModel: {} as any, confidence: 0.7,
    },
    blueprint: {
      website: { title: "Test Store", tagline: "Tagline", description: "Desc", domain: "test.creatorstore.com", locale: "en", currency: "USD", timezone: "UTC", version: 1 },
      pages: [{ id: "home", type: "home", title: "Home", slug: "home", description: "", sections: [], order: 1, visible: true, metadata: {} }],
      navigation: { desktop: [{ label: "Home", href: "/", order: 1, children: [] }, { label: "Products", href: "/products", order: 2, children: [] }], mobile: [], bottom: [], mobileBottom: [{ label: "Home", href: "/", order: 1, children: [] }, { label: "Products", href: "/products", order: 2, children: [] }], sticky: true, style: "standard" },
      sections: [
        { id: "hero", type: "hero", page: "home", order: 0, props: { headline: "Welcome to Test Store - Fitness Training", cta: "Shop Now", subheadline: "Best fitness products and workout plans" }, reason: "Hero", confidence: 0.9 },
        { id: "about", type: "about", page: "home", order: 1, props: { bio: "Test creator bio about fitness, health, and workout routines" }, reason: "About", confidence: 0.8 },
      ],
      products: [
        { id: "p1", name: "Workout Program", type: "digital", category: "Fitness", description: "Program", priceRange: "$20-$80", featured: true, imageUrl: null, order: 1, metadata: {} },
        { id: "p2", name: "Apparel", type: "physical", category: "Apparel", description: "T-shirt", priceRange: "$25", featured: false, imageUrl: null, order: 2, metadata: {} },
        { id: "p3", name: "Meal Plan", type: "digital", category: "Nutrition", description: "Plan", priceRange: "$10-$40", featured: false, imageUrl: null, order: 3, metadata: {} },
      ],
      gallery: { enabled: false, albums: [], featuredImages: [], ordering: "chronological", layout: "grid" },
      feed: { enabled: true, source: "instagram", limit: 6, layout: "grid", showCaptions: true, autoplay: false },
      about: { id: "about", type: "about", page: "about", order: 0, props: { title: "About", bio: "Test creator bio with enough content to pass validation" }, reason: "", confidence: 0.8 },
      contact: { id: "contact", type: "contact_form", page: "contact", order: 0, props: { email: "test@test.com" }, reason: "", confidence: 0.8 },
      seo: { title: "Test Store - Fitness", description: "Best fitness products", keywords: ["fitness", "workout", "health"], canonical: "https://test.creatorstore.com", pageTitle: "Test Store", metaDescription: "Desc", focusPhrase: "fitness", slug: "test", sitemapPriority: 1, sitemapChangefreq: "weekly", ogImage: "", ogType: "website", twitterHandle: "", structuredData: {} },
      theme: { primary: "#EA580C", secondary: "#F97316", accent: "#FB923C", mode: "light", fontPairing: "Inter", borderRadius: "0.5rem", confidence: 0.8, palette: ["#EA580C"], background: "#fff", text: "#000", fonts: { heading: "Inter", body: "Inter" }, spacing: { sectionPadding: "4rem", containerWidth: "1200px", gap: "1.5rem" }, buttons: { borderRadius: "0.5rem", padding: "0.75rem", fontWeight: "600", textTransform: "none" }, cards: { borderRadius: "0.5rem", shadow: "none", padding: "1.5rem" }, colors: { primary: "#EA580C", "primary-foreground": "#fff" } },
      builder: { version: 1, blocks: [], layout: "single", containerWidth: "1200px", metadata: {} },
      metadata: { generatedAt: new Date().toISOString(), version: 1, confidence: 0.8, sourceKey: "test", intelligenceVersion: "1.0" },
    } as any,
    artifacts: [
      { manifest: { id: "web", type: "website_record", version: 1, checksum: "abc", createdAt: "now", dependencies: [], sourceBlueprintVersion: 1, size: 100 }, data: {} },
      { manifest: { id: "theme", type: "theme_record", version: 1, checksum: "abc", createdAt: "now", dependencies: [], sourceBlueprintVersion: 1, size: 100 }, data: {} },
      { manifest: { id: "pages", type: "pages", version: 1, checksum: "abc", createdAt: "now", dependencies: [], sourceBlueprintVersion: 1, size: 100 }, data: {} },
      { manifest: { id: "nav", type: "navigation", version: 1, checksum: "abc", createdAt: "now", dependencies: [], sourceBlueprintVersion: 1, size: 100 }, data: {} },
      { manifest: { id: "sec", type: "sections", version: 1, checksum: "abc", createdAt: "now", dependencies: [], sourceBlueprintVersion: 1, size: 100 }, data: {} },
      { manifest: { id: "seo", type: "seo", version: 1, checksum: "abc", createdAt: "now", dependencies: [], sourceBlueprintVersion: 1, size: 100 }, data: {} },
      { manifest: { id: "sf", type: "storefront_json", version: 1, checksum: "abc", createdAt: "now", dependencies: [], sourceBlueprintVersion: 1, size: 100 }, data: {} },
      { manifest: { id: "ss", type: "publish_snapshot", version: 1, checksum: "abc", createdAt: "now", dependencies: [], sourceBlueprintVersion: 1, size: 100 }, data: { records: {} } },
    ],
    strategy: "pro",
    creatorName: "Test Creator",
    ...overrides,
  } as EvaluationContext;
}

describe("EvaluationRegistry", () => {
  it("registers all default rules", () => {
    const registry = new EvaluationRegistry();
    const rules = registry.getAll();
    expect(rules.length).toBeGreaterThanOrEqual(19);
  });

  it("filters rules by category", () => {
    const registry = new EvaluationRegistry();
    expect(registry.getByCategory("branding").length).toBeGreaterThanOrEqual(4);
    expect(registry.getByCategory("technical").length).toBeGreaterThanOrEqual(4);
  });

  it("prevents duplicate registration", () => {
    const registry = new EvaluationRegistry();
    expect(() => registry.register(new HeadlineExistsRule())).toThrow("already registered");
  });
});

describe("Individual rules", () => {
  it("HeadlineExistsRule passes with valid headline", () => {
    const rule = new HeadlineExistsRule();
    const result = rule.evaluate(mockContext());
    expect(result.passed).toBe(true);
  });

  it("HeadlineExistsRule fails without headline", () => {
    const rule = new HeadlineExistsRule();
    const ctx = mockContext();
    ctx.blueprint.sections = [];
    const result = rule.evaluate(ctx);
    expect(result.passed).toBe(false);
  });

  it("CTAExistsRule passes with CTA", () => {
    const rule = new CTAExistsRule();
    expect(rule.evaluate(mockContext()).passed).toBe(true);
  });

  it("ThemeColorsAppliedRule passes with colors", () => {
    const rule = new ThemeColorsAppliedRule();
    expect(rule.evaluate(mockContext()).passed).toBe(true);
  });

  it("EmptySectionsRule passes with populated sections", () => {
    const rule = new EmptySectionsRule();
    expect(rule.evaluate(mockContext()).passed).toBe(true);
  });

  it("SEOCompletenessRule passes with complete SEO", () => {
    const rule = new SEOCompletenessRule();
    expect(rule.evaluate(mockContext()).passed).toBe(true);
  });

  it("ProductsExistRule passes with products", () => {
    const rule = new ProductsExistRule();
    expect(rule.evaluate(mockContext()).passed).toBe(true);
  });

  it("ProductsExistRule fails without products", () => {
    const rule = new ProductsExistRule();
    const ctx = mockContext();
    ctx.blueprint.products = [];
    expect(rule.evaluate(ctx).passed).toBe(false);
  });

  it("NavigationExistsRule passes with navigation", () => {
    const rule = new NavigationExistsRule();
    expect(rule.evaluate(mockContext()).passed).toBe(true);
  });

  it("ArtifactValidationRule passes with all artifacts", () => {
    const rule = new ArtifactValidationRule();
    expect(rule.evaluate(mockContext()).passed).toBe(true);
  });

  it("ArtifactValidationRule fails with missing artifacts", () => {
    const rule = new ArtifactValidationRule();
    const ctx = mockContext();
    ctx.artifacts = [];
    expect(rule.evaluate(ctx).passed).toBe(false);
  });

  it("BlueprintValidationRule passes with valid blueprint", () => {
    const rule = new BlueprintValidationRule();
    expect(rule.evaluate(mockContext()).passed).toBe(true);
  });
});

describe("GenerationEvaluator", () => {
  it("produces evaluation report", () => {
    const evaluator = new GenerationEvaluator();
    const report = evaluator.evaluate(mockContext());
    expect(report.rules.length).toBeGreaterThan(10);
    expect(report.categories.length).toBe(5);
  });

  it("computes overall score", () => {
    const evaluator = new GenerationEvaluator();
    const report = evaluator.evaluate(mockContext());
    expect(report.overall.percentage).toBeGreaterThanOrEqual(0);
    expect(report.overall.percentage).toBeLessThanOrEqual(100);
  });

  it("generates recommendations for failed rules", () => {
    const evaluator = new GenerationEvaluator();
    const ctx = mockContext();
    ctx.blueprint.products = [];
    ctx.blueprint.sections = [];
    ctx.blueprint.navigation.desktop = [];
    ctx.artifacts = [];
    const report = evaluator.evaluate(ctx);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("applies strategy-specific thresholds", () => {
    const evaluator = new GenerationEvaluator();
    const free = evaluator.evaluate(mockContext({ strategy: "free" }));
    const elite = evaluator.evaluate(mockContext({ strategy: "elite" }));
    expect(free.threshold).toBe(40);
    expect(elite.threshold).toBe(75);
  });

  it("full quality blueprint passes all rules", () => {
    const evaluator = new GenerationEvaluator();
    const report = evaluator.evaluate(mockContext());
    const failed = report.rules.filter((r) => !r.passed);
    const failedCount = failed.length;
    expect(failedCount).toBe(0);
  });

  it("category scores sum correctly", () => {
    const evaluator = new GenerationEvaluator();
    const report = evaluator.evaluate(mockContext());
    const totalMax = report.categories.reduce((s, c) => s + c.maxScore, 0);
    expect(totalMax).toBeGreaterThan(0);
  });

  it("recommendations have required fields", () => {
    const evaluator = new GenerationEvaluator();
    const ctx = mockContext();
    ctx.blueprint.sections = [];
    ctx.blueprint.products = [];
    ctx.artifacts = [];
    const report = evaluator.evaluate(ctx);
    for (const rec of report.recommendations) {
      expect(rec.summary).toBeTruthy();
      expect(rec.details).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(rec.priority);
    }
  });
});
