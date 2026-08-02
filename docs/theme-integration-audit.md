# Theme Integration Audit — IMPLEMENTATION-24

## What already existed (reused, not rebuilt)

| System | Location | Status |
|---|---|---|
| Theme Engine (registry + resolver) | `src/lib/theme/registry-new.ts`, `resolver-new.ts` | ✅ existing |
| Design tokens (`ThemeDesignTokens`) | `src/lib/theme/tokens-new.ts` — colors (primary/secondary/accent/success/warning/danger/background/surface/surfaceSecondary/textPrimary/textSecondary/textMuted/border/focus/overlay), typography, spacing, radius, elevation, motion, borders + `tokensToCssVariables()` | ✅ existing |
| Themes (marketplace) | `src/lib/theme/themes/*` (creator, business, education, gaming, luxury, podcast, portfolio, restaurant) | ✅ existing |
| Theme settings + Builder theme selector | `src/app/admin/settings` + Builder properties | ✅ existing |
| Theme runtime (snapshot) | `ThemeSnapshot` (6 colors + typography) → `LayoutEngine.buildTheme()` emits CSS vars | ✅ existing |
| Storefront theme application | `<main style={theme}>` applies the vars | ✅ existing |

## The gap

`LayoutEngine.buildTheme()` emitted only 7 CSS vars:
`--brand-primary/secondary/accent`, `--surface-root`, `--surface-base`,
`--text-primary`, `--text-secondary`.

Every non-Hero renderer styled itself with **hardcoded Tailwind**:
`bg-zinc-900/50`, `bg-zinc-900`, `bg-zinc-800`, `border-white/10`,
`text-white`, `text-zinc-300/400/500/600`, `hover:bg-white/10`. On a light
theme (e.g. `creator-studio` light, background `#FFFFFF`) those dark zinc cards
+ white text made sections render effectively invisible/black.

## Integration layer added (no new engine, no duplicate tokens)

1. `LayoutEngine.buildTheme()` now also emits **semantic vars derived from the
   existing snapshot colors** (light/dark aware):
   `--surface-card`, `--surface-card-hover`, `--border`, `--on-primary`,
   `--primary-hover`, `--live`. Existing vars unchanged (backward compatible).
2. `globals.css` defines fallbacks for every semantic var.
3. Renderers consume the vars; the storefront `<main>` and the **Builder device
   frame** apply the same runtime vars (the builder previously dropped them).

Helpers: hex→rgb/luminance, `deriveSurface` (lift for dark, sink for light),
`deriveBorder` (subtle white/black by luminance), `deriveOnColor`,
`deriveShade`.
