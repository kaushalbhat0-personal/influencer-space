/**
 * RCCF-BUILDER-06E — Theme Visual Signature & Monotony Scoring
 *
 * Config-level signature derived from ThemeDefinition + ThemeExperience.
 * No DB schema, no runtime rendering — pure deterministic comparison.
 */

import type { ThemeDefinition } from "./types-new";
import { experienceRegistry } from "@/modules/theme/runtime/experience/experience-registry";
import type { ThemeExperience } from "@/modules/theme/runtime/experience/theme-experience";

export type ThemeVisualSignature = {
  themeId: string;
  family: string;
  variantGroup: string;
  mode: "light" | "dark";
  typography: string; // heading font family first token
  background: string; // kind + pattern + glow
  surface: string;
  decoration: string;
  divider: string;
  flow: string;
  motion: string;
  heroBlend: string; // true/false
  card: string; // surface kind
  density: string; // not directly in theme, use defaultFlow as proxy + experience
  geometry: string; // divider + decoration combo
};

export const SIGNATURE_WEIGHTS: Record<keyof Omit<ThemeVisualSignature, "themeId" | "family" | "variantGroup" | "mode">, number> = {
  typography: 2,
  background: 2,
  surface: 2,
  decoration: 1,
  divider: 1,
  flow: 1,
  motion: 1,
  heroBlend: 1,
  card: 1,
  density: 1,
  geometry: 1,
};

export function signatureForTheme(theme: ThemeDefinition, experience: ThemeExperience): ThemeVisualSignature {
  const primaryVariant = theme.variants[0];
  const mode = (primaryVariant?.mode as "light" | "dark") ?? "dark";
  const headingFont = primaryVariant?.tokens.typography.headingFont ?? "Inter";
  const firstFont = headingFont.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
  // background signature includes kind + pattern + glow
  const bg = experience.background;
  const background = `${bg.kind}:${bg.pattern ?? ""}:${bg.glow ?? ""}:${(bg.colors?.length ?? 0)}`;
  return {
    themeId: theme.id,
    family: theme.family ?? "legacy",
    variantGroup: theme.variantGroup ?? "",
    mode,
    typography: firstFont,
    background,
    surface: experience.surface,
    decoration: experience.decoration,
    divider: experience.divider,
    flow: experience.defaultFlow ?? "shared",
    motion: experience.motion,
    heroBlend: experience.sections?.hero?.heroBlend ? "true" : "false",
    card: experience.surface,
    density: experience.defaultFlow ?? "shared",
    geometry: `${experience.divider}:${experience.decoration}`,
  };
}

export function paletteSignature(theme: ThemeDefinition): string {
  const c = theme.variants[0]?.tokens.colors;
  if (!c) return "";
  return `${c.primary}|${c.secondary}|${c.accent}|${c.background}`;
}

export type MonotonyGrade = "A" | "B" | "C" | "D";

export function gradePair(a: ThemeVisualSignature, b: ThemeVisualSignature): MonotonyGrade {
  // Weighted distinct dimensions count
  let score = 0;
  (Object.keys(SIGNATURE_WEIGHTS) as Array<keyof typeof SIGNATURE_WEIGHTS>).forEach((k) => {
    if (a[k] !== b[k]) score += SIGNATURE_WEIGHTS[k];
  });
  // Light/dark difference alone not counted as weighted but gives moderate boost
  if (a.mode !== b.mode) score += 1;
  // Thresholds defined BEFORE seeing results (06E spec)
  // Palette-only (score 0-2) => D, only background (2) => D, typography alone (2) => D
  // Typography+surface (4) => C/B border, Typography+background+geometry (5-6) => B, 7+ => A
  if (score >= 7) return "A";
  if (score >= 5) return "B";
  if (score >= 3) return "C";
  return "D";
}

export function isPaletteOnlyDiff(a: ThemeDefinition, b: ThemeDefinition, sigA: ThemeVisualSignature, sigB: ThemeVisualSignature): boolean {
  const palA = paletteSignature(a);
  const palB = paletteSignature(b);
  const paletteDiff = palA !== palB;
  const sigDiff = (Object.keys(SIGNATURE_WEIGHTS) as Array<keyof typeof SIGNATURE_WEIGHTS>).some((k) => sigA[k] !== sigB[k]);
  return paletteDiff && !sigDiff;
}
