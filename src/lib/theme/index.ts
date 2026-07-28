export { themePresetRegistry } from "./presets";
export type { ThemePreset } from "./presets";
export { ThemeService, themeService } from "./service";
export type { ThemeOverrides } from "./types";

// ── Canonical Theme Registry (THEME-01A) ──────────────────────
export { ThemeRegistry, themeRegistry } from "./registry-new";
export type { ThemeProvider } from "./registry-new";
export { ThemeResolver, themeResolver } from "./resolver-new";
export type { ResolvedSnapshotTheme, ThemeResolutionMode } from "./resolver-new";
export { builtInThemeProvider } from "./providers/built-in";
export { tokensToCssVariables, mergeTokens, freezeTokens, DEFAULT_LIGHT_TOKENS, DEFAULT_DARK_TOKENS } from "./tokens-new";
export type { ThemeDefinition, ThemeDesignTokens, ThemeVariant, ThemeCategory, ColorTokens, TypographyTokens, SpacingTokens } from "./types-new";

