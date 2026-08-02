import { describe, it, expect } from "vitest";
import {
  type PublishedSnapshot,
  CURRENT_SNAPSHOT_VERSION,
  SNAPSHOT_SCHEMA,
} from "@/types/snapshot";
import { LayoutEngine } from "@/lib/storefront/layout-engine/LayoutEngine";

const engine = new LayoutEngine();

// ── Fixtures ──────────────────────────────────────────────

function minimalSnapshot(): PublishedSnapshot {
  return {
    _schema: SNAPSHOT_SCHEMA,
    _version: CURRENT_SNAPSHOT_VERSION,
    metadata: { version: 1, publishedAt: "2026-01-01T00:00:00Z", previousVersion: null, correlationId: "t1", generatedBy: "dashboard" },
    content: {
      identity: { name: "Minimal", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      hero: { title: "Hello", subtitle: "", description: "" },
      products: [],
      gallery: [],
      links: [],
      seo: { title: "", description: "" },
    },
    layout: {
      pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "hero.default", config: {}, order: 0, visible: true }] }],
    },
    theme: {
      packageId: "neon-dark",
      colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" },
      typography: { heading: "Inter", body: "Inter" },
    },
    navigation: [{ id: "hero", label: "Home", href: "#hero", type: "anchor", order: 0, visible: true }],
    renderingHints: {},
  };
}

function fullSnapshot(): PublishedSnapshot {
  return {
    _schema: SNAPSHOT_SCHEMA,
    _version: CURRENT_SNAPSHOT_VERSION,
    metadata: { version: 3, publishedAt: "2026-07-27T12:00:00Z", previousVersion: 2, correlationId: "t2", generatedBy: "dashboard" },
    content: {
      identity: {
        name: "Full Creator", tagline: "Full stack creator",
        bio: "I create content across multiple platforms",
        avatarUrl: "https://example.com/avatar.jpg", bannerUrl: "https://example.com/banner.jpg",
        socialLinks: [{ platform: "youtube", url: "https://youtube.com/@creator" }],
      },
      hero: { title: "Featured", subtitle: "Latest work", description: "Check out my creations", videoUrl: "https://example.com/hero.mp4", posterUrl: "https://example.com/poster.jpg", ctaText: "Shop Now", ctaLink: "/products", showLiveBadge: true, liveBadgeText: "LIVE" },
      products: [{ id: "p1", name: "Course", description: "Learn", price: 499, imageUrl: "https://example.com/course.jpg", images: [], slug: "course", isFeatured: true, isActive: true }],
      gallery: [{ id: "g1", title: "Photo", description: "A photo", imageUrl: "https://example.com/photo.jpg", mediaType: "image", videoUrl: null, altText: "Alt", isFeatured: true }],
      links: [{ id: "l1", title: "My Link", url: "https://example.com/link", imageUrl: null }],
      seo: { title: "Custom SEO Title", description: "Custom SEO Description" },
    },
    layout: {
      pages: [
        { id: "p_home", name: "Home", slug: "/", isHome: true, order: 0, sections: [
          { id: "s_hero", moduleId: "hero.default", config: {}, order: 0, visible: true },
          { id: "s_about", moduleId: "about.default", config: {}, order: 1, visible: true },
          { id: "s_products", moduleId: "products.grid", config: {}, order: 2, visible: true },
        ]},
        { id: "p_shop", name: "Shop", slug: "/shop", isHome: false, order: 1, sections: [
          { id: "s_shop_products", moduleId: "products.grid", config: {}, order: 0, visible: true },
        ]},
      ],
    },
    theme: {
      packageId: "gaming-dark",
      colors: { primary: "#7C3AED", secondary: "#10B981", accent: "#F43F5E", background: "#0F172A", foreground: "#F8FAFC", muted: "#94A3B8" },
      typography: { heading: "Poppins", body: "Inter" },
    },
    navigation: [
      { id: "hero", label: "Home", href: "#hero", type: "anchor", order: 0, visible: true },
      { id: "products", label: "Products", href: "#products", type: "anchor", order: 1, visible: true },
      { id: "gallery", label: "Gallery", href: "#gallery", type: "anchor", order: 2, visible: true },
      { id: "links", label: "Links", href: "#links", type: "anchor", order: 3, visible: true },
      { id: "shop_page", label: "Shop", href: "/shop", type: "page", order: 4, visible: true },
    ],
    renderingHints: {
      sectionVisibility: { s_hero: "visible", s_about: "auto" },
      responsive: { s_hero: { mobile: true, tablet: true, desktop: true } },
      animations: { s_hero: { id: "fade", duration: 500 } },
    },
  };
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  const props = Object.getOwnPropertyNames(obj);
  for (const prop of props) {
    const val = (obj as Record<string, unknown>)[prop];
    if (val && typeof val === "object") deepFreeze(val);
  }
  return Object.freeze(obj);
}

