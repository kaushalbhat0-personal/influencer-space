/**
 * Theme Experience Definition (IMPLEMENTATION-45/IMPLEMENTATION-48.1).
 *
 * Section-aware visual layer that sits ON TOP of the Theme Runtime. Each
 * SectionVariant resolves different decoration, divider, lighting and surface
 * treatments — pages never hardcode decorations.
 */
// RCCF-LAUNCH-POLISH-06: capability-driven availability (single authority).
import { experienceAvailableForPlan } from "./capabilities";

export type SectionVariant = "hero" | "commerce" | "gallery" | "timeline" | "social" | "cta" | "footer" | "default";

export type ExperienceBackgroundKind =
  | "solid"
  | "gradient"
  | "mesh"
  | "radial"
  | "pattern"
  | "multi-radial"
  | "aurora"
  | "image"
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

export type ExperienceSurface = "flat" | "glass" | "elevated" | "gradient-border" | "soft-glow" | "floating" | "luxury" | "neon" | "minimal";

export type SectionFlow = "shared" | "bleed" | "overlap" | "softSeparator" | "isolated";

export interface ExperienceBackground {
  kind: ExperienceBackgroundKind;
  /** CSS gradient stops / mesh colors (theme-aware, low contrast). */
  colors?: string[];
  /** Radial glow position: top | center | bottom. */
  glow?: "top" | "center" | "bottom" | null;
  /** SVG pattern id (from experience-assets) for pattern kind. */
  pattern?: "grid" | "dots" | "noise" | "lines";
  /** RCCF-71.6.4: resolved image source URL for the image background kind. */
  url?: string;
  /** RCCF-71.6.4: image opacity 0..1 (readability — root surface shows through). */
  opacity?: number;
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
  /** RCCF-BUILDER-05B: semantic flow for this section variant. */
  flow?: SectionFlow;
  /** RCCF-BUILDER-05B: when true with bleed flow, inner content stays constrained while outer extends. */
  fullBleed?: boolean;
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
  /** RCCF-BUILDER-05B: default flow for sections without explicit override (shared = minimal boundary). */
  defaultFlow?: SectionFlow;
  /** Per-section variant overrides (Hero, Commerce, Footer, etc.) */
  sections?: Partial<Record<SectionVariant, SectionExperienceOverride>>;
}

