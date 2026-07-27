import { describe, it, expect } from "vitest";
import {
  type PublishedSnapshot,
  type HeroContent,
  CURRENT_SNAPSHOT_VERSION,
  SNAPSHOT_SCHEMA,
} from "@/types/snapshot";
import type { StorefrontDocument } from "@/types/storefront";
import {
  serializeSnapshot,
  deserializeSnapshot,
  isPublishedSnapshot,
} from "@/lib/publishing/snapshot-serializer";

// ── Golden Fixtures ───────────────────────────────────────

function createMinimalSnapshot(): PublishedSnapshot {
  return {
    _schema: SNAPSHOT_SCHEMA,
    _version: CURRENT_SNAPSHOT_VERSION,
    metadata: {
      version: 1,
      publishedAt: "2026-07-27T12:00:00.000Z",
      previousVersion: null,
      correlationId: "test-corr-001",
      generatedBy: "dashboard",
    },
    content: {
      identity: {
        name: "Test Creator",
        tagline: "Building things",
        bio: "A test creator for unit tests",
        avatarUrl: null,
        bannerUrl: null,
        socialLinks: [],
      },
      hero: { title: "Welcome", subtitle: "My storefront", description: "" },
      products: [],
      gallery: [],
      links: [],
      seo: { title: "Test Creator — CreatorStore", description: "A test creator storefront" },
    },
    layout: {
      pages: [
        {
          id: "page_home",
          name: "Home",
          slug: "/",
          isHome: true,
          order: 0,
          sections: [
            {
              id: "sec_hero",
              moduleId: "hero.default",
              config: { title: "Welcome" },
              order: 0,
              visible: true,
            },
          ],
        },
      ],
    },
    theme: {
      packageId: "neon-dark",
      colors: {
        primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC",
        background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa",
      },
      typography: { heading: "Inter", body: "Inter" },
    },
    navigation: [{ label: "Home", href: "/", order: 0, enabled: true }],
    renderingHints: {},
  };
}

function createFullSnapshot(): PublishedSnapshot {
  return {
    ...createMinimalSnapshot(),
    _version: CURRENT_SNAPSHOT_VERSION,
    metadata: { ...createMinimalSnapshot().metadata, version: 3 },
    content: {
      identity: {
        name: "Full Creator",
        tagline: "Full stack creator",
        bio: "I create content across multiple platforms",
        avatarUrl: "https://example.com/avatar.jpg",
        bannerUrl: "https://example.com/banner.jpg",
        socialLinks: [
          { platform: "youtube", url: "https://youtube.com/@creator" },
          { platform: "instagram", url: "https://instagram.com/creator" },
        ],
      },
      hero: {
        title: "Featured Content",
        subtitle: "Check out my latest work",
        description: "A full description of featured content",
        videoUrl: "https://example.com/hero.mp4",
        posterUrl: "https://example.com/poster.jpg",
        ctaText: "Shop Now",
        ctaLink: "/products",
        showLiveBadge: true,
        liveBadgeText: "LIVE",
      },
      products: [
        {
          id: "prod_1",
          name: "Digital Course",
          description: "Learn something new",
          price: 499,
          imageUrl: "https://example.com/course.jpg",
          images: [],
          slug: "digital-course",
          isFeatured: true,
          isActive: true,
        },
      ],
      gallery: [
        {
          id: "gal_1",
          title: "Photo 1",
          description: "A great photo",
          imageUrl: "https://example.com/photo.jpg",
          mediaType: "image",
          videoUrl: null,
          altText: "Photo description",
          isFeatured: true,
        },
      ],
      links: [
        {
          id: "link_1",
          title: "My Link",
          url: "https://example.com/link",
          imageUrl: null,
        },
      ],
      seo: {
        title: "Full Creator — CreatorStore",
        description: "Full stack creator storefront with products and gallery",
      },
    },
    layout: {
      pages: [
        {
          id: "page_home",
          name: "Home",
          slug: "/",
          isHome: true,
          order: 0,
          sections: [
            { id: "sec_hero", moduleId: "hero.default", config: {}, order: 0, visible: true },
            { id: "sec_about", moduleId: "about.default", config: {}, order: 1, visible: true },
            { id: "sec_products", moduleId: "products.grid", config: {}, order: 2, visible: true },
            { id: "sec_gallery", moduleId: "gallery.grid", config: {}, order: 3, visible: true },
          ],
        },
        {
          id: "page_products",
          name: "Products",
          slug: "/products",
          isHome: false,
          order: 1,
          sections: [
            { id: "sec_products_full", moduleId: "products.grid", config: {}, order: 0, visible: true },
          ],
        },
      ],
    },
    theme: {
      packageId: "gaming-dark",
      colors: {
        primary: "#7C3AED", secondary: "#10B981", accent: "#F43F5E",
        background: "#0F172A", foreground: "#F8FAFC", muted: "#94A3B8",
      },
      typography: { heading: "Poppins", body: "Inter" },
    },
    navigation: [
      { label: "Home", href: "/", order: 0, enabled: true },
      { label: "Products", href: "/products", order: 1, enabled: true },
    ],
    renderingHints: {
      sectionVisibility: { sec_hero: "visible", sec_about: "auto" },
      responsive: { sec_hero: { mobile: true, tablet: true, desktop: true } },
    },
  };
}

