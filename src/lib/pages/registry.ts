/**
 * Canonical Page Registry — RCCF-EPIC-02
 *
 * Defines every possible page in a CreatorStore website. Foundation pages
 * are always created. Dynamic pages appear only when the creator has relevant
 * content. Legal pages are auto-generated with configurable templates.
 */

export interface RegisteredPage {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  type: "foundation" | "dynamic" | "legal";
  /** Show in navigation */
  showInNav: boolean;
  /** Show in footer */
  showInFooter: boolean;
  /** Show in footer legal section */
  showInLegalFooter: boolean;
  /** Required capabilities from the commerce registry */
  requiredCapabilities?: string[];
  /** SEO defaults */
  seoTitle?: string;
  seoDescription?: string;
  /** Builder editable */
  builderEditable: boolean;
  /** Generation strategy for content population */
  generationStrategy: "ai" | "template" | "dynamic" | "manual";
  /** Order in navigation (lower = first) */
  sortOrder: number;
}

export const PAGE_REGISTRY: RegisteredPage[] = [
  // ── Foundation Pages (always present) ──
  {
    id: "home", slug: "/", title: "Home", description: "Your storefront homepage",
    icon: "home", type: "foundation", showInNav: true, showInFooter: false, showInLegalFooter: false,
    seoTitle: "Home", seoDescription: "Welcome to my storefront",
    builderEditable: true, generationStrategy: "ai", sortOrder: 1,
  },
  {
    id: "about", slug: "/about", title: "About", description: "About you and your brand",
    icon: "user", type: "foundation", showInNav: true, showInFooter: true, showInLegalFooter: false,
    seoTitle: "About — {creatorName}", seoDescription: "Learn more about {creatorName}",
    builderEditable: true, generationStrategy: "ai", sortOrder: 2,
  },
  {
    id: "contact", slug: "/contact", title: "Contact", description: "Get in touch",
    icon: "mail", type: "foundation", showInNav: true, showInFooter: true, showInLegalFooter: false,
    seoTitle: "Contact — {creatorName}", seoDescription: "Contact {creatorName}",
    builderEditable: true, generationStrategy: "template", sortOrder: 3,
  },

  // ── Legal Pages (auto-generated) ──
  {
    id: "privacy", slug: "/privacy", title: "Privacy Policy", description: "How we handle your data",
    icon: "shield", type: "legal", showInNav: false, showInFooter: false, showInLegalFooter: true,
    seoTitle: "Privacy Policy", seoDescription: "Privacy Policy for {creatorName}",
    builderEditable: true, generationStrategy: "template", sortOrder: 90,
  },
  {
    id: "terms", slug: "/terms", title: "Terms & Conditions", description: "Terms of service",
    icon: "file", type: "legal", showInNav: false, showInFooter: false, showInLegalFooter: true,
    seoTitle: "Terms & Conditions", seoDescription: "Terms & Conditions for {creatorName}",
    builderEditable: true, generationStrategy: "template", sortOrder: 91,
  },
  {
    id: "refund", slug: "/refund", title: "Refund Policy", description: "Cancellation & refund policy",
    icon: "refresh", type: "legal", showInNav: false, showInFooter: false, showInLegalFooter: true,
    seoTitle: "Refund Policy", seoDescription: "Refund & Cancellation Policy",
    builderEditable: true, generationStrategy: "template", sortOrder: 92,
  },

  // ── Dynamic Pages (render only when content exists) ──
  {
    id: "products", slug: "/products", title: "Products", description: "Browse products",
    icon: "shopping-bag", type: "dynamic", showInNav: true, showInFooter: false, showInLegalFooter: false,
    seoTitle: "Products — {creatorName}", seoDescription: "Products by {creatorName}",
    builderEditable: true, generationStrategy: "dynamic", sortOrder: 10,
  },
  {
    id: "services", slug: "/services", title: "Services", description: "Services offered",
    icon: "briefcase", type: "dynamic", showInNav: true, showInFooter: false, showInLegalFooter: false,
    seoTitle: "Services — {creatorName}", seoDescription: "Services by {creatorName}",
    builderEditable: true, generationStrategy: "dynamic", sortOrder: 11,
  },
  {
    id: "courses", slug: "/courses", title: "Courses", description: "Online courses",
    icon: "book", type: "dynamic", showInNav: true, showInFooter: false, showInLegalFooter: false,
    seoTitle: "Courses — {creatorName}", seoDescription: "Courses by {creatorName}",
    builderEditable: true, generationStrategy: "dynamic", sortOrder: 12,
  },
  {
    id: "bookings", slug: "/bookings", title: "Bookings", description: "Book appointments",
    icon: "calendar", type: "dynamic", showInNav: true, showInFooter: false, showInLegalFooter: false,
    seoTitle: "Bookings — {creatorName}", seoDescription: "Book a session with {creatorName}",
    builderEditable: true, generationStrategy: "dynamic", sortOrder: 13,
  },
  {
    id: "gallery", slug: "/gallery", title: "Gallery", description: "Photo gallery",
    icon: "image", type: "dynamic", showInNav: true, showInFooter: false, showInLegalFooter: false,
    seoTitle: "Gallery — {creatorName}", seoDescription: "Gallery by {creatorName}",
    builderEditable: true, generationStrategy: "dynamic", sortOrder: 14,
  },
  {
    id: "testimonials", slug: "/testimonials", title: "Testimonials", description: "What people say",
    icon: "star", type: "dynamic", showInNav: true, showInFooter: false, showInLegalFooter: false,
    seoTitle: "Testimonials — {creatorName}", seoDescription: "Testimonials for {creatorName}",
    builderEditable: false, generationStrategy: "dynamic", sortOrder: 15,
  },
  {
    id: "faq", slug: "/faq", title: "FAQ", description: "Frequently asked questions",
    icon: "help-circle", type: "dynamic", showInNav: true, showInFooter: true, showInLegalFooter: false,
    seoTitle: "FAQ — {creatorName}", seoDescription: "FAQ for {creatorName}",
    builderEditable: true, generationStrategy: "dynamic", sortOrder: 16,
  },
];

