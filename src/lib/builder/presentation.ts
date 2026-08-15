/**
 * PresentationBlueprint — IMPLEMENTATION-14 (Phase E).
 *
 * The Builder persists ONLY presentation: section order, visibility, layout
 * variant, theme, spacing, container, columns, alignment, animations,
 * responsive rules, background, border, radius, shadow. It NEVER persists
 * business content.
 *
 * Content (hero copy, products, gallery, faq, testimonials, timeline, games,
 * links, courses, services, profile, SEO) always comes from the live CMS via
 * websiteAggregateService.build(). This module is the single filter that keeps
 * content out of the builder's block config.
 */

/** Presentation-only default props per registered component. */
export const PRESENTATION_DEFAULTS: Record<string, Record<string, unknown>> = {
  "hero.default": { alignment: "center", overlay: true, animation: "fade" },
  "hero.gaming": { showLiveBadge: true, animation: "fade" },
  "hero.fitness": { animation: "fade" },
  "hero.education": { animation: "fade" },
  "gallery.grid": { columns: 3, layout: "grid", lightbox: true, animation: "stagger" },
  "products.grid": { columns: 3, animation: "stagger" },
  "timeline.default": { animation: "slide" },
  "links.default": { layout: "horizontal" },
  "footer.default": { minimal: false },
  "testimonials.default": { animation: "fade", maxItems: 6 },
  "faq.default": { expandFirst: true },
  "contact.default": { showPhone: true },
  "newsletter.default": { showName: true },
  "courses.default": { animation: "stagger" },
  "services.default": {},
  "games.default": {},
  "contentFeed.default": { density: "grid" },
  "embed.spotify": { height: "352" },
  "embed.youtube": { autoplay: false },
  "social.discord": {},
  "social.instagram": { limit: 6, animation: "stagger" },
};

/** Global presentation keys valid for any component. */
const GLOBAL_PRESENTATION_KEYS = new Set([
  "animation", "alignment", "overlay", "columns", "layout", "spacing", "padding",
  "container", "gap", "background", "border", "radius", "shadow", "variant",
  "responsive", "width", "height", "showLiveBadge", "autoplay", "limit",
  "maxItems", "showPricing", "showPrice", "showRatings", "showViewAll",
  "density", "lightbox", "imagePosition", "fullscreen", "expandFirst",
  "autoRotate", "interval", "showCta", "showPhone", "showName", "showAddress",
  "showCalendar", "showHours", "showDescriptions", "showStats",
  "showSocialLinks", "showNewsletter", "showBackToTop", "minimal", "sorting",
  "showFilters", "showCaptions", "icon", "compact",
]);

/** Whether a config key is a presentation key for the given component. */
export function isPresentationKey(componentId: string, key: string): boolean {
  if (GLOBAL_PRESENTATION_KEYS.has(key)) return true;
  return Object.prototype.hasOwnProperty.call(PRESENTATION_DEFAULTS[componentId] ?? {}, key);
}

/** Presentation-only default props for a component (never content). */
export function presentationDefaults(componentId: string): Record<string, unknown> {
  return { ...(PRESENTATION_DEFAULTS[componentId] ?? {}) };
}

/**
 * Filter an arbitrary config down to presentation keys only. Used when a
 * component is inserted and whenever a config is about to be persisted, so
 * content can never leak into the PresentationBlueprint.
 */
export function presentationPropsFor(
  componentId: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (isPresentationKey(componentId, key)) result[key] = value;
  }
  return result;
}
