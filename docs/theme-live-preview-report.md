# Theme Live Preview Report — IMPLEMENTATION-24

## Theme changes apply instantly

The Builder theme selector updates `themePackageId` (and optional color
overrides) in `BuilderWorkspace` → the canvas's `resolved` memo recomputes
(`themeResolver.resolveForSnapshot` → `layoutEngine.resolve` → new `themeVars`)
→ the device frame's inline style updates. Because renderers read the CSS
variables, the entire canvas re-themes **without a page reload and without
publish**.

No stale runtime: the canvas and the storefront consume the same
`LayoutEngine.buildTheme()` output, so a previewed theme is exactly what a
publish would render.

## Pipeline (live)

```
Builder theme selector
  → themePackageId (+ overrides)
  → themeResolver.resolveForSnapshot(themePackageId, "dark", overrides)
  → ThemeSnapshot
  → layoutEngine.resolve → doc.theme (CSS vars incl. --surface-card, --border, …)
  → device frame inline style
  → every renderer re-reads the vars → instant re-theme
```

## Theme switching (all existing themes)

Every registered theme (creator, business, education, gaming, luxury, podcast,
portfolio, restaurant — light and dark variants) flows through the same path.
Switching updates backgrounds, cards, buttons, text, accents, hover, borders
and badges in one pass.

## No duplicate runtime

The live preview and the published storefront share `buildRuntimeSnapshot` and
`LayoutEngine`; there is no second theme pipeline.