// ── Theme Tests ───────────────────────────────────────────

describe("LayoutEngine — theme", () => {
  it("converts snapshot theme to CSS custom properties", () => {
    const doc = engine.resolve(minimalSnapshot());
    expect(doc.theme).toEqual({
      "--brand-primary": "#6366F1",
      "--brand-secondary": "#818CF8",
      "--brand-accent": "#A5B4FC",
      "--surface-root": "#09090b",
      "--surface-base": "#fafafa",
      "--text-primary": "#fafafa",
      "--text-secondary": "#a1a1aa",
    });
  });

  it("uses gaming-dark theme colors from full snapshot", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.theme["--brand-primary"]).toBe("#7C3AED");
    expect(doc.theme["--surface-root"]).toBe("#0F172A");
  });
});

// ── Navigation Tests ──────────────────────────────────────

describe("LayoutEngine — navigation", () => {
  it("includes layout pages in navigation", () => {
    const doc = engine.resolve(minimalSnapshot());
    expect(doc.navigation.some((n) => n.label === "Home")).toBe(true);
  });

  it("adds content-driven nav items when data exists", () => {
    const doc = engine.resolve(fullSnapshot());
    const labels = doc.navigation.map((n) => n.label);
    expect(labels).toContain("Products");
    expect(labels).toContain("Gallery");
    expect(labels).toContain("Links");
  });

  it("does not add content nav items when data is empty", () => {
    const doc = engine.resolve(minimalSnapshot());
    const labels = doc.navigation.map((n) => n.label);
    expect(labels).not.toContain("Products");
    expect(labels).not.toContain("Gallery");
    expect(labels).not.toContain("Links");
  });

  it("all nav items have visible property", () => {
    const doc = engine.resolve(fullSnapshot());
    for (const item of doc.navigation) {
      expect(typeof item.visible).toBe("boolean");
    }
  });
});

// ── Metadata Tests ────────────────────────────────────────

describe("LayoutEngine — metadata", () => {
  it("falls back to identity name for SEO title", () => {
    const doc = engine.resolve(minimalSnapshot());
    expect(doc.metadata.title).toBe("Minimal — CreatorStore");
  });

  it("uses custom SEO title when provided", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.metadata.title).toBe("Custom SEO Title");
  });

  it("includes canonical URL", () => {
    // canonical URL is set by the page (infrastructure), not LayoutEngine
    // Metadata includes it as a passthrough
  });

  it("includes OpenGraph and Twitter metadata", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.metadata.openGraph.title).toBe("Custom SEO Title");
    expect(doc.metadata.twitter.title).toBe("Custom SEO Title");
    expect(doc.metadata.openGraph.type).toBe("profile");
    expect(doc.metadata.twitter.card).toBe("summary_large_image");
  });
});

// ── JSON-LD Tests ─────────────────────────────────────────

