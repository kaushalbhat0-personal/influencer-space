// ── Section Count Resolver — RCCF-IMPLEMENTATION-74 ─────────
// Canonical item counts for the Builder sidebar. The ONLY source of truth is
// the Website Aggregate (already loaded by the Builder canvas via
// getLivePreviewData) — zero extra queries. This resolver never inspects
// Builder slots/blocks (slot count is a layout metric, not an item count).
//
// Counts map 1:1 to aggregate collections; sections without a canonical
// collection (Hero/About/Navigation/Footer/Contact, embeds, forms) resolve to
// `null` and render no badge.

import { baseOf } from "@/modules/section-presentation";
import type { WebsiteAggregate } from "@/types/snapshot";

export type SectionCount = number | null;

/** Canonical aggregate collection per canonical base id. */
const COLLECTION_BY_BASE: Record<string, keyof WebsiteAggregate> = {
  products: "products",
  gallery: "gallery",
  timeline: "timeline",
  milestones: "timeline", // /admin/milestones edits the timeline collection
  testimonials: "testimonials",
  faq: "faq",
  services: "services",
  courses: "courses",
  games: "games",
  contentFeed: "contentFeed",
  content_feed: "contentFeed",
  links: "links",
};

/** Sections that are always present and have no CMS item collection. */
export const STATIC_SECTION_BASES = new Set<string>([
  "hero", "about", "navigation", "nav", "footer", "contact",
]);

export class SectionCountResolver {
  /** Whether a section is static (never shows a count). */
  isStatic(moduleId: string): boolean {
    return STATIC_SECTION_BASES.has(baseOf(moduleId));
  }

  /** Whether a section has a canonical count (repeatable content collection). */
  hasCount(moduleId: string): boolean {
    return baseOf(moduleId) in COLLECTION_BY_BASE;
  }

  /** Resolve a section's item count from the aggregate (null when not countable). */
  countForModule(moduleId: string, aggregate: WebsiteAggregate | null | undefined): SectionCount {
    if (!aggregate) return null;
    return this.countForBase(baseOf(moduleId), aggregate);
  }

  /** Resolve a count from a canonical base id. */
  countForBase(baseId: string, aggregate: WebsiteAggregate | null | undefined): SectionCount {
    if (!aggregate) return null;
    const key = COLLECTION_BY_BASE[baseId];
    if (!key) return null;
    const collection = aggregate[key];
    return Array.isArray(collection) ? collection.length : null;
  }
}

export const sectionCountResolver = new SectionCountResolver();
