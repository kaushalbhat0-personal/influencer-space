# Theme Marketplace Expansion Report — IMPLEMENTATION-25

## What was reused (NOT rebuilt)

- **Theme Engine** (`themeRegistry`, `themeResolver`) — unchanged.
- **Theme Runtime** (`LayoutEngine.buildTheme` → CSS vars) — unchanged.
- **Theme Provider** (`builtInThemeProvider`) — unchanged.
- **Theme Tokens / CSS variables** — unchanged.
- **Theme Settings, Builder theme selector, Storefront loader** — unchanged.
- **Marketplace page** (`admin/themes`) — extended in place (same route/component).

## What was extended

| Area | Change |
|---|---|
| Catalog | 20 new curated themes (`themes/catalog.ts`) → **50 total**; each is pure configuration (palette + metadata) via the existing `createTheme`. |
| Tier model | `ThemeTier` (free/starter/pro/business/enterprise) + `access.ts` (plan→tier, `isThemeUnlocked`, `nextTier`) + centralized `THEME_TIER_BY_ID` map (5/10/15/20). |
| createTheme | Now accepts `tier` + `recommended`; `premium` derived from tier. |
| Marketplace UX | Plan banner, search, category/tier filters, sort (featured/tier/name/recent), favorites (localStorage), featured + current badges, lock badge with tier, quick apply (unlocked only → becomes Current instantly), detail panel with upgrade CTA for locked. |
| Runtime | Application still uses the ONE `applyThemePackage` action → `website.themePackageId` → existing runtime. No new runtime path. |

## Extensibility (theme #51 → #500)

Adding a theme is: one entry in `catalog.ts` (or any theme file) + one line in
`THEME_TIER_BY_ID`. No engine, runtime, provider, UI or token changes.

## Verification
- Catalog = **50 themes**, tier distribution **5 free / 10 starter / 15 pro / 20 business**.
- Local P1–P3 **3/3** · Production P1–P3 **3/3**.
- tsc ✅ · 1647 unit tests ✅ · build ✅ · deployed to Vercel ✅.
