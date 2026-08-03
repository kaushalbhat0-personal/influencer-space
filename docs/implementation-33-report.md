# Billing v2 Consolidation — IMPLEMENTATION-33

## 1. Architecture summary

Phase 1 of the Commerce Activation Initiative. Consolidated every billing
consumer onto Billing v2 (`modules/billing/**` + `lib/capabilities/**`),
established a single authoritative subscription + entitlement source, and
enforced server-side theme entitlement — with **no behavior change to the
revenue flow** and the legacy `Subscription` table left intact for
backward compatibility. No new billing systems were introduced.

```
Legacy readers (5) → resolveActivePlan() → BillingSubscription → BillingPlan
Every plan value   → resolvePlan()       → lib/capabilities (single mapping)
Theme apply        → themeEntitlementDecision() → CapabilityService premium_themes
```

## 2. Billing consolidation overview

| Concern | Before | After |
|---|---|---|
| Plan→tier mapping | 3 duplicated maps (LEGACY_PLAN_MAP, PLAN_TO_TIER, local display) | ONE `plan-resolution.ts` |
| Plan source | 5 readers on legacy `Subscription` + hardcoded `creator_free` | `resolveActivePlan()` (v2 first, legacy fallback) |
| Subscription status | `getSubscriptionStatus` returned `creator_free` always | returns the real `BillingSubscription.plan.code` |
| Theme apply | no server-side check | `themeEntitlementDecision` via CapabilityService |
| Marketplace client | duplicated `order.indexOf` rank logic | `isThemeUnlocked` (canonical) |

## 3. Consumer migration map

| Reader | Location | Migrated |
|---|---|---|
| Theme Marketplace | `app/admin/themes/page.tsx` | ✅ `resolveActivePlan(undefined, tenantId)` |
| Marketplace client lock | `theme-marketplace-client.tsx` | ✅ `isThemeUnlocked(tier, plan)` |
| Builder Overview | `actions/builder-overview.actions.ts` | ✅ `resolveActivePlan` + `resolvePlan` (local map removed) |
| Workspace plan chip | via builder-overview | ✅ |
| Super Admin Subscriptions | `super-admin/subscriptions/page.tsx` | ✅ `listAllSubscriptions()` |
| Super Admin Revenue | `super-admin/revenue/page.tsx` | ✅ `listAllSubscriptions()` |
| Subscription Metrics | `super-admin.service.ts` | kept v2 + legacy counts (metric parity) |
| Legacy Pro Counts | `billingRepository.countProSubscriptionsLegacy` | kept (read-only metric) |

Legacy table: **never written by this change**; removed only in a future
implementation after all readers are migrated.

## 4. Plan resolution architecture

`src/lib/capabilities/plan-resolution.ts` is the single resolver:

```
resolvePlan(value) → { code (canonical), displayName, family, tier, legacy, source, plan }
canonicalPlanCode(value) → canonical code | null
planTierFor(value) → theme tier band
```

- Handles legacy strings (`STARTER→creator_free`, `PRO→creator_pro`,
  `GROWTH→agency_growth`, `ENTERPRISE→agency_agency`, `FREELANCER→agency_starter`).
- Handles canonical codes (`creator_*`, `agency_*`) incl. aliases.
- `theme/access.ts` now delegates to it — no duplicate mapping.
- Diagnostics registry `LEGACY_READER_MIGRATION_STATUS` (7 readers, all migrated).

## 5. Entitlement flow

```
applyThemePackage(tenantId, themePackageId)
  → normalizeThemeId
  → getThemeTier(theme)                       (tier != free ⇒ premium)
  → resolveActivePlan(undefined, tenantId)    (BillingSubscription → legacy fallback)
  → themeEntitlementDecision(tier, planCode)  (pure)
      tier free  ⇒ allowed
      premium    ⇒ canonicalPlanCode → capabilityService.can(code,"premium_themes")
  → allowed ? persist theme : { success:false, "This theme requires an upgraded plan." }
```

Client locks remain **visual only**; the server is authoritative.

## 6. Diagnostics

`/dev/billing-consolidation` (dev-only, auth-gated):
resolved plan (`bd-plan`), origin (`bd-origin` v2/legacy/none), display/tier/
family, capability source (`bd-capability-source`), `premium_themes` decision
(`bd-premium` allowed/denied), v2 + legacy subscription counts, and the 7-reader
migration registry (`bd-readers`). Observability only — never changes behavior.

## 7. Runtime flow

```
resolveActivePlan(workspaceId?, tenantId?)
  workspace → billingRepository.findSubscriptionWithPlan → v2 plan.code  (wins)
  tenant    → workspace → v2 plan.code
           → else prisma.subscription (legacy fallback)
  none      → { code: null, origin: "none" }
```

