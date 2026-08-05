# Partner Ledger — IMPLEMENTATION-49

**Status:** Architecture Design  
**Date:** 2026-08-05

---

## Current State

Today, partner financial data is scattered across three systems:

1. **CommissionEntry** (Prisma) — individual commission entries with partnerId, invoiceId, amount, status
2. **CommissionLedger** (in-memory) — `PartnerBalance` derived from `CommissionLedger.addEntry()` and `getBalance()`
3. **PayoutBatch/PayoutReservation** (Prisma) — payout batches that reserve commission entries

There is **no single partner ledger** that provides a complete financial view. Partner balance is calculated by aggregating CommissionEntry rows.

---

## Partner Ledger Design

### Model (Additive to existing schema)

```prisma
model PartnerLedger {
  id            String   @id @default(cuid())
  partnerId     String
  type          PartnerLedgerType
  amount        Float
  reference     String?  // linked entity id (commissionEntry, settlement, payout)
  description   String
  balanceBefore Float
  balanceAfter  Float
  createdAt     DateTime @default(now())

  partner       Partner  @relation(fields: [partnerId], references: [id])
}

enum PartnerLedgerType {
  COMMISSION_EARNED
  COMMISSION_REVERSED
  COMMISSION_REFUND
  SETTLEMENT_CREATED
  SETTLEMENT_PAID
  SETTLEMENT_FAILED
  PAYOUT_FEE
  MANUAL_ADJUSTMENT
}
```

### Balance Calculation

```
Partner Balance = Sum of all PartnerLedger entries for partner

Running balance maintained by balanceBefore/balanceAfter on each entry.
```

### Entry Creation Points

| Trigger | LEDGER_TYPE | Direction |
|---------|-------------|-----------|
| CommissionEntry created | `COMMISSION_EARNED` | Credit (+amount) |
| CommissionEntry reversed | `COMMISSION_REVERSED` | Debit (-amount) |
| CommissionEntry refunded | `COMMISSION_REFUND` | Debit (-amount) |
| Settlement created (reserves entries) | `SETTLEMENT_CREATED` | Memo (0 amount, locks entries) |
| Settlement paid | `SETTLEMENT_PAID` | Memo (0 amount, transfers to paid) |
| Settlement failed | `SETTLEMENT_FAILED` | Memo (0 amount, releases entries) |
| Payout fee deducted | `PAYOUT_FEE` | Debit (-amount) |
| Finance manual adjustment | `MANUAL_ADJUSTMENT` | Credit/Debit |

### Partner Financial View

```
Partner Dashboard  →  Financial Summary
├── Total Earned    = sum of COMMISSION_EARNED
├── Total Reversed  = sum of COMMISSION_REVERSED + COMMISSION_REFUND
├── Available       = Earned - Reversed - Reserved (in pending settlements)
├── Reserved        = sum of commission entries in SETTLEMENT_CREATED/PROCESSING
├── Paid            = sum of COMMISSION_EARNED entries that reached SETTLEMENT_PAID
├── Fees            = sum of PAYOUT_FEE
├── Net Balance     = Available - Fees
└── Ledger History  = chronological PartnerLedger entries
```

### Super Admin View

```
Partner Ledger Page
├── Filter by partner
├── Filter by type
├── Date range
├── Search by reference
├── Export CSV
└── Balance trend chart
```

---

## Why This Is Better Than Current

| Current | Partner Ledger |
|---------|---------------|
| CommissionEntry + CommissionLedger (separate) | Single source of truth for partner balance |
| No running balance history | balanceBefore/balanceAfter on every entry |
| No reversal audit trail | Every reversal is a ledger entry |
| No fee tracking | PAYOUT_FEE entries track platform fees |
| No manual adjustment capability | MANUAL_ADJUSTMENT for corrections |
| Aggregation-only (compute on read) | Append-only ledger (never recalculate) |

---

## Revenue Sharing Calculation

### Commission Earned Calculation

```
Creator subscription gross = BillingPlan.price (e.g., ₹699)

Partner share = gross × partnerSharePercent
              = ₹699 × 20% = ₹139.80 (default 20%)

Platform share = gross × platformSharePercent
               = ₹699 × 10% = ₹69.90 (default 10%)

CreatorStore revenue = gross - partnerShare
                     = ₹699 - ₹139.80 = ₹559.20
```

### Where partnerSharePercent comes from (priority order)

```
1. CommissionRule.partnerSharePercent for partner+plan combination
2. AgencyTenant.revSharePercent for the partner (default 20%)
3. CommissionPolicy.agencyDefaultShare (default 30%)
```

### Example: Monthly Partner Earnings

```
Partner has 10 creators on Creator Grow (₹699/mo)
10 × ₹699 = ₹6,990 gross
10 × ₹139.80 = ₹1,398 partner share (at 20%)
10 × ₹69.90 = ₹699 platform share (at 10%)

After 1 month:
  PartnerBalance.available = ₹1,398
  MIN_PAYOUT = ₹500 ✓ (eligible for payout)
```
