# Theme Background Effects — RCCF-LAUNCH-TRACK-07

**Status:** Implemented

## Background kinds and how they render

`ExperienceBackgroundKind` (`theme-experience.ts`): `solid | gradient | mesh |
radial | pattern | multi-radial | aurora | none`.

`background-runtime.tsx` renders each kind via an explicit branch:

| Kind | Render |
| --- | --- |
| `none` / `solid` | `Layers` only (page/section surface shows through) |
| `radial` | single `radial-gradient` from top + `Layers` |
| `gradient` | `linear-gradient(180deg, stops)` from `colors` + `Layers` |
| `multi-radial` | three stacked radial gradients (corners + bottom) |
| `aurora` | four stacked radial gradients (organic color field) |
| `mesh` | two layered dual radials (top + bottom) |
| `pattern` | `Layers` with the pattern SVG (RC3 — explicit branch, no mesh fallthrough) |

`Layers` renders an optional brand-tinted radial glow
(`color-mix(in srgb, var(--brand-primary) 5%, transparent)`) and the static SVG
pattern (`grid`/`dots`/`noise`/`lines`) at 5% opacity. All background layers are
`pointer-events-none absolute inset-0`; content sits above at `z-10`.

## Theme-aware fallback tint (RC10a)

Experience-declared `colors` win; otherwise the fallback tint derives from the
theme's `--brand-primary`:

```
color-mix(in srgb, var(--brand-primary,#6366F1) 8%, transparent)
```

This keeps every free/fallback background connected to the selected theme
instead of a fixed indigo.

## Capability mapping

`BACKGROUND_KIND_CAP` (`experience/capabilities.ts`):

| Kind | Capability |
| --- | --- |
| `solid` / `none` | `theme_background_solid` |
| `gradient` / `radial` / `multi-radial` / `mesh` / `aurora` | `theme_background_gradient` |
| `pattern` | `theme_effects_noise` |

Free (Creator Launch) holds only `theme_background_solid`, so gradient-family
and pattern backgrounds resolve down to `solid`. Grow adds gradient + effects;
Scale adds everything.

## Image/video are NOT theme backgrounds

`ExperienceBackgroundKind` has no `image` or `video` value. Hero image/video is
**creator content** rendered by `HeroMedia`/`HeroBanner` (part of the hero
section, gated by its own CMS/content state), not a theme background. The plan
matrix still lists `theme_background_image` / `theme_background_video`
capabilities, but no experience layer consumes them — they describe the
free/grow/scale band boundaries and are reserved for a future
background-media feature. Documented rather than implemented (P10).

## Pattern assets

`BACKGROUND_ASSETS` (`experience-assets.ts`) holds self-contained SVGs
(`grid`, `dots`, `noise`, `lines`). Each `<pattern>`/`<filter>` id is static
and unique; the `<rect>` reference always resolves. `currentColor` strokes mean
patterns tint with the surrounding text color (typically the theme surface
text).

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues.
- `npm run build` — succeeds.
- `npx vitest run` — 2104/2104 pass.
