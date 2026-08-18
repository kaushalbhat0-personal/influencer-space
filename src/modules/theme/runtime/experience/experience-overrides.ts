/**
 * RCCF-71.2 — creator-controlled Experience overrides.
 *
 * A creator may pin the page background and surface treatment from a set of
 * presets that the EXISTING Theme Experience runtime already renders. The
 * override is applied to the theme's resolved base experience BEFORE
 * capability resolution, so the canonical Capability Runtime still governs
 * what each plan actually renders (a free plan degrades every premium preset
 * to the safe minimal look — never a broken render).
 *
 * This module is deliberately dependency-free (type-only imports) so both the
 * server pipeline (publish, preview loader, actions) and the Builder client
 * panel can import it without pulling the capability runtime into the client
 * bundle.
 */
import type { ExperienceBackground, ExperienceSurface, ThemeExperience } from "./theme-experience";
import { parseImageOpacity } from "./image-config";

export interface BackgroundPreset {
  id: string;
  label: string;
  description: string;
  /** A background the Theme Experience runtime already renders (no new CSS). */
  background: ExperienceBackground;
}

export interface SurfacePreset {
  id: string;
  label: string;
  surface: ExperienceSurface;
  /** Informational only — the capability runtime remains the authority. */
  premium: boolean;
}

/** Presets map to the existing `ExperienceBackground` shapes background-runtime renders. */
export const BACKGROUND_PRESETS: Record<string, BackgroundPreset> = {
  solid: {
    id: "solid",
    label: "Solid",
    description: "Clean flat background",
    background: { kind: "solid" },
  },
  none: {
    id: "none",
    label: "None",
    description: "No background layer",
    background: { kind: "none" },
  },
  midnight: {
    id: "midnight",
    label: "Midnight",
    description: "Solid with a centered glow",
    background: { kind: "solid", glow: "center" },
  },
  gradient: {
    id: "gradient",
    label: "Gradient",
    description: "Soft top gradient tint",
    background: { kind: "gradient", colors: ["rgba(129,140,248,0.18)", "rgba(59,130,246,0.04)", "transparent"], glow: "top" },
  },
  radial: {
    id: "radial",
    label: "Radial",
    description: "Radial tint from the top",
    background: { kind: "radial", glow: "top" },
  },
  mesh: {
    id: "mesh",
    label: "Mesh",
    description: "Dual-tone radial mesh",
    background: { kind: "mesh", colors: ["rgba(129,140,248,0.22)", "rgba(59,130,246,0.14)"], glow: "top" },
  },
  aurora: {
    id: "aurora",
    label: "Aurora",
    description: "Multi-color aurora wash",
    background: {
      kind: "aurora",
      colors: ["rgba(129,140,248,0.24)", "rgba(192,132,252,0.16)", "rgba(34,211,238,0.12)", "rgba(99,102,241,0.08)"],
      glow: "center",
    },
  },
  pattern: {
    id: "pattern",
    label: "Pattern",
    description: "Subtle line texture",
    background: { kind: "pattern", pattern: "lines", glow: "top" },
  },
  image: {
    id: "image",
    label: "Image",
    description: "Your uploaded background image",
    background: { kind: "image" },
  },
};

/** Surface presets map to the existing `ExperienceSurface` presets surfaceClass renders. */
export const SURFACE_PRESETS: Record<string, SurfacePreset> = {
  flat: { id: "flat", label: "Flat", surface: "flat", premium: false },
  minimal: { id: "minimal", label: "Minimal", surface: "minimal", premium: false },
  elevated: { id: "elevated", label: "Elevated", surface: "elevated", premium: false },
  glass: { id: "glass", label: "Glass", surface: "glass", premium: true },
  "soft-glow": { id: "soft-glow", label: "Soft Glow", surface: "soft-glow", premium: true },
  "gradient-border": { id: "gradient-border", label: "Gradient Border", surface: "gradient-border", premium: true },
  floating: { id: "floating", label: "Floating", surface: "floating", premium: true },
  luxury: { id: "luxury", label: "Luxury", surface: "luxury", premium: true },
  neon: { id: "neon", label: "Neon", surface: "neon", premium: true },
};

/**
 * Apply a creator's background/surface override onto the theme's base
 * experience. Returns the same object when no (valid) override keys are set.
 * Per-section `background` overrides are dropped when a page background is
 * chosen so the chosen preset wins everywhere (decoration/motion/divider/surface
 * section character is preserved). Capability resolution still runs afterwards.
 */
export function applyExperienceOverride(
  base: ThemeExperience,
  config?: Record<string, string> | null,
): ThemeExperience {
  if (!config) return base;
  const backgroundPreset = config.experienceBackground ? BACKGROUND_PRESETS[config.experienceBackground] : undefined;
  const surface = config.experienceSurface ? SURFACE_PRESETS[config.experienceSurface] : undefined;
  if (!backgroundPreset && !surface) return base;

  const out: ThemeExperience = { ...base };
  if (backgroundPreset) {
    // RCCF-71.6.4: the image preset carries no static source — the creator's
    // persisted image URL + opacity are injected here so the exact same
    // resolved experience flows to the Builder canvas, preview and publish.
    out.background =
      backgroundPreset.id === "image"
        ? {
            kind: "image",
            url: config.experienceBackgroundImage || undefined,
            opacity: parseImageOpacity(config.experienceBackgroundImageOpacity),
          }
        : backgroundPreset.background;
    if (out.sections) {
      // Drop per-section background overrides so the chosen page preset wins
      // everywhere; surface/decoration/motion/divider character is preserved.
      const sections: ThemeExperience["sections"] = {};
      for (const [variant, ov] of Object.entries(out.sections)) {
        if (!ov) continue;
        sections[variant as keyof typeof sections] = { ...ov, background: undefined };
      }
      out.sections = sections;
    }
  }
  if (surface) out.surface = surface.surface;
  return out;
}

export { parseImageOpacity } from "./image-config";
