# Commercialization — RCCF-IMPLEMENTATION-71

## The commercialization stack

```
┌─ Super Admin (Pricing Center) ─────────────────────────────┐
│  plan CRUD · capabilities · limits · marketing · schedule  │
│  versioning · rollback · coupons · launch programs         │
└───────────────┬────────────────────────────────────────────┘
                ▼
┌─ BillingPlan (runtime source) ─────────────────────────────┐
│  code · name · price · currency · gracePeriodDays          │
│  runtimeConfig JSON: capabilities, featureOverrides,       │
│  marketing, pricing (+ schedule)                           │
│  PlanPricingVersion · Coupon · LaunchProgram               │
└───────────────┬────────────────────────────────────────────┘
                ▼
┌─ Runtime pricing module (request-cached, registry fallback)─┐
│  getPlans · getComparison · getUpgrade · getCapabilities    │
│  getLimits · getEffectiveMonthlyPrice                       │
└───────────────┬────────────────────────────────────────────┘
   ┌────────────┼──────────────┬──────────────┐
   ▼            ▼              ▼              ▼
 Marketing   Checkout      Upgrade       Public API
 pricing     (DB price)    dialogs       /api/pricing/*
 + home      + JSON-LD     (next tier
 page        schema        adds)
```

## Non-developer success criteria

A Super Admin can, without code:

- ✅ Create a new plan (runtime loader resolves DB-only codes)
- ✅ Change pricing (monthly/annual) — applies at checkout (DB price) + marketing
- ✅ Change trial days / grace period
- ✅ Change limits (all numeric features)
- ✅ Change capabilities (grouped toggles)
- ✅ Change marketing (highlights, description, audience, badge, CTA, order)
- ✅ Schedule pricing (future effective dates)
- ✅ Rollback pricing (version history)
- ✅ Preview pricing (live card preview)
- ✅ Publish pricing (Save → surfaces revalidate)
- ✅ Manage coupons + launch programs

## Constraints honored

- **Billing / subscriptions / entitlements not rewritten** — `createCheckout`
  now reads the DB plan price (one-line source change); subscription/invoice
  creation already read `BillingPlan`; the capability/entitlement engines are
  untouched (runtime limits are surfaced through the resolved `features` map).
- **Registry stays defaults** — runtime edits live in `BillingPlan.runtimeConfig`;
  `resyncBillingCatalog` resets to defaults.
- **Existing subscriptions remain valid** — plan codes are never renamed; legacy
  codes resolve via `LEGACY_TO_CANONICAL`; price changes affect new checkouts.
- **No duplicated pricing/capabilities** — one runtime module, one merge.
- **Cached** — request-scoped memoization; one query per request.
- **Fallback-safe** — registry used when the DB is unavailable or a code has no
  row.

## Phases delivered

1. BillingPlan runtime source ✅
2. Runtime pricing CRUD ✅
3. Capability assignment (grouped, auto feature mapping) ✅
4. Limits editor (all numeric) ✅
5. Marketing editor ✅
6. Upgrade copy builder (`getUpgrade` = next tier additions) ✅
7. Pricing preview (card preview) ✅
8. Versioning + rollback + audit ✅
9. Scheduled pricing (`effectiveAt` honored by the runtime) ✅
10. Coupon foundation (schema + admin; checkout wiring future) ✅
11. Launch programs (schema + admin) ✅
12. Landing page sync (marketing/home read runtime) ✅
13. Public API (`/api/pricing/plans`, `/api/pricing/upgrade` + module functions) ✅
14. Admin dashboard (MRR/ARR, distribution, trial funnel, churn) ✅
15. Documentation ✅
