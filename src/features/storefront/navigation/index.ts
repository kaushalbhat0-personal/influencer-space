import type { StorefrontData } from "../types";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  isActive: boolean;
}

export function buildNavigation(data: StorefrontData, currentSlug: string): NavItem[] {
  return data.pages.map((page) => ({
    id: page.id,
    label: page.slug === "home" ? "Home" : page.slug.charAt(0).toUpperCase() + page.slug.slice(1),
    href: page.slug === "home" ? "/" : `/${page.slug}`,
    isActive: currentSlug === page.slug || (currentSlug === "" && page.isHome),
  }));
}

export function buildMobileNavigation(data: StorefrontData, currentSlug: string): NavItem[] {
  return buildNavigation(data, currentSlug);
}

export function getPageTitle(data: StorefrontData, slug: string): string {
  const page = data.pages.find((p) => p.slug === slug || (slug === "" && p.isHome));
  return page?.seo?.title ?? "CreatorStore";
}

export function getSitemapEntries(data: StorefrontData): Array<{ url: string; priority: number }> {
  return data.pages.map((page) => ({
    url: page.slug === "home" ? "/" : `/${page.slug}`,
    priority: page.isHome ? 1.0 : 0.8,
  }));
}