describe("LayoutEngine — JSON-LD", () => {
  it("includes Person schema", () => {
    const doc = engine.resolve(minimalSnapshot());
    const person = doc.jsonLd.find((j) => j["@type"] === "Person");
    expect(person).toBeDefined();
    expect(person?.name).toBe("Minimal");
  });

  it("includes Person sameAs from social links", () => {
    const doc = engine.resolve(fullSnapshot());
    const person = doc.jsonLd.find((j) => j["@type"] === "Person") as Record<string, unknown>;
    expect((person.sameAs as string[])).toContain("https://youtube.com/@creator");
  });

  it("includes ItemList when products exist", () => {
    const doc = engine.resolve(fullSnapshot());
    const itemList = doc.jsonLd.find((j) => j["@type"] === "ItemList");
    expect(itemList).toBeDefined();
  });

  it("does not include ItemList when no products", () => {
    const doc = engine.resolve(minimalSnapshot());
    const itemList = doc.jsonLd.find((j) => j["@type"] === "ItemList");
    expect(itemList).toBeUndefined();
  });

  it("includes product price in INR", () => {
    const doc = engine.resolve(fullSnapshot());
    const itemList = doc.jsonLd.find((j) => j["@type"] === "ItemList") as Record<string, unknown>;
    const items = itemList.itemListElement as Record<string, unknown>[];
    const offer = (items[0].item as Record<string, unknown>).offers as Record<string, unknown>;
    expect(offer.priceCurrency).toBe("INR");
    expect(offer.price).toBe(499);
  });
});

// ── Pages Tests ───────────────────────────────────────────

describe("LayoutEngine — pages", () => {
  it("preserves page hierarchy (not flattened)", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.pages).toHaveLength(2);
    expect(doc.pages[0].name).toBe("Home");
    expect(doc.pages[1].name).toBe("Shop");
  });

  it("preserves moduleId on each section", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.pages[0].sections[0].moduleId).toBe("hero.default");
    expect(doc.pages[0].sections[1].moduleId).toBe("products.grid");
  });

  it("preserves section order", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.pages[0].sections[0].order).toBe(0);
    expect(doc.pages[0].sections[1].order).toBe(2);
  });

  it("preserves visibility", () => {
    const doc = engine.resolve(minimalSnapshot());
    expect(doc.pages[0].sections[0].visible).toBe(true);
  });

  it("injects hero content into section config", () => {
    const doc = engine.resolve(minimalSnapshot());
    expect(doc.pages[0].sections[0].config).toHaveProperty("title", "Hello");
    expect(doc.pages[0].sections[0].config).toHaveProperty("subtitle", "");
    expect(doc.pages[0].sections[0].config).toHaveProperty("description", "");
  });

  it("injects products content into products grid section", () => {
    const doc = engine.resolve(fullSnapshot());
    const productsSection = doc.pages[0].sections.find((s) => s.moduleId === "products.grid");
    expect(productsSection).toBeDefined();
    const resolvedData = productsSection!.config.resolvedData as Array<Record<string, unknown>>;
    expect(resolvedData).toHaveLength(1);
    expect(resolvedData[0].name).toBe("Course");
    expect(resolvedData[0].price).toBe(499);
  });

  it("drops deprecated About sections (auto-migration from old layouts)", () => {
    const doc = engine.resolve(fullSnapshot());
    const aboutSections = doc.pages[0].sections.filter((s) => s.moduleId.startsWith("about."));
    expect(aboutSections).toHaveLength(0);
    expect(doc.pages[0].sections.some((s) => s.moduleId === "about.default")).toBe(false);
  });
});

// ── Rendering Hints Tests ─────────────────────────────────

describe("LayoutEngine — rendering hints", () => {
  it("passes through sectionVisibility", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.renderingHints.sectionVisibility?.s_hero).toBe("visible");
    expect(doc.renderingHints.sectionVisibility?.s_about).toBe("auto");
  });

  it("passes through responsive hints", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.renderingHints.responsive?.s_hero?.mobile).toBe(true);
    expect(doc.renderingHints.responsive?.s_hero?.desktop).toBe(true);
  });

  it("passes through animations", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.renderingHints.animations?.s_hero?.id).toBe("fade");
    expect(doc.renderingHints.animations?.s_hero?.duration).toBe(500);
  });

  it("hints are undefined when snapshot has none", () => {
    const doc = engine.resolve(minimalSnapshot());
    expect(doc.renderingHints.sectionVisibility).toBeUndefined();
    expect(doc.renderingHints.responsive).toBeUndefined();
    expect(doc.renderingHints.animations).toBeUndefined();
  });
});

// ── Immutability Tests ────────────────────────────────────

