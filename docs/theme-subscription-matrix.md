# Theme Subscription Matrix — IMPLEMENTATION-25

## Plan → tier band → themes unlocked

| Plan | Tier band | Themes unlocked | Tier labels |
|---|---|---|---|
| FREE | `free` | 5 | Free |
| STARTER | `free` + `starter` | 15 | Free + Starter |
| PRO | `free` + `starter` + `pro` | 30 | + Pro |
| BUSINESS | + `business` | 50 (all) | + Business |
| ENTERPRISE | everything | all + future premium | Enterprise |

## Implementation

- `src/lib/theme/access.ts`:
  - `planTier(plan)` maps subscription plan codes (`FREE/STARTER/PRO/GROWTH/
    ENTERPRISE`, `creator_*`, `agency_*`, `FREELANCER`) → a tier.
  - `isThemeUnlocked(themeTier, plan)` → `tierRank(theme) <= tierRank(plan)`.
  - `nextTier(plan)` → the upgrade path.
- `src/lib/theme/tiers.ts`: `THEME_TIER_BY_ID` is the single data source that
  assigns a tier to every theme (5/10/15/20). `getThemeTier(theme)` reads it.

## Gating behavior (marketplace)

- Locked themes: show the lock overlay + tier badge, can be **previewed** (full
  detail: colors, typography, description, benefits) but **cannot be applied**.
- The detail panel shows: "This theme requires the **<Tier>** plan …" with an
  **Upgrade to unlock** CTA (links to `/admin/billing`).
- Unlocked themes show an **Apply Theme** button; applying uses the single
  `applyThemePackage` runtime action and marks the theme Current instantly.
- The plan banner shows "N of 50 themes unlocked".

## Verified (P1/P3)

- P1: locked badges present for business-tier themes; apply buttons present for
  unlocked ones.
- P3: a locked theme's detail has **no** apply button + shows Upgrade; applying
  an unlocked theme makes it Current.
