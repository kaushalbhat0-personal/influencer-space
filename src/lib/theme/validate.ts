import type { Theme, ThemeValidationResult, ThemeValidationError, ContrastCheckResult, AccessibilityValidationResult, DesignTokenMap } from "./types";
import { REQUIRED_TOKEN_PATHS } from "./tokens";

export function isResponsiveTokenValue(
  value: unknown
): value is { default: string; [key: string]: string | undefined } {
  return (
    typeof value === "object" &&
    value !== null &&
    "default" in value &&
    typeof (value as Record<string, unknown>).default === "string"
  );
}

export function resolveTokenValue(
  value: unknown
): string {
  if (typeof value === "string") return value;
  if (isResponsiveTokenValue(value)) return value.default;
  return String(value ?? "");
}

export function validateThemeTokens(
  theme: Theme
): ThemeValidationResult {
  const errors: ThemeValidationError[] = [];
  const warnings: ThemeValidationError[] = [];

  for (const path of REQUIRED_TOKEN_PATHS) {
    if (!(path in theme.tokens)) {
      errors.push({
        path,
        message: `Missing required token: ${path}`,
      });
      continue;
    }

    const value = theme.tokens[path];
    if (value === undefined || value === null || value === "") {
      errors.push({
        path,
        message: `Token ${path} has empty value`,
      });
    }
  }

  for (const [path, value] of Object.entries(theme.tokens)) {
    if (!validateTokenType(path, value)) {
      errors.push({
        path,
        message: `Token ${path} has invalid type`,
      });
    }
  }

  const lockedSet = new Set(theme.inheritance.lockedTokens);
  const overridableSet = new Set(theme.inheritance.overridableTokens);

  for (const locked of Array.from(lockedSet)) {
    if (!(locked in theme.tokens)) {
      warnings.push({
        path: locked,
        message: `Locked token ${locked} not found in theme tokens`,
      });
    }
    if (overridableSet.has(locked)) {
      warnings.push({
        path: locked,
        message: `Token ${locked} is both locked and overridable (locked takes precedence)`,
      });
    }
  }

  for (const font of theme.fonts) {
    if (!font.family || font.family.trim().length === 0) {
      errors.push({
        path: "fonts",
        message: `Font has empty family name`,
      });
    }
    if (font.fallbacks && font.fallbacks.length === 0) {
      warnings.push({
        path: "fonts",
        message: `Font "${font.family}" has no fallbacks defined`,
      });
    }
  }

  for (const [moduleId, variants] of Object.entries(theme.variants)) {
    if (Object.keys(variants).length === 0) {
      warnings.push({
        path: `variants.${moduleId}`,
        message: `Module "${moduleId}" has no variant slots`,
      });
    }
  }

  if (theme.identity.version) {
    const semverPattern = /^\d+\.\d+\.\d+$/;
    if (!semverPattern.test(theme.identity.version)) {
      errors.push({
        path: "identity.version",
        message: `Invalid semver: ${theme.identity.version}. Must be MAJOR.MINOR.PATCH`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateThemeInheritance(
  theme: Theme,
  parentTheme: Theme
): ThemeValidationResult {
  const errors: ThemeValidationError[] = [];
  const warnings: ThemeValidationError[] = [];

  if (theme.inheritance.extends !== parentTheme.identity.id) {
    errors.push({
      path: "inheritance.extends",
      message: `Theme declares inheritance from "${theme.inheritance.extends}" but parent is "${parentTheme.identity.id}"`,
    });
  }

  const parentTokenPaths = new Set(Object.keys(parentTheme.tokens));
  for (const [path] of Object.entries(theme.tokens)) {
    if (!parentTokenPaths.has(path)) {
      warnings.push({
        path,
        message: `Token ${path} in child theme does not exist in parent theme "${parentTheme.identity.id}"`,
      });
    }
  }

  for (const lockedPath of theme.inheritance.lockedTokens) {
    if (!(lockedPath in theme.tokens) && !(lockedPath in parentTheme.tokens)) {
      errors.push({
        path: lockedPath,
        message: `Locked token ${lockedPath} not found in child or parent theme tokens`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateThemeCompatibility(
  theme: Theme,
  minVersion: string
): ThemeValidationResult {
  const errors: ThemeValidationError[] = [];
  const warnings: ThemeValidationError[] = [];

  const [major, minor, patch] = theme.identity.version
    .split(".")
    .map(Number);
  const [minMajor, minMinor, minPatch] = minVersion.split(".").map(Number);

  if (
    isNaN(major!) || isNaN(minor!) || isNaN(patch!) ||
    isNaN(minMajor!) || isNaN(minMinor!) || isNaN(minPatch!)
  ) {
    errors.push({
      path: "identity.version",
      message: "Cannot compare versions — invalid semver format",
    });
    return { valid: false, errors, warnings };
  }

  const versionNum = major! * 10000 + minor! * 100 + patch!;
  const minVersionNum = minMajor! * 10000 + minMinor! * 100 + minPatch!;

  if (versionNum < minVersionNum) {
    errors.push({
      path: "identity.version",
      message: `Theme version ${theme.identity.version} is below minimum ${minVersion}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateTokenType(path: string, value: unknown): boolean {
  if (typeof value === "string") return true;
  if (isResponsiveTokenValue(value)) {
    return typeof value.default === "string";
  }
  return false;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, "");

  let r: number, g: number, b: number;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0]! + cleanHex[0]!, 16);
    g = parseInt(cleanHex[1]! + cleanHex[1]!, 16);
    b = parseInt(cleanHex[2]! + cleanHex[2]!, 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

export function rgbaToRgb(
  rgba: string
): { r: number; g: number; b: number } | null {
  const match = rgba.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/
  );
  if (!match) return null;
  return {
    r: parseInt(match[1]!, 10),
    g: parseInt(match[2]!, 10),
    b: parseInt(match[3]!, 10),
  };
}

export function parseColorToRgb(
  color: string
): { r: number; g: number; b: number } | null {
  if (color.startsWith("#")) return hexToRgb(color);
  if (color.startsWith("rgb")) return rgbaToRgb(color);
  return null;
}

export function relativeLuminance(
  r: number,
  g: number,
  b: number
): number {
  const toLinear = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(fgRgb: { r: number; g: number; b: number }, bgRgb: { r: number; g: number; b: number }): number {
  const l1 = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateAccessibility(
  tokens: DesignTokenMap
): AccessibilityValidationResult {
  const errors: ThemeValidationError[] = [];
  const warnings: ThemeValidationError[] = [];
  const contrastResults: ContrastCheckResult[] = [];

  const surfacePrimary = resolveTokenValue(tokens["color.surface.primary"] ?? "#09090b");
  const surfaceSecondary = resolveTokenValue(tokens["color.surface.secondary"] ?? "#18181b");
  const textPrimary = resolveTokenValue(tokens["color.text.primary"] ?? "#ffffff");
  const textSecondary = resolveTokenValue(tokens["color.text.secondary"] ?? "#a1a1aa");
  const textMuted = resolveTokenValue(tokens["color.text.muted"] ?? "#71717a");
  const accentPrimary = resolveTokenValue(tokens["color.accent.primary"] ?? "#00f5ff");

  const textColorPairs: Array<{ fg: string; bg: string; label: string; path: string }> = [
    { fg: textPrimary, bg: surfacePrimary, label: "Text Primary on Surface Primary", path: "color.text.primary" },
    { fg: textSecondary, bg: surfacePrimary, label: "Text Secondary on Surface Primary", path: "color.text.secondary" },
    { fg: textMuted, bg: surfacePrimary, label: "Text Muted on Surface Primary", path: "color.text.muted" },
    { fg: textPrimary, bg: surfaceSecondary, label: "Text Primary on Surface Secondary", path: "color.text.primary" },
    { fg: accentPrimary, bg: surfacePrimary, label: "Accent on Surface Primary", path: "color.accent.primary" },
  ];

  for (const pair of textColorPairs) {
    const fgRgb = parseColorToRgb(pair.fg);
    const bgRgb = parseColorToRgb(pair.bg);

    if (!fgRgb || !bgRgb) {
      warnings.push({
        path: pair.path,
        message: `Cannot parse colors for contrast check: fg="${pair.fg}", bg="${pair.bg}"`,
      });
      continue;
    }

    const ratio = contrastRatio(fgRgb, bgRgb);
    const passesAA = ratio >= 4.5;
    const passesAAA = ratio >= 7.0;

    contrastResults.push({
      tokenPath: pair.path,
      foregroundColor: pair.fg,
      backgroundColor: pair.bg,
      contrastRatio: Math.round(ratio * 100) / 100,
      passes: { AA: passesAA, AAA: passesAAA },
    });

    if (!passesAA) {
      errors.push({
        path: pair.path,
        message: `${pair.label}: contrast ratio ${Math.round(ratio * 100) / 100}:1 fails WCAG AA (minimum 4.5:1)`,
      });
    } else if (!passesAAA) {
      warnings.push({
        path: pair.path,
        message: `${pair.label}: contrast ratio ${Math.round(ratio * 100) / 100}:1 passes AA but not AAA (minimum 7:1)`,
      });
    }
  }

  const hasReducedMotionToken = tokens["animation.duration.normal"] !== undefined;
  if (!hasReducedMotionToken) {
    warnings.push({
      path: "animation.duration.normal",
      message: "No animation duration tokens found; reduced motion support cannot be verified",
    });
  }

  return {
    valid: errors.length === 0,
    contrast: contrastResults,
    errors,
    warnings,
  };
}
