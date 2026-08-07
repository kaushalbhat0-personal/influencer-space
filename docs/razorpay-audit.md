# Razorpay Audit — Audit 07

## Client

`src/lib/razorpay.ts` instantiates the **official `razorpay` npm SDK** singleton
from `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` and exposes the raw
SDK. **One key pair = one merchant account = CreatorStore is Merchant of
Record.**

## API usage inventory

| Razorpay API | Used? | Where | Notes |
| --- | --- | --- | --- |
| `orders.create` | ✅ Real | `src/actions/checkout.actions.ts:96` (products) | Product checkout |
| `orders.create` | ⚠️ Broken | `billing/.../providers/razorpay.ts:57-66` | **Fallback plan checkout hardcodes `amount: 0`** → Razorpay rejects |
| `subscriptions.create` | ✅ Real | `providers/razorpay.ts:36-47` | Plan checkout with `plan_id` (creator_grow/scale have real IDs) |
| `payments.refund` / `refunds.create` | ❌ Missing | grep: none | No refund path anywhere |
| `transfers.create` / Route / Smart Collect | ❌ Missing | grep: only docs + stubbed `RazorpayRouteProvider` | No money movement to creators |
| `linkedaccount.*` / `fund_accounts` / `contacts` | ❌ Missing | grep: none | No per-creator accounts |
| Payment Links / Checkout Session | ❌ Missing | grep: none | — |
| `payments.fetch` (capture verification) | ❌ Missing | grep: none | `verifyPayment` never re-checks the amount/status server-side |

## Webhooks

| Event | Handled? | Where | Notes |
| --- | --- | --- | --- |
| `subscription.activated/charged/completed/cancelled/paused/resumed` | ✅ | `route.ts:17-26` → `handleSubscriptionWebhook` | Trial→Active, invoices |
| `payment.failed` | ✅ | route | → `PAST_DUE` |
| `order.paid` | ⚠️ | In subscription set; product-order `order.paid` (no workspace note) is dropped at `route.ts:77` | Product orders rely on `payment.captured` |
| `payment.captured` | ✅ | route.ts:93-151 | Dual: subscription reconciliation + ProductOrder COMPLETED (trusts notes, no amount check, no idempotency row for products) |
| `refund.*` | ❌ | not handled | — |
| payout/transfer events | ❌ | not handled | — |

Signature: HMAC-SHA256 + length-guarded `timingSafeEqual` (`route.ts:47-61`),
rate-limited 30/s (`rate-limiter.ts:17`), subscription events idempotent via
`BillingEvent.idempotencyKey`.

## Merchant of Record verdict

| Finding | Status | Evidence |
| --- | --- | --- |
| Single platform account — CreatorStore is MoR for ALL transactions (products + subscriptions) | ✅ (current) | one `NEXT_PUBLIC_RAZORPAY_KEY_ID` everywhere |
| `Tenant.razorpayAccountId`, `WebsiteAgency.razorpayAccountId`, `ProductOrder.routeTransferId` reserved but never read/written | ⚠️ | `schema.prisma:50,201,374` |
| No Route / linked-account / transfers code | ❌ | grep: only stubbed `lib/payouts/providers.ts:51-71` |

## Gap → desired model (DIRECT_CREATOR)

Razorpay supports the desired model via **Route / Linked Accounts / Smart
Collect**: platform creates the order, attaches `route` with
`transfers[].account = creator's linked account`, money splits automatically.
None of this exists. Building it requires:
1. Onboarding creators to Razorpay **Linked Accounts** (collect banking/UPI/account).
2. Attaching a `route`/transfer instruction to each `orders.create`.
3. A `payment.captured`/transfer webhook to mark the creator's share settled.
4. A payout/reconciliation fallback (platform collects → transfers to creator).

## Compatibility (Part 9)

| Model | Supported today? | What's needed |
| --- | --- | --- |
| **DIRECT_CREATOR** (creator is MoR for sales) | ❌ | Linked accounts + routes/transfers + creator onboarding |
| **PLATFORM_COLLECT** (creatorStore is MoR, then pays out) | ⚠️ (money lands here; payout missing) | Real payout provider + settlement + payout scheduling |
| **MARKETPLACE** | ⚠️ Schema reserves fields; no runtime | Route + transfer + per-creator balance |
| **HYBRID** (subscriptions platform-collect, sales creator-direct) | ❌ | Combination of the above |

The schema already reserves the anchors (`razorpayAccountId`, `routeTransferId`,
`platformFeePercent`, `agencyFeePercent`, `agencyId`) — the runtime does not use
them. **These are the intended hooks for the target model.**
