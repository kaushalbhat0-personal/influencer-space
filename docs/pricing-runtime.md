# Pricing Runtime — RCCF-IMPLEMENTATION-71

## BillingPlan becomes the runtime source

```
BEFORE                     AFTER
Registry  →  Marketing     BillingPlan (runtime)  →  Marketing / Pricing / Checkout
   ↓                          ↑ fallback              Upgrade dialogs / Public API
Sync                          ↓ registry (defaults)
BillingPlan (mirror)
```

`BillingPlan` (DB) is now the canonical **runtime** pricing source. The static
registry (`src/config/commerce/plans.ts`) provides **defaults/fallback** — if a
plan has no runtime config, the registry value is used. Super Admin edits apply
instantly without a redeploy.

## The runtime layer

`src/modules/pricing/application/runtime.ts` is the single read path:

| Function | Purpose |
| --- | --- |
| `getRuntimePlans()` | All plans (request-cached, one query) |
| `getRuntimePlan(code)` | Single plan (legacy codes resolve via `LEGACY_TO_CANONICAL`) |
| `getComparisonPlans(family)` | Public comparison (no hidden/enterprise), ordered |
| `getEnterprisePlan(family)` | Enterprise tier for a family |
| `getEffectiveMonthlyPrice(code, cycle)` | Price honoring the **schedule** |
| `getAnnualSavingsPercent(code)` | Annual savings |
| `getUpgrade(code)` | Next tier + exactly what it adds |
| `getEffectiveFeatures(code)` | Capability-engine defaults + runtime overrides |
| `getPublicPricingData()` | Everything the marketing page needs |

### Request-cached + DB-optional

- `loadCached` uses `React.cache` (per-request memoization; one
  `billingPlan.findMany`).
- If the DB is unavailable (or during static build), it **falls back to the
  registry** — marketing never crashes.

## Resolved plan shape

`ResolvedPlan` is a plain serializable object: `code, name, family,
description, marketingDescription, targetAudience, price, annualPrice,
currency, badge, ctaLabel, ctaType, trialDays, gracePeriodDays, hidden,
enterprise, popular, bestValue, recommended, comparisonOrder, colorAccent,
capabilities, featureOverrides, features, highlights, scheduled`.

It is what the marketing page, comparison matrix, JSON-LD, the public API and
upgrade dialogs consume.

## Consumers switched to the runtime

- Marketing pricing page (`/pricing`) + homepage → server components call
  `getPublicPricingData()` and pass `ResolvedPlan[]` to the client `<Pricing>`.
- Comparison matrix → reads each plan's effective `features` map.
- JSON-LD pricing schema → runtime plans (hidden/enterprise excluded).
- Checkout → `createCheckout` now reads the **DB plan price/currency**
  (`billingRepository.findPlanByCode`) with the registry as fallback, so runtime
  price changes hit the Razorpay order + invoice amounts.
- Public API → `/api/pricing/plans` + `/api/pricing/upgrade`.
