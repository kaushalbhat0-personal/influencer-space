// ── Section Presentation — Category Presets ─────────────────
// RCCF-LAUNCH-TRACK-04B (Phase 7). Seeding titleOverride by creator category
// during generation gives a polished, industry-appropriate storefront
// immediately. Canonical ids are unchanged — only presentation metadata.
//
// DRY: category identity is NOT a new registry. It is the knowledge-runtime
// category packs (`resolvePack`). This module only adds title overrides keyed
// by those pack ids. Only `titleOverride` is ever seeded.
//
// Map key = knowledge category pack id (resolvePack(category).id);
// value = canonical base id → { titleOverride }.

import type { SectionPresentation } from "../domain/types";
import { resolvePack } from "@/modules/knowledge-runtime/domain/category-packs";

/**
 * Category pack id → canonical base id → seeded presentation.
 * Keys MUST be knowledge-runtime pack ids (fitness, restaurant, photography,
 * designer, educator, creator) so generation stays driven by one registry.
 */
export const SECTION_PRESETS: Record<string, Record<string, SectionPresentation>> = {
  photography: {
    gallery: { titleOverride: "Portfolio" },
    timeline: { titleOverride: "My Journey" },
    testimonials: { titleOverride: "Client Reviews" },
  },
  educator: {
    products: { titleOverride: "Courses" },
    courses: { titleOverride: "My Courses" },
    testimonials: { titleOverride: "Student Success Stories" },
    faq: { titleOverride: "Common Questions" },
  },
  restaurant: {
    products: { titleOverride: "Menu" },
    gallery: { titleOverride: "Our Food" },
    testimonials: { titleOverride: "What Customers Say" },
  },
  fitness: {
    products: { titleOverride: "Programs" },
    services: { titleOverride: "Programs" },
    testimonials: { titleOverride: "Client Transformations" },
    timeline: { titleOverride: "My Journey" },
  },
  designer: {
    gallery: { titleOverride: "Case Studies" },
    products: { titleOverride: "Shop" },
    services: { titleOverride: "Design Services" },
    testimonials: { titleOverride: "Client Reviews" },
  },
  creator: {
    products: { titleOverride: "Resources" },
    gallery: { titleOverride: "Highlights" },
    timeline: { titleOverride: "My Journey" },
    testimonials: { titleOverride: "Community Reviews" },
  },
};

/**
 * Legacy category names → knowledge pack id. Keeps earlier onboarding/niche
 * labels (photographer, designer, gamer, …) resolving to the right presets
 * without a second registry.
 */
const LEGACY_CATEGORY_TO_PACK: Record<string, string> = {
  photographer: "photography",
  designer: "designer",
  art: "designer",
  gamer: "creator",
  musician: "creator",
  artist: "creator",
  business: "creator",
};

/** Normalize any category/niche value to a knowledge pack id. */
export function packIdFor(category: string): string {
  const normalized = category?.trim().toLowerCase() || "";
  if (SECTION_PRESETS[normalized]) return normalized;
  if (LEGACY_CATEGORY_TO_PACK[normalized]) return LEGACY_CATEGORY_TO_PACK[normalized];
  const resolved = resolvePack(category).id;
  if (SECTION_PRESETS[resolved]) return resolved;
  return "creator";
}

/** Resolve the preset for a category value + canonical base id. */
export function presetFor(category: string, baseId: string): SectionPresentation | undefined {
  return SECTION_PRESETS[packIdFor(category)]?.[baseId];
}

/**
 * The seeded title overrides for a category (pack id keyed). Used by
 * generation/tests; editing is always left to the creator (Phase 8 reset).
 */
export function presetsFor(category: string): Record<string, SectionPresentation> {
  return SECTION_PRESETS[packIdFor(category)] ?? {};
}
