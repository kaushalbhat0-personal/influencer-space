# RCCF-72.18D.4 Closure Report: Product Refund Provider Execution & Webhook Reconciliation

## Status: COMPLETE

## Audit Findings

| Finding | Severity | Confidence | Status |
|---------|----------|------------|--------|
| `refundPayment()` adapter discarded Razorpay refund ID (returned only `{ success, error }`) | High | High | Fixed — now returns `PaymentRefundResult` with `providerRefundId` and `status` |
| `refundAmount` on ProductOrder conflated "reserved" (D.3) with "confirmed" (D.4) — no PENDING state | High | High | Fixed — D.3 now sets PENDING; D.4 transitions to PARTIAL/REFUNDED/FAILED |
| `refund.processed` webhook only called `billingService.handleRefund()` (commission reversal) — never reconciled DIRECT_CREATOR ProductOrder state | High | High | Fixed — added DIRECT_CREATOR reconciliation branch in webhook route |
| No idempotency guard on provider refund execution (retry after timeout could double-refund) | High | High | Fixed — BillingEvent idempotency key `product_refund_initiated_<orderId>` |
| `refund.processed` webhook lacked `refund.failed` handling | Medium | High | Fixed — webhook now handles both `refund.processed` and `refund.failed` |
| Agency/SUPPORT roles not explicitly denied in `requireCreatorOrSuperAdmin` | Medium | High | Fixed — explicit role denial added |
| Unused `logger` import in webhook route | Low | High | Fixed — removed |

## Before/After Architecture

### Before (D.3 only):
```
creator calls requestProductOrderRefund()
  → validates authorization, strategy, amount
  → sets refundStatus = PARTIAL or REFUNDED directly
  → refundAmount = cumulative
  → NO provider call
  → refundId = null, refundedAt = null

webhook refund.processed
  → calls billingService.handleRefund() (commission reversal only)
  → ProductOrder refund state NEVER updated
```

### After (D.3 + D.4):
```
creator calls requestProductOrderRefund()      [D.3]
  → validates authorization, strategy, amount
  → sets refundStatus = PENDING
  → refundAmount = reserved cumulative paise
  → refundedAt = now
  → returns { success: true }

creator/system calls executeProductOrderRefund()  [D.4]
  → checks idempotency (BillingEvent: product_refund_initiated_<orderId>)
  → loads order, verifies PENDING state
  → verifies historical PaymentAccount binding (order.paymentAccountId → tenantId match)
  → decrypts credentials via @/lib/crypto
  → calls adapter.refundPayment() with decrypted credentials
  → on success:
    → sets refundId = provider refund ID
    → sets refundStatus = PARTIAL or REFUNDED
    → sets refundedAt = now
    → creates BillingEvent (idempotency record)
  → on failure:
    → sets refundStatus = FAILED
    → captures error via captureError()
    → never exposes credentials to caller

webhook refund.processed/refund.failed
  → signature verified (existing)
  → idempotency checked (existing buildRazorpayIdempotencyKey)
  → calls billingService.handleRefund() (commission reversal) [existing path]
  → ALSO: finds ProductOrder by razorpayPaymentId
    → if DIRECT_CREATOR + refundId is null:
      → idempotency check (BillingEvent: product_refund_webhook_<refundId>)
      → enforces cumulative ceiling (Math.min(newAmount, originalCapturedPaise))
      → sets refundId, refundStatus, refundAmount, refundedAt
      → creates BillingEvent (idempotency record)
```

## Refund State Machine

```
                    ┌─────────┐
                    │   NONE  │
                    └────┬────┘
                         │
                   requestProductOrderRefund (D.3)
                         │
                    ┌────▼────┐
                    │  PENDING│  ← provider refund in-flight
                    └──┬─┬──┬─┘
                       │ │  │
              executeProductOrderRefund    │
                       │ │  │
    ┌───────────┐      │ │  ┌───────────┐
    │ PARTIAL   │◄─────┘ │  │   FAILED  │
    └───────────┘        │  └─────┬─────┘
                         │        │
                    ┌────▼────┐   │
                    │ REFUNDED│   │
                    └─────────┘   │
                                  │
                    webhook reconcile (any D.3 gap)
```

**Transitions:**
- `NONE → PENDING`: D.3 initiates refund (sets refundAmount, refundStatus, refundedAt)
- `PENDING → PARTIAL`: D.4 provider succeeds, partial refund
- `PENDING → REFUNDED`: D.4 provider succeeds, full refund
- `PENDING → FAILED`: D.4 provider rejects or errors
- `PENDING → (webhook reconcile)`: webhook can transition if D.4 failed to complete

