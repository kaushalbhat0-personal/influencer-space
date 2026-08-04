/**
 * Theme Experience Definition (IMPLEMENTATION-45).
 *
 * A configuration-driven visual layer that sits ON TOP of the Theme Runtime.
 * Every section background, lighting, decoration, divider, motion and surface
 * is described here — pages never hardcode decorations.
 */

export type ExperienceBackgroundKind =
  | "solid"
  | "gradient"
  | "mesh"
  | "radial"
  | "pattern"
  | "none";

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

export type ExperienceDivider = "none" | "fade" | "wave" | "curve" | "diagonal" | "glow";

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
  },
  studio: {
    id: "studio",
    name: "Studio",
    premium: true,
    background: { kind: "radial", glow: "top" },
    decoration: "constellation",
    motion: "static",
    divider: "curve",
    surface: "glass",
  },
  aurora: {
    id: "aurora",
    name: "Aurora",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(99,102,241,0.14)", "rgba(139,92,246,0.08)", "rgba(34,211,238,0.06)"], glow: "top" },
    decoration: "blobs",
    motion: "gradient-shift",
    divider: "wave",
    surface: "glass",
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
  },
  cyber: {
    id: "cyber",
    name: "Cyber",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(34,211,238,0.10)", "rgba(168,85,247,0.08)"], glow: "top", pattern: "grid" },
    decoration: "hexagons",
    motion: "static",
    divider: "diagonal",
    surface: "gradient-border",
  },
  executive: {
    id: "executive",
    name: "Executive",
    premium: true,
    background: { kind: "radial", glow: "bottom" },
    decoration: "rings",
    motion: "static",
    divider: "fade",
    surface: "elevated",
  },
  creator: {
    id: "creator",
    name: "Creator",
    premium: true,
    background: { kind: "gradient", colors: ["rgba(236,72,153,0.08)", "transparent"], glow: "top" },
    decoration: "creator",
    motion: "float",
    divider: "wave",
    surface: "soft-glow",
  },
  luxury: {
    id: "luxury",
    name: "Luxury",
    premium: true,
    background: { kind: "radial", glow: "center", pattern: "noise" },
    decoration: "glow",
    motion: "static",
    divider: "glow",
    surface: "gradient-border",
  },
  velocity: {
    id: "velocity",
    name: "Velocity",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(249,115,22,0.10)", "rgba(236,72,153,0.06)"], glow: "top" },
    decoration: "waves",
    motion: "particle-drift",
    divider: "diagonal",
    surface: "floating",
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    premium: true,
    background: { kind: "pattern", pattern: "lines" },
    decoration: "grid",
    motion: "static",
    divider: "fade",
    surface: "flat",
  },
  arena: {
    id: "arena",
    name: "Arena",
    premium: true,
    background: { kind: "mesh", colors: ["rgba(249,115,22,0.12)", "rgba(34,211,238,0.06)"], glow: "center" },
    decoration: "particles",
    motion: "particle-drift",
    divider: "wave",
    surface: "floating",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    premium: true,
    background: { kind: "solid", glow: "top" },
    decoration: "constellation",
    motion: "static",
    divider: "curve",
    surface: "elevated",
  },
  glass: {
    id: "glass",
    name: "Glass",
    premium: true,
    background: { kind: "gradient", colors: ["rgba(20,184,166,0.08)", "transparent"], glow: "top" },
    decoration: "dots",
    motion: "static",
    divider: "fade",
    surface: "glass",
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