## 8. Files changed

| File | Change |
|---|---|
| `src/lib/capabilities/plan-resolution.ts` | NEW canonical plan resolver + migration registry |
| `src/lib/theme/access.ts` | Delegates plan→tier to the canonical resolver (no duplicate map) |
| `src/lib/theme/entitlement.ts` | NEW pure `themeEntitlementDecision` |
| `src/modules/billing/application/plan-source.ts` | NEW `resolveActivePlan` + `listAllSubscriptions` (v2+legacy) |
| `src/modules/billing/application/service.ts` | `getSubscriptionStatus` returns the real plan |
| `src/actions/theme.actions.ts` | Server-side premium-theme entitlement in `applyThemePackage` |
| `src/actions/builder-overview.actions.ts` | v2 plan resolution; removed local display map |
| `src/app/admin/themes/page.tsx` + client | v2 plan + canonical `isThemeUnlocked` |
| `src/app/super-admin/subscriptions|revenue/page.tsx` | `listAllSubscriptions()` union |
| `src/app/dev/billing-consolidation/page.tsx` | NEW dev diagnostics |
| `vitest.config.ts` | Include `src/modules/**/__tests__` |
| tests | `plan-resolution.test.ts`, `plan-source.test.ts`, `implementation33.spec.ts` |

## 9. Unit test summary

**17 new tests**:
- Plan resolution: canonical passthrough, legacy→canonical, unknown/null → free,
  tier bands, source/legacy flags, display names.
- Theme access delegation: `planTier`/`isThemeUnlocked`/`nextTier`/`tierRank` for
  legacy + canonical values (no duplicate mapping).
- Entitlement: `premium_themes` per plan via CapabilityService.
- Theme entitlement decision: free allowed, premium blocked for free/unknown,
  allowed for paid (incl. legacy `PRO`).
- `resolveActivePlan`: v2 by workspace, v2 via tenant's workspace, legacy
  fallback, none.
- `listAllSubscriptions`: v2 + legacy union without per-tenant duplication
  (v2 wins).
- Diagnostics registry: all 7 readers migrated.

Full suite: **86 files / 1792 tests**.

## 10. Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## 11. Playwright Local

`R7` — **4/4 passed (1.2m)**:
1. Diagnostics resolve the plan (origin v2/legacy/none, capability source,
   7/7 readers migrated).
2. Theme Marketplace renders gating from the resolved subscription.
3. Server-side premium-theme entitlement decision is surfaced and consistent
   with the resolved tier.
4. Diagnostics DOM matches the Billing runtime (7 migrated readers + counts).
Plus theme-marketplace regression suites (implementation25 + 26, **7/7**).

## 12. Playwright Production

`https://influencer-space-alpha.vercel.app` — **4/4 passed (42.5s)** (deployed
commit `4cb9206`).

## 13. Browser verification

The diagnostics DOM (`bd-plan/bd-origin/bd-premium/bd-readers`) matches the
Billing v2 runtime locally and in production: the seeded creator's plan resolves
through `resolveActivePlan` with the origin reported, `premium_themes` reflects
the actual entitlement, and all 7 legacy readers report migrated. Theme
Marketplace + Builder consume the same BillingSubscription-backed plan. Browser
DOM → Billing Runtime → BillingSubscription → CapabilityService →
EntitlementService → Builder/Marketplace stay synchronized.

## 14. Technical debt removed

- Duplicated plan→tier mappings (3 → 1).
- Hardcoded `creator_free` in `getSubscriptionStatus`.
- Local display map in `builder-overview` (removed).
- Duplicated tier-rank logic in the theme marketplace client.
- No server-side theme authorization (added).
- 5 legacy readers migrated off the legacy `Subscription` table.

## 15. Remaining legacy debt

- Legacy `Subscription` table (still read by the fallback path + metrics; writes
  remain via `updateSubscriptionPlan`). **Intentional** — removed in a future
  implementation once all consumers confirm v2 coverage.
- v1 `lib/billing/*` service/providers and `features/billing/*` (dead) — outside
  this phase's scope.
- `/admin/payments` dead nav link; super-admin analytics placeholder.

## 16. Commit message suggestion

```
feat(billing): Billing v2 Consolidation
- canonical plan resolution (single mapping); theme/access delegates
- resolveActivePlan (v2 + legacy fallback); real getSubscriptionStatus
- all 5 legacy readers migrated (marketplace/builder/workspace/super-admin)
- server-side premium-theme entitlement via CapabilityService
- dev diagnostics; 17 unit tests; R7 local & production; theme regressions pass
```