**Re-entry:** All transitions are guarded by idempotency. D.4 checks `refundStatus === "PENDING"` and BillingEvent existence.

## Historical Account Binding

The refund execution uses `ProductOrder.paymentAccountId` — the **exact persisted binding** at checkout time. It does NOT call `getCurrentPaymentAccount(tenantId)`.

Flow:
1. Load `ProductOrder` including `paymentAccountId`
2. Load `PaymentAccount` by that ID (not by tenantId)
3. Verify `paymentAccount.tenantId === order.tenantId`
4. Decrypt `providerKeyId` and `providerKeySecret` via `@/lib/crypto.decrypt()`
5. Pass decrypted credentials to adapter

If the tenant's current payment account has changed since the order was created, the **historical** account is still used. This is correct for refunds — you can only refund on the Razorpay account that originally captured the payment.

## Provider Execution

Uses the existing `RazorpayPaymentAdapter.refundPayment()` — enhanced to return:
- `providerRefundId`: the Razorpay refund ID (`refund_xxx`)
- `status`: the provider status string

The adapter creates a `new Razorpay({ key_id, key_secret })` client per call — no shared state. Credentials are decrypted in-memory only and never persisted or logged.

Amount conversion: `order.refundAmount` is stored in paise (minor units). The adapter expects rupees and converts internally: `Math.round(input.amount * 100)`. So D.4 passes `refundAmount / 100` to the adapter.

## Idempotency Design

| Layer | Key | Mechanism |
|-------|-----|-----------|
| D.4 execution | `product_refund_initiated_<orderId>` | BillingEvent unique key — second call returns `alreadyProcessed: true` without provider call |
| Webhook reconcile | `product_refund_webhook_<refundId>` | BillingEvent unique key — duplicate webhooks are no-ops |
| D.3 initiation | Optimistic lock on `refundAmount` + `refundStatus` filter | Conditional update with `where: { refundAmount: <stale>, refundStatus: { in: [NONE, PARTIAL, FAILED] } }` — second D.3 call returns `REFUND_IN_PROGRESS` |
| Webhook route | `buildRazorpayIdempotencyKey()` | Existing top-level idempotency check on all Razorpay events |

## Webhook Reconciliation

Extended `refund.processed` and added `refund.failed` handling in the webhook route. After the existing commission reversal path (`billingService.handleRefund`), a new DIRECT_CREATOR branch:

1. Finds ProductOrder via `findFirst({ where: { razorpayPaymentId } })` — server-side persistence, never from client
2. Checks `commerceStrategy === "DIRECT_CREATOR"` — PLATFORM_COLLECT uses commission path; subscriptions unaffected
3. Checks `refundId === null` — duplicate detection
4. Checks BillingEvent idempotency — `product_refund_webhook_<refundId>`
5. Enforces cumulative ceiling: `Math.min(newRefundAmount, originalCapturedPaise)`
6. Sets final status: REFUNDED (full), PARTIAL (partial), FAILED (refund.failed)
7. Creates BillingEvent for idempotency

This handles all webhook ordering scenarios:
- **Case A** (API success before webhook): refundId already set → idempotent skip
- **Case B** (API timeout, webhook later): webhook reconciles → sets refundId/status
- **Case C** (provider failure then success): webhook `refund.processed` reconciles
- **Case D** (provider failure): webhook `refund.failed` → FAILED
- **Case E** (duplicate webhooks): idempotency key collides → skip

## Partial Refund Safety

All amounts in paise (integer minor units):
- Original captured: `order.amount * 100` (rupees → paise)
- Requested: `order.refundAmount` (already reserved by D.3 in paise)
- Remaining: `originalCapturedPaise - cumulativeRefundedPaise`

Validation:
- `refundAmount > 0` — zero rejected (`INVALID_AMOUNT`)
- `refundAmount <= originalCapturedPaise` — overflow rejected (`INVALID_AMOUNT`)
- Concurrent safety: D.3's optimistic lock prevents double-initiation
- Webhook ceiling: `Math.min(newAmount, originalCapturedPaise)` prevents ceiling breach

## Authorization Matrix

