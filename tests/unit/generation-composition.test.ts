import { describe, it, expect, beforeEach } from "vitest";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import { LayoutComposer } from "@/lib/generation/composition/layout-composer";
import { PageComposer } from "@/lib/generation/composition/page-composer";
import { NavigationComposer } from "@/lib/generation/composition/navigation-composer";
import { HeroComposer } from "@/lib/generation/composition/hero-composer";
import { ProductComposer } from "@/lib/generation/composition/product-composer";
import { GalleryComposer } from "@/lib/generation/composition/gallery-composer";
import { FeedComposer } from "@/lib/generation/composition/feed-composer";
import { ContactComposer } from "@/lib/generation/composition/contact-composer";
import { FooterComposer } from "@/lib/generation/composition/footer-composer";
import { ThemeComposer } from "@/lib/generation/composition/theme-composer";
import { SEOComposer } from "@/lib/generation/composition/seo-composer";
import { BuilderComposer } from "@/lib/generation/composition/builder-composer";
import { BlueprintValidator } from "@/lib/generation/composition/validation";
import { SectionComposer } from "@/lib/generation/composition/section-composer";
import { composeFromGraph } from "@/lib/generation/composition/website-blueprint";
import { BlueprintCache } from "@/lib/generation/composition/blueprint-cache";
import { DEFAULTS } from "@/lib/generation/experience-plan";

function mockGraph(overrides?: Partial<KnowledgeGraph>): KnowledgeGraph {
  return {
    creator: {
      name: "Test Creator", username: "testcreator", bio: "Digital creator sharing content daily. Fitness enthusiast.", niche: "fitness",
      subNiche: ["workout", "nutrition"], platform: "instagram", followers: 50000, engagement: 0.05,
      contentFrequency: "daily", verified: false, confidence: 0.8,
    },
    brand: {
      name: "Test Creator", tagline: "Transform your fitness journey", description: "Fitness brand", colors: ["#EA580C"],
      logo: null, existingBranding: false, brandVoice: "inspirational", confidence: 0.7,
    },
    audience: {
      ageRange: "25-34", primaryGender: "mixed", primaryLanguage: "english", topCountries: ["United States"],
      interests: ["Fitness", "Health", "Nutrition"], incomeLevel: "medium", devicePreference: "mobile",
      activeHours: ["8:00-9:00"], confidence: 0.6,
    },
    products: [
      { name: "Workout Program", type: "digital", category: "Fitness", description: "Complete workout program", priceRange: "$20-$80", recommended: true, reason: "High demand", confidence: 0.85 },
      { name: "Branded Apparel", type: "physical", category: "Apparel", description: "Premium fitness apparel", priceRange: "$25-$60", recommended: true, reason: "Popular choice", confidence: 0.8 },
    ],
    content: {
      topContentTypes: ["video", "post"], averagePostLength: 200, commonHashtags: ["#fitness", "#workout"],
      commonTopics: ["fitness", "health", "nutrition", "motivation"], postingSchedule: "daily",
      contentQuality: "high", estimatedReadTime: 2, confidence: 0.7,
    },
    seo: {
      pageTitle: "Test Creator | Official Fitness Store", metaDescription: "Shop official fitness merchandise.", keywords: ["fitness", "workout", "health"],
      focusPhrase: "test creator fitness store", slug: "test-creator", canonical: "https://test-creator.creatorstore.com", confidence: 0.7,
    },
    theme: {
      palette: ["#EA580C", "#F97316", "#FB923C"], primary: "#EA580C", secondary: "#F97316", accent: "#FB923C",
      mode: "light", fontPairing: "Inter + Bebas Neue", borderRadius: "0.5rem", confidence: 0.8,
    },
    sections: [],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/testcreator", handle: "@testcreator", followers: 50000, primary: true },
    ],
    businessModel: { type: "mixed", primaryRevenueSource: "Digital Products", monetizationChannels: ["Digital Products", "Merchandise"], priceTier: "mid", confidence: 0.6 },
    confidence: 0.7,
    ...overrides,
  };
}

