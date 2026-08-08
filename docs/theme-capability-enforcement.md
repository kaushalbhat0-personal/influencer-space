# Theme Capability Enforcement

**Track:** RCCF-LAUNCH-POLISH-06 (Phases 3–11)
**Status:** Implemented

## One authority

The **Capability Runtime** (`src/lib/capabilities`) is the single source of
truth for what a plan may visually render. No layer hardcodes `plan === "grow"`
— every visual decision flows through `capabilityService.can(plan, capability)`.

### Canonical theme capabilities

Defined in `src/config/commerce/plans.ts` (`CommerceCapability`) and mapped to
boolean features so `capabilityService.can()` is authoritative:

| Capability | Launch | Grow | Scale |
| --- | --- | --- | --- |
| `theme_background_solid` | ✅ | ✅ | ✅ |
| `theme_background_gradient` | — | ✅ | ✅ |
| `theme_background_image` | — | ✅ | ✅ |
| `theme_background_animation` | — | ✅ | ✅ |
| `theme_effects_particles` | — | ✅ | ✅ |
| `theme_effects_glow` | — | ✅ | ✅ |
| `theme_effects_noise` | — | ✅ | ✅ |
| `theme_effects_blur` | — | ✅ | ✅ |
| `theme_background_video` | — | — | ✅ |
| `theme_effects_custom` | — | — | ✅ |

## How it is enforced

### Experience ↔ capability mapping — `src/modules/theme/runtime/experience/capabilities.ts`

- `requiredCapabilitiesForExperience(experience)` — derives the capability set a
  `ThemeExperience` needs (background kind, glow, pattern, decoration pack,
  motion, surface, divider + per-section overrides).
- `experienceAvailableForPlan(experience, planCode)` — all-or-nothing check.
- `resolveExperienceForCapabilities(experience, planCode)` — downgrades
  unentitled layers to the safe free tier (solid background, minimal decoration,
  static motion, flat surface, fade divider). Never a broken render.

Background-kind mapping: `solid/none → solid`; `gradient/radial/multi-radial/
mesh/aurora → gradient`; `pattern → noise`; glow → `theme_effects_glow`;
non-minimal decoration → `theme_effects_particles`; non-static motion →
`theme_background_animation`; glass/premium surfaces → `theme_effects_blur`;
custom dividers → `theme_effects_glow`.

### Builder (Phase 8)

Theme selection is the only background control; it is gated server-side by
`themeEntitlementDecision` (`src/lib/theme/entitlement.ts`, `premium_themes`
capability) and the theme picker locks premium themes with an **Upgrade to Grow**
dialog. `isExperienceAvailableForPlan` now routes through the capability engine
(no raw `PLAN_TIER_ORDER`).

### Publishing (Phase 9)

`publishingService.publish()` runs `validateThemeCapabilities(tenantId,
themePackageId)` and returns canonical, machine-readable `CapabilityIssue[]`
(code/label/plan). These are **non-blocking**: existing free creators with
premium themes already applied keep publishing (the storefront falls back);
the builder prevents new premium selections. `validateBeforePublish` surfaces
the same warnings ("Upgrade to Creator Growth").

### Storefront (Phase 10)

`src/app/[domain]/page.tsx` resolves the tenant's active plan
(`resolveActivePlan`) and runs the resolved experience through
`resolveExperienceForCapabilities`. Unsupported premium layers are never
rendered for free plans; paid creators are never degraded. Plan-resolution
failure degrades gracefully to the free tier.

## Extra requirement: audit of plan-gated features

Every subscription-gated feature was audited. All flow through the Capability
Runtime:

- **Custom domains** → `entitlement.can(planCode, "custom_domain")` (`domain.actions.ts`)
- **Premium themes** → `capabilityService.can(..., "premium_themes")` (`theme.actions.ts`)
- **Custom branding** → `entitlementService.has(planTier, "custom_branding")` (`appearance/page.tsx`)
- **Marketplace packages** → `capabilityService.can(..., cap)` (`marketplace/registry.ts`)
- **Limits** (products/gallery/etc.) → `capabilityService.limit(...)` (`billing/service.ts`)

The former raw-string experience gate (`EXPERIENCE_MIN_PLAN` + `PLAN_TIER_ORDER`)
was **removed** and replaced with capability-driven checks. Remaining raw plan
references are intentional non-gates: `planTierFor` (a derived display tier for
the theme lock UI), `isAgencyRestrictedPlan` (agency-creator minimum plan
business rule), customer-success opportunity targeting, and legacy plan-code
display chips. These are documented, not feature gates.
