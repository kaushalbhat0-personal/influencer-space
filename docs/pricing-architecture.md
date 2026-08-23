# Pricing Architecture — RCCF-IMPLEMENTATION-70

## ONE Commerce Registry

```
src/config/commerce/plans.ts  ← THE single source of truth
   │  code · name · price · annualPrice · capabilities · featureOverrides
   │  marketingDescription · targetAudience · marketingHighlights
   │  badge · ctaLabel · comparisonOrder · trialDays · hidden · enterprise
   │  popular · bestValue · recommended
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Marketing (pricing page, comparison, annual toggle, trial)   │
│ Billing runtime (plan → subscription, checkout)              │
│ Capability engine (features map per plan)                    │
│ Entitlement runtime (limits + upgrade enforcement)           │
│ Catalog seed → BillingPlan DB mirror (Super Admin sync)      │
│ JSON-LD pricing schema                                       │
└─────────────────────────────────────────────────────────────┘
```

Every pricing surface derives from this file. There is **no** duplicated plan
list, feature list, price, or marketing bullet anywhere in the UI.

## Consumers and their source

| Surface | Reads | File |
| --- | --- | --- |
| Pricing cards | `getMarketingPlans` + `plan.marketingHighlights` | `src/components/marketing/Pricing/data.ts` |
| Comparison matrix | `getComparisonPlans` + `FEATURE_CATALOG` + `entitlement.limit` | `Pricing/comparison.tsx` |
| Annual toggle | `getPlanMonthlyPrice` / `getAnnualSavingsPercent` | `Pricing/index.tsx` |
| Upgrade copy | `getUpgradeHighlights` | `data.ts` |
| JSON-LD pricing | `getCreatorCommercePlans`/`getPartnerCommercePlans` (hidden/enterprise filtered) | `src/app/pricing/page.tsx` |
| Capability engine | `featuresForPlan` + `featureOverrides` | `src/lib/capabilities/plans.ts` |
| Catalog DB mirror | `seedBillingCatalog` (persists `marketing` JSON) | `src/modules/billing/infrastructure/catalog-seed.ts` |
| Super Admin Pricing Center | BillingPlan + registry | `src/app/super-admin/pricing` |

## Plan hierarchy (restructured)

**Creator:** Creator Launch (free, 15-day trial) → Creator Growth (₹699/mo,
Most Popular) → Creator Scale (₹1,999/mo, Best Value) → Creator Enterprise
(Contact Sales — shown only under Enterprise Solutions).

**Partner:** Partner Launch (free, 15-day trial) → Solo Partner (₹2,999/mo,
Recommended) → Partner Scale (₹7,999/mo, Best Value) → Enterprise Partner
(Contact Sales). Partner Growth was retired and is now **fully removed** from
the registry (RCCF-MKT-04-R1 — Agency never launched, no subscribers).

## Limit source of truth

Per-plan limits live in `featureOverrides` on each plan (products, gallery,
services, courses, testimonials, FAQs, timeline, links, feed, games, bookings,
AI credits, storage, team, clients, API calls). The capability engine merges
`BASE_FEATURES` + capability grants + `featureOverrides` into
`PlanDefinition.features` — the value the comparison matrix and
`capabilityService.limit` read. Launch = 3-per-module; Growth = unlimited core
modules; Scale adds API/team/storage; partner tiers scale clients/websites.
