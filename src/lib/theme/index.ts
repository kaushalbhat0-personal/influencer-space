/** @deprecated Use ThemeRegistry (registry-new.ts) instead. */
export { themePresetRegistry } from "./presets";
/** @deprecated Use ThemeRegistry (registry-new.ts) instead. */
export type { ThemePreset } from "./presets";
/** @deprecated Use ThemeRegistry/ThemeResolver instead. */
export { ThemeService, themeService } from "./service";

// ── Canonical Theme Registry (THEME-01A) ──────────────────────
export { ThemeRegistry, themeRegistry } from "./registry-new";
export type { ThemeProvider } from "./registry-new";
export { ThemeResolver, themeResolver, normalizeThemeId } from "./resolver-new";
export type { ResolvedSnapshotTheme, ThemeResolutionMode } from "./resolver-new";
export { builtInThemeProvider } from "./providers/built-in";
export { tokensToCssVariables, mergeTokens, freezeTokens, DEFAULT_LIGHT_TOKENS, DEFAULT_DARK_TOKENS } from "./tokens-new";
export type { ThemeDefinition, ThemeDesignTokens, ThemeVariant, ThemeCategory, ColorTokens, TypographyTokens, SpacingTokens } from "./types-new";

