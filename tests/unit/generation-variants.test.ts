import { describe, it, expect } from "vitest";
import { LayoutVariantSelector } from "@/lib/generation/composition/variants/selector";
import { LayoutVariantRegistry } from "@/lib/generation/composition/variants/registry";
import { ALL_VARIANTS } from "@/lib/generation/composition/variants/variants/all-variants";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";

function mockGraph(niche: string, overrides?: Partial<KnowledgeGraph>): KnowledgeGraph {
  const base: KnowledgeGraph = {
    creator: { name: "Test", username: "test", bio: "A creator", niche, subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 },
    brand: { name: "Test", tagline: "Tagline", description: "Desc", colors: [], logo: null, existingBranding: false, brandVoice: "casual", confidence: 0.7 },
    audience: {} as any, products: [], socialLinks: [],
    content: { topContentTypes: [], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "weekly", contentQuality: "medium", estimatedReadTime: 1, confidence: 0.6 },
    seo: { pageTitle: "", metaDescription: "", keywords: [], focusPhrase: "", slug: "test", canonical: "", confidence: 0.6 },
    theme: { palette: ["#000"], primary: "#000", secondary: "#fff", accent: "#ccc", mode: "light", fontPairing: "Inter", borderRadius: "0.5rem", confidence: 0.8 },
    sections: [], businessModel: { type: "mixed", primaryRevenueSource: "Digital", monetizationChannels: [], priceTier: "mid", confidence: 0.5 },
    confidence: 0.7,
    ...overrides,
  };
  return base;
}

describe("LayoutVariantRegistry", () => {
  it("registers all variants", () => {
    const registry = new LayoutVariantRegistry();
    expect(registry.getAll().length).toBe(ALL_VARIANTS.length);
  });

  it("selects a variant for each niche", () => {
    const registry = new LayoutVariantRegistry();
    const niches = ["default", "photography", "education", "gaming", "technology", "fitness", "food", "music", "travel", "lifestyle", "art", "sports", "news"];
    for (const niche of niches) {
      const v = registry.select(niche, mockGraph(niche));
      expect(v.niche).toBe(niche);
      expect(v.id).toBeTruthy();
    }
  });

  it("returns default_creator for unknown niche", () => {
    const registry = new LayoutVariantRegistry();
    const v = registry.select("nonexistent", mockGraph("default"));
    expect(v.id).toBe("default_creator");
  });
});

describe("Variant determinism", () => {
  it("same graph always returns same variant", () => {
    const registry = new LayoutVariantRegistry();
    const graph = mockGraph("photography");
    const a = registry.select("photography", graph);
    const b = registry.select("photography", graph);
    expect(a.id).toBe(b.id);
  });

  it("different product counts select different variants", () => {
    const registry = new LayoutVariantRegistry();
    const noProducts = registry.select("photography", mockGraph("photography"));
    const manyProducts = registry.select("photography", mockGraph("photography", { products: [{ name: "P1", type: "digital", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 }, { name: "P2", type: "digital", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 }, { name: "P3", type: "digital", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 }, { name: "P4", type: "digital", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 }, { name: "P5", type: "digital", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 }] }));
    expect(noProducts.id).not.toBe(manyProducts.id);
  });

  it("no randomness — three consecutive selections are identical", () => {
    const registry = new LayoutVariantRegistry();
    const graph = mockGraph("fitness", { content: { topContentTypes: ["video"], averagePostLength: 200, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 2, confidence: 0.7 } });
    const r1 = registry.select("fitness", graph);
    const r2 = registry.select("fitness", graph);
    const r3 = registry.select("fitness", graph);
    expect(r1.id).toBe(r2.id);
    expect(r2.id).toBe(r3.id);
  });
});

