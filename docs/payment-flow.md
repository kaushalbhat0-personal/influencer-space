# Payment Flow — Audit 07

## Creator product sale (LIVE)

```
Customer
  ↓ https://checkout.razorpay.com/v1/checkout.js (buy-now-button.tsx:38)
BuyNowButton.handleBuy → createCheckout(productId, "")   (buy-now-button.tsx:69)
  ↓ fanEmail is passed as EMPTY STRING — never collected
createCheckout (src/actions/checkout.actions.ts:23-141)
  ├─ product validated (29-32)
  ├─ coupon (hardcoded ACTIVE_COUPONS map) + flat 18% tax (41-54, coupons.ts:89)
  ├─ ProductOrder created: status PENDING, amount = subtotal + 18% (57-66)
  ├─ free/100% branch: total<=0 → COMPLETED, no Razorpay (70-92)
  └─ razorpay.orders.create({amount, receipt: dbOrder.id, notes}) (96-107)  ← REAL API
Razorpay Checkout modal (key = NEXT_PUBLIC_RAZORPAY_KEY_ID)
  ↓ handler → verifyPayment(orderId, paymentId, signature) (buy-now-button.tsx:104-109)
verifyPayment (checkout.actions.ts:143-190) — client HMAC → ProductOrder COMPLETED + paymentId (169-175)
  ↓ (authoritative)
payment.captured webhook (route.ts:132-150) — ProductOrder COMPLETED (idempotent-in-status)
  ↓
NOTHING — no receipt page, no download, no shipping, no transfer, no payout
```

**Merchant of Record: CreatorStore.** One Razorpay key pair
(`NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, `src/lib/razorpay.ts:8-9`)
for every transaction. Money lands in the **platform account**. No Route /
transfer / linked-account / payout exists for product orders.

## Creator subscription (LIVE, real API)

```
BillingPageClient.changePlanAction → billingService.changePlan → createCheckout
  (src/components/billing/BillingPageClient.tsx:70-88)
createCheckout (billing/service.ts:20-58)
  └─ razorpay.subscriptions.create({plan_id, total_count:12, notes})   ← REAL API
      (src/modules/billing/infrastructure/providers/razorpay.ts:36-47)
Razorpay modal consumes subscription_id
  ↓
Webhooks: subscription.activated/charged/completed/cancelled/paused/resumed,
         payment.failed, order.paid  (route.ts:17-26)
handleSubscriptionWebhook (billing/service.ts:163-282)
  ├─ upsert subscription status (TRIALING→ACTIVE)
  ├─ renewsAt = now + 30d (route.ts:84)
  ├─ BillingInvoice(PAID) from plan.price (87-93, 228-234)
  └─ try processCommission (agency-managed) (245-265) — DEAD (see partner-revenue)
```

**Fallback plan checkout is broken:** `razorpay.orders.create({ amount: 0 })`
(providers/razorpay.ts:57-66) — Razorpay rejects ₹0 orders. The subscription
path works only when a `razorpayPlanId` maps (creator_grow/creator_scale have
real IDs).

## Dead / unwired paths

| Path | Evidence | Verdict |
| --- | --- | --- |
| `PurchaseService` (Offering/Purchase models) | `src/lib/commerce/purchases.ts:4-103`; `CheckoutProvider` interface has no implementation | Dead |
| `BillingService.handlePaymentCaptured` | `billing/service.ts:60-154`; grep: zero callers | Dead (and has a self-transition bug) |
| `RazorpayProvider.handleWebhook` | `providers/razorpay.ts:81-90` returns `{success:true}` always | Stub, unused |
| Payment Links / Checkout Session | grep: none | Missing |
| `refunds.create` / `payment.refund` | grep: none | Missing |
| Transfers / Route / Smart Collect / linked accounts | grep: only stubbed providers (`lib/payouts/providers.ts:51-71`) | Missing |

## Webhook handling

- Signature: HMAC-SHA256 + length-guarded `timingSafeEqual` (route.ts:47-61), rate-limited 30/s, subscription events idempotent via `BillingEvent.idempotencyKey`.
- Product orders: **no idempotency record**; completion trusts `notes.productId`/`notes.orderId` without verifying the captured amount.
- `refund.*` events: **not handled**.
