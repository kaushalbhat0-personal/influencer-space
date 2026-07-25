import { describe, it, expect } from "vitest";
import { getVocabulary, ALL_VOCABULARIES } from "@/lib/generation/content/vocabularies";
import { ContentStrategyRegistry } from "@/lib/generation/content/registry";
import { HeroComposer } from "@/lib/generation/composition/hero-composer";
import { AboutComposer } from "@/lib/generation/composition/about-composer";
import { SEOComposer } from "@/lib/generation/composition/seo-composer";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";

function mockGraph(niche: string): KnowledgeGraph {
  return {
    creator: { name: "TestCreator", username: "test", bio: "Creator bio here", niche, subNiche: [], platform: "instagram", followers: 50000, engagement: 0.05, contentFrequency: "daily", verified: false, confidence: 0.8 },
    brand: { name: "TestCreator", tagline: "Tagline", description: "Brand description", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.7 },
    audience: {} as any, content: { topContentTypes: ["video"], averagePostLength: 200, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 2, confidence: 0.7 },
    seo: { pageTitle: "Test", metaDescription: "Desc", keywords: ["test"], focusPhrase: "test", slug: "test-creator", canonical: "https://test.creatorstore.com", confidence: 0.7 },
    theme: { palette: [], primary: "#000", secondary: "#fff", accent: "#ccc", mode: "light", fontPairing: "Inter", borderRadius: "0.5rem", confidence: 0.8 },
    sections: [], socialLinks: [{ platform: "instagram", url: "https://ig.com/test", handle: "@test", followers: 1000, primary: true }],
    businessModel: { type: "mixed", primaryRevenueSource: "Digital", monetizationChannels: ["Online"], priceTier: "mid", confidence: 0.6 },
    products: [
      { name: "Product", type: "digital", category: "General", description: "Desc", priceRange: "$10", recommended: true, reason: "Popular", confidence: 0.8 },
    ],
    confidence: 0.7,
  };
}

describe("ContentStrategyRegistry", () => {
  it("registers all vocabularies", () => {
    const registry = new ContentStrategyRegistry();
    expect(registry.getAll().length).toBe(ALL_VOCABULARIES.length);
  });

  it("returns vocabulary by niche", () => {
    expect(getVocabulary("education").niche).toBe("education");
    expect(getVocabulary("photography").niche).toBe("photography");
    expect(getVocabulary("gaming").niche).toBe("gaming");
  });

  it("returns default for unknown niche", () => {
    const v = getVocabulary("nonexistent");
    expect(v.niche).toBe("default");
  });

  it("prevents duplicate registration", () => {
    const registry = new ContentStrategyRegistry();
    expect(() => registry.register(getVocabulary("education"))).toThrow("already registered");
  });
});

describe("All vocabularies have required fields", () => {
  for (const v of ALL_VOCABULARIES) {
    it(`${v.label} has all required fields`, () => {
      expect(v.hero.headlineTemplate).toBeTruthy();
      expect(v.hero.subheadlineTemplate).toBeTruthy();
      expect(v.hero.cta).toBeTruthy();
      expect(v.products.sectionTitle).toBeTruthy();
      expect(v.products.emptyMessage).toBeTruthy();
      expect(v.gallery.sectionTitle).toBeTruthy();
      expect(v.about.sectionTitle).toBeTruthy();
      expect(v.contact.successMessage).toBeTruthy();
      expect(v.navigation.homeLabel).toBeTruthy();
      expect(v.cta.shopNow).toBeTruthy();
      expect(v.emptyState.noProducts).toBeTruthy();
      expect(v.meta.titleSuffix).toBeTruthy();
    });
  }
});

describe("Niche-specific vocabulary differences", () => {
  it("each niche has unique hero CTA", () => {
    const ctas = ALL_VOCABULARIES.map((v) => v.hero.cta);
    const unique = new Set(ctas);
    expect(unique.size).toBe(ALL_VOCABULARIES.length);
  });

  it("each niche has unique product section title", () => {
    const titles = ALL_VOCABULARIES.map((v) => v.products.sectionTitle);
    const unique = new Set(titles);
    expect(unique.size).toBeGreaterThan(8);
  });

  it("education uses course language", () => {
    const v = getVocabulary("education");
    expect(v.hero.cta).toBe("Browse Courses");
    expect(v.products.categoryLabel).toBe("Courses");
    expect(v.navigation.productsLabel).toBe("Courses");
  });

  it("photography uses visual language", () => {
    const v = getVocabulary("photography");
    expect(v.hero.headlineTemplate).toContain("Moments");
    expect(v.products.categoryLabel).toBe("Prints");
    expect(v.navigation.galleryLabel).toBe("Portfolio");
  });

  it("gaming uses community language", () => {
    const v = getVocabulary("gaming");
    expect(v.hero.secondaryCta).toBe("Join Discord");
    expect(v.products.sectionTitle).toBe("Creator Gear");
  });

  it("fitness uses transformational language", () => {
    const v = getVocabulary("fitness");
    expect(v.hero.headlineTemplate).toContain("Transform");
    expect(v.products.sectionTitle).toBe("Programs");
    expect(v.gallery.sectionTitle).toBe("Transformations");
  });

  it("food uses recipe language", () => {
    const v = getVocabulary("food");
    expect(v.hero.cta).toBe("Browse Recipes");
    expect(v.navigation.productsLabel).toBe("Recipes");
  });

  it("technology uses tool language", () => {
    const v = getVocabulary("technology");
    expect(v.hero.cta).toBe("Explore Tools");
    expect(v.products.categoryLabel).toBe("Tools");
  });

  it("travel uses exploration language", () => {
    const v = getVocabulary("travel");
    expect(v.hero.cta).toBe("Explore");
    expect(v.gallery.sectionTitle).toBe("Destinations");
  });

  it("art uses creative language", () => {
    const v = getVocabulary("art");
    expect(v.hero.cta).toBe("View Gallery");
    expect(v.contact.sectionTitle).toBe("Commissions");
  });
});

describe("HeroComposer integration", () => {
  it("uses niche-specific hero vocabulary", () => {
    const composer = new HeroComposer();
    const edu = composer.compose(mockGraph("education"));
    expect(edu.props.headline).toContain("Master skills");
    expect(edu.props.cta).toBe("Browse Courses");

    const gaming = composer.compose(mockGraph("gaming"));
    expect(gaming.props.headline).toContain("in one place");
    expect(gaming.props.cta).toBe("Watch Now");
  });

  it("badges use vocabulary product labels", () => {
    const composer = new HeroComposer();
    const edu = composer.compose(mockGraph("education"));
    expect(edu.props.badges.some((b: string) => b.includes("Courses"))).toBe(true);

    const gaming = composer.compose(mockGraph("gaming"));
    expect(gaming.props.badges.some((b: string) => b.includes("Gear"))).toBe(true);
  });
});

describe("SEOComposer integration", () => {
  it("uses niche-specific SEO title suffix", () => {
    const composer = new SEOComposer();
    const tech = composer.compose(mockGraph("technology"));
    expect(tech.title).toContain("TestCreator — TestCreator Tech");

    const music = composer.compose(mockGraph("music"));
    expect(music.title).toContain("TestCreator — TestCreator Music");
  });
});