describe("Variant selection rules", () => {
  it("photography with no products selects Portfolio", () => {
    const registry = new LayoutVariantRegistry();
    const v = registry.select("photography", mockGraph("photography"));
    expect(v.id).toBe("photo_portfolio");
  });

  it("photography with 5+ products selects Commerce", () => {
    const registry = new LayoutVariantRegistry();
    const products = Array(5).fill(null).map((_, i) => ({ name: `P${i}`, type: "digital", category: "Print", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 }));
    const v = registry.select("photography", mockGraph("photography", { products }));
    expect(v.id).toBe("photo_commerce");
  });

  it("education with 2+ products selects Course First", () => {
    const registry = new LayoutVariantRegistry();
    const products = [{ name: "C1", type: "digital", category: "Course", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.8 }, { name: "C2", type: "digital", category: "Course", description: "", priceRange: "$50", recommended: true, reason: "", confidence: 0.8 }];
    const v = registry.select("education", mockGraph("education", { products }));
    expect(v.id).toBe("edu_courses");
  });

  it("gaming with daily content selects Streamer", () => {
    const registry = new LayoutVariantRegistry();
    const v = registry.select("gaming", mockGraph("gaming", { creator: { name: "Gamer", username: "g", bio: "", niche: "gaming", subNiche: [], platform: "twitch", followers: 1000, engagement: 0.02, contentFrequency: "daily", verified: false, confidence: 0.7 }, content: { topContentTypes: ["video"], averagePostLength: 100, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 1, confidence: 0.7 } }));
    expect(v.id).toBe("gaming_streamer");
  });

  it("gaming with 3+ products selects Creator Store", () => {
    const registry = new LayoutVariantRegistry();
    const products = Array(3).fill(null).map((_, i) => ({ name: `G${i}`, type: "physical", category: "Gear", description: "", priceRange: "$20", recommended: true, reason: "", confidence: 0.8 }));
    const v = registry.select("gaming", mockGraph("gaming", { products }));
    expect(v.id).toBe("gaming_store");
  });

  it("fitness with high quality video selects Transformation", () => {
    const registry = new LayoutVariantRegistry();
    const v = registry.select("fitness", mockGraph("fitness", { content: { topContentTypes: ["video"], averagePostLength: 200, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 2, confidence: 0.7 } }));
    expect(v.id).toBe("fit_transformation");
  });

  it("fitness with 2+ products and no high content selects Programs", () => {
    const registry = new LayoutVariantRegistry();
    const products = [{ name: "P1", type: "digital", category: "Program", description: "", priceRange: "$30", recommended: true, reason: "", confidence: 0.8 }, { name: "P2", type: "digital", category: "Program", description: "", priceRange: "$30", recommended: true, reason: "", confidence: 0.8 }];
    const v = registry.select("fitness", mockGraph("fitness", { products }));
    expect(v.id).toBe("fit_programs");
  });

  it("default with 3+ products and existing branding selects Business", () => {
    const registry = new LayoutVariantRegistry();
    const products = Array(3).fill(null).map((_, i) => ({ name: `P${i}`, type: "digital", category: "A", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 }));
    const v = registry.select("default", mockGraph("default", { products, brand: { name: "Brand", tagline: "Tag", description: "Desc", colors: [], logo: null, existingBranding: true, brandVoice: "professional", confidence: 0.7 } }));
    expect(v.id).toBe("default_business");
  });
});

describe("Variant composition", () => {
  it("every variant produces sections in correct order", () => {
    const registry = new LayoutVariantRegistry();
    for (const v of registry.getAll()) {
      const graph = mockGraph(v.niche);
      const sections = v.compose(graph);
      expect(sections.length).toBeGreaterThan(0);
      const types = sections.map((s) => s.type);
      expect(types[0]).toBe("hero");
      expect(types[types.length - 1]).toBe("footer");
      for (let i = 1; i < sections.length; i++) {
        expect(sections[i]!.order).toBeGreaterThan(sections[i - 1]!.order);
      }
    }
  });

  it("different variants produce different section arrangements", () => {
    const registry = new LayoutVariantRegistry();
    const photo1 = registry.select("photography", mockGraph("photography"));
    const photo2 = registry.select("photography", mockGraph("photography", { products: Array(5).fill(null).map((_, i) => ({ name: `P${i}`, type: "digital", category: "Print", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })) }));
    const s1 = photo1.compose(mockGraph("photography")).map((s) => s.type).join(",");
    const s2 = photo2.compose(mockGraph("photography", { products: Array(5).fill(null).map((_, i) => ({ name: `P${i}`, type: "digital", category: "Print", description: "", priceRange: "$10", recommended: true, reason: "", confidence: 0.8 })) })).map((s) => s.type).join(",");
    expect(s1).not.toBe(s2);
  });

  it("default_creator variant exists and works", () => {
    const registry = new LayoutVariantRegistry();
    const graph = mockGraph("default", { content: { topContentTypes: ["video"], averagePostLength: 200, commonHashtags: [], commonTopics: [], postingSchedule: "daily", contentQuality: "high", estimatedReadTime: 2, confidence: 0.7 }, creator: { name: "Test", username: "test", bio: "A creator", niche: "default", subNiche: [], platform: "instagram", followers: 1000, engagement: 0.02, contentFrequency: "weekly", verified: false, confidence: 0.7 } });
    const v = registry.select("default", graph);
    expect(v.id).toBe("default_portfolio");
    const sections = v.compose(graph);
    expect(sections.length).toBeGreaterThan(3);
  });
});

describe("Variant metadata", () => {
  it("every variant has unique id", () => {
    const ids = ALL_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every variant has label and description", () => {
    for (const v of ALL_VARIANTS) {
      expect(v.label).toBeTruthy();
      expect(v.description).toBeTruthy();
    }
  });

  it("listNiches returns unique niches", () => {
    const registry = new LayoutVariantRegistry();
    const niches = registry.listNiches();
    expect(new Set(niches).size).toBe(niches.length);
  });
});
