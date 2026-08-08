import { themeRegistry } from "./registry-new";
import { DEFAULT_DARK_TOKENS, DEFAULT_LIGHT_TOKENS } from "./tokens-new";

export interface ResolvedSnapshotTheme {
  packageId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    // RCCF-LAUNCH-TRACK-05: complete token set so the Theme Runtime is the
    // single authority (status colors, surfaces, border, focus, secondary text).
    success?: string;
    warning?: string;
    danger?: string;
    surface?: string;
    surfaceSecondary?: string;
    border?: string;
    focus?: string;
    textSecondary?: string;
  };
  typography: {
    heading: string;
    body: string;
    mono?: string;
    display?: string;
  };
}

export type ThemeResolutionMode = "light" | "dark";

/**
 * ThemeResolver — answers what theme a website should actually receive.
 *
 * Responsibilities:
 * - Resolve theme by ID with fallback chain
 * - Select appropriate variant (light/dark)
 * - Handle theme inheritance (future)
 * - Handle compatibility upgrades (future)
 * - Handle marketplace/agency/enterprise theme sourcing (future)
 *
 * ThemeRegistry answers "what themes exist?"
 * ThemeResolver answers "what should this website receive?"
 */
export class ThemeResolver {
  resolveForSnapshot(
    themeId: string,
    mode: ThemeResolutionMode = "dark",
    options?: {
      inheritedThemeId?: string;
      overrides?: Partial<ResolvedSnapshotTheme>;
    },
  ): ResolvedSnapshotTheme | null {
    let theme = themeRegistry.getById(themeId);

    // Legacy preset IDs (e.g. "neon-dark") are resolved through their slug so
    // websites provisioned with the old theme system still render the theme
    // they were assigned instead of silently falling back to the default.
    if (!theme) {
      theme = themeRegistry.getAll().find((t) => t.slug === themeId);
    }

    if (!theme) {
      // Fallback: try default theme
      const defaultTheme = themeRegistry.getById("com.creatos.neon-dark");
      if (!defaultTheme) return null;
      return this.applyOverrides(this.extractSnapshotTheme(defaultTheme, mode), options?.overrides);
    }

    return this.applyOverrides(this.extractSnapshotTheme(theme, mode), options?.overrides);
  }

  private applyOverrides(
    base: ResolvedSnapshotTheme,
    overrides?: Partial<ResolvedSnapshotTheme>,
  ): ResolvedSnapshotTheme {
    if (!overrides) return base;
    return {
      packageId: base.packageId,
      colors: {
        primary: overrides.colors?.primary ?? base.colors.primary,
        secondary: overrides.colors?.secondary ?? base.colors.secondary,
        accent: overrides.colors?.accent ?? base.colors.accent,
        background: overrides.colors?.background ?? base.colors.background,
        foreground: overrides.colors?.foreground ?? base.colors.foreground,
        muted: overrides.colors?.muted ?? base.colors.muted,
        ...(overrides.colors?.success ?? base.colors.success !== undefined ? { success: overrides.colors?.success ?? base.colors.success } : {}),
        ...(overrides.colors?.warning ?? base.colors.warning !== undefined ? { warning: overrides.colors?.warning ?? base.colors.warning } : {}),
        ...(overrides.colors?.danger ?? base.colors.danger !== undefined ? { danger: overrides.colors?.danger ?? base.colors.danger } : {}),
        ...(overrides.colors?.surface ?? base.colors.surface !== undefined ? { surface: overrides.colors?.surface ?? base.colors.surface } : {}),
        ...(overrides.colors?.surfaceSecondary ?? base.colors.surfaceSecondary !== undefined ? { surfaceSecondary: overrides.colors?.surfaceSecondary ?? base.colors.surfaceSecondary } : {}),
        ...(overrides.colors?.border ?? base.colors.border !== undefined ? { border: overrides.colors?.border ?? base.colors.border } : {}),
        ...(overrides.colors?.focus ?? base.colors.focus !== undefined ? { focus: overrides.colors?.focus ?? base.colors.focus } : {}),
        ...(overrides.colors?.textSecondary ?? base.colors.textSecondary !== undefined ? { textSecondary: overrides.colors?.textSecondary ?? base.colors.textSecondary } : {}),
      },
      typography: {
        heading: overrides.typography?.heading ?? base.typography.heading,
        body: overrides.typography?.body ?? base.typography.body,
        ...(overrides.typography?.mono ?? base.typography.mono !== undefined ? { mono: overrides.typography?.mono ?? base.typography.mono } : {}),
        ...(overrides.typography?.display ?? base.typography.display !== undefined ? { display: overrides.typography?.display ?? base.typography.display } : {}),
      },
    };
  }

  private extractSnapshotTheme(
    theme: NonNullable<ReturnType<typeof themeRegistry.getById>>,
    mode: ThemeResolutionMode,
  ): ResolvedSnapshotTheme {
    const variant = theme.variants.find((v) => v.mode === mode) ?? theme.variants[0];
    const defaultTokens = mode === "light" ? DEFAULT_LIGHT_TOKENS : DEFAULT_DARK_TOKENS;

    if (!variant) {
      // Fallback: return theme identity with defaults
      const d = defaultTokens.colors;
      const t = defaultTokens.typography;
      return {
        packageId: theme.id,
        colors: {
          primary: d.primary, secondary: d.secondary, accent: d.accent,
          background: d.background, foreground: d.textPrimary, muted: d.textMuted,
          success: d.success, warning: d.warning, danger: d.danger,
          surface: d.surface, surfaceSecondary: d.surfaceSecondary,
          border: d.border, focus: d.focus, textSecondary: d.textSecondary,
        },
        typography: { heading: t.headingFont, body: t.bodyFont, mono: t.monoFont, display: t.displayFont },
      };
    }

    const c = variant.tokens.colors;
    const t = variant.tokens.typography;
    return {
      packageId: theme.id,
      colors: {
        primary: c.primary,
        secondary: c.secondary,
        accent: c.accent,
        background: c.background,
        foreground: c.textPrimary,
        muted: c.textMuted,
        success: c.success ?? defaultTokens.colors.success,
        warning: c.warning ?? defaultTokens.colors.warning,
        danger: c.danger ?? defaultTokens.colors.danger,
        surface: c.surface ?? defaultTokens.colors.surface,
        surfaceSecondary: c.surfaceSecondary ?? defaultTokens.colors.surfaceSecondary,
        border: c.border ?? defaultTokens.colors.border,
        focus: c.focus ?? defaultTokens.colors.focus,
        textSecondary: c.textSecondary ?? defaultTokens.colors.textSecondary,
      },
      typography: {
        heading: t.headingFont,
        body: t.bodyFont,
        mono: t.monoFont,
        display: t.displayFont,
      },
    };
  }
}

export const themeResolver = new ThemeResolver();

/**
 * Resolve a stored theme id (possibly a legacy preset slug such as
 * "neon-dark") into the canonical registry id ("com.creatos.neon-dark").
 * Falls back to the default theme when the id is unknown.
 */
export function normalizeThemeId(id: string | null | undefined): string {
  if (!id) return "com.creatos.neon-dark";
  if (themeRegistry.getById(id)) return id;
  const bySlug = themeRegistry.getAll().find((t) => t.slug === id);
  return bySlug?.id ?? "com.creatos.neon-dark";
}
