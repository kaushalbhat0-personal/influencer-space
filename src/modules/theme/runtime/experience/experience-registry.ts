/**
 * Experience Registry (IMPLEMENTATION-45) — resolves a ThemeExperience for any
 * theme: premium theme id match → category decoration pack → deterministic
 * fallback (Minimal). Pure/config-driven; no theme awareness needed in pages.
 */
import { THEME_EXPERIENCES, THEME_TO_EXPERIENCE, type ThemeExperience } from "./theme-experience";
import { CATEGORY_DECORATION, type CategoryKey } from "./category-decoration-packs";

export interface ThemeInfo {
  id?: string | null;
  category?: string | null;
  premium?: boolean | null;
}

const FALLBACK: ThemeExperience = THEME_EXPERIENCES.minimal;

const CATEGORY_EXPERIENCE: Partial<Record<CategoryKey, string>> = {
  fitness: "velocity",
  gaming: "arena",
  finance: "executive",
  technology: "cyber",
  education: "classic",
  music: "editorial",
  photography: "editorial",
  travel: "aurora",
  food: "velocity",
  fashion: "luxury",
  podcast: "classic",
  creator: "creator",
  "business & agency": "executive",
  "coach & education": "classic",
  "luxury & lifestyle": "luxury",
  health: "velocity",
};

function normalizeCategory(category?: string | null): CategoryKey | null {
  if (!category) return null;
  const c = category.trim().toLowerCase();
  if (c === "health" || c === "fitness") return "fitness";
  if (c.includes("gaming")) return "gaming";
  if (c.includes("finance") || c.includes("business")) return "business & agency";
  if (c.includes("tech")) return "technology";
  if (c.includes("education") || c.includes("coach")) return "education";
  if (c.includes("music")) return "music";
  if (c.includes("photo")) return "photography";
  if (c.includes("travel")) return "travel";
  if (c.includes("food") || c.includes("restaurant")) return "food";
  if (c.includes("fashion")) return "fashion";
  if (c.includes("podcast")) return "podcast";
  if (c.includes("creator") || c.includes("portfolio")) return "creator";
  if (c.includes("luxury")) return "luxury & lifestyle";
  return null;
}

export class ExperienceRegistry {
  /**
   * Resolve the experience for a theme. Deterministic:
   * 1) explicit theme-id mapping, 2) category mapping, 3) Minimal fallback.
   */
  resolve(theme: ThemeInfo | null | undefined): ThemeExperience {
    if (!theme?.id) return FALLBACK;
    const mapped = THEME_TO_EXPERIENCE[theme.id];
    if (mapped && THEME_EXPERIENCES[mapped]) return THEME_EXPERIENCES[mapped];

    const category = normalizeCategory(theme.category);
    if (category) {
      const expId = CATEGORY_EXPERIENCE[category];
      if (expId && THEME_EXPERIENCES[expId]) {
        const exp = THEME_EXPERIENCES[expId];
        // Keep the category decoration pack so creators see a fitting theme.
        return { ...exp, decoration: CATEGORY_DECORATION[category] };
      }
    }
    return FALLBACK;
  }

  list(): ThemeExperience[] {
    return Object.values(THEME_EXPERIENCES);
  }
}

export const experienceRegistry = new ExperienceRegistry();
