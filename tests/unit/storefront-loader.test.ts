// ── Storefront Data Loader — Page Resolution Tests ────────
// RCCF-IMPLEMENTATION-09B (Phase 2). Homepage and independent [slug] pages
// resolve a target page from the storefront document by slug.

import { describe, it, expect } from "vitest";
import { normalizePageSlug, resolvePageBySlug, withViewAllHref, resolveNavHrefs, resolveStorefrontNavigation, buildPageSeoDefaults } from "@/lib/storefront/page-resolver";
import { getRegisteredPageBySlug } from "@/lib/pages/registry";

const pages = [
  { id: "p1", slug: "/", isHome: true, sections: [] },
  { id: "p2", slug: "/products", isHome: false, sections: [] },
  { id: "p3", slug: "/gallery", isHome: false, sections: [] },
];

describe("normalizePageSlug", () => {
  it("strips leading slashes and lowercases", () => {
    expect(normalizePageSlug("/products")).toBe("products");
    expect(normalizePageSlug("/Gallery")).toBe("gallery");
    expect(normalizePageSlug("products")).toBe("products");
    expect(normalizePageSlug("/")).toBe("");
  });
});

describe("resolvePageBySlug", () => {
  it("home (null slug) resolves the isHome page", () => {
    expect(resolvePageBySlug(pages, null)?.id).toBe("p1");
  });

  it("home falls back to the first page when no page is marked home", () => {
    const noHome = [{ id: "a", slug: "/x", sections: [] }, { id: "b", slug: "/y", sections: [] }];
    expect(resolvePageBySlug(noHome, null)?.id).toBe("a");
  });

  it("slug route resolves a page by normalized slug", () => {
    expect(resolvePageBySlug(pages, "products")?.id).toBe("p2");
    expect(resolvePageBySlug(pages, "/gallery")?.id).toBe("p3");
  });

  it("returns null for an unknown slug", () => {
    expect(resolvePageBySlug(pages, "nope")).toBeNull();
    expect(resolvePageBySlug([], "products")).toBeNull();
  });
});

describe("withViewAllHref (Phase 3 view-all CTA)", () => {
  const docPages = [
    { slug: "/", isHome: true },
    { slug: "/products", isHome: false },
    { slug: "/gallery", isHome: false },
  ];
  const sections = [
    { moduleId: "products.grid", config: { columns: 3 } },
    { moduleId: "gallery.grid", config: { columns: 2 } },
    { moduleId: "hero.default", config: {} },
    { moduleId: "games.default", config: {} },
  ];

  it("attaches viewAllHref when the base matches an independent page", () => {
    const hrefFor = (slug: string) => `/${slug.replace(/^\//, "")}`;
    const out = withViewAllHref(sections, docPages, hrefFor);
    expect(out[0].config.viewAllHref).toBe("/products");
    expect(out[1].config.viewAllHref).toBe("/gallery");
  });

  it("leaves sections without a matching page untouched", () => {
    const hrefFor = (slug: string) => `/${slug.replace(/^\//, "")}`;
    const out = withViewAllHref(sections, docPages, hrefFor);
    expect(out[2].config.viewAllHref).toBeUndefined();
    expect(out[3].config.viewAllHref).toBeUndefined();
  });

  it("never links a section to the homepage", () => {
    const hrefFor = (slug: string) => `/${slug.replace(/^\//, "")}`;
    const onlyHome = [{ slug: "/", isHome: true }];
    const out = withViewAllHref(sections, onlyHome, hrefFor);
    for (const s of out) expect(s.config.viewAllHref).toBeUndefined();
  });

  it("RCCF-VALIDATION-09B: never self-links on the full collection page", () => {
    const hrefFor = (slug: string) => `/${slug.replace(/^\//, "")}`;
    // On the /products page itself the products section must NOT get a
    // view-all CTA back to /products; other sections still may.
    const out = withViewAllHref(sections, docPages, hrefFor, "/products");
    expect(out[0].config.viewAllHref).toBeUndefined();
    expect(out[1].config.viewAllHref).toBe("/gallery");
  });
});

describe("resolveNavHrefs (Phase 4 page-type navigation)", () => {
  const hrefFor = (slug: string) => `/owais/${slug.replace(/^\//, "")}`;
  const nav = [
    { id: "home", label: "Home", href: "#hero", type: "anchor", order: 0, visible: true },
    { id: "products", label: "Products", href: "products", type: "page", order: 1, visible: true },
    { id: "external", label: "Twitter", href: "https://x.com", type: "external", order: 2, visible: true, target: "_blank" },
  ];

  it("resolves page items to storefront routes, leaves anchor/external untouched", () => {
    const out = resolveNavHrefs(nav, hrefFor);
    expect(out[0].href).toBe("#hero");
    expect(out[1].href).toBe("/owais/products");
    expect(out[2].href).toBe("https://x.com");
  });

  it("preserves all other fields", () => {
    const out = resolveNavHrefs(nav, hrefFor);
    expect(out[1].label).toBe("Products");
    expect(out[1].visible).toBe(true);
    expect(out[1].order).toBe(1);
  });

  it("handles an empty nav", () => {
    expect(resolveNavHrefs([], hrefFor)).toEqual([]);
  });
});