/** Base experiences reused by premium packs — 06E differentiation: each family has unique divider/motion/decoration/geometry. */
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
    defaultFlow: "shared",
  },
  classic: {
    id: "classic",
    name: "Classic",
    premium: true,
    background: { kind: "gradient", colors: ["rgba(99,102,241,0.06)", "transparent"], glow: "top" },
    decoration: "dots",
    motion: "static",
    divider: "wave",
    surface: "elevated",
    defaultFlow: "shared",
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
    motion: "float",
    divider: "curve",
    surface: "glass",
    defaultFlow: "shared",
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
    divider: "soft",
    surface: "glass",
    defaultFlow: "bleed",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(129,140,248,0.22)", "rgba(192,132,252,0.14)", "rgba(34,211,238,0.10)"] }, divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", motion: "static" },
      commerce: { decoration: "particles", divider: "soft" },
      gallery: { decoration: "grid", divider: "soft", reducedDecorations: true },
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
    divider: "organic",
    surface: "glass",
    defaultFlow: "bleed",
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
    defaultFlow: "bleed",
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
    defaultFlow: "shared",
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
    motion: "particle-drift",
    divider: "glow",
    surface: "soft-glow",
    defaultFlow: "shared",
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
    motion: "glow-pulse",
    divider: "glow",
    surface: "luxury",
    defaultFlow: "bleed",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(234,179,8,0.14)", "rgba(202,138,4,0.08)"] }, divider: "none", heroBlend: true, surface: "minimal" },
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
    divider: "brush",
    surface: "floating",
    defaultFlow: "bleed",
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
    divider: "brush",
    surface: "flat",
    defaultFlow: "shared",
    sections: {
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
  arena: {
    id: "arena",
    name: "Arena",
    premium: true,
    background: { kind: "multi-radial", colors: ["rgba(249,115,22,0.14)", "rgba(34,211,238,0.08)", "rgba(168,85,247,0.06)"], glow: "center" },
    decoration: "particles",
    motion: "particle-drift",
    divider: "diagonal",
    surface: "floating",
    defaultFlow: "shared",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(249,115,22,0.20)", "rgba(34,211,238,0.12)"] }, divider: "none", heroBlend: true },
      footer: { decoration: "minimal", divider: "curve", motion: "static", reducedDecorations: true },
    },
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    premium: true,
    background: { kind: "solid", glow: "center" },
    decoration: "constellation",
    motion: "parallax",
    divider: "fade",
    surface: "elevated",
    defaultFlow: "bleed",
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
    motion: "float",
    divider: "wave",
    surface: "glass",
    defaultFlow: "shared",
    sections: {
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
    },
  },
  brutalist: {
    id: "brutalist",
    name: "Brutalist",
    premium: true,
    background: { kind: "pattern", pattern: "grid", glow: null },
    decoration: "grid",
    motion: "static",
    divider: "none",
    surface: "flat",
    defaultFlow: "isolated",
  },
  // ── RCCF-VISUAL-01C — 5 approved visual directions, wired via CSS-token pipeline. ──
  // Each pack is hex/RGBA only (Tailwind 3.4.1), honors prefers-reduced-motion,
  // and uses existing pipeline (no alternate renderers).
  "visual-nocturne": {
    id: "visual-nocturne",
    name: "Visual Nocturne",
    premium: true,
    background: { kind: "pattern", pattern: "lines", glow: "top" },
    decoration: "grid",
    motion: "static",
    divider: "fade",
    surface: "flat",
    defaultFlow: "shared",
    sections: {
      hero: { divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
      gallery: { decoration: "dots", divider: "fade", reducedDecorations: true },
    },
  },
  "visual-signal": {
    id: "visual-signal",
    name: "Visual Signal",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(6,182,214,0.14)", "rgba(139,92,246,0.10)"], glow: "top", pattern: "grid" },
    decoration: "hexagons",
    motion: "static",
    divider: "glow",
    surface: "gradient-border",
    defaultFlow: "bleed",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(6,182,214,0.20)", "rgba(139,92,246,0.14)"] }, divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
      commerce: { decoration: "dots", divider: "glow" },
    },
  },
  "visual-atelier": {
    id: "visual-atelier",
    name: "Visual Atelier",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(212,165,116,0.10)", "rgba(167,139,250,0.08)", "rgba(253,230,138,0.06)"], glow: "center", pattern: "noise" },
    decoration: "glow",
    motion: "glow-pulse",
    divider: "glow",
    surface: "luxury",
    defaultFlow: "bleed",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(212,165,116,0.14)", "rgba(167,139,250,0.10)"] }, divider: "none", heroBlend: true, surface: "minimal" },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
      cta: { background: { glow: "bottom" }, surface: "soft-glow" },
    },
  },
  "visual-field": {
    id: "visual-field",
    name: "Visual Field",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(249,115,22,0.12)", "rgba(132,204,22,0.08)", "rgba(251,146,60,0.06)"], glow: "center" },
    decoration: "waves",
    motion: "particle-drift",
    divider: "organic",
    surface: "soft-glow",
    defaultFlow: "shared",
    sections: {
      hero: { background: { glow: "center", colors: ["rgba(249,115,22,0.16)", "rgba(132,204,22,0.10)"] }, divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
      gallery: { decoration: "dots", divider: "organic", reducedDecorations: true },
    },
  },
  "visual-system": {
    id: "visual-system",
    name: "Visual System",
    premium: true,
    background: { kind: "solid", glow: "top" },
    decoration: "dots",
    motion: "static",
    divider: "fade",
    surface: "elevated",
    defaultFlow: "shared",
    sections: {
      hero: { divider: "none", heroBlend: true, surface: "flat" },
      footer: { decoration: "minimal", divider: "fade", reducedDecorations: true },
      gallery: { decoration: "dots", divider: "fade", reducedDecorations: true },
    },
  },
};

export const THEME_EXPERIENCES: Record<string, ThemeExperience> = BASE;