// ── Contract Tests ────────────────────────────────────────

describe("PublishedSnapshot contract", () => {
  it("has _schema and _version at root", () => {
    const snap = createMinimalSnapshot();
    expect(snap._schema).toBe("creatorstore.snapshot");
    expect(snap._version).toBe(CURRENT_SNAPSHOT_VERSION);
  });

  it("minimal snapshot has all required root properties", () => {
    const snap = createMinimalSnapshot();
    const rootKeys = Object.keys(snap);
    expect(rootKeys).toEqual([
      "_schema",
      "_version",
      "metadata",
      "content",
      "layout",
      "theme",
      "navigation",
      "renderingHints",
    ]);
  });

  it("metadata has all required fields", () => {
    const snap = createMinimalSnapshot();
    const metaKeys = Object.keys(snap.metadata);
    expect(metaKeys).toContain("version");
    expect(metaKeys).toContain("publishedAt");
    expect(metaKeys).toContain("previousVersion");
    expect(metaKeys).toContain("correlationId");
    expect(metaKeys).toContain("generatedBy");
  });

  it("content has all aggregate fields", () => {
    const snap = createMinimalSnapshot();
    const contentKeys = Object.keys(snap.content);
    expect(contentKeys).toEqual(["identity", "hero", "products", "gallery", "links", "seo"]);
  });

  it("hero is strongly typed with correct shape", () => {
    const hero = createMinimalSnapshot().content.hero;
    const heroKeys = Object.keys(hero);

    // Required fields always present
    expect(heroKeys).toContain("title");
    expect(heroKeys).toContain("subtitle");
    expect(heroKeys).toContain("description");

    // Optional fields exist in type (check via partial that sets them)
    const fullHero = createFullSnapshot().content.hero;
    const fullHeroKeys = Object.keys(fullHero);
    expect(fullHeroKeys).toContain("videoUrl");
    expect(fullHeroKeys).toContain("posterUrl");
    expect(fullHeroKeys).toContain("ctaText");
    expect(fullHeroKeys).toContain("ctaLink");
    expect(fullHeroKeys).toContain("liveBadgeText");
    expect(fullHeroKeys).toContain("showLiveBadge");
  });

  it("theme has frozen color shape (no dynamic keys)", () => {
    const theme = createMinimalSnapshot().theme;
    const colorKeys = Object.keys(theme.colors);
    expect(colorKeys).toEqual(["primary", "secondary", "accent", "background", "foreground", "muted"]);
    expect(theme.typography.heading).toBeTruthy();
    expect(theme.typography.body).toBeTruthy();
  });

  it("layout uses moduleId (not type)", () => {
    const snap = createMinimalSnapshot();
    const section = snap.layout.pages[0].sections[0];
    expect(section).toHaveProperty("moduleId");
    expect(section).not.toHaveProperty("type");
    expect(section.moduleId).toBe("hero.default");
  });

  it("navigation has enabled field", () => {
    const snap = createMinimalSnapshot();
    expect(snap.navigation[0]).toHaveProperty("enabled");
  });

  it("full snapshot has products, gallery, links populated", () => {
    const snap = createFullSnapshot();
    expect(snap.content.products).toHaveLength(1);
    expect(snap.content.gallery).toHaveLength(1);
    expect(snap.content.links).toHaveLength(1);
    expect(snap.layout.pages).toHaveLength(2);
    expect(snap.navigation).toHaveLength(2);
  });
});

describe("Snapshot immutability invariant", () => {
  it("_version is frozen at creation", () => {
    const snap = createMinimalSnapshot();
    expect(snap._version).toBe(CURRENT_SNAPSHOT_VERSION);
    expect(CURRENT_SNAPSHOT_VERSION).toBeGreaterThanOrEqual(1);
  });

  it("Object.freeze prevents mutation in tests", () => {
    const snap = createMinimalSnapshot();
    const frozen = Object.freeze({ ...snap, content: Object.freeze(snap.content) });

    // Verify freeze works
    expect(() => { (frozen as any)._version = 99; }).toThrow();
    expect(() => { (frozen as any).metadata = {}; }).toThrow();

    // But freeze should not prevent reading
    expect(frozen._version).toBe(CURRENT_SNAPSHOT_VERSION);
    expect(frozen.metadata.version).toBe(1);
  });
});

// ── Serializer Tests ──────────────────────────────────────