describe("resolveStorefrontNavigation — RCCF-AUDIT-10B navigation order parity", () => {
  const hrefFor = (slug: string) => `/domain/${slug.replace(/^\//, "")}`;

  // A full nav in the persisted Admin/Builder order (the shape generateDefaults
  // produces when every collection has content).
  const fullNav = [
    { id: "hero", label: "Home", href: "#hero", type: "anchor", order: 0, visible: true },
    { id: "products", label: "Products", href: "products", type: "page", order: 1, visible: true },
    { id: "gallery", label: "Gallery", href: "#gallery", type: "anchor", order: 2, visible: true },
    { id: "contact", label: "Contact", href: "#contact", type: "anchor", order: 3, visible: true },
  ];

  // test-creator-1's real weighted profile — with applyGoalNavigation this
  // WOULD re-order the nav (products 2→6, links 8→2 on the full set).
  const goalProfile = {
    weights: [
      { goalId: "MONETIZE_CONTENT", weight: 39 },
      { goalId: "GROW_YOUTUBE", weight: 22 },
      { goalId: "SHOW_PORTFOLIO", weight: 22 },
      { goalId: "BUILD_EMAIL_LIST", weight: 17 },
    ],
  };

  it("preserves the persisted order exactly even with a goal profile present", () => {
    const out = resolveStorefrontNavigation(fullNav, hrefFor, goalProfile);
    expect(out.map((n) => n.id)).toEqual(["hero", "products", "gallery", "contact"]);
    expect(out.map((n) => n.href)).toEqual(["#hero", "/domain/products", "#gallery", "#contact"]);
  });

  it("preserves the persisted order without a goal profile", () => {
    const out = resolveStorefrontNavigation(fullNav, hrefFor, null);
    expect(out.map((n) => n.id)).toEqual(["hero", "products", "gallery", "contact"]);
  });

  it("resolves page-type hrefs to real routes without reordering", () => {
    const nav = [
      { id: "hero", label: "Home", href: "#hero", type: "anchor", order: 0, visible: true },
      { id: "products", label: "Products", href: "products", type: "page", order: 1, visible: true },
      { id: "gallery", label: "Gallery", href: "gallery", type: "page", order: 2, visible: true },
      { id: "games", label: "Games", href: "games", type: "page", order: 3, visible: true },
      { id: "custom", label: "Custom", href: "custom-page", type: "page", order: 4, visible: true },
    ];
    const out = resolveStorefrontNavigation(nav, hrefFor, goalProfile);
    expect(out.map((n) => n.href)).toEqual([
      "#hero",
      "/domain/products",
      "/domain/gallery",
      "/domain/games",
      "/domain/custom-page",
    ]);
    expect(out.map((n) => n.id)).toEqual(["hero", "products", "gallery", "games", "custom"]);
  });

  it("leaves anchor and external items untouched", () => {
    const nav = [
      { id: "hero", label: "Home", href: "#hero", type: "anchor", order: 0, visible: true },
      { id: "twitter", label: "Twitter", href: "https://x.com", type: "external", order: 1, visible: true, target: "_blank" },
      { id: "faq", label: "FAQ", href: "#faq", type: "anchor", order: 2, visible: true },
    ];
    const out = resolveStorefrontNavigation(nav, hrefFor, goalProfile);
    expect(out.map((n) => n.href)).toEqual(["#hero", "https://x.com", "#faq"]);
    expect(out[1].target).toBe("_blank");
  });

  it("works identically for independent-page roots (/, /products, /gallery, /custom-page)", () => {
    for (const root of ["/", "/products", "/gallery", "/custom-page"]) {
      const href = (slug: string) => `${root}${slug === "" ? "" : "/" + slug.replace(/^\//, "")}`;
      const out = resolveStorefrontNavigation(fullNav, href, goalProfile);
      expect(out.map((n) => n.id)).toEqual(["hero", "products", "gallery", "contact"]);
      expect(out[1].href).toBe(`${root}/products`);
    }
  });
});

describe("buildPageSeoDefaults (Phase 5 per-page SEO)", () => {
  it("substitutes {creatorName} into the registry seoTitle/seoDescription", () => {
    const seo = buildPageSeoDefaults(
      { seoTitle: "Products — {creatorName}", seoDescription: "Products by {creatorName}" },
      "Products",
      "CreatorStore",
      "Priya",
    );
    expect(seo.title).toBe("Products — Priya");
    expect(seo.description).toBe("Products by Priya");
  });

  it("falls back to pageName — siteTitle when no registry defaults exist", () => {
    const seo = buildPageSeoDefaults(null, "Custom", "CreatorStore", "Priya");
    expect(seo.title).toBe("Custom — CreatorStore");
    expect(seo.description).toBe("");
  });

  it("keeps a registry title that has no placeholder verbatim", () => {
    const seo = buildPageSeoDefaults({ seoTitle: "Gallery" }, "Gallery", "CreatorStore", "Priya");
    expect(seo.title).toBe("Gallery");
  });
});

describe("getRegisteredPageBySlug (Phase 5)", () => {
  it("resolves a dynamic page by normalized slug", () => {
    expect(getRegisteredPageBySlug("products")?.id).toBe("products");
    expect(getRegisteredPageBySlug("/gallery")?.id).toBe("gallery");
  });

  it("returns undefined for unknown slugs", () => {
    expect(getRegisteredPageBySlug("nope")).toBeUndefined();
  });
});
