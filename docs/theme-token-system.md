# Theme Token System

**Track:** RCCF-LAUNCH-TRACK-05 (Phase 1/2/5)
**Status:** Implemented

## One authority

The Theme Runtime (theme definitions → `ThemeResolver` → `LayoutEngine`) is the
only source of visual tokens. No component chooses colors independently.

## Token groups (`src/lib/theme/types-new.ts` + `tokens-new.ts`)

| Group | Tokens | Emitted as CSS vars |
| --- | --- | --- |
| colors | primary, secondary, accent | `--brand-primary/secondary/accent` |
| | success, warning, danger | `--color-success/warning/danger` |
| | background, surface, surfaceSecondary | `--surface-root`, `--surface-base`, `--surface-secondary` |
| | textPrimary, textSecondary, textMuted | `--text-primary/secondary/muted` |
| | border, focus, overlay | `--border`, `--color-focus` |
| typography | headingFont, bodyFont, monoFont, displayFont | `--brand-font-heading/body/mono/display` |
| spacing, motion, radius, elevation, borders | (defaults) | static globals.css defaults |

## Resolution path

```
ThemeDefinition.variants[].tokens
  → ThemeResolver.resolveForSnapshot()   (extracts full color + font set)
  → ThemeSnapshot (persisted/published, additive fields)
  → LayoutEngine.buildTheme()            (emits CSS variables on <main>)
  → components consume var(--brand-*), var(--surface-*), var(--text-*),
    var(--color-*), var(--border), var(--on-primary), var(--primary-hover)
```

Surfaces `--surface-card`/`--surface-card-hover` are still derived from
`background` by hex math for contrast; `--surface-secondary` and `--border` now
come from the theme's own tokens when present.

## Consumers

- **Buttons**: `.btn-primary/.btn-secondary/.btn-ghost` and `.admin-input`
  (`globals.css`) — `--brand-primary`, `--on-primary`, `--border`,
  `--text-primary`, `--surface-base`, `--color-focus`.
- **Storefront**: buy-now button, pricing cards, product grid, Discord card,
  timeline/course/service accents, `StorefrontNav` — `--brand-*`,
  `--surface-*`, `--border`, `--text-*`.
- **Experience layer**: `--surface-root` (hero blend), `--brand-primary`
  (decorations).
- **Status**: `--color-success/warning/danger` now theme-driven (were static).

## Backward compatibility

All token emission is **additive** — snapshots published before this track lack
the new fields and resolve to derived/global fallbacks (identical colors).
