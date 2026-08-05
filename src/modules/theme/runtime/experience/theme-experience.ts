/**
 * Theme Experience Definition (IMPLEMENTATION-45/IMPLEMENTATION-48.1).
 *
 * Section-aware visual layer that sits ON TOP of the Theme Runtime. Each
 * SectionVariant resolves different decoration, divider, lighting and surface
 * treatments — pages never hardcode decorations.
 */

export type SectionVariant = "hero" | "commerce" | "gallery" | "timeline" | "social" | "cta" | "footer" | "default";

export type ExperienceBackgroundKind =
  | "solid"
  | "gradient"
  | "mesh"
  | "radial"
  | "pattern"
  | "multi-radial"
  | "aurora"
  | "none";

export type ExperienceDivider = "none" | "fade" | "wave" | "curve" | "diagonal" | "glow" | "brush" | "organic" | "soft";

export type ExperienceDecorationPack =
  | "minimal"
  | "constellation"
  | "grid"
  | "dots"
  | "rings"
  | "waves"
  | "hexagons"
  | "blobs"
  | "glow"
  | "orbits"
  | "particles"
  // category packs
  | "fitness"
  | "gaming"
  | "finance"
  | "technology"
  | "education"
  | "music"
  | "photography"
  | "travel"
  | "food"
  | "fashion"
  | "podcast"
  | "creator";

export type ExperienceMotion =
  | "static"
  | "float"
  | "glow-pulse"
  | "gradient-shift"
  | "particle-drift"
  | "parallax";

export type ExperienceSurface = "flat" | "glass" | "elevated" | "gradient-border" | "soft-glow" | "floating";

export interface ExperienceBackground {
  kind: ExperienceBackgroundKind;
  /** CSS gradient stops / mesh colors (theme-aware, low contrast). */
  colors?: string[];
  /** Radial glow position: top | center | bottom. */
  glow?: "top" | "center" | "bottom" | null;
  /** SVG pattern id (from experience-assets) for pattern kind. */
  pattern?: "grid" | "dots" | "noise" | "lines";
}

/** Per-section experience override — allows different treatments per SectionVariant. */
export interface SectionExperienceOverride {
  background?: Partial<ExperienceBackground>;
  decoration?: ExperienceDecorationPack;
  divider?: ExperienceDivider;
  surface?: ExperienceSurface;
  motion?: ExperienceMotion;
  /** When true, the background fades out at the bottom for seamless hero→next blending. */
  heroBlend?: boolean;
  /** Reduced decoration density for this section type. */
  reducedDecorations?: boolean;
}

export interface ThemeExperience {
  id: string;
  name: string;
  premium: boolean;
  background: ExperienceBackground;
  decoration: ExperienceDecorationPack;
  motion: ExperienceMotion;
  divider: ExperienceDivider;
  surface: ExperienceSurface;
  /** Hero gradient fade color (merges hero media into the page surface). */
  heroFadeTo?: string;
  /** Alternate surface tone for rhythm (alternate sections). */
  alternateSurface?: boolean;
  /** Per-section variant overrides (Hero, Commerce, Footer, etc.) */
  sections?: Partial<Record<SectionVariant, SectionExperienceOverride>>;
}

