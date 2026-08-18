/**
 * Theme Experience Capabilities — RCCF-LAUNCH-POLISH-06 (Phase 3/4/5/10).
 *
 * The single canonical authority for what a plan may VISUALLY render.
 * Capability Runtime (capabilityService) is the only source of truth — no raw
 * plan-string comparisons here. The storefront, builder and publish pipeline
 * all resolve visual layers through these helpers.
 *
 * Plan bands:
 *   Creator Launch → theme_background_solid only (solid backgrounds, theme
 *                    colors, typography, layout, logo).
 *   Creator Grow    → + gradient/image backgrounds, animated backgrounds,
 *                    decorative effects (particles/glow/noise/blur).
 *   Creator Scale   → + video backgrounds + advanced/custom effects.
 */
import type {
  ThemeExperience,
  ExperienceBackgroundKind,
  ExperienceSurface,
  ExperienceDivider,
  SectionExperienceOverride,
} from "./theme-experience";
import { capabilityService } from "@/lib/capabilities";

export const THEME_CAPABILITY = {
  solid: "theme_background_solid",
  gradient: "theme_background_gradient",
  image: "theme_background_image",
  video: "theme_background_video",
  animation: "theme_background_animation",
  particles: "theme_effects_particles",
  glow: "theme_effects_glow",
  noise: "theme_effects_noise",
  blur: "theme_effects_blur",
  custom: "theme_effects_custom",
} as const;
export type ThemeCapability = (typeof THEME_CAPABILITY)[keyof typeof THEME_CAPABILITY];

/** Existing broad Builder capability for creator-controlled appearance. */
export const THEME_APPEARANCE_CAPABILITY = "advanced_builder";

/** Background kind → required capability (gradient-family kinds map to gradient). */
export const BACKGROUND_KIND_CAP: Record<ExperienceBackgroundKind, ThemeCapability> = {
  solid: THEME_CAPABILITY.solid,
  none: THEME_CAPABILITY.solid,
  gradient: THEME_CAPABILITY.gradient,
  radial: THEME_CAPABILITY.gradient,
  "multi-radial": THEME_CAPABILITY.gradient,
  mesh: THEME_CAPABILITY.gradient,
  aurora: THEME_CAPABILITY.gradient,
  pattern: THEME_CAPABILITY.noise, // SVG texture (noise/lines/grid)
  image: THEME_CAPABILITY.image, // RCCF-71.6.4: creator-uploaded background image
};

const SURFACE_FREE = new Set<ExperienceSurface>(["flat", "elevated", "minimal"]);
const DIVIDER_FREE = new Set<ExperienceDivider>(["fade", "none"]);

/** Capabilities required when a persisted background preset is creator-selected. */
export function requiredCapabilitiesForBackground(background: Pick<NonNullable<ThemeExperience["background"]>, "kind" | "glow" | "pattern">): string[] {
  const caps = new Set<string>([THEME_APPEARANCE_CAPABILITY, THEME_CAPABILITY.solid]);
  caps.add(BACKGROUND_KIND_CAP[background.kind] ?? THEME_CAPABILITY.solid);
  if (background.glow) caps.add(THEME_CAPABILITY.glow);
  if (background.pattern) caps.add(THEME_CAPABILITY.noise);
  return Array.from(caps);
}

/** Capabilities required when a persisted surface preset is creator-selected. */
export function requiredCapabilitiesForSurface(surface: ExperienceSurface): string[] {
  const caps = new Set<string>([THEME_APPEARANCE_CAPABILITY]);
  if (!SURFACE_FREE.has(surface)) caps.add(THEME_CAPABILITY.blur);
  return Array.from(caps);
}

