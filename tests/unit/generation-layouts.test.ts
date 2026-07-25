import { describe, it, expect } from "vitest";
import { getLayoutStrategy, ALL_STRATEGIES, EducationLayoutStrategy, GamingLayoutStrategy, PhotographyLayoutStrategy, FitnessLayoutStrategy, FoodLayoutStrategy, TechnologyLayoutStrategy } from "@/lib/generation/composition/layouts/strategies";
import { LayoutStrategyRegistry } from "@/lib/generation/composition/layouts/registry";
import { SectionComposer } from "@/lib/generation/composition/section-composer";
import { DEFAULTS } from "@/lib/generation/experience-plan";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";

function mockGraph(niche: string): KnowledgeGraph {
  return {
    creator: { name: `Test ${niche}`, username: "test", bio: `A ${niche} creator`, niche, subNiche: [], platform: "instagram", followers: 50000, engagement: 0.05, contentFrequency: "daily", verified: false, confidence: 0.8 },
    brand: { name: `Test ${niche}`, tagline: `Best ${niche} content`, description: `${niche} brand`, colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.7 },
    audience: { ageRange: "25-34", primaryGender: "mixed", primaryLanguage: "english", topCountries: ["US"], interests: ["Tech"], incomeLevel: "medium", devicePreference: "mobile", activeHours: ["8:00"], confidence: 0.6 },
    products: [
      { name: "Product A", type: "digital", category: "General", description: "Desc", priceRange: "$10", recommended: true, reason: "Popular", confidence: 0.8 },
      { name: "Product B", type: "physical", category: "Apparel", description: "Desc", priceRange: "$20", recommended: false, reason: "New", confidence: 0.7 },
    ],
    content: { topContentTypes: ["video"], averagePostLength: 200, commonHashtags: ["#test"], commonTopics: ["test"], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 2, confidence: 0.7 },
    seo: { pageTitle: "Test", metaDescription: "Test desc", keywords: ["test", "demo"], focusPhrase: "test", slug: "test", canonical: "https://test.com", confidence: 0.7 },
    theme: { palette: ["#000"], primary: "#000", secondary: "#fff", accent: "#ccc", mode: "light", fontPairing: "Inter", borderRadius: "0.5rem", confidence: 0.8 },
    sections: [], socialLinks: [{ platform: "instagram", url: "https://ig.com/test", handle: "@test", followers: 1000, primary: true }],
    businessModel: { type: "mixed", primaryRevenueSource: "Digital", monetizationChannels: ["Online"], priceTier: "mid", confidence: 0.6 },
    confidence: 0.7,
  };
}

describe("LayoutStrategyRegistry", () => {
  it("registers all strategies", () => {
    const registry = new LayoutStrategyRegistry();
    const strategies = registry.getAll();
    expect(strategies.length).toBe(ALL_STRATEGIES.length);
  });

  it("returns strategy by niche", () => {
    const strategy = getLayoutStrategy("education");
    expect(strategy.niche).toBe("education");
    expect(strategy.label).toBe("Education");
  });

  it("returns default for unknown niche", () => {
    const strategy = getLayoutStrategy("nonexistent");
    expect(strategy.niche).toBe("default");
  });

  it("prevents duplicate registration", () => {
    const registry = new LayoutStrategyRegistry();
    expect(() => registry.register(new EducationLayoutStrategy())).toThrow("already registered");
  });
});

