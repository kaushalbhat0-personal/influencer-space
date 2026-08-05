/**
 * Website Foundation Runtime — RCCF-EPIC-02
 *
 * Navigation generation, footer generation, and legal page templates.
 * Everything derives from the canonical PAGE_REGISTRY.
 */
import { getNavPages, getFooterLegalLinks, getFoundationPages, getDynamicPages, getAvailableDynamicPages, PAGE_REGISTRY } from "./registry";
import type { RegisteredPage } from "./registry";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  order: number;
}

export interface FooterSection {
  title: string;
  links: Array<{ label: string; href: string }>;
}

export async function generateNavigation(tenantId: string): Promise<NavigationItem[]> {
  const availableContent = await getAvailableDynamicPages(tenantId);
  return getNavPages(availableContent).map((page) => ({
    id: page.id,
    label: page.title,
    href: page.slug,
    order: page.sortOrder,
  }));
}

export function generateFooter(tenantId: string, creatorName?: string, supportEmail?: string): FooterSection[] {
  const availablePages = new Set(["about", "contact"]);
  const footerPages = PAGE_REGISTRY.filter((p) => p.showInFooter && availablePages.has(p.id));
  const legalLinks = getFooterLegalLinks();

  return [
    {
      title: "Quick Links",
      links: footerPages.map((p) => ({ label: p.title, href: p.slug })),
    },
    {
      title: "Legal",
      links: legalLinks.map((p) => ({ label: p.title, href: p.slug })),
    },
  ];
}

export function getFoundationPageList(): RegisteredPage[] {
  return getFoundationPages();
}

export function getDynamicPageList(): RegisteredPage[] {
  return getDynamicPages();
}

export { getAvailableDynamicPages, getNavPages, getFooterLegalLinks, PAGE_REGISTRY };
