# Future Razorpay Route Migration — IMPLEMENTATION-49

**Status:** Architecture Design · Migration Path  
**Date:** 2026-08-05

---

## Overview

This document describes exactly what changes when the company registers, obtains GST, and activates Razorpay Route / Smart Collect for automated partner settlements.

**Today:** Manual bank transfers. No company.  
**Future:** Automated settlements via Razorpay Route. GST-compliant invoicing.

---

## Pre-Migration Checklist

| Requirement | Status |
|-------------|--------|
| Registered company with GSTIN | Not yet |
| Razorpay Route enabled on account | Not yet |
| Partner bank accounts linked via Route | Not yet |
| Smart Collect configured for split settlements | Not yet |

---

## Phase 1: Company Registration

### What changes

1. **Platform config** — Add company details:
```typescript
const COMPANY = {
  name: "CreatorStore Technologies Pvt Ltd",
  gstin: "27AADCC...",
  registeredAddress: "...",
  pan: "...",
  cin: "...",
}
```

2. **Tax Configuration** — Add to `RevenueConfiguration`:
```prisma
model RevenueConfiguration {
  ...
  gstNumber       String?
  gstRate         Float   @default(0.18)  // 18%
  taxMode         String  @default("exclusive") // exclusive | inclusive
  companyName     String?
  companyAddress  String?
}
```

3. **Invoice updates** — `BillingInvoice` gains:
```prisma
model BillingInvoice {
  ...
  gstNumber       String?
  taxBreakdown    Json?    // { cgst: amount, sgst: amount, igst: amount }
  invoiceNumber   String?  // GST-compliant sequential numbering
}
```

**What stays the same:** BillingService, BillingRepository, checkout flow, webhook handling.

---

## Phase 2: Razorpay Route Activation

### New Provider Registration

```typescript
// src/lib/payouts/providers/razorpay-route.ts
class RazorpayRouteProvider implements SettlementProvider {
  name = "razorpay_route"
  capabilities = {
    supportsAutoPayout: true,
    supportsSplit: true,
    supportsReference: true,
    supportsWebhook: true,
  }

  async createPayout(params: SettlementPayoutParams): Promise<SettlementProviderResult> {
    // 1. Validate partner has a linked Razorpay account
    const partner = await partnerService.getById(params.partnerId)
    if (!partner.razorpayAccountId) {
      throw new Error("Partner has no linked Razorpay Route account")
    }

    // 2. Create transfer via Razorpay Route API
    const razorpay = getRazorpayClient()
    const transfer = await razorpay.transfers.create({
      account: partner.razorpayAccountId,
      amount: Math.round(params.amount * 100), // paise
      currency: params.currency,
      on_hold: false,
      notes: {
        settlement_id: params.reference,
        partner_id: params.partnerId,
      },
    })

    return {
      success: true,
      providerRef: transfer.id,
      status: transfer.status,
    }
  }
}
```

### New Partner Fields (on WebsiteAgency)

```prisma
model WebsiteAgency {
  ...
  razorpayAccountId     String?   // Razorpay Route linked account ID
  razorpaySetupComplete Boolean   @default(false)
}
```

### Settlement Workflow Change

```
Today:
  APPROVED → finance manually transfers → updates transferRef → PAID

Future (with Route):
  APPROVED → system creates Razorpay transfer → PROCESSING
  → Route webhook confirms transfer success → PAID (auto)
  → Route webhook reports transfer failure → FAILED (auto retry)
```

---

## Phase 3: Smart Collect / Split Settlements

### What Smart Collect Enables

```
Creator pays ₹699/mo for Creator Grow
    ↓
Razorpay processes ₹699
    ↓
Smart Collect split rules:
  CreatorStore account:  ₹559.20 (80%)
  Partner Route account: ₹139.80 (20%)
    ↓
No separate payout needed — money is routed at time of payment.
```

### Configuration

```typescript
interface SmartCollectConfig {
  enabled: boolean
  splitRules: {
    platformPercent: number  // CreatorStore share
    partnerPercent: number   // Partner share
  }
  partnerAccounts: Record<string, {
    razorpayAccountId: string
    active: boolean
  }>
}
```

### What changes

1. **Webhook handler** — Instead of creating a CommissionEntry and later a Settlement, Smart Collect splits the payment immediately. The `payment.captured` webhook now carries split details. CommissionEntry is still created for audit but the payout step is eliminated.

2. **Settlement** — Still created for record-keeping, but the PROCESSING step is automatic (Razorpay already transferred the partner's share).

3. **Partner onboarding** — Requires Razorpay Route account linking. Partner fills out Razorpay's KYC form to create a linked account.

---

## What NEVER Changes

| Component | Stays exactly the same |
|-----------|----------------------|
| Billing v2 (BillingAccount → BillingSubscription → BillingEvent → BillingInvoice) | ✓ |
| Commission engine (RuleEngine → Calculator → CommissionEntry) | ✓ |
| Revenue dashboard (RevenueService.getRevenueDashboard) | ✓ |
| Settlement lifecycle (PENDING → APPROVED → PAID) | ✓ Only PROCESSING step changes provider |
| `SettlementProvider` interface | ✓ Same contract, different implementation |
| Plan restriction (agency creators min = Grow) | ✓ |
| `LEGACY_TO_CANONICAL` mapping | ✓ |

---

## Provider Architecture

```
                    SettlementProvider (interface)
                           │
           ┌───────────────┼────────────────┐
           │               │                │
    ManualProvider   RazorpayRouteProv   BankTransferProv
    (today)          (post-company)      (alternative)
```

All providers implement the same interface. Switching from Manual to Route is a configuration change, not an architecture change.

---

## Migration Checklist

| Step | IMPLEMENTATION |
|------|---------------|
| 1. Register company + GSTIN | IMPLEMENTATION-51 (external) |
| 2. Add company config fields | IMPLEMENTATION-51 |
| 3. Enable Razorpay Route | IMPLEMENTATION-52 |
| 4. Implement RazorpayRouteProvider | IMPLEMENTATION-52 |
| 5. Partner Route account linking UI | IMPLEMENTATION-52 |
| 6. GST on invoices | IMPLEMENTATION-53 |
| 7. Smart Collect split settlements | IMPLEMENTATION-54 |
| 8. Automated settlement scheduling | IMPLEMENTATION-55 |
| 9. Tax-compliant reporting | IMPLEMENTATION-56 |

---

## Risks & Dependencies

| Risk | Mitigation |
|------|-----------|
| Company registration delays | Manual settlement workflow works indefinitely |
| Razorpay Route not approved | BankTransferProvider as alternative |
| Partner doesn't have bank account | Manual provider fallback |
| GST rate changes | Config-driven (CommissionPolicy) — single update point |
| Settlement failure | Idempotency keys prevent double-payout. Retry with exponential backoff. |
