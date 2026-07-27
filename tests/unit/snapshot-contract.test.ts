import { describe, it, expect } from "vitest";
import {
  type PublishedSnapshot,
  CURRENT_SNAPSHOT_VERSION,
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
    snapshotVersion: CURRENT_SNAPSHOT_VERSION,
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
      hero: { title: "Welcome", subtitle: "My storefront" },
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
              type: "hero",
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
      colors: { primary: "#6366F1", secondary: "#818CF8" },
      fonts: { heading: "Inter", body: "Inter" },
    },
    navigation: [{ label: "Home", href: "/", order: 0 }],
    renderingHints: {},
  };
}

function createFullSnapshot(): PublishedSnapshot {
  return {
    ...createMinimalSnapshot(),
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
            { id: "sec_hero", type: "hero", config: {}, order: 0, visible: true },
            { id: "sec_about", type: "about", config: {}, order: 1, visible: true },
            { id: "sec_products", type: "products", config: {}, order: 2, visible: true },
            { id: "sec_gallery", type: "gallery", config: {}, order: 3, visible: true },
          ],
        },
        {
          id: "page_products",
          name: "Products",
          slug: "/products",
          isHome: false,
          order: 1,
          sections: [
            { id: "sec_products_full", type: "products", config: {}, order: 0, visible: true },
          ],
        },
      ],
    },
    theme: {
      packageId: "gaming-dark",
      colors: { primary: "#7C3AED", secondary: "#10B981", accent: "#F43F5E" },
      fonts: { heading: "Poppins", body: "Inter" },
    },
    navigation: [
      { label: "Home", href: "/", order: 0 },
      { label: "Products", href: "/products", order: 1 },
    ],
    renderingHints: {
      sectionVisibility: { sec_hero: "visible", sec_about: "auto" },
      responsive: { sec_hero: { mobile: true, tablet: true, desktop: true } },
    },
  };
}

// ── Contract Tests ────────────────────────────────────────

describe("PublishedSnapshot contract", () => {
  it("minimal snapshot has all required fields", () => {
    const snap = createMinimalSnapshot();

    expect(snap).toHaveProperty("snapshotVersion");
    expect(snap).toHaveProperty("metadata");
    expect(snap).toHaveProperty("content");
    expect(snap).toHaveProperty("layout");
    expect(snap).toHaveProperty("theme");
    expect(snap).toHaveProperty("navigation");
    expect(snap).toHaveProperty("renderingHints");

    // No extra root properties
    const rootKeys = Object.keys(snap);
    expect(rootKeys).toEqual([
      "snapshotVersion",
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
    expect(contentKeys).toContain("identity");
    expect(contentKeys).toContain("hero");
    expect(contentKeys).toContain("products");
    expect(contentKeys).toContain("gallery");
    expect(contentKeys).toContain("links");
    expect(contentKeys).toContain("seo");
  });

  it("content identity has all fields", () => {
    const identity = createMinimalSnapshot().content.identity;
    const idKeys = Object.keys(identity);
    expect(idKeys).toContain("name");
    expect(idKeys).toContain("tagline");
    expect(idKeys).toContain("bio");
    expect(idKeys).toContain("avatarUrl");
    expect(idKeys).toContain("bannerUrl");
    expect(idKeys).toContain("socialLinks");
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
  it("snapshotVersion is frozen at creation", () => {
    const snap = createMinimalSnapshot();
    expect(snap.snapshotVersion).toBe(CURRENT_SNAPSHOT_VERSION);
    expect(CURRENT_SNAPSHOT_VERSION).toBeGreaterThanOrEqual(1);
  });
});

// ── Serializer Tests ──────────────────────────────────────

describe("serializeSnapshot", () => {
  it("produces a plain object with all fields", () => {
    const snap = createMinimalSnapshot();
    const serialized = serializeSnapshot(snap);

    expect(serialized._schema).toBe(CURRENT_SNAPSHOT_VERSION);
    expect(serialized.snapshotVersion).toBe(CURRENT_SNAPSHOT_VERSION);
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
  });
});

describe("deserializeSnapshot", () => {
  it("roundtrips minimal snapshot", () => {
    const original = createMinimalSnapshot();
    const serialized = serializeSnapshot(original);
    const deserialized = deserializeSnapshot(serialized);

    expect(deserialized).not.toBeNull();
    expect(deserialized!.snapshotVersion).toBe(original.snapshotVersion);
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
    expect(deserialized!.content.products).toHaveLength(1);
    expect(deserialized!.content.products[0].name).toBe("Digital Course");
    expect(deserialized!.content.gallery[0].title).toBe("Photo 1");
    expect(deserialized!.content.gallery[0].mediaType).toBe("image");
    expect(deserialized!.content.links[0].url).toBe("https://example.com/link");
    expect(deserialized!.layout.pages).toHaveLength(2);
    expect(deserialized!.navigation).toHaveLength(2);
    expect(deserialized!.theme.packageId).toBe("gaming-dark");
    expect(deserialized!.renderingHints.sectionVisibility?.sec_hero).toBe("visible");
  });

  it("returns null for null/undefined input", () => {
    expect(deserializeSnapshot({} as Record<string, unknown>)).toBeNull();
    expect(deserializeSnapshot({} as Record<string, unknown>)).toBeNull();
  });

  it("returns null if required fields missing", () => {
    const result = deserializeSnapshot({ someField: "value" });
    expect(result).toBeNull();
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

  it("returns false for null", () => {
    expect(isPublishedSnapshot({} as Record<string, unknown>)).toBe(false);
  });
});

// ── StorefrontDocument Contract Tests ─────────────────────

describe("StorefrontDocument contract", () => {
  it("has the required shape", () => {
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
      navigation: [{ id: "home", label: "Home", exists: true }],
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
  });
});
