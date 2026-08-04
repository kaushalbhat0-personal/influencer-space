/**
 * Motion + Surface Runtime (IMPLEMENTATION-45) — config-driven presets as CSS
 * classes. Reduced-motion is respected globally (the app's
 * `prefers-reduced-motion` rule collapses all transitions/animations).
 */
import type { ExperienceMotion, ExperienceSurface } from "./theme-experience";

export function motionClass(motion: ExperienceMotion): string {
  switch (motion) {
    case "float":
      return "xp-float";
    case "glow-pulse":
      return "xp-glow-pulse";
    case "gradient-shift":
      return "xp-gradient-shift";
    case "particle-drift":
      return "xp-particle-drift";
    case "parallax":
      return "xp-parallax";
    default:
      return "";
  }
}

export function surfaceClass(surface: ExperienceSurface): string {
  switch (surface) {
    case "glass":
      return "xp-surface-glass";
    case "elevated":
      return "xp-surface-elevated";
    case "gradient-border":
      return "xp-surface-gradient-border";
    case "soft-glow":
      return "xp-surface-soft-glow";
    case "floating":
      return "xp-surface-floating";
    default:
      return "";
  }
}

/** Alternate section rhythm — a slightly darker/raised surface for odd sections. */
export function alternateSurfaceClass(index: number, enabled: boolean): string {
  if (!enabled) return "";
  return index % 2 === 1 ? "bg-white/[0.015]" : "";
}