/** Premium theme ids → named experience (configuration only). RCCF-BUILDER-05A: catalog families mapped explicitly to distinct packs.
 * 06E: legacy cluster de-duplication — each legacy theme maps to a distinct pack matching its design language,
 * breaking the previous 9× Creator / 6× Classic monotony while preserving family intent.
 */
export const THEME_TO_EXPERIENCE: Record<string, string> = {
  "com.creatos.creator-dark": "creator",
  "com.creatos.creator-light": "minimal",
  "com.creatos.creator-gold": "luxury",
  "com.creatos.creator-neon": "cyber",
  "com.creatos.creator-midnight": "midnight",
  "com.creatos.creator-glass": "glass",
  "com.creatos.gaming-neon": "cyber",
  "com.creatos.gaming-cyber": "cyber",
  "com.creatos.gaming-matrix": "brutalist",
  "com.creatos.streaming-purple": "aurora",
  "com.creatos.streaming-green": "cyber",
  "com.creatos.business-minimal": "minimal",
  "com.creatos.corporate-modern": "executive",
  "com.creatos.corporate-black": "executive",
  "com.creatos.photography-light": "editorial",
  "com.creatos.music-festival": "aurora",
  "com.creatos.music-stage": "luxury",
  "com.creatos.fitness-energy": "brutalist",
  "com.creatos.education-academy": "editorial",
  "com.creatos.luxury-champagne": "luxury",
  "com.creatos.luxury-gold": "luxury",
  // 06E legacy de-duplication (previously all fell back to Creator/Executive/Classic/Arena/Velocity via category)
  "com.creatos.neon-dark": "cyber",
  "com.creatos.creator-studio": "studio",
  "com.creatos.creator-bold": "brutalist",
  "com.creatos.stream-vibe": "velocity",
  "com.creatos.creator-pro": "executive",
  "com.creatos.midnight-ocean": "midnight",
  "com.creatos.minimal-portfolio": "minimal",
  "com.creatos.designer": "glass",
  "com.creatos.photographer": "editorial",
  "com.creatos.cyber-arena": "cyber",
  "com.creatos.esports": "brutalist",
  "com.creatos.game-stream": "aurora",
  "com.creatos.royal-plum": "luxury",
  "com.creatos.forest-canopy": "nebula",
  "com.creatos.modern-restaurant": "minimal",
  "com.creatos.fine-dining": "luxury",
  "com.creatos.bistro": "editorial",
  "com.creatos.coach": "classic",
  "com.creatos.academy": "editorial",
  "com.creatos.mentor": "glass",
  "com.creatos.podcast-studio": "nebula",
  "com.creatos.audio-creator": "creator",
  "com.creatos.voice": "midnight",
  "com.creatos.executive": "luxury",
  "com.creatos.startup": "glass",
  "com.creatos.professional": "minimal",
  "com.creatos.corporate-blue": "executive",
  // RCCF-VISUAL-01C — 5 visual foundation themes → new packs
  "com.creatos.visual-nocturne-editorial": "visual-nocturne",
  "com.creatos.visual-signal": "visual-signal",
  "com.creatos.visual-atelier": "visual-atelier",
  "com.creatos.visual-field": "visual-field",
  "com.creatos.visual-system": "visual-system",
};

export { BASE as EXPERIENCE_PACKS };

/**
 * RCCF-LAUNCH-POLISH-06: Experience → plan availability now flows through the
 * Capability Runtime (requiredCapabilitiesForExperience + capabilityService) —
 * the raw plan-tier comparison below is removed. EXPERIENCE_MIN_PLAN remains
 * only as an informational label for tooling.
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
  brutalist: "creator_scale",
  // RCCF-VISUAL-01C — new packs (required caps: pattern/mesh→noise/gradient + decoration→particles)
  "visual-nocturne": "creator_grow",
  "visual-signal": "creator_grow",
  "visual-atelier": "creator_scale",
  "visual-field": "creator_grow",
  "visual-system": "creator_grow",
};

/**
 * Checks if an experience is available for a given plan.
 * Delegates to the canonical capability engine (one source of truth).
 */
export function isExperienceAvailableForPlan(experienceId: string, planCode: string | null): boolean {
  if (!planCode) return false;
  const experience = THEME_EXPERIENCES[experienceId];
  if (!experience) return false;
  return experienceAvailableForPlan(experience, planCode);
}
