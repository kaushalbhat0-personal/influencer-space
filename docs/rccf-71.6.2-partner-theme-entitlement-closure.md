# RCCF-71.6.2 — Partner Theme Experience Entitlement Closure

## 1. Final Partner Capability Matrix

| Capability | `partner_free` | `partner_solo` | `partner_growth` | `partner_scale` | `partner_enterprise` |
|---|---:|---:|---:|---:|---:|
| Basic theme packages | Yes | Yes | Yes | Yes | Yes |
| Premium theme packages | No | Yes | Yes | Yes | Yes |
| `advanced_builder` custom Appearance/Hero base | No | Yes | Yes | Yes | Yes |
| Solid background | Yes | Yes | Yes | Yes | Yes |
| Gradient/image/animated backgrounds | No | Yes | Yes | Yes | Yes |
| Particles/glow/noise/blur | No | Yes | Yes | Yes | Yes |
| Video background capability | No | No | No | Yes | Yes |
| Custom effects capability | No | No | No | Yes | Yes |
| Theme tier band | Free | Business | Business | Enterprise | Enterprise |

Typography, heading weight, radius, density, colors, and Hero presentation use
the existing `advanced_builder` capability. Backgrounds and surfaces additionally
use the existing granular `theme_background_*` and `theme_effects_*` keys.

## 2. Existing Capability Keys Used

No new capability keys were created.

Existing keys used:

- `premium_themes` — premium theme-package selection only.
- `advanced_builder` — custom Appearance and Hero presentation base access.
- `theme_background_solid`
- `theme_background_gradient`
- `theme_background_image`
- `theme_background_animation`
- `theme_background_video`
- `theme_effects_particles`
- `theme_effects_glow`
- `theme_effects_noise`
- `theme_effects_blur`
- `theme_effects_custom`

## 3. Exact Files Changed

- `src/config/commerce/plans.ts`
  - Added the existing granular Growth-level keys to Partner Solo/Growth.
  - Added the existing Scale-level keys to Partner Scale/Enterprise.
  - Added basic solid-background capability to Partner Free.

- `src/modules/theme/runtime/experience/capabilities.ts`
  - Added canonical helpers for creator-selected background and surface preset requirements.
  - Uses `advanced_builder` plus the existing granular visual keys.

- `src/modules/theme/runtime/experience/index.ts`
  - Exported the canonical preset requirement helpers.

- `src/actions/theme.actions.ts`
  - Removed `premium_themes` as the broad Appearance mutation gate.
  - Added server-side `advanced_builder` and preset-specific capability checks.
  - Kept `premium_themes` in `applyThemePackage()` for package selection.

- `src/actions/builder-overview.actions.ts`
  - Added server-derived `advancedBuilder` capability data.

- `src/features/builder/components/appearance-panel.tsx`
  - Appearance lock now uses `advancedBuilder`, not `premiumThemes`.
  - Upgrade messaging is plan-neutral and Partner-safe.

- `src/features/builder/components/website-panel.tsx`
  - Passes the server-derived `advancedBuilder` flag.

- `src/app/admin/appearance/page.tsx`
  - Admin Appearance access now uses `advanced_builder`.

- Existing RCCF tests updated to reflect the new package-vs-Appearance separation.

- `tests/unit/rccf71-6-2-partner-theme-entitlement.test.ts`
  - Added Partner capability, mutation, runtime, and parity guardrails.

## 4. `premium_themes` vs Granular Capability Separation

Before:

```text
premium_themes = true
  -> entire Appearance panel enabled
```

After:

```text
premium_themes
  -> premium theme-package selection

advanced_builder
  -> custom Appearance/Hero mutation base

theme_background_* / theme_effects_*
  -> specific runtime visual layers
```

This removes the Partner false-enable condition where paid Partner plans could
open Appearance while lacking the granular runtime capabilities.

## 5. Server Security Verification

- `applyThemePackage()` remains gated by `themeEntitlementDecision()`.
- `updateTheme()` now rejects custom Appearance mutations without
  `advanced_builder`.
- Background mutations require the existing required background capabilities.
- Surface mutations require `advanced_builder` and `theme_effects_blur` for
  premium surfaces.
- Partner Free cannot regain custom Appearance through ThemeConfig payloads,
  direct server calls, URLs, theme IDs, Builder state, or preview state.
- Client locks remain presentation-only; server checks are authoritative.
- No Partner plan-code condition was added to application logic.

## 6. Builder / Preview / Publish / Storefront Parity

The existing shared chain remains unchanged:

```text
effective plan
  -> canonical capabilities
  -> applyExperienceOverride
  -> resolveExperienceForCapabilities
  -> Builder preview
  -> preview snapshot
  -> publish snapshot
  -> storefront
```

Partner-entitled capabilities use the same runtime resolver as Creator plans.
Denied capabilities degrade through the existing safe fallback.

No Partner renderer or parallel theme path was introduced.

## 7. Tests Added / Updated

Focused Partner coverage includes:

- Partner Free premium denial.
- Partner Solo/Growth Growth-level capability bundles.
- Partner Scale/Enterprise existing Scale capability bundles.
- Partner theme-tier decisions.
- `advanced_builder` requirement for custom Appearance.
- Background and surface granular requirements.
- Runtime availability equivalence between Creator Growth and Partner Growth.
- Video/custom capabilities remaining unavailable to Partner Growth.
- Server mutation separation from `premium_themes` package selection.
- Builder lock source and no client Partner plan checks.
- Builder/preview/publish/storefront resolver parity.

Existing Launch, Growth, theme entitlement, plan-resolution, commerce, and
RCCF-71.6.1 tests were updated or retained as regression coverage.

## 8. Verification

| Gate | Result |
|---|---|
| Focused Partner/capability/theme/regression suites | PASS — 220/220 |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| ESLint touched TS/TSX files | PASS — no errors |
| `git diff --check` | PASS with pre-existing CRLF warnings only |

## 9. Frozen Surfaces Confirmed Untouched

- Prisma schema/migrations.
- Billing lifecycle and webhooks.
- RCCF-71.6.1 effective-plan resolver.
- Signup/authentication.
- Hero content ownership.
- Builder canvas/device-frame architecture.
- ThemeRegistry architecture.
- Publishing architecture and snapshot schema.
- Client-side capability authority.

## 10. Remaining Scale / Enterprise Gaps

- `theme_background_video` and `theme_effects_custom` are now assigned to
  Partner Scale/Enterprise because those existing keys define the Scale bundle.
- No new video/custom runtime or Builder controls were implemented.
- Partner Scale/Enterprise behavior for those capabilities remains limited to
  the existing capability definitions and current resolver behavior.
- Enterprise-specific theme packages remain unassigned.

No commit was created.
