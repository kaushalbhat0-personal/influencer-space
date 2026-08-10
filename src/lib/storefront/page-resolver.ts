/**
 * Storefront Page Resolver — RCCF-IMPLEMENTATION-09B (Phase 2).
 *
 * Pure helpers for mapping a public URL slug to a storefront document page.
 * Leaf module (no DB / no Next imports) so it is unit-testable and safe to
 * reuse by routes, navigation and metadata generation.
 */

/** Normalize a page slug for URL matching ("/products" → "products"). */
export function normalizePageSlug(slug: string): string {
  return slug.replace(/^\/+/, "").toLowerCase();
}

/** Resolve a page by slug (or the homepage) from a storefront document's pages. */
export function resolvePageBySlug<T extends { slug: string; isHome?: boolean }>(
  pages: T[],
  pageSlug: string | null,
): T | null {
  if (pageSlug === null) {
    return pages.find((p) => p.isHome) ?? pages[0] ?? null;
  }
  const normalized = normalizePageSlug(pageSlug);
  return pages.find((p) => normalizePageSlug(p.slug) === normalized) ?? null;
}

export interface ViewAllSection {
  moduleId: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ViewAllPage {
  slug: string;
  isHome?: boolean;
}

/**
 * RCCF-IMPLEMENTATION-09B (Phase 3) — attach a "View all" href to sections
 * whose base matches an independent non-home page (e.g. a `products` section
 * on the homepage gets viewAllHref → "/products"). `hrefFor` resolves the
 * storefront root so the link is correct on subdomains and platform slugs.
 * Pure — the caller supplies the URL builder.
 *
 * RCCF-VALIDATION-09B: `currentPageSlug` is the page currently being rendered
 * (the homepage passes null/undefined). A section never gets a self-referential
 * "View all" CTA — on the full collection page itself the CTA would link back
 * to the very page the visitor is already on.
 */
export function withViewAllHref<T extends ViewAllSection>(
  sections: T[],
  pages: ViewAllPage[],
  hrefFor: (pageSlug: string) => string,
  currentPageSlug?: string | null,
): T[] {
  const current = currentPageSlug ? normalizePageSlug(currentPageSlug) : null;
  return sections.map((s) => {
    const base = baseOfModule(s.moduleId);
    if (base === "") return s;
    const fullPage = pages.find(
      (p) =>
        !p.isHome &&
        normalizePageSlug(p.slug) === base &&
        normalizePageSlug(p.slug) !== current,
    );
    if (!fullPage) return s;
    return {
      ...s,
      config: { ...s.config, viewAllHref: hrefFor(fullPage.slug) },
    };
  });
}

function baseOfModule(moduleId: string): string {
  const base = moduleId.split(".")[0];
  return base === "contentFeed" ? "content_feed" : base;
}

export interface ResolvableNavItem {
  id: string;
  label: string;
  href: string;
  type: "page" | "anchor" | "external";
  visible: boolean;
  target?: "_self" | "_blank";
}

/**
 * RCCF-IMPLEMENTATION-09B (Phase 4) — resolve page-type navigation items to
 * real storefront routes. `page` items carry a page slug (e.g. "products");
 * this resolves them to a root-relative href via `hrefFor` (which knows the
 * storefront root on subdomains vs platform slugs). Anchor/external items are
 * passed through untouched. Pure — the caller supplies the URL builder.
 */
export function resolveNavHrefs<T extends ResolvableNavItem>(
  nav: T[],
  hrefFor: (pageSlug: string) => string,
): T[] {
  return nav.map((item) => {
    if (item.type !== "page") return item;
    return { ...item, href: hrefFor(item.href) };
  });
}

/** SEO defaults for an independent storefront page. */
export interface PageSeoDefaults {
  /** Absolute-title string with {creatorName} already substituted. */
  seoTitle?: string;
  seoDescription?: string;
}

/**
 * RCCF-IMPLEMENTATION-09B (Phase 5) — per-page SEO metadata from the canonical
 * PAGE_REGISTRY defaults. `registered` is the matching RegisteredPage (with
 * seoTitle/seoDescription that may contain `{creatorName}`); `creatorName` is
 * substituted. Falls back to a sensible title when no registry entry exists.
 * Pure — used by generateMetadata on the [domain]/[slug] route.
 */
export function buildPageSeoDefaults(
  registered: { seoTitle?: string; seoDescription?: string } | null | undefined,
  pageName: string,
  siteTitle: string,
  creatorName: string,
): { title: string; description: string } {
  const title = registered?.seoTitle
    ? registered.seoTitle.replace(/\{creatorName\}/g, creatorName)
    : `${pageName} — ${siteTitle}`;
  const description = registered?.seoDescription
    ? registered.seoDescription.replace(/\{creatorName\}/g, creatorName)
    : "";
  return { title, description };
}
