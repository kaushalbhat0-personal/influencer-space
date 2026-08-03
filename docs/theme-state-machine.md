# Theme State Machine — IMPLEMENTATION-26

Every theme has exactly one state at any time. States are derived from the
existing single data source (`themeRegistry` + `THEME_TIER_BY_ID` +
`planTier(plan)`) — no duplicated state management.

## States

| State | Condition | Behavior |
|---|---|---|
| **Current** | `theme.id === currentThemeId` | Applied + active; badge on card |
| **Applied** | `Website.themePackageId === theme.id` | persisted; source of the storefront |
| **Previewing** | `theme.id === previewThemeId && !== currentThemeId` | temporary canvas render; never persisted |
| **Locked** | `!themeUnlockedForPlan(theme, plan)` | previewable; apply blocked → Upgrade |
| **Available** | unlocked + not current | can preview + apply |
| **Recommended** | `theme.recommended` | curated badge/order |
| **Featured** | `theme.featured` | marketplace highlight |
| **New** | recent `releaseDate` | sortable via "Newest" |

## Transitions

- **Available → Previewing**: click a theme (`onThemePreview`) — temporary.
- **Previewing → Current**: Apply (unlocked) — persists + badge moves.
- **Previewing → Available**: revert (restores current).
- **Locked → Previewing**: click a locked theme — allowed (temporary).
- **Locked → (never Current)**: Apply blocked; Upgrade dialog.
- **Current → Available**: apply a different theme.

## Single source

State is derived from: `currentThemeId` (DB), `previewThemeId` (Builder
ephemeral), `planTier(plan)` + `THEME_TIER_BY_ID` (gating). The Marketplace,
Builder, Settings and Storefront all derive from these — no divergent copies.
