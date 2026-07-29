# BILLING-02 — Revenue Management Platform

> **Date:** 2026-07-30
> **Type:** Commercial pricing and revenue configuration
> **Status:** Complete

---

## Architecture

Revenue Management is a Super Admin domain that owns commercial pricing, commission configuration, and billing settings.

`
RevenueManagement (Super Admin)
  ├── Revenue Dashboard (MRR, ARR, subs, commissions)
  ├── Commission Center (platform fees, agency splits)
  └── Billing Settings (currencies, trials, invoices)

RevenueService
  └── reads from BillingRepository + CommissionEntry + BillingEvent
  └── stores config in Setting table (platform-scoped)

BillingService (execution)
  └── reads active pricing from RevenueService
  └── processes payments via Razorpay
  └── calculates commissions via CommissionService

CapabilityService (entitlements)
  └── owns feature gating independently of pricing
  └── plans are capability definitions, not price tags
`

## Ownership

| Concept | Owner | Implementation |
|---------|-------|---------------|
| Commercial pricing | RevenueService | src/lib/revenue/service.ts |
| Commission rates | RevenueService | Setting key: evenue_commission_config |
| Billing defaults | RevenueService | Setting key: evenue_billing_settings |
| Payment execution | BillingService | src/modules/billing/ |
| Feature entitlements | CapabilityService | src/lib/capabilities/ |
| Subscriptions | BillingRepository | BillingSubscription model |
| Invoices | BillingRepository | BillingInvoice model |

## Dashboard Metrics

| Metric | Source |
|--------|--------|
| MRR | Sum of active subscription plan prices |
| ARR | MRR * 12 |
| Active Creator Subs | Active/Trialing subscriptions with family=creator |
| Active Agency Subs | Active/Trialing subscriptions with family=agency |
| Trial Users | Subscriptions in TRIALING status |
| Monthly Revenue | Paid invoices in last 30 days |
| Commission Revenue | Pending/paid commission entries |
| Platform Take Rate | Commission / (subscription revenue + commission) |

## Pages Created

| Route | Purpose |
|-------|---------|
| /super-admin/revenue-management | Revenue Dashboard with 8 metric cards |
| /super-admin/revenue-management/commissions | Commission Center with revenue sharing config |
| /super-admin/revenue-management/settings | Billing Settings with global defaults |

## Files Created

| File | Purpose |
|------|---------|
| src/lib/revenue/service.ts | RevenueService — dashboard, commissions, settings |
| src/app/super-admin/revenue-management/page.tsx | Revenue Dashboard |
| src/app/super-admin/revenue-management/commissions/page.tsx | Commission Center |
| src/app/super-admin/revenue-management/settings/page.tsx | Billing Settings |

## Files Modified

| File | Change |
|------|--------|
| src/config/admin-registry.ts | Added Revenue Management entry under Billing group |

## Verification

- TypeScript: 0 errors
- Marketplace tests: 27/27 passed
- BillingService unchanged (still execution-only)
- CapabilityService unchanged (still entitlement-only)
- No duplicate plan definitions
- No duplicate commission calculations