// ===================== Website Blueprint =====================
describe("composeFromGraph", () => {
  it("creates website config from knowledge graph", () => {
    const config = composeFromGraph(mockGraph());
    expect(config.title).toBe("Test Creator");
    expect(config.tagline).toBe("Transform your fitness journey");
    expect(config.domain).toBe("test-creator.creatorstore.com");
  });
});

// ===================== Page Composer =====================
describe("PageComposer", () => {
  let composer: PageComposer;

  beforeEach(() => { composer = new PageComposer(); });

  it("creates home page", () => {
    const pages = composer.compose(mockGraph());
    expect(pages.find((p) => p.type === "home")).toBeDefined();
  });

  it("creates products page when products exist", () => {
    const pages = composer.compose(mockGraph());
    expect(pages.find((p) => p.type === "products")?.visible).toBe(true);
  });

  it("hides products page when no products", () => {
    const pages = composer.compose(mockGraph({ products: [] }));
    expect(pages.find((p) => p.type === "products")?.visible).toBe(false);
  });

  it("creates contact page and omits about page (removed)", () => {
    const pages = composer.compose(mockGraph());
    expect(pages.find((p) => p.type === "about")).toBeUndefined();
    expect(pages.find((p) => p.type === "contact")?.visible).toBe(true);
  });
});

// ===================== Navigation Composer =====================
describe("NavigationComposer", () => {
  let composer: NavigationComposer;

  beforeEach(() => { composer = new NavigationComposer(); });

  it("creates desktop navigation from pages", () => {
    const pages = new PageComposer().compose(mockGraph());
    const nav = composer.compose(pages);
    expect(nav.desktop.length).toBeGreaterThan(0);
  });

  it("adds icons to mobile bottom nav", () => {
    const pages = new PageComposer().compose(mockGraph());
    const nav = composer.compose(pages);
    if (nav.mobileBottom.length > 0) expect(nav.mobileBottom[0]!.icon).toBeDefined();
  });

  it("navigation is sticky", () => {
    const pages = new PageComposer().compose(mockGraph());
    const nav = composer.compose(pages);
    expect(nav.sticky).toBe(true);
  });
});

// ===================== Hero Composer =====================
describe("HeroComposer", () => {
  let composer: HeroComposer;

  beforeEach(() => { composer = new HeroComposer(); });

  it("creates hero section with niche-specific headline", () => {
    const hero = composer.compose(mockGraph());
    expect(hero.type).toBe("hero");
    expect(hero.props.headline).toBeTruthy();
    expect(hero.props.headline.length).toBeGreaterThan(10);
  });

  it("uses niche-specific CTA", () => {
    const hero = composer.compose(mockGraph());
    expect(hero.props.cta).toBe("Start Now");
  });

  it("uses niche-specific CTA even without products", () => {
    const hero = composer.compose(mockGraph({ products: [] }));
    expect(hero.props.cta).toBe("Start Now");
  });

  it("generates badges based on audience", () => {
    const hero = composer.compose(mockGraph());
    expect(hero.props.badges.length).toBeGreaterThan(0);
  });
});

// ===================== Product Composer =====================
describe("ProductComposer", () => {
  let composer: ProductComposer;

  beforeEach(() => { composer = new ProductComposer(); });

  it("composes products from intelligence", () => {
    const products = composer.compose(mockGraph());
    expect(products.length).toBe(2);
  });

  it("returns empty for no products", () => {
    const products = composer.compose(mockGraph({ products: [] }));
    expect(products).toEqual([]);
  });

  it("marks first products as featured", () => {
    const products = composer.compose(mockGraph());
    expect(products[0]!.featured).toBe(true);
  });
});

// ===================== Gallery Composer =====================
describe("GalleryComposer", () => {
  let composer: GalleryComposer;

  beforeEach(() => { composer = new GalleryComposer(); });

  it("disables gallery for non-visual niches", () => {
    const gallery = composer.compose(mockGraph());
    expect(gallery.enabled).toBe(false);
  });

  it("enables gallery for photography", () => {
    const gallery = composer.compose(mockGraph({ creator: { ...mockGraph().creator, niche: "photography" } }));
    expect(gallery.enabled).toBe(true);
  });
});

