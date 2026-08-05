# Commerce & Billing Governance Audit — RCCF-AUDIT-05

**Date:** 2026-08-05  
**Status:** COMPLETE — Read-Only Audit

---

## 1. Subscription Governance Matrix

| # | Operation | Creator | Partner | Notes |
|---|-----------|---------|---------|-------|
| 1 | Assign plan (any to any) | ✅ | ✅ | `adminSetPlan()` — no payment required |
| 2 | Upgrade | ✅ | ✅ | Customer: checkout; Admin: direct |
| 3 | Downgrade | ✅ | ✅ | Same as upgrade |
| 4 | Complimentary (free forever) | ❌ | ❌ | No FREE_FOREVER status exists |
| 5 | Complimentary period (N months) | ❌ | ❌ | No complimentaryUntil field |
| 6 | Pause subscription | ⚠️ | ⚠️ | Webhook only; no manual pause action |
| 7 | Resume | ✅ | ✅ | CANCELLED → ACTIVE |
| 8 | Cancel | ✅ | ✅ | Customer + admin actions |
| 9 | Reactivate | ✅ | ✅ | Same as resume |
| 10 | Retry payment | ⚠️ | ⚠️ | Creates new checkout, not retry same invoice |
| 11 | Extend trial | ❌ | ❌ | Only global defaultTrialDays |
| 12 | Shorten trial | ❌ | ❌ | No per-tenant mechanism |
| 13 | Convert complimentary → paid | ❌ | ❌ | No complimentary status |
| 14 | Convert paid → complimentary | ❌ | ❌ | No complimentary status |
| 15 | Bulk operate | ❌ | ❌ | No batch actions anywhere |

**Implemented: 7/15 | Partial: 2/15 | Missing: 6/15**

---

## 2. Commission Governance Matrix

### Override Hierarchy

| Level | Status | Mechanism |
|-------|--------|-----------|
| **Creator Override** | ❌ Missing | No creatorId on CommissionRule |
| **Partner Override** | ✅ Implemented | `CommissionRule.partnerId` + `partner_override` type |
| **Plan Override** | ⚠️ Partial | `CommissionRule.metadata.planCode` — implicit, no dedicated type |
| **Platform Default** | ✅ Implemented | `CommissionRule.type === "default"` |

### Two Competing Config Systems

| System | Edited Via | Used By Calculator | Synced? |
|--------|-----------|-------------------|---------|
| **CommissionRule** (Prisma) | API only (no UI) | ✅ `resolveRule()` → `calculate()` | — |
| **CommissionPolicy** (Prisma) | Super Admin UI | ❌ Never consumed by calculator | **Broken** |

**Critical gap:** Changing commission in the Super Admin Commission Center does not affect actual calculations. The UI edits the wrong table.

---

## 3. Revenue Governance

### All metrics from Billing v2

| Metric | Status | Issue |
|--------|--------|-------|
| MRR | ✅ Real | Sum of ACTIVE plan prices — naive (no proration) |
| ARR | ✅ Derived | MRR × 12 — no annual contracts |
| ARPC | ✅ Real | MRR ÷ active subscribers |
| Plan distribution | ✅ Real | groupBy planId |
| Revenue growth (MoM) | ✅ Real | PAID invoice comparison |
| Commission revenue | ⚠️ Bug | Filters `status: "paid"` — no such status exists on CommissionEntry |
| Platform take rate | ⚠️ Formula | Double-counting risk in denominator |

---

## 4. Partner Revenue Traceability

| Link | Status |
|------|--------|
| Creator → Partner | ✅ workspace.agencyId |
| Partner → CommissionEntry | ✅ CommissionEntry.partnerId + audit |
| CommissionEntry → PartnerLedger | ✅ COMMISSION_EARNED with commissionId ref |
| CommissionEntry → Settlement | ✅ SettlementItem.commissionEntryId |
| **Settlement → PartnerLedger** | ❌ **BROKEN** — types defined but never written |
| Settlement → Payout | ⚠️ Weak — no settlement ref |
| Payout → Transfer | ✅ PayoutBatch.providerReference |

---

## 5. Financial Audit Trail

| Event | Entry Created? | Ledger Written? | Rollback? |
|-------|---------------|-----------------|-----------|
| Commission earned | ✅ CommissionEntry | ✅ PartnerLedger | ✅ reversal |
| Settlement created | ✅ Settlement | ❌ | ✅ transition rejects |
| Settlement paid | ✅ status update | ❌ | ❌ irreversible |

---

## 6. Bulk Operations — All Missing

- Bulk upgrade/downgrade
- Bulk cancel/pause
- Bulk migration between plans
- Bulk commission change
- Bulk feature enable
- Bulk capability sync

---

## 7. Complimentary/Trial Runtime

| Feature | Status |
|---------|--------|
| Complimentary plans | No FREE_FOREVER lifecycle state |
| Complimentary periods | No complimentaryUntil field |
| Trial extension per-tenant | No adminExtendTrial() |
| Trial reset | No reset mechanism |
| Per-plan trial settings | Only global defaultTrialDays |

---

## 8. Razorpay Readiness

| Area | Status |
|------|--------|
| Subscriptions | ✅ Billing v2 + webhooks |
| Invoices | ✅ Created on payment capture |
| Payments | ✅ Razorpay checkout |
| Route/Smart Collect | ❌ Stub — ManualSettlementProvider only |
| GST | ❌ No GST fields on invoices |
| Tax invoices | ❌ Not implemented |
| Refunds | ❌ No refund API integration |
| Credit notes | ❌ Not implemented |

---

## 9. Implementation Roadmap

| Priority | Feature | RCCF |
|----------|---------|------|
| **Critical** | Fix CommissionPolicy → CommissionRule sync (UI changes affect calculations) | 57 |
| **Critical** | Write SETTLEMENT_CREATED/SETTLEMENT_PAID to Partner Ledger | 57 |
| **Critical** | Per-partner commission overrides with UI | 57 |
| **High** | Complimentary/free plans (FREE_FOREVER status + complimentaryUntil) | 57 |
| **High** | Per-creator commission overrides | 57 |
| **High** | Manual pause action + SUBS_PAUSED state | 58 |
| **High** | Bulk subscription operations | 58 |
| **Medium** | Trial extension per-tenant + per-plan trial settings | 58 |
| **Medium** | Revenue formula fixes (commissionRevenue status, take rate) | 59 |
| **Medium** | Subscription simulation/preview | 59 |
| **Low** | MRR proper calculation (proration, upgrades) | 59 |
| **Low** | Payout settlement linking | 60 |
| **Low** | Razorpay Route + GST preparation | 60 |