describe("Niche-specific layout strategies", () => {
  it("education layout starts with different hero text", () => {
    const graph = mockGraph("education");
    const sections = new EducationLayoutStrategy().compose(graph);
    const hero = sections[0]!;
    expect(hero.props.headline).toContain("Learn with");
    expect(hero.props.cta).toBe("Browse Courses");
    expect(hero.props.alignment).toBe("left");
  });

  it("education layout includes testimonials", () => {
    const graph = mockGraph("education");
    const sections = new EducationLayoutStrategy().compose(graph);
    const types = sections.map((s) => s.type);
    expect(types).toContain("testimonials");
  });

  it("photography layout starts with portfolio gallery", () => {
    const graph = mockGraph("photography");
    const sections = new PhotographyLayoutStrategy().compose(graph);
    const hero = sections[0]!;
    const types = sections.map((s) => s.type);
    expect(hero.props.cta).toBe("View Portfolio");
    expect(types[1]).toBe("gallery");
  });

  it("fitness layout includes stats and testimonials", () => {
    const graph = mockGraph("fitness");
    const sections = new FitnessLayoutStrategy().compose(graph);
    const types = sections.map((s) => s.type);
    expect(types).toContain("stats");
    expect(types).toContain("testimonials");
    expect(hero(sections).headline).toContain("Transform");
  });

  it("gaming layout emphasizes content feed", () => {
    const graph = mockGraph("gaming");
    const sections = new GamingLayoutStrategy().compose(graph);
    const types = sections.map((s) => s.type);
    expect(types[1]).toBe("content_feed");
    expect(hero(sections).cta).toBe("Watch Now");
  });

  it("food layout has gallery early", () => {
    const graph = mockGraph("food");
    const sections = new FoodLayoutStrategy().compose(graph);
    const types = sections.map((s) => s.type);
    expect(types).toContain("gallery");
  });

  it("every strategy produces sections in order", () => {
    for (const Strategy of ALL_STRATEGIES) {
      const graph = mockGraph(Strategy.niche);
      const sections = Strategy.compose(graph);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections[0]!.type).toBe("hero");
      expect(sections[sections.length - 1]!.type).toBe("footer");
      const orders = sections.map((s) => s.order);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]!).toBeGreaterThan(orders[i - 1]!);
      }
    }
  });

  it("two different niches produce different section counts", () => {
    const edu = new EducationLayoutStrategy().compose(mockGraph("education"));
    const tech = new TechnologyLayoutStrategy().compose(mockGraph("technology"));
    expect(edu.length).not.toBe(tech.length);
  });

  it("two different niches have different section ordering", () => {
    const fitness = new FitnessLayoutStrategy().compose(mockGraph("fitness"));
    const photography = new PhotographyLayoutStrategy().compose(mockGraph("photography"));
    const fitTypes = fitness.map((s) => s.type);
    const photoTypes = photography.map((s) => s.type);
    expect(fitTypes.join(",")).not.toBe(photoTypes.join(","));
  });

  it("each strategy overrides hero CTA appropriately", () => {
    const ctas: Record<string, string> = {
      education: "Browse Courses",
      photography: "View Portfolio",
      gaming: "Watch Now",
      music: "Listen Now",
      technology: "See Products",
      fitness: "Start Now",
      food: "See Recipes",
      travel: "Explore",
      art: "View Gallery",
      sports: "Shop Gear",
      news: "Read More",
      default: "Shop Now",
    };
    for (const [niche, expectedCta] of Object.entries(ctas)) {
      const strategy = getLayoutStrategy(niche);
      const sections = strategy.compose(mockGraph(niche));
      expect(sections[0]!.props.cta).toBe(expectedCta);
    }
  });
});

describe("SectionComposer integration", () => {
  it("uses layout strategy via SectionComposer", () => {
    const composer = new SectionComposer();
    const eduSections = composer.compose(mockGraph("education"), DEFAULTS);
    const fitSections = composer.compose(mockGraph("fitness"), DEFAULTS);
    expect(eduSections[0]!.props.headline).toContain("Learn with");
    expect(fitSections[0]!.props.headline).toContain("Transform with");
  });

  it("produces different sections for different niches", () => {
    const composer = new SectionComposer();
    const tech = composer.compose(mockGraph("technology"), DEFAULTS);
    const music = composer.compose(mockGraph("music"), DEFAULTS);
    const techTypes = new Set(tech.map((s) => s.type));
    const musicTypes = new Set(music.map((s) => s.type));
    expect(techTypes).not.toEqual(musicTypes);
  });
});

function hero(sections: any[]) {
  return sections[0]!.props;
}