| Actor / Scenario | Expected | Result |
|-----------------|----------|--------|
| Anonymous | Deny | UNAUTHORIZED |
| Creator (tenant owner) | Allow | ✓ |
| Creator from another tenant | Deny | FORBIDDEN |
| AGENCY_ADMIN | Deny | UNAUTHORIZED |
| AGENCY_STAFF | Deny | UNAUTHORIZED |
| SUPPORT | Deny | UNAUTHORIZED |
| READ_ONLY | Deny | UNAUTHORIZED |
| SUPER_ADMIN | Allow (admin policy) | ✓ with documented bypass |
| Cross-tenant PaymentAccount | Deny | INVALID_PAYMENT_ACCOUNT |
| Missing historical PaymentAccount | Deny | MISSING_PAYMENT_ACCOUNT |
| Current account differs from historical | Use historical | ✓ |

## Security Controls

1. **No credential exposure**: `decrypt()` is called in-memory; results never stored or returned to client
2. **Error scrubbing**: `captureError()` captures provider error details server-side; caller only sees `PROVIDER_ERROR` / `INVALID_REQUEST` / `UNAUTHORIZED_PROVIDER` codes
3. **Signature verification**: Existing HMAC-SHA256 verification in webhook route (unchanged)
4. **No tenantId from webhook**: ProductOrder is found by `razorpayPaymentId` only; `tenantId` is read from the DB record
5. **Strategy isolation**: `DIRECT_CREATOR` check prevents PLATFORM_COLLECT product refunds from entering creator-provider path

## Tests

| Suite | Result |
|-------|--------|
| D.2 (refund binding) | 10/10 ✓ |
| D.3 (initiation) | 19/19 ✓ |
| D.4 (execution) | 38/38 ✓ |
| Payment account tests | All pass ✓ |
| Commerce integrity tests | All pass ✓ |

## Verification

| Gate | Result |
|-----|--------|
| `npx tsc --noEmit` | ✓ Clean |
| `npx eslint --max-warnings=0` | ✓ Clean |
| `npm run build` | ✓ Success (160 routes) |
| `npx prisma validate` | ✓ Schema valid |
| Focused tests | ✓ 67/67 (D.2+D.3+D.4) |
| Regression | ✓ All pass |

## Staged Files

Exact D.4 implementation files to stage:

```
src/actions/payment-account.actions.ts         (D.3 PENDING state + D.4 executeProductOrderRefund)
src/modules/payment-account/providers/types.ts  (PaymentRefundResult interface)
src/modules/payment-account/providers/razorpay.ts (enhanced refundPayment)
src/modules/payment-account/index.ts            (export PaymentRefundResult)
src/app/api/webhooks/razorpay/route.ts          (webhook reconciliation)
tests/unit/rccf72-18d4-product-refund-execution.test.ts  (38 tests)
docs/rccf-72.18d4-product-refund-provider-closure.md  (this file)
```

## Protected Work

All unrelated working-tree changes remain untouched:
- RCCF-70.4.3 (RCCF-70.4.3-creator-dashboard-implementation.md)
- RCCF-71.x series (theme experience, hero presentation, etc.)
- Dashboard work (storefront, dashboard, etc.)
- Builder work (interactive-canvas, components, etc.)
- Settings work (settings-form, settings-live-preview, etc.)
- Theme work (entitlement, resolver-new, etc.)
- Publishing work (service.ts, build-snapshot, etc.)
- Test fixtures (auth.ts, test-seed.ts)
- E2E tests

## Deferred

- **DIRECT_CREATOR activation**: Remains `status: "future"` in the commerce strategy registry. NOT activated by D.4.
- **Provider webhook idempotency at Razorpay level**: Not using `X-Idempotency-Key` (Razorpay SDK doesn't support per-request headers for this). Application-level idempotency via BillingEvent is used instead.
- **E2E webhook testing**: Unit tests mock the adapter. A full E2E test with real webhook signatures is deferred.
- **Razorpay `refund.failed` event**: Handled in webhook, but the event payload structure may vary — additional validation could be added if provider feedback indicates issues.

## Production Readiness Verdict

**C** — Functional but limited to admin/internal use. The DIRECT_CREATOR strategy remains inactive (`status: "future"`). The refund execution and webhook reconciliation are production-safe (idempotent, tenant-isolated, credential-safe, state-guarded), but will not be exercised by real customers until DIRECT_CREATOR is activated in a future RCCF.

## Git
Commit: NOT CREATED
Push: NOT PERFORMED

STOP.