/** All capabilities a theme experience requires (including per-section overrides). */
export function requiredCapabilitiesForExperience(experience: ThemeExperience): string[] {
  const caps = new Set<string>([THEME_CAPABILITY.solid]);
  caps.add(BACKGROUND_KIND_CAP[experience.background.kind] ?? THEME_CAPABILITY.solid);
  if (experience.background.glow) caps.add(THEME_CAPABILITY.glow);
  if (experience.background.pattern) caps.add(THEME_CAPABILITY.noise);
  if (experience.decoration !== "minimal") caps.add(THEME_CAPABILITY.particles);
  if (experience.motion !== "static") caps.add(THEME_CAPABILITY.animation);
  if (!SURFACE_FREE.has(experience.surface)) caps.add(THEME_CAPABILITY.blur);
  if (!DIVIDER_FREE.has(experience.divider)) caps.add(THEME_CAPABILITY.glow);

  for (const ov of Object.values(experience.sections ?? {})) {
    if (!ov) continue;
    if (ov.background) {
      if (ov.background.kind) caps.add(BACKGROUND_KIND_CAP[ov.background.kind] ?? THEME_CAPABILITY.solid);
      if (ov.background.glow) caps.add(THEME_CAPABILITY.glow);
      if (ov.background.pattern) caps.add(THEME_CAPABILITY.noise);
    }
    if (ov.decoration && ov.decoration !== "minimal") caps.add(THEME_CAPABILITY.particles);
    if (ov.motion && ov.motion !== "static") caps.add(THEME_CAPABILITY.animation);
    if (ov.surface && !SURFACE_FREE.has(ov.surface)) caps.add(THEME_CAPABILITY.blur);
    if (ov.divider && !DIVIDER_FREE.has(ov.divider)) caps.add(THEME_CAPABILITY.glow);
  }
  return Array.from(caps);
}

/** Client/server-safe capability check against the Capability Runtime. */
export function canUseCapability(planCode: string | null | undefined, capability: string): boolean {
  if (!planCode) return false;
  return capabilityService.can(planCode, capability).allowed;
}

/**
 * Whether a whole experience is available for a plan (all required capabilities
 * held). Replaces the old raw plan-tier comparison.
 */
export function experienceAvailableForPlan(experience: ThemeExperience, planCode: string | null | undefined): boolean {
  if (!planCode) return false;
  return requiredCapabilitiesForExperience(experience).every((cap) => canUseCapability(planCode, cap));
}

/**
 * Resolve the visual layers a plan is entitled to (Phase 5/10). Unentitled
 * premium layers fall back to the safe free tier — solid background, minimal
 * decoration, static motion, flat surface, fade divider. Never a broken render.
 */
export function resolveExperienceForCapabilities(
  experience: ThemeExperience,
  planCode: string | null | undefined,
): ThemeExperience {
  const has = (cap: string) => canUseCapability(planCode, cap);
  const out: ThemeExperience = {
    ...experience,
    background: { kind: "solid" },
    decoration: "minimal",
    motion: "static",
    divider: "fade",
    surface: "flat",
    sections: undefined,
  };

  const kind = experience.background.kind;
  if (has(BACKGROUND_KIND_CAP[kind] ?? THEME_CAPABILITY.solid)) {
    out.background = {
      ...experience.background,
      kind,
      glow: has(THEME_CAPABILITY.glow) ? experience.background.glow : undefined,
      pattern: has(THEME_CAPABILITY.noise) ? experience.background.pattern : undefined,
    };
  }
  if (experience.decoration !== "minimal" && has(THEME_CAPABILITY.particles)) out.decoration = experience.decoration;
  if (experience.motion !== "static" && has(THEME_CAPABILITY.animation)) out.motion = experience.motion;
  if (!SURFACE_FREE.has(experience.surface) && has(THEME_CAPABILITY.blur)) out.surface = experience.surface;
  if (!DIVIDER_FREE.has(experience.divider) && has(THEME_CAPABILITY.glow)) out.divider = experience.divider;

  if (experience.sections) {
    const sections: Partial<Record<string, SectionExperienceOverride>> = {};
    for (const [variant, ov] of Object.entries(experience.sections)) {
      if (!ov) continue;
      const next: SectionExperienceOverride = { ...ov };
      if (ov.background) {
        const ovKind = ov.background.kind ?? kind;
        if (has(BACKGROUND_KIND_CAP[ovKind] ?? THEME_CAPABILITY.solid)) {
          next.background = {
            ...ov.background,
            glow: has(THEME_CAPABILITY.glow) ? ov.background.glow : undefined,
            pattern: has(THEME_CAPABILITY.noise) ? ov.background.pattern : undefined,
          };
        } else {
          delete next.background;
        }
      }
      if (ov.decoration && ov.decoration !== "minimal" && !has(THEME_CAPABILITY.particles)) delete next.decoration;
      if (ov.motion && ov.motion !== "static" && !has(THEME_CAPABILITY.animation)) delete next.motion;
      if (ov.divider && !DIVIDER_FREE.has(ov.divider) && !has(THEME_CAPABILITY.glow)) delete next.divider;
      if (ov.surface && !SURFACE_FREE.has(ov.surface) && !has(THEME_CAPABILITY.blur)) delete next.surface;
      if (ov.heroBlend && !has(THEME_CAPABILITY.gradient)) delete next.heroBlend;
      sections[variant] = next;
    }
    out.sections = sections;
  }

  return out;
}
