# Theme Builder Unification — IMPLEMENTATION-26

## The problem

The Builder's `ThemeCard` showed only `allThemes.slice(0, 6)` — the first 6
registered themes. Marketplace and Builder therefore had **different theme
lists**, and premium themes were fully disabled (not even previewable).

## The fix (single source)

- `ThemeCard` now calls `themeRegistry.getAll()` and renders **all 50 themes**
  (no `slice`). The same catalog the Marketplace, Storefront and Settings use.
- Locked themes are **visible** (never hidden) with a tier badge + lock icon.
- The Builder has **no filtered list of its own** — it consumes the exact same
  registry the Marketplace reads.

## Builder theme browser (Phase J)

- All 50 themes in a scrollable grid.
- Search (name / description / tags).
- Category dropdown (`CATEGORY_LABELS`).
- Favorites toggle (same `theme_favorites` localStorage key as the Marketplace →
  favorites sync across surfaces).
- Badges: **Current**, **Preview**, **Free/Starter/Pro/Business**, lock icon.
- "N of 50 themes" counter.
- Live preview banner + Apply / Upgrade actions.

## Verified

- Q1: Builder shows **50** cards and "of 50 themes".
- Local + production pass.
