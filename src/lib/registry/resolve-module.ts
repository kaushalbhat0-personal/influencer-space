const COMPAT_MAP: Record<string, string> = {
  hero: "hero.default",
  gallery: "gallery.grid",
  products: "products.grid",
  timeline: "timeline.default",
  links: "links.default",
  footer: "footer.default",
  testimonials: "testimonials.default",
  faq: "faq.default",
  contact: "contact.default",
  newsletter: "newsletter.default",
  courses: "courses.default",
  games: "games.default",
  contentfeed: "contentFeed.default",
  services: "services.default",

  featured_products: "products.grid",
  product_grid: "products.grid",
  social_links: "links.default",
  contact_form: "contact.default",
  content_feed: "contentFeed.default",
};

export function resolveModuleId(type: string): string {
  if (type.includes(".")) return type;
  return COMPAT_MAP[type.toLowerCase()] ?? type;
}

export function moduleIdToDisplayName(moduleId: string): string {
  const name = moduleId.includes(".") ? moduleId.split(".")[0] : moduleId;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * IMPLEMENTATION-19: sections that have been fully removed from the product.
 * About duplicated Hero — it is no longer a registrable section. Old layouts
 * containing it migrate automatically by dropping it (never rendering).
 *
 * RCCF-67.3: Pricing was never wired to a data source (no aggregate/snapshot/
 * LayoutEngine path), so it is no longer a registrable section. Old layouts
 * containing pricing.* drop automatically, matching the About behaviour.
 */
const DEPRECATED_SECTION_PREFIXES = ["about.", "pricing."];

export function isDeprecatedSection(moduleId: string): boolean {
  return DEPRECATED_SECTION_PREFIXES.some((p) => moduleId.toLowerCase().startsWith(p));
}