/** Base experiences reused by premium packs. */
const BASE: Record<string, ThemeExperience> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    premium: false,
    background: { kind: "solid" },
    decoration: "minimal",
    motion: "static",
    divider: "fade",
    surface: "flat",
  },
  classic: {
    id: "classic",
    name: "Classic",
    premium: true,
    background: { kind: "gradient", colors: ["rgba(99,102,241,0.06)", "transparent"], glow: "top" },
    decoration: "dots",
    motion: "static",
    divider: "fade",
    surface: "elevated",
    sections: {
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
  studio: {
    id: "studio",
    name: "Studio",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(99,102,241,0.10)", "rgba(59,130,246,0.06)"], glow: "top" },
    decoration: "constellation",
    motion: "static",
    divider: "fade",
    surface: "glass",
    sections: {
      hero: { divider: "none", heroBlend: true },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
  aurora: {
    id: "aurora",
    name: "Aurora",
    premium: true,
    background: { kind: "aurora", colors: ["rgba(129,140,248,0.14)", "rgba(192,132,252,0.08)", "rgba(34,211,238,0.06)", "rgba(99,102,241,0.04)"], glow: "center" },
    decoration: "blobs",
    motion: "gradient-shift",
    divider: "fade",
    surface: "glass",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(129,140,248,0.22)", "rgba(192,132,252,0.14)", "rgba(34,211,238,0.10)"] }, divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", motion: "static" },
      commerce: { decoration: "particles", divider: "fade" },
      gallery: { decoration: "grid", divider: "fade", reducedDecorations: true },
      cta: { background: { glow: "bottom" }, surface: "soft-glow" },
    },
  },
  nebula: {
    id: "nebula",
    name: "Nebula",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(139,92,246,0.14)", "rgba(236,72,153,0.08)", "rgba(59,130,246,0.06)"], glow: "center" },
    decoration: "orbits",
    motion: "float",
    divider: "curve",
    surface: "glass",
    sections: {
      hero: { divider: "none", heroBlend: true },
      footer: { decoration: "dots", divider: "fade", motion: "static", reducedDecorations: true },
    },
  },
  cyber: {
    id: "cyber",
    name: "Cyber",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(34,211,238,0.14)", "rgba(168,85,247,0.10)"], glow: "top", pattern: "grid" },
    decoration: "hexagons",
    motion: "static",
    divider: "diagonal",
    surface: "gradient-border",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(34,211,238,0.20)", "rgba(168,85,247,0.14)"] }, divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
      commerce: { decoration: "particles", divider: "diagonal" },
    },
  },
  executive: {
    id: "executive",
    name: "Executive",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(100,116,139,0.10)", "rgba(71,85,105,0.06)"], glow: "bottom" },
    decoration: "rings",
    motion: "static",
    divider: "fade",
    surface: "elevated",
    sections: {
      hero: { divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
  creator: {
    id: "creator",
    name: "Creator",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(236,72,153,0.12)", "rgba(249,115,22,0.08)", "rgba(139,92,246,0.06)"], glow: "center" },
    decoration: "creator",
    motion: "float",
    divider: "fade",
    surface: "soft-glow",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(236,72,153,0.18)", "rgba(249,115,22,0.12)"] }, divider: "none", heroBlend: true },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
      cta: { background: { glow: "bottom" } },
    },
  },
  luxury: {
    id: "luxury",
    name: "Luxury",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(234,179,8,0.08)", "rgba(202,138,4,0.05)"], glow: "center", pattern: "noise" },
    decoration: "glow",
    motion: "static",
    divider: "glow",
    surface: "gradient-border",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(234,179,8,0.14)", "rgba(202,138,4,0.08)"] }, divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
  velocity: {
    id: "velocity",
    name: "Velocity",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(249,115,22,0.12)", "rgba(236,72,153,0.08)"], glow: "top" },
    decoration: "waves",
    motion: "particle-drift",
    divider: "fade",
    surface: "floating",
    sections: {
      hero: { divider: "none", heroBlend: true },
      footer: { decoration: "minimal", divider: "fade", motion: "static", reducedDecorations: true },
    },
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    premium: true,
    background: { kind: "pattern", pattern: "lines", glow: "top" },
    decoration: "grid",
    motion: "static",
    divider: "fade",
    surface: "flat",
    sections: {
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
  arena: {
    id: "arena",
    name: "Arena",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(249,115,22,0.14)", "rgba(34,211,238,0.08)"], glow: "center" },
    decoration: "particles",
    motion: "particle-drift",
    divider: "fade",
    surface: "floating",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(249,115,22,0.20)", "rgba(34,211,238,0.12)"] }, divider: "none", heroBlend: true },
      footer: { decoration: "minimal", divider: "fade", motion: "static", reducedDecorations: true },
    },
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    premium: true,
    background: { kind: "solid", glow: "center" },
    decoration: "constellation",
    motion: "static",
    divider: "fade",
    surface: "elevated",
    sections: {
      hero: { divider: "none", heroBlend: true },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
  glass: {
    id: "glass",
    name: "Glass",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(20,184,166,0.10)", "rgba(6,182,212,0.06)"], glow: "top" },
    decoration: "dots",
    motion: "static",
    divider: "fade",
    surface: "glass",
    sections: {
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
};

export const THEME_EXPERIENCES: Record<string, ThemeExperience> = BASE;

/** Premium theme ids → named experience (configuration only). */
export const THEME_TO_EXPERIENCE: Record<string, string> = {
  "com.creatos.creator-neon": "cyber",
  "com.creatos.gaming-neon": "cyber",
  "com.creatos.gaming-cyber": "cyber",
  "com.creatos.gaming-matrix": "arena",
  "com.creatos.creator-midnight": "midnight",
  "com.creatos.creator-glass": "glass",
  "com.creatos.creator-gold": "luxury",
  "com.creatos.luxury-champagne": "luxury",
  "com.creatos.luxury-gold": "luxury",
  "com.creatos.music-festival": "velocity",
  "com.creatos.music-stage": "editorial",
  "com.creatos.fitness-energy": "arena",
  "com.creatos.corporate-black": "executive",
  "com.creatos.business-minimal": "minimal",
  "com.creatos.corporate-modern": "classic",
  "com.creatos.streaming-purple": "nebula",
  "com.creatos.streaming-green": "cyber",
};

export { BASE as EXPERIENCE_PACKS };

/**
 * Experience → Plan eligibility (IMPLEMENTATION-48.3).
 * Maps each premium experience to the minimum plan code required.
 * Minimal is always available (free tier). Classic is available to Launch.
 */
export const EXPERIENCE_MIN_PLAN: Record<string, string> = {
  minimal: "creator_launch",
  classic: "creator_launch",
  studio: "creator_grow",
  creator: "creator_grow",
  glass: "creator_grow",
  aurora: "creator_grow",
  midnight: "creator_grow",
  velocity: "creator_grow",
  editorial: "creator_grow",
  nebula: "creator_grow",
  cyber: "creator_scale",
  luxury: "creator_scale",
  executive: "creator_scale",
  arena: "creator_scale",
};

/** Creator plan tier order (higher index = higher tier). */
const PLAN_TIER_ORDER: Record<string, number> = {
  creator_launch: 0,
  creator_grow: 1,
  creator_scale: 2,
  creator_enterprise: 3,
};

/**
 * Checks if an experience is available for a given plan.
 * Resolves through legacy mapping, so both "creator_pro" and "creator_grow" work.
 */
export function isExperienceAvailableForPlan(experienceId: string, planCode: string | null): boolean {
  if (!planCode) return false;
  const required = EXPERIENCE_MIN_PLAN[experienceId];
  if (!required) return true; // unknown → available
  const requiredTier = PLAN_TIER_ORDER[required] ?? 0;
  const actualTier = PLAN_TIER_ORDER[planCode] ?? 0;
  return actualTier >= requiredTier;
}
