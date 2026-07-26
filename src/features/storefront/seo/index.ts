import type { SeoMetadata } from "../types";
import type { StorefrontData } from "../types";

export function buildSeoMetadata(
  data: StorefrontData,
  slug: string,
  canonicalUrl: string,
): SeoMetadata {
  const page = data.pages.find((p) => p.slug === slug || (slug === "" && p.isHome)) ?? data.pages[0];
  const title = page?.seo?.title || "CreatorStore";
  const description = page?.seo?.description || "Creator profile on CreatorStore";

  return {
    title,
    description,
    canonicalUrl,
    ogImage: page?.seo?.ogImage ?? null,
    ogType: "profile",
    twitterCard: "summary_large_image",
    noIndex: false,
  };
}

export function buildJsonLd(data: StorefrontData, canonicalUrl: string): Record<string, unknown>[] {
  const ld: Record<string, unknown>[] = [];
  const firstPage = data.pages[0];
  const profileName = firstPage?.seo?.title ?? "Creator";

  ld.push({
    "@context": "https://schema.org",
    "@type": "Person",
    name: profileName,
    url: canonicalUrl,
  });

  if (data.pages.length > 0) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: profileName,
      url: canonicalUrl,
    });
  }

  return ld;
}

export function buildOpenGraph(data: StorefrontData, slug: string, canonicalUrl: string) {
  const page = data.pages.find((p) => p.slug === slug || (slug === "" && p.isHome)) ?? data.pages[0];
  return {
    title: page?.seo?.title || "CreatorStore",
    description: page?.seo?.description || "",
    url: canonicalUrl,
    siteName: "CreatorStore",
    type: "profile" as const,
    ...(page?.seo?.ogImage ? { images: [{ url: page.seo.ogImage, width: 1200, height: 630 }] } : {}),
  };
}

export function buildTwitterCard(data: StorefrontData, slug: string) {
  const page = data.pages.find((p) => p.slug === slug || (slug === "" && p.isHome)) ?? data.pages[0];
  return {
    card: "summary_large_image" as const,
    title: page?.seo?.title || "CreatorStore",
    description: page?.seo?.description || "",
    ...(page?.seo?.ogImage ? { images: [page.seo.ogImage] } : {}),
  };
}

export function canIndex(data: StorefrontData, slug: string): boolean {
  const page = data.pages.find((p) => p.slug === slug || (slug === "" && p.isHome));
  if (!page) return false;
  return page.slug !== "draft";
}

export function getRobotsDirective(canIndexPage: boolean): string {
  return canIndexPage ? "index, follow" : "noindex, nofollow";
}

export function generateSitemapXml(entries: Array<{ url: string; priority: number; lastmod?: string }>): string {
  const urls = entries
    .map(
      (e) => `<url><loc>${e.url}</loc><priority>${e.priority}</priority>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
