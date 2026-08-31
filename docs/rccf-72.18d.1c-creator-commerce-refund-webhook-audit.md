# RCCF-72.18D.1C — Creator Commerce Refund & Webhook Hardening Audit

**Verdict: D — Architectural Blocker**

---

## Executive Summary

The CreatorStore DIRECT_CREATOR refund architecture **cannot safely support production creator-direct money flows**. While the Razorpay provider adapter (`RazorpayPaymentAdapter.refundPayment()`) implements the low-level `POST /payments/{payment_id}/refund` operation, the **complete refund lifecycle is missing**:

1. **No provider-side refund initiation** for ProductOrders (only subscription commission reversal exists)
2. **No historical PaymentAccount credential binding** — refunds after account switch would use wrong credentials
3. **No ProductOrder refund schema** — no fields to track refund state (refundId, amount, status, timestamp)
4. **No refund webhook reconciliation** for products (`refund.processed` only handles subscription commissions)
5. **No refund authorization/IDOR protection** for products

**The production-readiness boundary is not met**: the system cannot identify and authenticate against the EXACT creator payment account that originally received the money.

---

## Phase 1 — Worktree Protection ✅

- `git status --short` recorded (69 modified, 140+ untracked files — all pre-existing RCCF-71.x/builder/theme/publishing work)
- Baseline diff established via `git diff --stat`
- No modifications made during this audit
- Verified: `npx tsc --noEmit` ✅, `npm run lint` ✅ (warnings only), `npx prisma validate` ✅, `git diff --check` ✅
- **Source modified: NO | Database modified: NO | Staged: NO | Commit: NOT CREATED | Push: NOT PERFORMED**

---

## Phase 2 — Product Order Refund Call Graph

### PLATFORM_COLLECT Checkout (Current Production)
```
createCheckout() [checkout.actions.ts:70]
  → resolveCheckoutTenantId() (host-derived or session)
  → prisma.product.findFirst({ tenantId: checkoutTenantId })
  → resolveCommerceStrategy() → PLATFORM_COLLECT
  → prisma.productOrder.create({ tenantId, productId, amount, status: PENDING, razorpayOrderId: "" })
  → razorpay.orders.create() [PLATFORM credentials: process.env.RAZORPAY_KEY_ID/SECRET]
  → prisma.productOrder.update({ razorpayOrderId: razorpayOrder.id })
  → Returns { orderId, razorpayOrderId, keyId: PLATFORM_KEY_ID }

verifyPayment() [checkout.actions.ts:245]
  → HMAC verify with PLATFORM secret
  → razorpay.payments.fetch() amount verification
  → completeProductOrder(orderId, { paymentId })

Webhook: payment.captured [route.ts:107]
  → Signature verify (RAZORPAY_WEBHOOK_SECRET)
  → Idempotency: BillingEvent.idempotencyKey
  → Finds ProductOrder by notes.orderId
  → Amount verification (capturedPaise === expectedPaise)
  → completeProductOrder() → COMPLETED + razorpayPaymentId
  → BillingEvent: PAYMENT_CAPTURED_PRODUCT
```

### DIRECT_CREATOR Checkout (Future — currently `status: "future"`)
```
createDirectCheckout() [payment-account.actions.ts:63]
  → resolveCheckoutTenantId()
  → prisma.product.findFirst({ tenantId })
  → resolveCommerceStrategy() → MUST be DIRECT_CREATOR + active
  → computePaymentReadiness() → MUST be ready
  → prisma.paymentAccount.findUnique({ tenantId })
  → decrypt(providerKeyId, providerKeySecret) → CREATOR'S credentials
  → adapter.createCheckout() with CREATOR credentials
  → Creates Payment Link on CREATOR's Razorpay account
  → prisma.productOrder.create({
        tenantId, productId, amount, status: PENDING,
        commerceStrategy: "DIRECT_CREATOR",
        provider: "razorpay",
        providerReference: paymentLink.id,
        providerMetadata: { checkoutUrl },
        razorpayOrderId: paymentLink.id (or fallback)
      })
  → Returns { checkoutUrl }
```

