# Commerce Registry — RCCF-IMPLEMENTATION-70

## What it is

`src/config/commerce/plans.ts` is the canonical commercialization layer. It
holds plan identity, pricing (monthly + annual), capability grants, per-plan
limits, and the full marketing surface. It is the ONLY place these are defined.

## Registry structure

| Section | Purpose |
| --- | --- |
| `CommerceCapability` | The boolean capability enum (basic/advanced builder, themes, domain, AI, API, white-label, analytics, support, storage…) |
| `CommercePlanConfig` | Full plan record (Phase 1–6 fields) |
| `COMMERCE_PLANS` | The 8 plans (4 creator, 4 partner — RCCF-MKT-04-R1 removed the retired Partner Growth) |
| `CAPABILITY_LABELS` | Human labels for capabilities |
| `COMMERCE_CAPABILITY_TO_FEATURE` | Capability → entitlement feature/value mapping |
| `LEGACY_TO_CANONICAL` | Legacy DB codes → canonical codes (backward compat) |
| `MIN_PLAN_FOR_AGENCY_CREATORS` | Agency-managed creators can't be on Launch |
| selectors | `getCommercePlan`, `getMarketingPlans`, `getEnterprisePlan`, `getPlanMonthlyPrice`, `getAnnualSavingsPercent`, `getUpgradeHighlights`, `featuresForPlan` |

## Derivation chain (no duplicated logic)

1. `featuresForPlan(code)` → boolean feature map from `capabilities` +
   `COMMERCE_CAPABILITY_TO_FEATURE`.
2. `src/lib/capabilities/plans.ts` → `PlanDefinition.features =
   BASE_FEATURES + featuresForPlan + featureOverrides`. This is what
   `capabilityService.limit/can` and the comparison matrix read.
3. `FEATURE_CATALOG` (`src/lib/capabilities/features.ts`) → labels, categories,
   value types, groups for every feature (products, gallery, services, courses,
   testimonials, FAQs, timeline, links, feed, games, bookings, AI credits…).
4. `seedBillingCatalog` → mirrors plan + `marketing` JSON into `BillingPlan`.

## Canonical selectors

- `getMarketingPlans(family)` — standard comparison plans (no hidden, no
  enterprise), ordered by `comparisonOrder`.
- `getEnterprisePlan(family)` — the enterprise tier for a family.
- `getUpgradeHighlights(code)` — what the next visible tier adds.
- `getPlanMonthlyPrice(plan, cycle)` / `getAnnualSavingsPercent(plan)` — annual
  math (annual = 10 × monthly).
- `featuresForPlan(code)` — capability→feature map used by the capability
  engine.

## Invariants (test-enforced in `tests/unit/commerce-registry.test.ts`)

- Unique plan codes.
- Creator lineup = Launch/Growth/Scale (+ Enterprise hidden); Partner lineup =
  Launch/Solo/Scale (+ Growth hidden, + Enterprise hidden).
- Canonical prices (699 / 1999 / 2999 / 7999).
- Per-plan limits present (Launch 3-per-module, Growth unlimited).
- Annual savings in a sane 1–25% band.
- Every marketing highlight backed by a real capability keyword.
- Legacy mapping internal only.

## Rules

- Prices, features and marketing copy are **never** hardcoded in components.
- Plan codes are **never** renamed — legacy aliases only.
- Enterprise + hidden plans are excluded from the comparison and JSON-LD.