// ===================== Feed Composer =====================
describe("FeedComposer", () => {
  let composer: FeedComposer;

  beforeEach(() => { composer = new FeedComposer(); });

  it("creates feed blueprint", () => {
    const feed = composer.compose(mockGraph());
    expect(feed.enabled).toBe(true);
    expect(feed.limit).toBe(9);
  });
});

// ===================== Contact Composer =====================
describe("ContactComposer", () => {
  it("creates contact section", () => {
    const contact = new ContactComposer().compose("test-creator", "Test Creator");
    expect(contact.props.email).toBe("test-creator@creatorstore.com");
  });
});

// ===================== Footer Composer =====================
describe("FooterComposer", () => {
  it("creates footer with copyright", () => {
    const nav = new NavigationComposer().compose(new PageComposer().compose(mockGraph()));
    const footer = new FooterComposer().compose(mockGraph(), nav.desktop);
    expect(footer.props.copyright).toContain("Test Creator");
  });
});

// ===================== Theme Composer =====================
describe("ThemeComposer", () => {
  let composer: ThemeComposer;

  beforeEach(() => { composer = new ThemeComposer(); });

  it("composes theme from graph", () => {
    const theme = composer.compose(mockGraph());
    expect(theme.primary).toBe("#EA580C");
    expect(theme.fonts.heading).toBe("Inter");
  });

  it("sets dark mode colors", () => {
    const theme = composer.compose(mockGraph({ theme: { ...mockGraph().theme, mode: "dark" } }));
    expect(theme.background).toBe("#0F172A");
    expect(theme.text).toBe("#F8FAFC");
  });

  it("has all required color tokens", () => {
    const theme = composer.compose(mockGraph());
    expect(theme.colors.primary).toBeDefined();
    expect(theme.colors["primary-foreground"]).toBeDefined();
    expect(theme.colors.background).toBeDefined();
    expect(theme.colors.text).toBeDefined();
  });
});

// ===================== SEO Composer =====================
describe("SEOComposer", () => {
  let composer: SEOComposer;

  beforeEach(() => { composer = new SEOComposer(); });

  it("composes SEO from graph", () => {
    const seo = composer.compose(mockGraph());
    expect(seo.title).toContain("Test Creator");
    expect(seo.keywords).toContain("fitness");
  });

  it("includes structured data", () => {
    const seo = composer.compose(mockGraph());
    expect(seo.structuredData["@type"]).toBe("Person");
  });
});

// ===================== Builder Composer =====================
describe("BuilderComposer", () => {
  it("maps sections and pages to builder blocks", () => {
    const graph = mockGraph();
    const pages = new PageComposer().compose(graph);
    const sections = new SectionComposer().compose(graph, DEFAULTS);
    const builder = new BuilderComposer().compose(sections, pages);
    expect(builder.blocks.length).toBeGreaterThan(0);
    expect(builder.version).toBe(1);
  });
});

// ===================== Blueprint Validator =====================
describe("BlueprintValidator", () => {
  let validator: BlueprintValidator;

  beforeEach(() => { validator = new BlueprintValidator(); });

  it("validates complete blueprint", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const result = validator.validate(blueprint);
    expect(result.score).toBeGreaterThan(0);
  });

  it("detects missing home page", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const bp = { ...blueprint, pages: [] };
    const result = validator.validate(bp as any);
    expect(result.issues.some((i) => i.message.includes("No pages"))).toBe(true);
  });

  it("detects missing hero section", () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    const bp = { ...blueprint, sections: [] };
    const result = validator.validate(bp as any);
    expect(result.issues.some((i) => i.category === "sections")).toBe(true);
  });
});

