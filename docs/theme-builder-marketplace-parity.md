# Theme Builder ↔ Marketplace Parity — IMPLEMENTATION-26

## One catalog, one gating, one runtime

| Surface | Theme list | Gating | Favorites | Current |
|---|---|---|---|---|
| Builder theme browser | `themeRegistry.getAll()` (50) | `themeUnlockedForPlan` / `getThemeTier` | `theme_favorites` | `currentThemeId` |
| Marketplace | `themeRegistry.getAll()` (50) | `themeUnlockedForPlan` / `getThemeTier` | `theme_favorites` | `currentThemeId` |
| Theme Settings | same registry | same gating | — | `currentThemeId` |
| Storefront | LayoutEngine runtime | — | — | `Website.themePackageId` |

## No divergence

- **Same catalog**: both Builder and Marketplace render all 50 themes from
  `themeRegistry.getAll()` — no Builder subset.
- **Same locked state**: both use `themeUnlockedForPlan(theme, plan)` with the
  same `THEME_TIER_BY_ID` map.
- **Same favorites**: both read/write the `theme_favorites` localStorage key.
- **Same current**: both read `Website.themePackageId` (server prop) and update
  it through the single `applyThemePackage` action.
- **Same runtime**: applying (Builder or Marketplace) writes
  `Website.themePackageId`; the storefront + preview resolve it via the one
  LayoutEngine.

## Verified

- Q1: Builder shows 50 themes (matches Marketplace).
- Q3: applying in the Builder persists `Website.themePackageId` (the same value
  the Marketplace reads as Current and the Storefront renders).
- P1/P3 (marketplace) + Q1–Q4 (builder) pass locally and on production.
