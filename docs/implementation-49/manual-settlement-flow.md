# Manual Settlement Flow — IMPLEMENTATION-49

**Status:** Architecture Design  
**Date:** 2026-08-05

---

## Overview

This document defines the canonical manual settlement workflow. Today, all partner payouts are manual bank transfers initiated by the finance team. This workflow assumes no Razorpay Route, no Smart Collect, no company registration, and no GST.

---

## Settlement Lifecycle

```
PENDING ──→ READY ──→ APPROVED ──→ PROCESSING ──→ PAID ──→ ARCHIVED
   │                      │              │
   └── REJECTED           │              └── FAILED
                          │
                     CANCELLED
```

---

## Step-by-Step Workflow

### Step 1: Commission Accumulation

```
1. Creator subscribes (CreatorStore platform subscription)
2. Razorpay processes payment
3. payment.captured webhook → BillingService.handlePaymentCaptured()
4. CommissionService.processCommission() creates CommissionEntry
5. CommissionEntry status = "pending" (awaiting clearing period)
6. After clearing period (e.g., 30 days for refund window):
   CommissionEntry status = "cleared" (available for payout)
```

### Step 2: Settlement Generation

```
1. Finance reviews partner balance in Super Admin
   GET /super-admin/revenue-management/commissions
2. For each partner with available balance >= MIN_PAYOUT (₹500):
   - Select cleared CommissionEntry rows
   - Create Settlement with status = PENDING
   - Create SettlementItems linking to CommissionEntry rows
3. Settlement recorded in DB with:
   - partnerId
   - totalAmount (sum of selected commission entries)
   - feeAmount (platform processing fee, if any)
   - netAmount = totalAmount - feeAmount
   - entryCount (number of commission entries included)
```

### Step 3: Finance Review (READY)

```
1. Finance officer verifies:
   - All commission entries are valid
   - Partner account details are current
   - Amount matches expected balance
2. Settlement status → READY
```

### Step 4: Approval (APPROVED)

```
1. Super Admin approves the settlement
2. Recorded: approvedBy (user ID), approvedAt (timestamp)
3. Settlement status → APPROVED
4. Items are now "reserved" — cannot be included in another settlement
```

### Step 5: Manual Transfer (PROCESSING → PAID)

```
1. Finance executes manual transfer via:
   - NEFT/IMPS/RTGS to partner's bank account
   - OR UPI transfer to partner's VPA
2. Finance records:
   - Transfer reference number (UTR/bank ref)
   - Payment method
   - Settlement status → PAID
3. All associated CommissionEntry rows move to "paid" status
```

### Step 6: Archive

```
1. After payment confirmation (e.g., 7 days):
   Settlement status → ARCHIVED
2. Settlement is read-only. No further modifications.
```

## Error Handling

### Rejected Settlement

```
Settlement status → REJECTED
- Reason recorded (invalid entries, partner dispute, etc.)
- Items are released back to available balance
- New settlement can be created after corrections
```

### Failed Transfer

```
Settlement status → PROCESSING → FAILED
- Failure reason recorded
- Items remain reserved
- Can retry with same or different provider
```

### Cancelled Settlement

```
Settlement status → CANCELLED
- Items released back to available balance
- Settlements cannot be cancelled after reaching PAID status
```

---

## API Design (Future)

```typescript
// Create settlement from available commission entries
POST /api/admin/settlements
{
  partnerId: string,
  commissionEntryIds: string[],  // optional; auto-select available if omitted
}

// Approve settlement
PATCH /api/admin/settlements/:id/approve

// Record transfer
PATCH /api/admin/settlements/:id/transfer
{
  transferRef: string,  // UTR or bank reference
  method: "neft" | "imps" | "rtgs" | "upi"
}

// Mark paid
PATCH /api/admin/settlements/:id/pay

// List partner settlements
GET /api/admin/settlements?partnerId=:partnerId&status=READY

// Partner settlement history
GET /api/agency/settlements
```

---

## Super Admin UI Pages (Future)

| Page | Route | Purpose |
|------|-------|---------|
| Settlement Queue | `/super-admin/settlements` | All settlements grouped by status. Filter by partner, date range. |
| Partner Ledger | `/super-admin/settlements/ledger` | Per-partner balance breakdown. Commission entries → settlements → payouts. |
| Settlement Detail | `/super-admin/settlements/:id` | Full lifecycle view. Items, approvals, transfers, attachments. |
| Finance Dashboard | `/super-admin/finance` | MRR, partner payouts, pending settlements, monthly totals. |
| Monthly Reports | `/super-admin/finance/reports` | Exportable CSV/PDF of all monthly settlements. |

---

## Current State vs Target

| Capability | Current | Target (IMPLEMENTATION-50) |
|---|---|---|
| Commission accumulation | Manual trigger only | Auto-trigger from subscription webhooks |
| Settlement creation | No UI — PayoutBatch serves as proxy | Full settlement UI with manual workflow |
| Partner ledger | No dedicated page | Partner ledger with balance breakdown |
| Transfer tracking | No transferRef field | transferRef + method + timestamp |
| Approval workflow | No approval | Multi-step approval with audit trail |
| Finance dashboard | Fragmented across revenue/transactions | Unified finance dashboard |