// ===================== Layout Composer (Integration) =====================
describe("LayoutComposer", () => {
  let composer: LayoutComposer;

  beforeEach(() => { composer = new LayoutComposer(); });

  it("composes complete website blueprint", () => {
    const blueprint = composer.compose(mockGraph(), "test_1", DEFAULTS);
    expect(blueprint.website.title).toBe("Test Creator");
    expect(blueprint.pages.length).toBeGreaterThan(0);
    expect(blueprint.sections.length).toBeGreaterThan(0);
    expect(blueprint.products.length).toBeGreaterThan(0);
    expect(blueprint.seo.title).toBeDefined();
    expect(blueprint.theme.primary).toBeDefined();
    expect(blueprint.builder.blocks.length).toBeGreaterThan(0);
  });

  it("blueprint is immutable", () => {
    const blueprint = composer.compose(mockGraph(), "test_1", DEFAULTS);
    expect(Object.isFrozen(blueprint)).toBe(true);
  });

  it("handles minimal graph gracefully", () => {
    const minimal = mockGraph({
      creator: { ...mockGraph().creator, name: "", followers: 0, bio: "" },
      products: [],
      socialLinks: [],
      content: { ...mockGraph().content, topContentTypes: [], postingSchedule: "irregular", contentQuality: "low" },
    });
    const blueprint = composer.compose(minimal, "minimal", DEFAULTS);
    expect(blueprint.sections.length).toBeGreaterThan(0);
  });

  it("includes metadata", () => {
    const blueprint = composer.compose(mockGraph(), "test_1", DEFAULTS);
    expect(blueprint.metadata.sourceKey).toBe("test_1");
    expect(blueprint.metadata.confidence).toBeGreaterThan(0);
  });
});

// ===================== Blueprint Cache =====================
describe("BlueprintCache", () => {
  let cache: BlueprintCache;
  let store: Map<string, any>;

  beforeEach(() => {
    store = new Map();
    cache = new BlueprintCache({
      get: async (k: string) => ({ success: true, data: store.get(k) ?? null }),
      set: async (k: string, v: any) => { store.set(k, v); return { success: true, data: undefined }; },
      invalidate: async (k: string) => { store.delete(k); return { success: true, data: undefined }; },
      invalidateByPattern: async () => { store.clear(); return { success: true, data: undefined }; },
      exists: async () => ({ success: true, data: false }),
    } as any, 5000);
  });

  it("stores and retrieves blueprints", async () => {
    const blueprint = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    await cache.set("test_1", blueprint);
    const retrieved = await cache.get("test_1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.website.title).toBe("Test Creator");
  });

  it("returns null for missing key", async () => {
    expect(await cache.get("missing")).toBeNull();
  });

  it("invalidates specific key", async () => {
    const bp = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    await cache.set("test_1", bp);
    await cache.invalidate("test_1");
    expect(await cache.get("test_1")).toBeNull();
  });

  it("invalidates all keys", async () => {
    const bp = new LayoutComposer().compose(mockGraph(), "test_1", DEFAULTS);
    await cache.set("k1", bp);
    await cache.set("k2", bp);
    await cache.invalidateAll();
    expect(await cache.get("k1")).toBeNull();
    expect(await cache.get("k2")).toBeNull();
  });
});

// ===================== Section Composer =====================
describe("SectionComposer", () => {
  let composer: SectionComposer;

  beforeEach(() => { composer = new SectionComposer(); });

  it("creates all required sections for default niche", () => {
    const sections = composer.compose(mockGraph({ creator: { ...mockGraph().creator, niche: "default" as any }, content: { ...mockGraph().content, contentQuality: "low" as any } }), DEFAULTS);
    const types = sections.map((s) => s.type);
    expect(types).toContain("hero");
    expect(types).toContain("featured_products");
    expect(types).toContain("content_feed");
    expect(types).not.toContain("about");
    expect(types).toContain("contact_form");
    expect(types).toContain("footer");
    expect(types).toContain("social_links");
  });

  it("each section has a reason", () => {
    const sections = composer.compose(mockGraph(), DEFAULTS);
    for (const s of sections) expect(s.reason).toBeTruthy();
  });

  it("each section has a confidence score", () => {
    const sections = composer.compose(mockGraph(), DEFAULTS);
    for (const s of sections) {
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("sections are ordered sequentially", () => {
    const sections = composer.compose(mockGraph(), DEFAULTS);
    for (let i = 0; i < sections.length - 1; i++) {
      expect(sections[i]!.order).toBeLessThan(sections[i + 1]!.order);
    }
  });
});
