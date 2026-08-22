/**
 * RCCF-71.3 — shared Hero presentation option sets (text alignment, content
 * width, overlay strength) + the pure merge helper.
 *
 * Single authority for the HERO PRESENTATION presets a creator may pick. The
 * Builder appearance panel persists the chosen keys through `updateTheme` into
 * Website.themeConfig (premium_themes gated); `buildRuntimeSnapshot` and the
 * Builder canvas merge them onto snapshot.content.hero via
 * `applyHeroPresentation` (identical rule, both sides). HeroRenderer consumes
 * them through `heroTextAlignClass` / `heroContentWidthClass` /
 * `heroOverlayClass`, each with the EXACT current look as the fallback — so old
 * snapshots (fields absent) and unknown values render today's Hero appearance.
 *
 * This module is PURE (no server/client deps, type-only) so both the server
 * pipeline (build-snapshot, settings page) and the Builder panel can import it
 * without pulling any runtime into the client bundle. Hero CONTENT remains
 * hero_data / Settings owned — nothing here touches content fields.
 */

export type HeroTextAlign = "left" | "center" | "right";
export type HeroContentWidth = "narrow" | "medium" | "wide";
export type HeroOverlay = "none" | "soft" | "medium" | "strong";

export const HERO_TEXT_ALIGN_OPTIONS: { value: HeroTextAlign; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center (Default)" },
  { value: "right", label: "Right" },
];

export const HERO_CONTENT_WIDTH_OPTIONS: { value: HeroContentWidth; label: string }[] = [
  { value: "narrow", label: "Narrow" },
  { value: "medium", label: "Medium (Default)" },
  { value: "wide", label: "Wide" },
];

export const HERO_OVERLAY_OPTIONS: { value: HeroOverlay; label: string }[] = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium (Default)" },
  { value: "strong", label: "Strong" },
];

export const HERO_TEXT_ALIGN_VALUES = new Set<string>(HERO_TEXT_ALIGN_OPTIONS.map((o) => o.value));
export const HERO_CONTENT_WIDTH_VALUES = new Set<string>(HERO_CONTENT_WIDTH_OPTIONS.map((o) => o.value));
export const HERO_OVERLAY_VALUES = new Set<string>(HERO_OVERLAY_OPTIONS.map((o) => o.value));

// Controlled preset classes (literal strings so Tailwind's JIT emits them).
// The default in each map is EXACTLY today's rendered output.
const TEXT_ALIGN_CLASSES: Record<string, string> = {
  left: "text-left mr-auto",
  center: "text-center mx-auto",
  right: "text-right ml-auto",
};

const CONTENT_WIDTH_CLASSES: Record<string, string> = {
  narrow: "max-w-xl",
  medium: "max-w-2xl",
  wide: "max-w-3xl",
};

const OVERLAY_CLASSES: Record<string, string> = {
  soft: "bg-gradient-to-b from-black/25 via-transparent to-zinc-950/60",
  medium: "bg-gradient-to-b from-black/50 via-transparent to-zinc-950",
  strong: "bg-gradient-to-b from-black/80 via-black/40 to-zinc-950",
};

/** RCCF-71.3: hero content-block text alignment + horizontal anchor. Default =
 * the exact current centered look ("text-center mx-auto"). */
export function heroTextAlignClass(textAlign?: string): string {
  return TEXT_ALIGN_CLASSES[textAlign || "center"] ?? TEXT_ALIGN_CLASSES.center;
}

/** RCCF-71.3: hero content-block width. Default = the exact current
 * "max-w-2xl". */
export function heroContentWidthClass(contentWidth?: string): string {
  return CONTENT_WIDTH_CLASSES[contentWidth || "medium"] ?? CONTENT_WIDTH_CLASSES.medium;
}

/** RCCF-71.3: hero media overlay strength. Default = the exact current
 * gradient. "none" renders no overlay (null). No arbitrary color/opacity. */
export function heroOverlayClass(overlay?: string): string | null {
  if (overlay === "none") return null;
  return OVERLAY_CLASSES[overlay || "medium"] ?? OVERLAY_CLASSES.medium;
}

/**
 * Pure merge of the persisted Website.themeConfig hero-presentation keys onto a
 * hero content object. Valid keys are applied; undefined/unknown values are
 * ignored (never stored, never rendered) — the hero is returned unchanged.
 * Used identically by the server snapshot builder and the Builder canvas so
 * publish == preview route == canvas == settings preview.
 */
export function applyHeroPresentation(
  hero: Record<string, unknown>,
  cfg: Record<string, string>,
): Record<string, unknown> {
  const out = { ...hero };
  if (HERO_TEXT_ALIGN_VALUES.has(cfg.heroTextAlign)) out.textAlign = cfg.heroTextAlign;
  if (HERO_CONTENT_WIDTH_VALUES.has(cfg.heroContentWidth)) out.contentWidth = cfg.heroContentWidth;
  if (HERO_OVERLAY_VALUES.has(cfg.heroOverlay)) out.overlay = cfg.heroOverlay;
  return out;
}