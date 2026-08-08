// ── Section Presentation — Runtime ──────────────────────────
// RCCF-LAUNCH-TRACK-04B. Centralized presentation resolution + the canonical
// section-has-content + should-render helpers. Every renderer/LayoutEngine/
// storefront page uses these — no duplicated title/visibility logic.

import type { SectionPresentation } from "../domain/types";
import { ALWAYS_VISIBLE_SECTIONS } from "../domain/types";
import { presetFor } from "./presets";
import { sectionPresentationResolver, type ResolvedPresentation } from "./resolver";
import { baseOf } from "./base";

export { baseOf } from "./base";

export { sectionPresentationResolver, SectionPresentationResolver } from "./resolver";
export type { ResolvedPresentation, VisibilityMode } from "./resolver";

/**
 * Resolve a section's presentation from its override + the canonical defaults.
 * Delegates to the canonical SectionPresentationResolver (Phase 1).
 */
export function resolveSectionPresentation(
  presentation: SectionPresentation | undefined,
  defaultTitle: string | null,
  moduleId: string,
): ResolvedPresentation {
  return sectionPresentationResolver.resolve(presentation, defaultTitle, moduleId);
}

/** Apply a category preset to a set of generated section slots (base id → presentation). */
export function applySectionPresets(category: string, slots: Array<{ baseId: string; config: Record<string, unknown> }>): void {
  for (const slot of slots) {
    const preset = presetFor(category, slot.baseId);
    if (!preset) continue;
    const existing = (slot.config.presentation as SectionPresentation | undefined) ?? {};
    slot.config.presentation = { ...existing, ...preset };
  }
}

/**
 * Canonical content check — does a section have meaningful content? Every
 * renderer uses this before deciding to render (hideWhenEmpty).
 * `content` is the aggregate content object (products, gallery, timeline, …).
 */
export function sectionHasContent(baseId: string, content: Record<string, unknown>): boolean {
  const arr = (key: string): unknown[] => (Array.isArray(content[key]) ? (content[key] as unknown[]) : []);
  switch (baseId) {
    case "products":
      return arr("products").length > 0;
    case "gallery":
      return arr("gallery").length > 0;
    case "timeline":
      return arr("timeline").length > 0;
    case "testimonials":
      return arr("testimonials").length > 0;
    case "faq":
      return arr("faq").length > 0;
    case "courses":
    case "content_feed":
      return arr("courses").concat(arr("contentFeed")).length > 0;
    case "services":
    case "offerings":
      return arr("services").concat(arr("offerings")).length > 0;
    case "games":
      return arr("games").length > 0;
    case "links":
      return arr("links").length > 0;
    case "pricing":
      return arr("plans").concat(arr("pricingPlans")).length > 0;
    case "newsletter":
    case "contact":
      return true; // interactive forms always render
    default:
      return true;
  }
}

/**
 * RCCF-LAUNCH-TRACK-04B (Phase 5/10). Canonical "should this section render"
 * decision, resolved from a section's engine-composed config.
 *   - visibilityMode "hidden"  → false (explicitly turned off → removed from DOM)
 *   - visibilityMode "auto"    → false when hasContent === false (empty hidden)
 *   - otherwise                → true
 * The LayoutEngine computes `config.visibilityMode` + `config.hasContent` once;
 * renderers and the storefront page both call this — one decision, no duplication.
 */
export function shouldRenderSection(config: Record<string, unknown>): boolean {
  const mode = String(config.visibilityMode ?? "always");
  if (mode === "hidden") return false;
  if (mode === "auto" && config.hasContent === false) return false;
  return true;
}

/** Phase 6: is a canonical base id a permanent section (always renders)? */
export function isPermanentSection(moduleId: string): boolean {
  return ALWAYS_VISIBLE_SECTIONS.includes(baseOf(moduleId));
}