describe("serializeSnapshot", () => {
  it("produces a plain object with all fields", () => {
    const snap = createMinimalSnapshot();
    const serialized = serializeSnapshot(snap);

    expect(serialized._schema).toBe("creatorstore.snapshot");
    expect(serialized._version).toBe(CURRENT_SNAPSHOT_VERSION);
    expect(serialized.metadata).toEqual(snap.metadata);
    expect(serialized.content).toEqual(snap.content);
    expect(serialized.layout).toEqual(snap.layout);
    expect(serialized.theme).toEqual(snap.theme);
    expect(serialized.navigation).toEqual(snap.navigation);
    expect(serialized.renderingHints).toEqual(snap.renderingHints);
  });

  it("is deterministic (same input = same output)", () => {
    const snap = createMinimalSnapshot();
    const a = serializeSnapshot(snap);
    const b = serializeSnapshot(snap);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("serializes full snapshot without data loss", () => {
    const snap = createFullSnapshot();
    const serialized = serializeSnapshot(snap);
    expect(serialized.content.products).toHaveLength(1);
    expect(serialized.content.products[0].name).toBe("Digital Course");
    expect(serialized.content.gallery[0].title).toBe("Photo 1");
    expect(serialized.navigation[0].label).toBe("Home");
    expect(serialized.navigation[0].enabled).toBe(true);
  });
});

describe("deserializeSnapshot", () => {
  it("roundtrips minimal snapshot", () => {
    const original = createMinimalSnapshot();
    const serialized = serializeSnapshot(original);
    const deserialized = deserializeSnapshot(serialized);

    expect(deserialized).not.toBeNull();
    expect(deserialized!._schema).toBe("creatorstore.snapshot");
    expect(deserialized!._version).toBe(original._version);
    expect(deserialized!.metadata.version).toBe(original.metadata.version);
    expect(deserialized!.content.identity.name).toBe(original.content.identity.name);
    expect(deserialized!.content.products).toEqual([]);
    expect(deserialized!.content.seo.title).toBe(original.content.seo.title);
  });

  it("roundtrips full snapshot without data loss", () => {
    const original = createFullSnapshot();
    const serialized = serializeSnapshot(original);
    const deserialized = deserializeSnapshot(serialized);

    expect(deserialized).not.toBeNull();
    expect(deserialized!._version).toBe(CURRENT_SNAPSHOT_VERSION);
    expect(deserialized!.content.products).toHaveLength(1);
    expect(deserialized!.content.products[0].name).toBe("Digital Course");
    expect(deserialized!.content.gallery[0].title).toBe("Photo 1");
    expect(deserialized!.content.gallery[0].mediaType).toBe("image");
    expect(deserialized!.content.links[0].url).toBe("https://example.com/link");
    expect(deserialized!.content.hero.title).toBe("Featured Content");
    expect(deserialized!.content.hero.ctaText).toBe("Shop Now");
    expect(deserialized!.content.hero.showLiveBadge).toBe(true);
    expect(deserialized!.layout.pages).toHaveLength(2);
    expect(deserialized!.layout.pages[0].sections[0].moduleId).toBe("hero.default");
    expect(deserialized!.navigation).toHaveLength(2);
    expect(deserialized!.navigation[0].enabled).toBe(true);
    expect(deserialized!.theme.colors.primary).toBe("#7C3AED");
    expect(deserialized!.theme.typography.heading).toBe("Poppins");
    expect(deserialized!.renderingHints.sectionVisibility?.sec_hero).toBe("visible");
  });

  it("returns null for empty/invalid input", () => {
    expect(deserializeSnapshot({})).toBeNull();
    expect(deserializeSnapshot({ someField: "value" })).toBeNull();
  });
});

describe("isPublishedSnapshot", () => {
  it("returns true for valid snapshot data", () => {
    const snap = createMinimalSnapshot();
    const serialized = serializeSnapshot(snap);
    expect(isPublishedSnapshot(serialized)).toBe(true);
  });

  it("returns false for empty object", () => {
    expect(isPublishedSnapshot({})).toBe(false);
  });
});

// ── StorefrontDocument Contract Tests ─────────────────────

describe("StorefrontDocument contract", () => {
  it("has the required shape with moduleId and pages hierarchy", () => {
    const doc: StorefrontDocument = {
      version: 1,
      metadata: {
        title: "Test",
        description: "Test description",
        canonicalUrl: "https://example.com",
        openGraph: {},
        twitter: {},
      },
      theme: { "--brand-primary": "#6366F1" },
      navigation: [{ id: "home", label: "Home", enabled: true }],
      jsonLd: [],
      pages: [
        {
          id: "page_home",
          name: "Home",
          slug: "/",
          isHome: true,
          sections: [
            {
              id: "sec_hero",
              moduleId: "hero.default",
              config: { title: "Welcome" },
              order: 0,
              visible: true,
            },
          ],
        },
      ],
      renderingHints: {},
    };

    const rootKeys = Object.keys(doc);
    expect(rootKeys).toEqual([
      "version",
      "metadata",
      "theme",
      "navigation",
      "jsonLd",
      "pages",
      "renderingHints",
    ]);

    expect(doc.pages[0].sections[0].moduleId).toBe("hero.default");
    expect(doc.navigation[0]).toHaveProperty("enabled");
  });
});
