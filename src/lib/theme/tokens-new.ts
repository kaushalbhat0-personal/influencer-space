import type { ThemeDesignTokens } from "./types-new";

export const DEFAULT_LIGHT_TOKENS: ThemeDesignTokens = {
  colors: {
    primary: "#6366F1",
    secondary: "#818CF8",
    accent: "#A5B4FC",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    background: "#FFFFFF",
    surface: "#F8FAFC",
    surfaceSecondary: "#F1F5F9",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
    border: "#E2E8F0",
    focus: "#6366F1",
    overlay: "rgba(0, 0, 0, 0.5)",
  },
  typography: {
    headingFont: "Inter, system-ui, sans-serif",
    bodyFont: "Inter, system-ui, sans-serif",
    monoFont: "JetBrains Mono, monospace",
    displayFont: "Inter, system-ui, sans-serif",
    headingWeights: { h1: 800, h2: 700, h3: 600, h4: 600, h5: 500, h6: 500 },
    bodyWeight: 400,
  },
  motion: {
    durationFast: "150ms", durationNormal: "250ms", durationSlow: "400ms",
    easingDefault: "cubic-bezier(0.4, 0, 0.2, 1)",
    easingEntrance: "cubic-bezier(0.0, 0, 0.2, 1)",
    easingExit: "cubic-bezier(0.4, 0, 1, 1)",
    hoverScale: "1.05", reducedMotion: false,
  },
  radius: { none: "0", sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
  borders: { radius: "8px" },
};

export const DEFAULT_DARK_TOKENS: ThemeDesignTokens = {
  ...DEFAULT_LIGHT_TOKENS,
  colors: {
    ...DEFAULT_LIGHT_TOKENS.colors,
    background: "#09090B",
    surface: "#18181B",
    surfaceSecondary: "#27272A",
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    border: "rgba(255,255,255,0.08)",
    overlay: "rgba(0, 0, 0, 0.7)",
  },
};

export function tokensToCssVariables(tokens: ThemeDesignTokens, prefix = "brand"): Record<string, string> {
  const vars: Record<string, string> = {};
  const c = tokens.colors;
  const t = tokens.typography;
  const b = tokens.borders;

  vars[`--${prefix}-primary`] = c.primary;
  vars[`--${prefix}-secondary`] = c.secondary;
  vars[`--${prefix}-accent`] = c.accent;
  vars[`--${prefix}-bg`] = c.background;
  vars[`--${prefix}-surface`] = c.surface;
  vars[`--${prefix}-text`] = c.textPrimary;
  vars[`--${prefix}-text-secondary`] = c.textSecondary;
  vars[`--${prefix}-text-muted`] = c.textMuted;
  vars[`--${prefix}-border`] = c.border;
  vars[`--${prefix}-font-heading`] = t.headingFont;
  vars[`--${prefix}-font-body`] = t.bodyFont;
  vars[`--${prefix}-radius`] = b.radius;

  return vars;
}

export function mergeTokens(base: ThemeDesignTokens, overrides: Partial<ThemeDesignTokens>): ThemeDesignTokens {
  return {
    colors: { ...base.colors, ...overrides.colors },
    typography: { ...base.typography, ...overrides.typography },
    motion: { ...base.motion, ...overrides.motion },
    radius: { ...base.radius, ...overrides.radius },
    borders: { ...base.borders, ...overrides.borders },
  };
}

export function freezeTokens(tokens: ThemeDesignTokens): ThemeDesignTokens {
  return Object.freeze({
    colors: Object.freeze({ ...tokens.colors }),
    typography: Object.freeze({ ...tokens.typography }),
    motion: Object.freeze({ ...tokens.motion }),
    radius: Object.freeze({ ...tokens.radius }),
    borders: Object.freeze({ ...tokens.borders }),
  });
}