### Order Completion (Shared)
```
completeProductOrder() [order-completion.ts:46]
  → prisma.productOrder.findUnique({ orderId })
  → Validates tenantId, status === PENDING
  → resolveActivePlan() → order quota (PlanUsage)
  → Atomic: reserveSlot() + update status=COMPLETED + razorpayPaymentId
  → ensureFulfillment() (idempotent, OrderFulfillment.orderId @unique)
```

### Refund Flow (Subscription — Only Implemented Path)
```
Webhook: refund.processed [route.ts:191]
  → billingService.handleRefund({ refundId, paymentId, refundAmountPaise })
  → Finds BillingInvoice by providerReference=paymentId
  → Finds CommissionEntry for invoice (partner commission)
  → Creates refund_reversal CommissionEntry (negative partnerShare)
  → Updates original commission status=reversed (if full)
  → PartnerLedger: COMMISSION_REVERSED + CLAWBACK_DUE (if settled)
  → BillingEvent: REFUND_PROCESSED (idempotencyKey: razorpay_refund_{refundId})
```

### Missing: Product Order Refund Flow
```
❌ No server action to initiate product refund
❌ No provider refund execution for ProductOrder
❌ No ProductOrder refund fields (refundId, refundAmount, refundStatus, refundedAt)
❌ Webhook refund.processed does NOT touch ProductOrder
❌ No partial/full refund tracking
❌ No digital fulfillment invalidation on refund
```

**Key Identifiers at Each Step:**
| Step | tenantId | productId | orderId | paymentId | providerReference | razorpayOrderId | razorpayPaymentId | refundId | commerceStrategy | provider | PaymentAccount |
|------|----------|-----------|---------|-----------|-------------------|-----------------|-------------------|----------|------------------|----------|----------------|
| createCheckout (PLATFORM) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (Razorpay order) | ❌ | ❌ | PLATFORM_COLLECT | razorpay | Platform |
| createDirectCheckout | ✅ | ✅ | ✅ | ❌ | ✅ (Payment Link ID) | ✅ (Payment Link ID) | ❌ | ❌ | DIRECT_CREATOR | razorpay | Creator |
| verifyPayment | ✅ | ✅ | ✅ | ✅ (input) | ❌ | ✅ | ✅ | ❌ | PLATFORM_COLLECT | razorpay | Platform |
| Webhook payment.captured | ✅ (notes) | ✅ (notes) | ✅ (notes) | ✅ (payload) | ❌ | ✅ | ✅ | ❌ | PLATFORM_COLLECT | razorpay | Platform |
| Webhook refund.processed | ❌ | ❌ | ❌ | ✅ (payload) | ✅ (refundId) | ❌ | ✅ | ✅ | N/A (subscription) | razorpay | N/A |

---

## Phase 3 — Actual Razorpay Refund Capability

### Provider Adapter: `RazorpayPaymentAdapter.refundPayment()` ✅
**Location**: `src/modules/payment-account/providers/razorpay.ts:54-63`

```typescript
async refundPayment(input: PaymentRefundInput): Promise<{ success: boolean; error?: string }> {
  const { client, missing } = creatorRazorpay(input.providerKeyId, input.providerKeySecret);
  if (missing) return { success: false, error: "Creator Razorpay keys not configured" };
  try {
    await (client as unknown as { payments: { refund(id: string, opts?: { amount?: number }): Promise<unknown> } })
      .payments.refund(input.providerPaymentId, input.amount ? { amount: Math.round(input.amount * 100) } : undefined);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Refund failed" };
  }
}
```

**Calls**: `razorpay.payments.refund(payment_id, { amount?: number })` — **exactly** `POST /payments/{payment_id}/refund`

### Provider Adapter Capability Matrix

