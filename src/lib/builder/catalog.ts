import { componentRegistry } from "@/lib/registry/components";
import type { ComponentCategory } from "@/lib/registry/components/types";

export interface CatalogEntry {
  name: string;
  category: ComponentCategory;
  componentId: string;
}

/**
 * Canonical section catalog — single source for Builder Add Section and Dashboard Add Section.
 * Validated against ComponentRegistry at import so sidebar and canvas can never diverge.
 */
export const SECTION_CATALOG: CatalogEntry[] = [
  { name: "Hero", category: "hero", componentId: "hero.default" },
  { name: "Hero Split", category: "hero", componentId: "hero.split" },
  { name: "Products", category: "products", componentId: "products.grid" },
  { name: "Products Bento", category: "products", componentId: "products.bento" },
  { name: "Gallery", category: "gallery", componentId: "gallery.grid" },
  { name: "Gallery Bento", category: "gallery", componentId: "gallery.bento" },
  { name: "Timeline", category: "timeline", componentId: "timeline.default" },
  { name: "Timeline Masonry", category: "timeline", componentId: "timeline.masonry" },
  { name: "Testimonials", category: "testimonials", componentId: "testimonials.default" },
  { name: "Testimonials Marquee", category: "testimonials", componentId: "testimonials.marquee" },
  { name: "Testimonials Bento", category: "testimonials", componentId: "testimonials.bento" },
  { name: "FAQ", category: "faq", componentId: "faq.default" },
  { name: "Courses", category: "courses", componentId: "courses.default" },
  { name: "Services", category: "services", componentId: "services.default" },
  { name: "Services Bento", category: "services", componentId: "services.bento" },
  { name: "Games", category: "games", componentId: "games.default" },
  { name: "ContentFeed", category: "contentFeed", componentId: "contentFeed.default" },
  { name: "Newsletter", category: "newsletter", componentId: "newsletter.default" },
  { name: "Contact", category: "contact", componentId: "contact.default" },
  { name: "Footer", category: "footer", componentId: "footer.default" },
];

export const DEFAULT_SECTIONS = SECTION_CATALOG.filter((e) => componentRegistry.get(e.componentId) !== undefined);

export const FEATURED_COMPONENT_IDS = new Set<string>([
  "hero.default",
  "products.grid",
  "gallery.grid",
  "testimonials.default",
  "faq.default",
  "courses.default",
  "services.default",
  "newsletter.default",
  "contact.default",
  "footer.default",
]);

export const FEATURED_SECTIONS = DEFAULT_SECTIONS.filter((e) => FEATURED_COMPONENT_IDS.has(e.componentId));
export const REMAINING_SECTIONS = DEFAULT_SECTIONS.filter((e) => !FEATURED_COMPONENT_IDS.has(e.componentId));

export function getCatalogEntryForModuleId(moduleId: string): CatalogEntry | undefined {
  return SECTION_CATALOG.find((e) => e.componentId === moduleId);
}