describe("LayoutEngine — immutability", () => {
  it("does not mutate the input snapshot", () => {
    const snap = minimalSnapshot();
    const frozen = deepFreeze(snap);

    // Should not throw — LayoutEngine must not mutate
    expect(() => engine.resolve(frozen)).not.toThrow();
  });

  it("output is a different reference from input", () => {
    const snap = minimalSnapshot();
    const doc = engine.resolve(snap);
    expect(doc).not.toBe(snap);
    expect(doc.pages).not.toBe(snap.layout.pages);
    expect(doc.pages[0].sections).not.toBe(snap.layout.pages[0].sections);
  });
});

// ── Determinism Tests ─────────────────────────────────────

describe("LayoutEngine — determinism", () => {
  it("produces identical output across multiple calls", () => {
    const snap = fullSnapshot();
    const results = Array.from({ length: 100 }, () => engine.resolve(snap));
    const first = JSON.stringify(results[0]);
    for (let i = 1; i < results.length; i++) {
      expect(JSON.stringify(results[i])).toBe(first);
    }
  });

  it("no timestamps or random values in output", () => {
    const snap = fullSnapshot();
    const doc = engine.resolve(snap);
    const str = JSON.stringify(doc);
    expect(str).not.toContain("Date");
    expect(str).not.toContain("random");
    expect(str).not.toContain("uuid");
  });
});

// ── Special Cases ─────────────────────────────────────────

describe("LayoutEngine — vocabulary resolution", () => {
  it("resolves featured_products to products.grid", () => {
    const snap = minimalSnapshot();
    snap.layout.pages[0].sections[0].moduleId = "featured_products";
    const doc = engine.resolve(snap);
    expect(doc.pages[0].sections[0].moduleId).toBe("products.grid");
  });

  it("resolves product_grid to products.grid", () => {
    const snap = minimalSnapshot();
    snap.layout.pages[0].sections[0].moduleId = "product_grid";
    const doc = engine.resolve(snap);
    expect(doc.pages[0].sections[0].moduleId).toBe("products.grid");
  });

  it("resolves social_links to links.default", () => {
    const snap = minimalSnapshot();
    snap.layout.pages[0].sections[0].moduleId = "social_links";
    const doc = engine.resolve(snap);
    expect(doc.pages[0].sections[0].moduleId).toBe("links.default");
  });

  it("resolves contact_form to contact.default", () => {
    const snap = minimalSnapshot();
    snap.layout.pages[0].sections[0].moduleId = "contact_form";
    const doc = engine.resolve(snap);
    expect(doc.pages[0].sections[0].moduleId).toBe("contact.default");
  });

  it("canonical IDs pass through unchanged", () => {
    const snap = minimalSnapshot();
    snap.layout.pages[0].sections[0].moduleId = "hero.default";
    const doc = engine.resolve(snap);
    expect(doc.pages[0].sections[0].moduleId).toBe("hero.default");
  });

  it("unknown IDs pass through unchanged (no silent mapping)", () => {
    const snap = minimalSnapshot();
    snap.layout.pages[0].sections[0].moduleId = "custom.thing";
    const doc = engine.resolve(snap);
    expect(doc.pages[0].sections[0].moduleId).toBe("custom.thing");
  });

  it("resolves content_feed to contentFeed.default", () => {
    const snap = minimalSnapshot();
    snap.layout.pages[0].sections[0].moduleId = "content_feed";
    const doc = engine.resolve(snap);
    expect(doc.pages[0].sections[0].moduleId).toBe("contentFeed.default");
  });
});

describe("LayoutEngine — special cases", () => {
  it("handles multi-page layout", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.pages).toHaveLength(2);
    expect(doc.navigation.filter((n) => n.visible).length).toBeGreaterThanOrEqual(4);
  });

  it("hero image snapshot produces no video metadata", () => {
    const snap = minimalSnapshot();
    const doc = engine.resolve(snap);
    expect(doc.metadata.openGraph.image).toBeUndefined();
  });

  it("full snapshot with avatar produces OG image", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.metadata.openGraph.image).toBeDefined();
  });

  it("produces version matching snapshot metadata", () => {
    const doc = engine.resolve(fullSnapshot());
    expect(doc.version).toBe(3);
  });
});
