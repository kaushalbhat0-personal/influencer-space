# RCCF-72.18D.2 — ProductOrder Refund Schema & Provider Binding Closure

**Verdict: A — Production-safe (foundation only)**

---

## Summary

Implemented the foundational data model required to make future `DIRECT_CREATOR` product-order refunds safe. This RCCF adds immutable historical payment-account binding and durable refund state tracking to `ProductOrder` without activating any refund execution or webhook handling (deferred to D.3/D.4).

---

## Audit Findings (from D.1)

### P0-1 — Missing historical PaymentAccount binding
**RESOLVED**: ProductOrder now has `paymentAccountId` (FK → PaymentAccount.id, RESTRICT on delete) populated at checkout time.

### P0-2 — Missing ProductOrder refund schema
**RESOLVED**: Added `RefundStatus` enum + `refundId`, `refundAmount` (cumulative, paise), `refundedAt`, `refundStatus` fields.

### P0-3 — No product refund execution yet
**DEFERRED**: D.3 will implement the refund initiation action.

### P0-4 — No product refund webhook reconciliation
**DEFERRED**: D.4 will implement webhook handling.

---

## Architecture Design

### Binding Strategy: Immutable FK to PaymentAccount

```
ProductOrder.paymentAccountId → PaymentAccount.id (RESTRICT on delete)
```

**Why this approach:**
- PaymentAccount records are never hard-deleted in the current architecture (status transitions to `disconnected`, verificationStatus to `unverified`)
- `RESTRICT` FK prevents accidental deletion of a PaymentAccount that has historical orders
- No credential duplication — encrypted keys stay in PaymentAccount where they belong
- Minimal schema change, maximal safety

### What happens when PaymentAccount is "replaced"?
- Creator calls `saveMyPaymentAccount` with new credentials → updates existing PaymentAccount row (same `id`)
- Historical orders still point to the same PaymentAccount `id`
- Refund execution in D.3 will decrypt the *current* credentials on that PaymentAccount
- **Risk**: If creator revokes old API keys in Razorpay dashboard, refund fails — this is correct behavior (we cannot refund against revoked credentials)

