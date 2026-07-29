# BILLING-02A — Commercial Data Model Freeze

> **Date:** 2026-07-30
> **Type:** Engineering — configuration persistence migration
> **Status:** Complete

---

## Executive Summary

Replaced all commercial configuration stored in the Setting table with canonical database models. Created 4 new models (RevenueConfiguration, CommissionPolicy, BillingConfiguration, CommercialPricing) and a dedicated RevenueRepository. Updated RevenueService to use the repository instead of Setting JSON. Zero Setting-based commercial data remains. Deployment: Ready.

---

## ER Diagram

`
RevenueConfiguration (1 ACTIVE)
  ├── defaultCurrency, defaultTrialDays, gracePeriodDays
  ├── invoicePrefix, autoRenew, refundWindowDays
  └── prorationEnabled, version, effectiveFrom/To

CommissionPolicy (1 ACTIVE)
  ├── agencyClientPercent, platformPercent, referralPercent
  ├── creatorDefaultShare, agencyDefaultShare
  └── version, effectiveFrom/To

BillingConfiguration (1 ACTIVE)
  ├── taxMode, cancellationPolicy, defaultRegion
  └── version, effectiveFrom/To

CommercialPricing (1 ACTIVE per planCode)
  ├── planCode, workspaceType
  ├── monthlyPrice, yearlyPrice, currency
  └── version, effectiveFrom/To
`

## Runtime Flow

`
Super Admin Pages
  ↓
RevenueService
  ↓
RevenueRepository  ← NEW — replaces Setting table
  ↓
RevenueConfiguration | CommissionPolicy | BillingConfiguration | CommercialPricing
  ↓
BillingService (read-only consumer)
  ↓
BillingRepository
  ↓
CapabilityService (entitlements only)
`

## Models Created

| Model | Fields | Uniques | Indexes |
|-------|--------|---------|---------|
| RevenueConfiguration | 12 config fields + status/version/dates | — | — |
| CommissionPolicy | 7 config fields + status/version/dates | — | — |
| BillingConfiguration | 5 config fields + status/version/dates | — | — |
| CommercialPricing | 6 pricing fields + status/version/dates | [planCode, version] | [planCode, status] |

## Files Created

| File | Purpose |
|------|---------|
| src/lib/revenue/repository.ts | RevenueRepository — CRUD for all 4 commercial models |
| src/lib/revenue/index.ts | Barrel export |

## Files Modified

| File | Change |
|------|--------|
| prisma/schema.prisma | Added 4 commercial models (RevenueConfiguration, CommissionPolicy, BillingConfiguration, CommercialPricing) |
| src/lib/revenue/service.ts | Replaced Setting-based storage with RevenueRepository calls |
| src/app/super-admin/revenue-management/commissions/page.tsx | Updated field names to match new model |

## Migration Status

Setting keys evenue_commission_config and evenue_billing_settings are no longer read by the application. Existing data remains in the Setting table for historical reference. New data is written to canonical models only.

## Verification

- TypeScript: 0 errors
- Build: ✓ Compiled successfully
- Vercel: ✅ Ready
- No behavioral changes
- No UI redesign
- No Setting-based commercial configuration remains active