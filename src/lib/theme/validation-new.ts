import type { ThemeDefinition, ColorTokens } from "./types-new";

export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const RGBA_COLOR = /^rgba?\(/;
const VALID_CATEGORIES = ["minimal", "creator", "business & agency", "portfolio & creative", "photography", "coach & education", "gaming", "podcast", "luxury & lifestyle", "ecommerce", "agency", "food & restaurant", "music", "health"];

function validateColorTokens(colors: ColorTokens): string[] {
  const errors: string[] = [];
  const required: Array<keyof ColorTokens> = ["primary", "secondary", "accent", "background", "surface", "textPrimary", "textSecondary", "border"];

  for (const key of required) {
    const value = colors[key];
    if (!value) errors.push(`Missing required color: ${key}`);
    else if (!HEX_COLOR.test(value) && !RGBA_COLOR.test(value)) {
      errors.push(`Invalid color value for ${key}: ${value}`);
    }
  }

  return errors;
}

export function validateTheme(theme: ThemeDefinition): ThemeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!theme.id) errors.push("Theme must have an id");
  if (!theme.slug) errors.push("Theme must have a slug");
  if (!theme.name) errors.push("Theme must have a name");
  if (!theme.version) errors.push("Theme must have a version");

  if (!theme.author?.name) errors.push("Theme must have an author name");

  if (!VALID_CATEGORIES.includes(theme.category)) {
    warnings.push(`Unknown category: ${theme.category}`);
  }

  if (!theme.variants || theme.variants.length === 0) {
    errors.push("Theme must have at least one variant");
  }

  if (theme.supportsDarkMode && !theme.variants.some((v) => v.mode === "dark")) {
    errors.push("supportsDarkMode=true but no dark variant");
  }

  for (const variant of theme.variants ?? []) {
    if (!["light", "dark"].includes(variant.mode)) {
      errors.push(`Invalid variant mode: ${variant.mode}`);
    }
    errors.push(...validateColorTokens(variant.tokens.colors).map((e) => `[${variant.mode}] ${e}`));
    if (!variant.tokens.typography.headingFont) errors.push(`[${variant.mode}] Missing headingFont`);
    if (!variant.tokens.typography.bodyFont) errors.push(`[${variant.mode}] Missing bodyFont`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