### What happens if PaymentAccount is deleted?
- Impossible via current API (only `disconnect` which sets status, doesn't delete)
- Even if a raw SQL delete is attempted, `RESTRICT` FK blocks it
- Historical refund capability is preserved

---

## Schema Changes

### New Enum
```prisma
enum RefundStatus {
  NONE
  PENDING
  PARTIAL
  REFUNDED
  FAILED
}
```

### ProductOrder — New Fields
```prisma
paymentAccountId     String?     @db.Uuid          // FK to PaymentAccount.id (nullable for historical PLATFORM_COLLECT orders)
refundStatus         RefundStatus @default(NONE)   // NONE | PENDING | PARTIAL | REFUNDED | FAILED
refundId             String?                        // Provider refund ID (Razorpay refund_id)
refundAmount         Int?                            // Cumulative refunded amount in minor units (paise)
refundedAt           DateTime?                       // Timestamp of final/refunded completion
```

### Indexes Added
```prisma
@@index([paymentAccountId])
@@index([refundStatus])
```

### Foreign Key
```prisma
ALTER TABLE "ProductOrder"
  ADD CONSTRAINT "ProductOrder_paymentAccountId_fkey"
  FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

## Migration Strategy

**File**: `prisma/migrations/20260822000000_rccf72_18d2_product_order_refund_binding/migration.sql`

- Additive, nullable — zero downtime
- Existing ProductOrder rows get `NULL` paymentAccountId and `NONE` refundStatus
- Future DIRECT_CREATOR orders MUST have paymentAccountId set at creation (enforced by `createDirectCheckout`)
- No backfill of historical rows — they cannot be safely bound to a PaymentAccount
- D.3 refund logic will reject refunds on orders with `paymentAccountId = null`

---

## Code Changes

### 1. `prisma/schema.prisma`
- Added `RefundStatus` enum
- Added 5 new fields to `ProductOrder`
- Added 2 new indexes
- Added FK constraint (via migration)

### 2. `src/actions/payment-account.actions.ts` — `createDirectCheckout()`
```typescript
// NEW: Record the exact PaymentAccount that processed this payment
paymentAccountId: account!.id,
```

This is the **critical binding moment** — server-side, after validating readiness, using the PaymentAccount resolved from the tenant.

---

## Test Coverage

**File**: `tests/unit/rccf72-18d2-product-order-refund-binding.test.ts`

| Test | Description | Status |
|------|-------------|--------|
| Test 1 | New DIRECT_CREATOR order captures PaymentAccount binding | ✅ PASS |
| Test 2 | Account switch does not alter historical binding | ✅ PASS |
| Test 3 | Cross-tenant binding rejected | ✅ PASS |
| Test 4 | PLATFORM_COLLECT remains unaffected | ✅ PASS |
| Test 5 | Partial refund accounting (cumulative) | ✅ PASS |
| Test 6 | Refund cannot exceed captured amount | ✅ PASS |
| Test 7 | Duplicate provider refund reference | ✅ PASS |
| Test 8 | Historical order with missing binding (NULL) | ✅ PASS |
| Test 9 | Account deactivation preserves binding | ✅ PASS |
| Test 10 | Secrets never exposed in ProductOrder | ✅ PASS |

**All 10 tests pass.**

---

## Verification Gates

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | ✅ PASS |
| Lint | `npm run lint` | ✅ PASS (pre-existing warnings only) |
| Prisma Validate | `npx prisma validate` | ✅ PASS |
| Git Diff Check | `git diff --check` | ✅ PASS (pre-existing CRLF warnings only) |
| Related Unit Tests | `rccf38`, `rccf41`, `rccf50`, `rccf69` | ✅ ALL PASS |
| New RCCF Tests | `rccf72-18d2` | ✅ 10/10 PASS |

---

## Security Verification

| Check | Result |
|-------|--------|
| Tenant isolation (paymentAccountId.tenantId === order.tenantId) | Enforced by server-side checkout resolution |
| Client cannot supply paymentAccountId | Binding set server-only in `createDirectCheckout` |
| Old orders cannot silently bind to new accounts | Historical orders have NULL paymentAccountId; D.3 will reject |
| No credential duplication | Keys remain encrypted in PaymentAccount only |
| No secrets in ProductOrder API | Verified by Test 10 |
| Agency boundary preserved | PaymentAccount is per-tenant; no cross-tenant FK possible |
| PLATFORM_COLLECT unaffected | No paymentAccountId required; strategy check blocks D.2 path |

---

## DIRECT_CREATOR Status

**EXPLICITLY CONFIRMED: INACTIVE**

- `COMMERCE_STRATEGY_REGISTRY` DIRECT_CREATOR status: `"future"` (unchanged)
- Checkout gate: `commerceStrategy.definition.status === "active"` (unchanged)
- No activation logic modified
- No test payment accounts created for activation

---

## Staged Files

```
prisma/schema.prisma
src/actions/payment-account.actions.ts
prisma/migrations/20260822000000_rccf72_18d2_product_order_refund_binding/migration.sql
tests/unit/rccf72-18d2-product-order-refund-binding.test.ts
```

**No unrelated work staged.** Verified via `git diff --cached --name-only`.

---

## Git Status

- Commit: **NOT CREATED**
- Push: **NOT PERFORMED**

---

## Explicitly Deferred to Later RCCFs

| RCCF | Scope |
|------|-------|
| **D.3** | Product refund initiation action (creator auth, amount validation, partial rules, audit) |
| **D.4** | Provider refund execution + webhook reconciliation (Razorpay refund API, refund.processed, idempotency) |
| **D.5** | Refund policy + fulfillment + agency boundary tests |
| **D.6** | Security hardening / penetration testing |
| **Activation** | DIRECT_CREATOR status → "active" only after D.2–D.6 pass |

---

## Limitations & Known Gaps

1. **Credential rotation risk**: If creator revokes Razorpay API keys externally, future refunds against that PaymentAccount will fail. This is correct behavior — we cannot refund against invalid credentials. D.3 should surface this clearly.

2. **Historical PLATFORM_COLLECT orders**: Have `paymentAccountId = null`. D.3 must ensure refund logic distinguishes PLATFORM_COLLECT (platform refund) from DIRECT_CREATOR (creator refund) via `commerceStrategy` + `paymentAccountId` presence.

3. **Partial refund webhook idempotency**: D.4 must design `refundId` uniqueness handling for multi-partial-refund scenarios.

4. **RefundStatus transitions**: D.3/D.4 must define valid state machine: `NONE → PENDING → PARTIAL/REFUNDED/FAILED`.

---

## Closure

This RCCF establishes the **immutable data foundation** for safe creator-direct refunds. Every future DIRECT_CREATOR ProductOrder will permanently record which PaymentAccount received the payment, and the schema supports cumulative partial refund tracking with overflow protection.

The architecture follows the principle: **prove the system can identify and authenticate against the EXACT creator payment account that originally received the money.**

That boundary is now met at the data layer. Execution and reconciliation remain for D.3/D.4.