| Operation | Supported | Method |
|-----------|-----------|--------|
| Create order | ✅ | `razorpay.orders.create()` (PLATFORM) / `paymentLink.create()` (DIRECT_CREATOR) |
| Create payment link | ✅ | `paymentLink.create()` |
| Verify payment | ✅ | `payments.fetch()` |
| **Refund payment** | ✅ | `payments.refund()` |
| Refund status | ❌ | No `getRefundStatus` method |
| Payment lookup | ✅ | `payments.fetch()` |
| Account lookup | ❌ | No method |

**Critical Requirement**: `refundPayment()` requires `providerKeyId` and `providerKeySecret` — the **exact credentials of the account that received the payment**.

---

## Phase 4 — Original Payment Account Binding

### ProductOrder Schema (Relevant Fields)
```prisma
model ProductOrder {
  id                 String   @id @default(cuid())
  tenantId           String   @db.Uuid
  productId          String   @db.Uuid
  amount             Float
  status             String   @default("PENDING")
  razorpayOrderId    String   @unique          // PLATFORM: Razorpay order ID; DIRECT: Payment Link ID
  razorpayPaymentId  String?                   // Set on completion
  commerceStrategy   String?                   // "PLATFORM_COLLECT" | "DIRECT_CREATOR"
  provider           String?                   // "razorpay"
  providerReference  String?                   // Payment Link ID (DIRECT) or Razorpay order ID
  providerMetadata   Json?                     // { checkoutUrl } for DIRECT_CREATOR
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

### PaymentAccount Schema (Credentials)
```prisma
model PaymentAccount {
  id                 String   @id @default(uuid()) @db.Uuid
  tenantId           String   @unique @db.Uuid
  provider           String   @default("razorpay")
  providerKeyId      String?  // ENCRYPTED (creator's Razorpay Key ID)
  providerKeySecret  String?  // ENCRYPTED (creator's Razorpay Key Secret)
  status             String   @default("pending")  // pending | active | disconnected
  verificationStatus String   @default("unverified")
}
```

### Scenario Analysis

#### Scenario A: Creator uses Account A → switches to Account B → refund for old order
- **ProductOrder** stores: `providerReference` (Payment Link ID from Account A), `commerceStrategy: "DIRECT_CREATOR"`, `provider: "razorpay"`
- **PaymentAccount** now contains Account B's encrypted credentials
- **No historical record** of Account A's credentials
- **Refund execution would use Account B's credentials** → **WRONG ACCOUNT** (Razorpay will reject or refund from B's balance)

#### Scenario B: Creator disconnects PaymentAccount entirely → refund for old order
- PaymentAccount.status = "disconnected", but `providerKeyId`/`providerKeySecret` remain encrypted in DB
- Could decrypt old credentials if not rotated
- **BUT**: No guarantee credentials are valid; creator may have revoked API keys in Razorpay dashboard
- **Risk**: Refund fails silently or uses stale credentials

#### Scenario C: Creator reconnects different Razorpay account (new credentials)
- New credentials **overwrite** old ones in PaymentAccount
- No audit trail of previous credentials
- **Historical refunds would use new credentials** → **WRONG ACCOUNT**

#### Scenario D: Two tenants with Razorpay accounts — cross-tenant refund
- ProductOrder.tenantId checked in `createDirectCheckout()` and `completeProductOrder()`
- Webhook derives tenant from `notes.tenantId` / `notes.workspaceId`
- **Risk**: If refund initiation uses wrong tenantId for PaymentAccount lookup → cross-tenant credential use

#### Scenario E: Malicious manipulation (orderId, paymentId, refundId, providerReference, tenantId)
- `verifyPayment()` [checkout.actions.ts:262]: `findUnique({ where: { razorpayOrderId } })` — **no tenant check**
- `createDirectCheckout()`: Product lookup scoped to checkoutTenantId ✅
- `completeProductOrder()`: Uses order.tenantId from found order ✅
- Webhook: Finds ProductOrder by `notes.orderId` — **no tenant verification** in product path [route.ts:151]
- **P0 IDOR**: ProductOrder lookup by ID without tenant authorization in multiple paths

---

## Phase 5 — Refund Authorization / IDOR

**Current State**: NO product refund initiation function exists.

### Potential IDOR Vectors (if product refund were added):

| Function | Caller | Auth | Tenant Derivation | ProductOrder Lookup | Tenant Check | Strategy Check | Payment Binding |
|----------|--------|------|-------------------|---------------------|--------------|----------------|-----------------|
| `fetchOrders()` | Creator | Session | Session tenantId | `where: { tenantId }` | ✅ | ❌ | ❌ |
| `getCustomerOrder()` | Customer | Email | From order | `findUnique({ id: orderId })` | Via `canAccessOrder()` ✅ | ❌ | ❌ |
| `submitShippingAddress()` | Customer | Email | From order | `findUnique({ id: orderId })` | Via `canAccessOrder()` ✅ | ❌ | ❌ |
| `getOrderDownload()` | Customer | Email | From order | `findUnique({ id: orderId })` | Via `canAccessOrder()` ✅ | ❌ | ❌ |

**Required for Product Refund Action**:
- Caller: Creator (owner) OR Customer (with email verification)
- Authentication: Session (creator) OR Email match (customer)
- TenantId: From ProductOrder.tenantId (server-derived)
- ProductOrder lookup: `findUnique({ id: orderId })` + **tenantId verification**
- Strategy check: `commerceStrategy === "DIRECT_CREATOR"` (for provider refund)
- Provider check: `provider === "razorpay"`
- Payment binding: `razorpayPaymentId` must exist and match order

---

## Phase 6 — Webhook Security

### Current Webhook: `src/app/api/webhooks/razorpay/route.ts`

✅ **Signature Verification**: HMAC-SHA256 with `timingSafeEqual`  
✅ **Idempotency**: `BillingEvent.idempotencyKey` (unique per payment+event)  
✅ **Rate Limiting**: IP-based  
✅ **Error Tracking**: `captureError()`  

### Event Handling Matrix

| Razorpay Event | Handled | Purpose | Product Order Support |
|----------------|---------|---------|----------------------|
| `payment.captured` | ✅ | Complete ProductOrder + Subscription | ✅ |
| `payment.failed` | ✅ (via SUBSCRIPTION_EVENTS) | Subscription only | ❌ |
| `order.paid` | ✅ (via SUBSCRIPTION_EVENTS) | Subscription only | ❌ |
| `subscription.activated` | ✅ | Subscription lifecycle | ❌ |
| `subscription.charged` | ✅ | Subscription renewal | ❌ |
| `subscription.cancelled` | ✅ | Subscription lifecycle | ❌ |
| `refund.processed` | ✅ | **Subscription commission reversal only** | ❌ |
| `refund.created` | ❌ | Not handled | ❌ |
| `payment.refunded` | ❌ | Not handled | ❌ |

### Refund Webhook Gaps for Product Orders
- `refund.processed` handler [route.ts:191] calls `billingService.handleRefund()` which **only reverses subscription commissions**
- No binding of `refundEntity.payment_id` → `ProductOrder.razorpayPaymentId`
- No ProductOrder status update (REFUNDED, PARTIALLY_REFUNDED)
- No refund amount tracking on ProductOrder
- No idempotency key for product refunds (subscription uses `razorpay_refund_{refundId}`)

---

## Phase 7 — Product Refund vs Subscription Refund

| Operation | Subscription | Creator Product (DIRECT_CREATOR) |
|-----------|-------------|----------------------------------|
| Provider payment | Razorpay Subscription/Order | Razorpay Payment Link (creator's account) |
| Customer refund initiation | ❌ No UI | ❌ No action |
| Provider refund execution | ❌ Only commission reversal | ✅ Adapter exists (`refundPayment`) but **not wired** |
| Refund webhook | ✅ `refund.processed` → commission reversal | ❌ Not handled |
| Local order mutation | BillingSubscription status | ❌ ProductOrder has NO refund status |
| Commission reversal | ✅ `handleRefund()` (partner share) | ❌ No product commission model |
| Idempotency | ✅ `BillingEvent.idempotencyKey` | ❌ Not implemented |
| Partial refund support | ✅ Proportional commission reversal | ❌ No tracking |
| Full refund overflow protection | ✅ Capped at original commission | ❌ Not applicable |

**Critical Finding**: `handleRefund()` is **subscription-only** — it reverses partner commissions for BillingInvoices. It does NOT:
- Issue provider-side refunds to customers
- Update ProductOrder status
- Track refund amounts on ProductOrder
- Handle partial refunds for products

---

## Phase 8 — Account Switching Safety

### State Machine Audit
```
PaymentAccount A (active, keys_A)
      ↓