const pageById = new Map(PAGE_REGISTRY.map((p) => [p.id, p]));

export function getRegisteredPage(id: string): RegisteredPage | undefined {
  return pageById.get(id);
}

export function getFoundationPages(): RegisteredPage[] {
  return PAGE_REGISTRY.filter((p) => p.type === "foundation");
}

export function getLegalPages(): RegisteredPage[] {
  return PAGE_REGISTRY.filter((p) => p.type === "legal");
}

export function getDynamicPages(): RegisteredPage[] {
  return PAGE_REGISTRY.filter((p) => p.type === "dynamic");
}

export function getNavPages(availableContent: Set<string>): RegisteredPage[] {
  return PAGE_REGISTRY
    .filter((p) => p.showInNav && p.type !== "legal")
    .filter((p) => p.type !== "dynamic" || availableContent.has(p.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getFooterLegalLinks(): RegisteredPage[] {
  return PAGE_REGISTRY.filter((p) => p.showInLegalFooter).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Generate default pages for a new website. Returns pages to create. */
export function generateDefaultPages(creatorName: string): Array<{ slug: string; name: string; isHome: boolean; order: number; sections: Array<{ moduleId: string; config: Record<string, unknown> }> }> {
  const foundation = getFoundationPages();
  const legal = getLegalPages();
  const all = [...foundation, ...legal];

  return all.map((page) => ({
    slug: page.slug.replace("/", ""),
    name: page.title,
    isHome: page.id === "home",
    order: page.sortOrder,
    sections: [],
  }));
}

/** Check which dynamic pages have content for a tenant. */
export async function getAvailableDynamicPages(tenantId: string): Promise<Set<string>> {
  const { prisma } = await import("@/lib/prisma");
  const [productCount, offeringCount, bookingCount, galleryCount, faqSetting, testimonialSetting] = await Promise.all([
    prisma.product.count({ where: { tenantId } }).catch(() => 0),
    prisma.offering.count({ where: { tenantId } }).catch(() => 0),
    prisma.booking.count({ where: { tenantId } }).catch(() => 0),
    prisma.galleryImage.count({ where: { tenantId } }).catch(() => 0),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "faq" } } }).catch(() => null),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } } }).catch(() => null),
  ]);

  const available = new Set<string>();
  if (productCount > 0) available.add("products");
  if (offeringCount > 0) { available.add("services"); available.add("courses"); }
  if (bookingCount > 0) available.add("bookings");
  if (galleryCount > 0) available.add("gallery");
  if (testimonialSetting?.value) available.add("testimonials");
  if (faqSetting?.value) available.add("faq");
  return available;
}
