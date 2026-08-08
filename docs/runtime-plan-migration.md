# Runtime Plan Migration

**Track:** RCCF-LAUNCH-TRACK-05 (Phase 8/9)
**Status:** Implemented

## Canonical source

The **BillingPlan Runtime** (`src/modules/pricing/application/runtime.ts`) is the
single source of truth for plan identity:

- **Canonical plans**: Creator Launch / Creator Growth / Creator Scale /
  Creator Enterprise (+ Partner family), stored in `BillingPlan` (DB) merged over
  `COMMERCE_PLANS` defaults.
- **Reading**: `resolveActivePlan` (v2-first, legacy fallback) →
  `resolvePlan().displayName`.
- **Writing**: `updateSubscriptionPlan` → `canonicalPlanCode()` → Billing v2 via
  `billingService.adminSetPlan` (legacy `Subscription` is read-only compat).

## What was migrated

| Surface | Before | After |
| --- | --- | --- |
| Super Admin Tenant Ledger | raw legacy `STARTER`/`PRO` strings, `plan === "PRO"` badge, modal "Set to STARTER/PRO" | canonical display names (Creator Launch/Growth/Scale) from the runtime; `planCode` badge; modal sets `creator_launch/grow/scale` |
| Super Admin subscriptions table | legacy `"PRO"`/`"AGENCY"` badge component | component deleted (dead code) — the live table is runtime-driven |
| `getAllTenants` | `subscription.plan` = display name only | also exposes `subscription.planCode` (canonical) for badge/tier logic |

## Verification

- `grep` for legacy display strings across `src`: no `"STARTER"`/`"PRO"`
  plan labels remain in any live UI (legacy codes only exist in canonicalization
  maps + tests that exercise backward compatibility).
- Changing a `BillingPlan` name in the Pricing Runtime automatically updates the
  Tenant Ledger and every plan surface (all read from the runtime).
