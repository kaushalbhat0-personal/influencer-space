# Subscription Sharing — Audit 07

Recurring subscription revenue sharing for agencies: agency earns a configurable
% of creator **subscriptions**; the creator keeps 100% of product sales.

## Can it be built on the current runtimes?

**Yes, with fixes — no redesign.** The schema + Billing v2 + runtime pricing
already carry 80% of the shape. Four blockers must be fixed first (from
`docs/partner-revenue.md`).

## What can be reused (✅)

| Asset | Reuse | Evidence |
| --- | --- | --- |
| Billing v2 state machine (trial→active, PAST_DUE, idempotent events) | YES | `billing/domain/lifecycle.ts`, `webhook.ts` |
| Runtime pricing (BillingPlan is the price source) | YES | IMPLEMENTATION-71 `src/modules/pricing` |
| `CommissionEntry(partnerId, planCode, subscriptionId)` schema | YES | `schema.prisma:1562-1564` |
| `CommissionRule(partner → plan(metadata.planCode) → default)` cascade | YES | `commission/rules.ts:38-57` |
| DB-backed `PartnerLedger` (balanceAfter chain) | YES | `ledger/partner-ledger.ts:40-87` |
| `AgencyTenant.revSharePercent` (default 20) + `CommissionPolicy.agencyDefaultShare` (30) | YES | `schema.prisma:221,1019-1032` |
| Creator subscribes on **their own** workspace (creator owns the subscription) | YES | `billing/.../repository.ts:89-98` |
| Super Admin config UI for splits (in-memory engine caveat) | ⚠️ | `revenue-management/commissions` |

## What must change (❌ → fix)

| # | Change | Complexity | Risk | Notes |
| --- | --- | --- | --- | --- |
| 1 | **Attribution**: map a subscription payment to the managing agency | Low | Low | `BillingSubscription.workspaceId → Workspace.tenantId → AgencyTenant.agencyId` (creator workspaces already have `tenantId`); or add `partnerId` to `BillingSubscription`/`BillingInvoice` |
| 2 | **Hydrate the rule engine** from `CommissionRule` at runtime (or replace the in-memory engine with direct Prisma reads) | Medium | Low | `saveRule` on writes; seed rules on read; drop the never-invoked `bootstrap.initialize()` dependency |
| 3 | **Use `revSharePercent`/`CommissionPolicy` in the split** — the calculator is a strict 2-way platform/partner 100% split; the model needs platform/agency/creator attribution | Medium | Low | `calculator.ts:23-25`; add the agency-vs-platform share from the rule |
| 4 | **Fire commission reliably**: `processCommission` must not throw on an empty engine; callers must not swallow errors; write `CommissionEntry` + `PartnerLedger` in one transaction | Medium | Medium | `commission/service.ts:58-79`; `billing/service.ts:116-118,263-265` |
| 5 | **Fix settlement**: select pending entries, use `partnerShare`, write real `amount` to the ledger | Medium | Low | `settlement/service.ts:81-120,133-141` |
| 6 | **Real payout provider** (Razorpay Payouts / transfers) + callers for `payoutService.createPayout` | High | Medium | `payouts/providers.ts` are stubs |
| 7 | Fix the **paise/rupees unit bug** | Low | Low | `calculator.ts` vs `route.ts:85` |

## Recommended revenue-share model (no redesign)

```
BillingSubscription (creator's workspace, plan ₹699)
  ↓ payment captured / renewal
attribution: workspace.tenantId → AgencyTenant.agencyId
  ↓
split = AgencyTenant.revSharePercent (or CommissionPolicy.agencyDefaultShare)
platform = remainder
  ↓
CommissionEntry(partnerId=agency, planCode, subscriptionId, amount=₹699,
                platformShare, partnerShare)
  ↓
PartnerLedger(COMMISSION_EARNED)  (DB, balanceAfter)
  ↓
Settlement (pending entries) → PAID → Payout (Razorpay transfers to agency)
```

## What should never change

- Creator subscription ownership (creator is the billing owner on their
  workspace — keep it; the agency is not the payer).
- Creator keeps 100% of product revenue (no transaction fee — only the
  subscription share goes to the agency).
- Billing v2 state machine + idempotent webhooks.
- Runtime pricing as the single price source.
