/**
 * Theme Selection Strategy v1.0.0
 *
 * Selects a theme preset, colors, and typography based on creator niche.
 * Extensible via strategy pattern for future ML-based theme selection.
 */

import { BaseAppService } from "@/lib/application/base";
import type { ServiceResult } from "@/lib/application/types";
import type { CreatorProfile, GeneratedTheme } from "./types";

interface ThemePreset {
  preset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: number;
  layoutDensity: "compact" | "comfortable" | "spacious";
  darkMode: boolean;
}

const NICHE_THEMES: Record<string, ThemePreset> = {
  gaming: {
    preset: "gaming-dark",
    primaryColor: "#7C3AED",
    secondaryColor: "#10B981",
    accentColor: "#F43F5E",
    fontFamily: "Inter",
    borderRadius: 12,
    layoutDensity: "compact",
    darkMode: true,
  },
  music: {
    preset: "music-vibrant",
    primaryColor: "#EC4899",
    secondaryColor: "#8B5CF6",
    accentColor: "#F59E0B",
    fontFamily: "Inter",
    borderRadius: 16,
    layoutDensity: "comfortable",
    darkMode: true,
  },
  technology: {
    preset: "tech-clean",
    primaryColor: "#2563EB",
    secondaryColor: "#06B6D4",
    accentColor: "#10B981",
    fontFamily: "Inter",
    borderRadius: 8,
    layoutDensity: "comfortable",
    darkMode: true,
  },
  fitness: {
    preset: "fitness-energetic",
    primaryColor: "#EF4444",
    secondaryColor: "#F97316",
    accentColor: "#22C55E",
    fontFamily: "Inter",
    borderRadius: 12,
    layoutDensity: "spacious",
    darkMode: true,
  },
  photography: {
    preset: "photo-minimal",
    primaryColor: "#18181B",
    secondaryColor: "#71717A",
    accentColor: "#F43F5E",
    fontFamily: "Inter",
    borderRadius: 4,
    layoutDensity: "spacious",
    darkMode: true,
  },
  fashion: {
    preset: "fashion-elegant",
    primaryColor: "#D946EF",
    secondaryColor: "#FB923C",
    accentColor: "#FACC15",
    fontFamily: "Inter",
    borderRadius: 12,
    layoutDensity: "comfortable",
    darkMode: true,
  },
  food: {
    preset: "food-warm",
    primaryColor: "#EA580C",
    secondaryColor: "#F59E0B",
    accentColor: "#22C55E",
    fontFamily: "Inter",
    borderRadius: 16,
    layoutDensity: "comfortable",
    darkMode: false,
  },
  travel: {
    preset: "travel-sky",
    primaryColor: "#0284C7",
    secondaryColor: "#0EA5E9",
    accentColor: "#F97316",
    fontFamily: "Inter",
    borderRadius: 12,
    layoutDensity: "spacious",
    darkMode: false,
  },
  beauty: {
    preset: "beauty-soft",
    primaryColor: "#E11D48",
    secondaryColor: "#F472B6",
    accentColor: "#FBBF24",
    fontFamily: "Inter",
    borderRadius: 20,
    layoutDensity: "comfortable",
    darkMode: false,
  },
};

const DEFAULT_THEME: ThemePreset = {
  preset: "default-neutral",
  primaryColor: "#6366F1",
  secondaryColor: "#8B5CF6",
  accentColor: "#10B981",
  fontFamily: "Inter",
  borderRadius: 12,
  layoutDensity: "comfortable",
  darkMode: true,
};

export class ThemeSelectionStrategy extends BaseAppService {
  constructor() {
    super("ThemeSelectionStrategy");
  }

  selectTheme(
    profile: CreatorProfile,
    forceTheme?: string
  ): ServiceResult<GeneratedTheme> {
    try {
      if (forceTheme) {
        return this.success({ ...DEFAULT_THEME, preset: forceTheme });
      }

      const niche = profile.niche.toLowerCase();
      const theme = NICHE_THEMES[niche] ?? DEFAULT_THEME;

      return this.success({ ...theme });
    } catch (error) {
      return this.failed(error, "Theme");
    }
  }
}

export const themeSelectionStrategy = new ThemeSelectionStrategy();