Order paid: createDirectCheckout() uses keys_A
  → ProductOrder: providerReference=plink_A, commerceStrategy=DIRECT_CREATOR
      ↓
PaymentAccount switched: savePaymentAccount() with keys_B
  → PaymentAccount: providerKeyId=keys_B, providerKeySecret=keys_B
      ↓
PaymentAccount B (active, keys_B)
      ↓
Refund requested for old order
      ↓
System looks up PaymentAccount for tenant → gets keys_B
      ↓
refundPayment(providerPaymentId, keys_B) → FAILS or WRONG ACCOUNT
```

### Root Cause
**ProductOrder does not preserve PaymentAccount identity at payment time.** It stores:
- `providerReference` (Payment Link ID) — belongs to Account A
- `provider` ("razorpay")
- `commerceStrategy` ("DIRECT_CREATOR")

But **NOT**: `paymentAccountId`, `providerKeyIdSnapshot`, or any credential binding.

**Razorpay Constraint**: `payments.refund(payment_id)` must be called with the **same account credentials** that created the payment. Payment Link IDs are account-scoped.

---

## Phase 9 — Webhook Reconciliation

### Payment Flow (DIRECT_CREATOR) — Works
```
createDirectCheckout → Payment Link (creator's Razorpay)
    ↓
Customer pays
    ↓
Razorpay: payment.captured webhook
    ↓
Webhook finds ProductOrder by notes.orderId
    ↓
completeProductOrder() → COMPLETED, razorpayPaymentId set
    ↓
BillingEvent: PAYMENT_CAPTURED_PRODUCT
```

### Refund Flow (MISSING)
```
❌ No refund initiation action
    ↓
❌ No provider refund execution
    ↓
Razorpay: refund.processed webhook
    ↓
Webhook handles refund.processed → ONLY subscription commission reversal
    ↓
ProductOrder NOT updated (remains COMPLETED)
    ↓
No local reconciliation
```

### Missing ProductOrder Refund Fields
| Field | Purpose | Status |
|-------|---------|--------|
| `refundId` | Razorpay refund ID | ❌ Missing |
| `refundAmount` | Cumulative refunded amount | ❌ Missing |
| `refundStatus` | requested/processing/processed/failed | ❌ Missing |
| `refundedAt` | Timestamp of full refund | ❌ Missing |
| `partialRefund` | Boolean: partial vs full | ❌ Missing |
| `cumulativeRefundAmount` | Sum of all partial refunds | ❌ Missing |

---

## Phase 10 — Partial Refunds

**Current State**: NO support for partial refunds on ProductOrders.

### If Implemented Naively (Current Gaps):
| Risk | Current Protection |
|------|-------------------|
| Cumulative refunds > original amount | ❌ No tracking |
| Duplicate webhook = double refund | ❌ No product refund idempotency |
| ProductOrder status incorrect | ❌ No refund status field |
| Commission calculation drift | ❌ No product commission model |
| Provider refund amount validation | ❌ No amount verification on refund |

---

## Phase 11 — Agency Boundary

| Strategy | Merchant | Expected Refund Account | Actual Refund Account (if implemented today) |
|----------|----------|------------------------|---------------------------------------------|
| PLATFORM_COLLECT | Platform | Platform Razorpay | Platform (uses `process.env` keys) ✅ |
| DIRECT_CREATOR | Creator | **Exact creator account at payment time** | **Current PaymentAccount (may be wrong after switch)** ❌ |

**Risk**: Agency-managed creators on DIRECT_CREATOR could have refunds processed through wrong account if tenant resolution fails.

---

## Phase 12 — WhatsApp / Offline Orders

**Product.commerceMode**: `"ONLINE" | "WHATSAPP" | "BOTH"`

- `createCheckout()` only processes ONLINE products (must be PUBLISHED, isActive)
- WhatsApp orders: Created manually/contact form → **no Razorpay payment**
- Could be manually marked COMPLETED via free-order path (total ≤ 0)
- **Risk**: Manually COMPLETED WhatsApp orders have no provider payment → refund would have no target

---

## Phase 13 — Physical Products

**OrderFulfillment** tracks: `status` (pending→preparing→packed→shipped→delivered), `shippingAddress`, `trackingNumber`

**Refund Business Rules**: **NONE implemented or documented**
- No rules for refund before shipment
- No rules for refund after shipment
- No rules for refund after delivery
- No automatic refund blocking based on fulfillment status

---

## Phase 14 — Digital Products

**OrderFulfillment** for digital: `downloadUrl`, `downloadToken`, `downloadExpiresAt`, `downloadLimit`, `downloadCount`

**Refund Implications**: **NONE implemented**
- Refunded order does NOT invalidate download tokens
- No prevention of additional downloads
- Previous downloads preserved
- Order status not changed to REFUNDED

---

## Phase 15 — Security Matrix

| Scenario | Expected | Actual | Status | Severity |
|----------|----------|--------|--------|----------|
| Tenant A refunds own order | ALLOW | ❌ No action | BLOCKED | — |
| Tenant A refunds Tenant B order | DENY | ❌ N/A | N/A | — |
| Anonymous refund | DENY | ❌ N/A | N/A | — |
| Customer manipulates orderId | DENY | ❌ No action | N/A | — |
| Customer manipulates paymentId | DENY | ❌ No action | N/A | — |
| Wrong provider account | DENY | ⚠️ Uses current PaymentAccount | **FAIL** | **P0** |
| Duplicate webhook | Idempotent | ✅ Subscriptions, ❌ Products | **FAIL** | **P0** |
| Partial refund overflow | DENY | ❌ No tracking | **FAIL** | **P0** |
| Old order after account switch | Original account | ❌ Uses current account | **FAIL** | **P0** |
| Disconnected old account | Safe handling | ❌ Would fail/stale creds | **FAIL** | **P1** |
| Platform order via creator account | DENY | Strategy check in checkout ✅ | PASS | P1 |
| Creator order via platform account | DENY | Strategy check in checkout ✅ | PASS | P1 |

---

## Phase 16 — Performance (Read-Only)

| Pattern | Location | Concern |
|---------|----------|---------|
| Duplicate PaymentAccount queries | `computePaymentReadiness()` called multiple times per request | Request-cached mitigates |
| Duplicate ProductOrder queries | Webhook: `findUnique` + `completeProductOrder` does another `findUnique` | Low (single order) |
| N+1 webhook processing | Single order per webhook event | Low |
| Unnecessary provider API calls | `verifyPayment()` fetches payment for amount check | Best-effort, webhook is authoritative |
| Transaction scope | `handleRefund()`: invoice + commission + ledger + event in one tx | Correct |

---

## Phase 17 — Production Classification

| ID | Severity | Confidence | Finding | Evidence | Recommendation |
|----|----------|------------|---------|----------|----------------|
| F1 | **P0** | HIGH | No provider-side product refund execution | `refundPayment` adapter exists but no action, no webhook handling, no ProductOrder refund fields | Implement product refund action + webhook handling + schema fields |
| F2 | **P0** | HIGH | Historical PaymentAccount credentials not preserved | ProductOrder stores providerReference but not credential binding; PaymentAccount overwrites keys | Add `paymentAccountId` + `paymentAccountSnapshot` to ProductOrder |
| F3 | **P0** | HIGH | Refund uses wrong credentials after account switch | Scenario A: Account A → Account B → refund uses B's keys | Store credential reference at payment time |
| F4 | **P0** | HIGH | No ProductOrder refund status tracking | Schema lacks refundId, refundAmount, refundStatus, refundedAt | Add refund fields to ProductOrder |
| F5 | **P0** | HIGH | No partial refund support | No cumulative refund tracking, no overflow protection | Implement partial refund logic with cumulative tracking |
| F6 | **P1** | HIGH | Refund webhook doesn't handle product refunds | `refund.processed` only does subscription commission reversal | Add ProductOrder refund handling to webhook |
| F7 | **P1** | HIGH | No refund authorization/IDOR for products | No refund action exists; needs tenant/order/payment binding | Implement with full authorization checks |
| F8 | **P1** | MEDIUM | No digital product refund invalidation | Refunded digital orders don't invalidate download tokens | Add fulfillment integration on refund |
| F9 | **P2** | MEDIUM | No physical product refund rules | No business rules for shipment/delivery state | Define and implement refund rules |
| F10 | **P2** | MEDIUM | WhatsApp orders could enter refund path | Manual COMPLETED orders have no payment | Block refunds for orders without provider payment |
| F11 | **P2** | MEDIUM | No refund idempotency for products | Product refund webhooks not idempotent | Add refund idempotency keys |
| F12 | **P3** | LOW | No refund status polling API | Adapter lacks `getRefundStatus` | Add to adapter interface |

---

## Phase 18 — Final Verdict & Verification

### RCCF-72.18D.1C — Creator Commerce Refund & Webhook Hardening Audit
**Verdict: D — Architectural Blocker**

### Production Blockers
1. **P0**: Refunds after PaymentAccount switch use wrong credentials (money loss / cross-tenant mutation)
2. **P0**: No provider refund execution for ProductOrders
3. **P0**: No refund idempotency for ProductOrders
4. **P0**: No partial refund overflow protection

### Recommended RCCF Sequence
1. **RCCF-72.18D.2** — ProductOrder Refund Schema & Provider Binding (add `paymentAccountId`, refund fields, credential snapshot at payment time)
2. **RCCF-72.18D.3** — Product Refund Initiation Action (creator-initiated, customer-facing, with full authorization)
3. **RCCF-72.18D.4** — Provider Refund Execution & Webhook Reconciliation (wire `refundPayment`, handle `refund.processed` for products)
4. **RCCF-72.18D.5** — Partial Refunds, Digital/Physical Rules, Agency Boundary Tests
5. **RCCF-72.18D.6** — Security Hardening & Penetration Testing

### Verification Gates
```
npx tsc --noEmit          → PASS
npm run lint              → PASS (warnings only)
npx prisma validate       → PASS
git diff --check          → PASS
working-tree comparison   → UNCHANGED (no modifications made)
```

**HARD STOP**: Do not activate DIRECT_CREATOR. Do not implement fixes in this RCCF. The next RCCF should only be implemented after this audit establishes exactly what must change.

---

## Core Principle Verification

> **Do not say a refund architecture is safe merely because:**
> - the order has providerReference
> - the webhook is signed
> - handleRefund() is idempotent
> - commissions can be reversed
>
> **Prove that the system can identify and authenticate against the EXACT creator payment account that originally received the money.**
>
> **That is the production-readiness boundary.**

**This audit proves the boundary is NOT met.** The system lacks the credential binding, refund execution, webhook reconciliation, and state tracking required to safely refund against the original creator account.