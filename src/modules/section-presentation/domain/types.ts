// ── Section Presentation — Domain Types ─────────────────────
// RCCF-LAUNCH-TRACK-04. Presentation is metadata only — it never renames
// canonical ids, never creates sections, and never affects business logic.

export interface SectionPresentation {
  /** Override the section's displayed title (defaults to the canonical title). */
  titleOverride?: string;
  /** Optional one-line description shown under the title. */
  descriptionOverride?: string;
  /** Hide the section heading entirely. */
  hideTitle?: boolean;
  /** Master visibility switch (default true). */
  visible?: boolean;
  /** Hide the section when it has no meaningful content. */
  hideWhenEmpty?: boolean;
}

export type PresentationCategory =
  | "photographer"
  | "educator"
  | "restaurant"
  | "fitness"
  | "gamer"
  | "musician"
  | "artist"
  | "business"
  | "default";

/** Canonical base ids (presentation keys on base ids; module ids stay canonical). */
export const OPTIONAL_SECTIONS = [
  "products", "gallery", "timeline", "testimonials", "faq", "courses", "services",
  "games", "contentFeed", "content_feed", "links", "newsletter", "pricing",
  "embed", "social", "bookings",
];

/** Sections that should always render — ignore hideWhenEmpty. */
export const ALWAYS_VISIBLE_SECTIONS = ["hero", "footer", "navigation", "contact", "about"];

/**
 * RCCF-LAUNCH-TRACK-04B (Phase 6). The canonical permanent-section list.
 * These always render on every storefront (hideWhenEmpty is ignored):
 * Hero, Navigation, Footer, About, Contact. Canonical base ids — never renamed.
 */
export const PERMANENT_SECTIONS = ALWAYS_VISIBLE_SECTIONS;
