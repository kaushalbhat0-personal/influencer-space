# Finance Architecture — IMPLEMENTATION-49

**Status:** Architecture Design · Read-Only Audit  
**Date:** 2026-08-05

---

## 1. Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│                    RAZORPAY WEBHOOK                         │
│                 src/app/api/webhooks/razorpay/route.ts      │
│          subscription.activated / payment.captured           │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    BILLING SERVICE v2                        │
│           src/modules/billing/application/service.ts        │
│          handlePaymentCaptured / handleSubscriptionWebhook  │
│          cancel / resume / changePlan / adminSetPlan        │
└──┬────────────────┬───────────────────┬─────────────────────┘
   │                │                   │
   ▼                ▼                   ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│ Billing      │ │ Commission   │ │ RevenueService            │
│ Repository   │ │ Service      │ │ .getRevenueDashboard()    │
│              │ │              │ │ .listUnifiedTransactions()│
│ BillingSub   │ │ processComm  │ │ .listInvoicesAdmin()      │
│ BillingEvent │ │ Commission   │ │ .getCommissionConfig()    │
│ BillingInv   │ │   Ledger     │ │ .getBillingSettings()     │
│ BillingPlan  │ │   Calculator │ └──────────────────────────┘
└──────────────┘ │   RuleEngine │
                 │   (in-memory)│
                 └──────┬───────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                   COMMISSION LAYER                            │
│              src/lib/commission/                              │
│  CommissionService · Calculator · RuleEngine · Ledger        │
│  CommissionRepository (Prisma)                               │
│  Models: CommissionRule, CommissionEntry                     │
│  Flow: resolveRule → calculate → createEntry → balance       │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                    PAYOUT LAYER                               │
│              src/lib/payouts/                                 │
│  PayoutService · PayoutLedger · PayoutRepository (Prisma)   │
│  Models: PayoutBatch, PayoutReservation                      │
│  Providers: Manual (stub), RazorpayRoute (stub),             │
│             BankTransfer (stub)                              │
│  Flow: checkEligibility → create → reserve → process → paid │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  SETTLEMENT LAYER                             │
│              NOT IMPLEMENTED                                  │
│  No Settlement/SettlementItem/SettlementBatch models         │
│  PayoutBatch + PayoutReservation serve as placeholder        │
│  Settlement state machine planned for IMPLEMENTATION-50      │
└──────────────────────────────────────────────────────────────┘

                         Revenue Config
┌──────────────────────────────────────────────────────────────┐
│  CommissionPolicy  │ RevenueConfiguration │ CommercialPricing │
│  (percent knobs)   │ (trial, grace, etc.) │ (plan pricing)    │
└──────────────────────────────────────────────────────────────┘

```

## 2. What Exists Today

### Fully Deployed (Production-Ready)

| Component | Files | Description |
|-----------|-------|-------------|
| **Billing v2 Core** | 21 files in `modules/billing/` | Subscription lifecycle via Razorpay. BillingAccount → BillingPlan → BillingSubscription → BillingEvent → BillingInvoice chain fully implemented. |
| **Revenue Dashboard** | `revenue-service.ts` (272 lines) | MRR, ARR, active subscribers, ARPC, plan distribution. Derived from Billing v2 subscription data. |
| **Commission Engine** | `lib/commission/` (11 files) | Domain-driven rule resolution, split calculation, entry creation, balance tracking. CommissionEntry persisted to Prisma. |
| **Payout Engine** | `lib/payouts/` (11 files) | Batch creation, reservation, status lifecycle. PayoutBatch + PayoutReservation persisted to Prisma. |
| **Partner Platform** | `lib/partners/` (10 files) + `modules/partner/` (5 files) | Partner/member/workspace management. AgencyTenant linking. Creator import flow. |
| **Revenue Config UI** | `super-admin/revenue-management/` (6 files) | CommissionPolicy editing (5 percentage knobs). Billing settings management. |
| **Unified Transactions** | `super-admin/transactions/` (3 files) | Merges BillingEvents + Invoices + ProductOrders into single timeline. |
| **Agency Analytics** | `agency/analytics/` | Commission balance display + payout eligibility + batch history. |

### Placeholder / Stub

| Component | Status |
|-----------|--------|
| **Payout Providers** (Manual/RazorpayRoute/BankTransfer) | All 3 return no-op success. No actual Razorpay Route/Smart Collect API integration. |
| **Partner rewards UI** (agency billing) | Explicitly marked "Coming soon — no rewards are active today." |
| **revSharePercent** (AgencyTenant) | Stored at 20% default. Never consumed by any financial calculation. |
| **productRevSharePercent** (AgencyTenant) | Stored at 10% default. Never consumed. |
| **platformFeePercent** (WebsiteAgency) | Stored at 0% default. Never used in billing/commission. |
| `lib/partners` Partner model | Has zero financial fields. Not connected to WebsiteAgency. |

### Dead / Disconnected

| Component | Issue |
|-----------|-------|
| **Legacy Subscription table** | Deprecated. 10/12 consumers migrated. Remaining: tenants-list reader + update-subscription-plan writer. |
| **Commission/Rules/Ledger in-memory state** | Must call `initialize()` from DB. If not called, state is empty. Dual state risk. |
| **Payout in-memory state** | Same pattern. `saveBatch()` is fire-and-forget `.catch()`. |
| **Two separate percentage systems** | `CommissionRule` (partnerSharePercent/platformSharePercent) vs `AgencyTenant.revSharePercent` — disconnected. |

## 3. Prisma Models (Finance-Relevant)

| Model | Status | Finance Role |
|-------|--------|-------------|
| `BillingAccount` | Deployed | Aggregate root for billing |
| `BillingPlan` | Deployed | Plan catalog (price, currency, cycle) |
| `BillingSubscription` | Deployed | Single source of truth for active subscriptions |
| `BillingEvent` | Deployed | Append-only event log with idempotency |
| `BillingInvoice` | Deployed | Financial source of truth (amount, tax, status) |
| `RevenueConfiguration` | Deployed | Platform-wide billing defaults |
| `CommissionPolicy` | Deployed | 5 percentage knobs for revenue sharing |
| `CommissionRule` | Deployed | Per-partner commission rules |
| `CommissionEntry` | Deployed | Individual commission entries with audit |
| `PayoutBatch` | Deployed | Payout batch tracking |
| `PayoutReservation` | Deployed | Per-entry reservation linking commission to payout |
| `AgencyTenant` | Deployed | Links agency ↔ creator with revSharePercent |
| `WebsiteAgency` | Deployed | Agency profile with platformFeePercent |
| `Subscription` | Deprecated | Legacy table, being migrated to BillingSubscription |

**Not modeled:** Settlement, SettlementItem, SettlementBatch, PartnerLedger, FinanceNote, TransferReference, PartnerBilling, PartnerPayment, PartnerReward.

## 4. Summary

The finance architecture has **solid foundations**: Billing v2 handles payments, CommissionEngine calculates splits, PayoutService manages batch disbursement. However, three critical gaps exist:

1. **No auto-trigger** — Commission entries are not created automatically when creators pay subscriptions. The `processCommission()` method exists but nothing calls it from the webhook/subscription event flow.
2. **No settlement model** — PayoutBatch doubles as a settlement record, but a proper Settlement lifecycle with audit trail, approval workflow, and transfer references doesn't exist.
3. **Disconnected percentage systems** — AgencyTenant.revSharePercent is stored but never consumed by CommissionRule's partnerSharePercent calculation. These need to be unified.
