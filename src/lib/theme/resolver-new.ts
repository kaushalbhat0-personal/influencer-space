import { themeRegistry } from "./registry-new";

export interface ResolvedSnapshotTheme {
  packageId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  typography: {
    heading: string;
    body: string;
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
    _options?: {
      inheritedThemeId?: string;
      overrides?: Partial<ResolvedSnapshotTheme>;
    },
  ): ResolvedSnapshotTheme | null {
    const theme = themeRegistry.getById(themeId);
    if (!theme) {
      // Fallback: try default theme
      const defaultTheme = themeRegistry.getById("com.creatos.neon-dark");
      if (!defaultTheme) return null;
      return this.extractSnapshotTheme(defaultTheme, mode);
    }

    return this.extractSnapshotTheme(theme, mode);
  }

  private extractSnapshotTheme(
    theme: NonNullable<ReturnType<typeof themeRegistry.getById>>,
    mode: ThemeResolutionMode,
  ): ResolvedSnapshotTheme {
    const variant = theme.variants.find((v) => v.mode === mode) ?? theme.variants[0];

    if (!variant) {
      // Fallback: return theme identity with defaults
      return {
        packageId: theme.id,
        colors: {
          primary: "#6366F1",
          secondary: "#818CF8",
          accent: "#A5B4FC",
          background: "#09090b",
          foreground: "#fafafa",
          muted: "#a1a1aa",
        },
        typography: {
          heading: "Inter, system-ui, sans-serif",
          body: "Inter, system-ui, sans-serif",
        },
      };
    }

    return {
      packageId: theme.id,
      colors: {
        primary: variant.tokens.colors.primary,
        secondary: variant.tokens.colors.secondary,
        accent: variant.tokens.colors.accent,
        background: variant.tokens.colors.background,
        foreground: variant.tokens.colors.textPrimary,
        muted: variant.tokens.colors.textMuted,
      },
      typography: {
        heading: variant.tokens.typography.headingFont,
        body: variant.tokens.typography.bodyFont,
      },
    };
  }
}

export const themeResolver = new ThemeResolver();
