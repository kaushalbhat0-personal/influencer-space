# Commerce End-to-End Testing — IMPLEMENTATION-35

This guide documents how to validate the real Razorpay subscription lifecycle
end-to-end using the Razorpay Dashboard, Razorpay CLI, the dev billing harness,
Playwright, and the webhook simulator.

## Razorpay Dashboard setup

1. Create a Razorpay account (test mode) at https://dashboard.razorpay.com.
2. **Plans** → create three plans:
   - `Creator Grow` → internal code `creator_grow` → ₹699/month → copy the
     `plan_...` id.
   - `Creator Scale` → `creator_scale` → ₹1,995/month → copy the `plan_...` id.
3. Put those plan ids into `src/config/commerce/plans.ts` (`razorpayPlanId`).
   **Never reference them in feature code.**

## Required environment variables

```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

## Webhook setup

1. Dashboard → Settings → Webhooks → Add webhook:
   - URL: `https://influencer-space-alpha.vercel.app/api/webhooks/razorpay`
   - Secret: `RAZORPAY_WEBHOOK_SECRET`
   - Events: `subscription.activated`, `subscription.charged`,
     `subscription.completed`, `subscription.cancelled`, `subscription.paused`,
     `subscription.resumed`, `payment.captured`, `payment.failed`, `order.paid`.
2. Enable and save.

## Razorpay CLI

Install: `npm i -g @razorpay/razorpay-cli` (or via the dashboard webhook tester).

```bash
# simulate a subscription event (Razorpay CLI / dashboard "test webhook")
razorpay-cli webhooks <event> <payload-json> -u https://influencer-space-alpha.vercel.app/api/webhooks/razorpay -s <RAZORPAY_WEBHOOK_SECRET>
```

For **out-of-order / duplicate / retry / replay** testing, replay the same event
twice — the second delivery must be a no-op (idempotency key on `BillingEvent`).
For **failed signature**, send a payload signed with the wrong secret — the route
must return 401.

## Dev billing harness

`/dev/billing` (auth-gated, dev only) shows: current `BillingSubscription`,
status, renewal date, current capabilities (CapabilityService), capability
matrix + Razorpay plan mapping, webhook event count, last invoice, the Billing
timeline, and a **webhook simulator** that drives the same
`BillingService.handleSubscriptionWebhook` path the real webhook uses.

Use it to exercise the lifecycle without a real payment:
1. `subscription.activated` → status ACTIVE, premium capabilities unlock.
2. `subscription.charged` → renewal (ACTIVE, paid invoice).
3. `payment.failed` → PAST_DUE (premium locked).
4. `subscription.paused` / `subscription.resumed` → PAST_DUE / ACTIVE.
5. `subscription.cancelled` / `subscription.completed` → CANCELLED.
6. Replay any event → idempotent no-op (duplicate BillingEvent prevented).
7. Illegal transitions (e.g. `subscription.resumed` from ACTIVE) → recorded, not applied.

## Test scenarios + expected BillingEvent sequence

| Scenario | Event(s) | BillingEvent | BillingSubscription status |
|---|---|---|---|
| New subscription | `subscription.activated` | SUBSCRIPTION_ACTIVATED | ACTIVE |
| Monthly renewal | `subscription.charged` | SUBSCRIPTION_RENEWED | ACTIVE |
| Payment failure | `payment.failed` | PAYMENT_FAILED | PAST_DUE |
| Pause | `subscription.paused` | SUBSCRIPTION_PAUSED | PAST_DUE |
| Resume | `subscription.resumed` | SUBSCRIPTION_RESUMED | ACTIVE |
| Cancel | `subscription.cancelled` | SUBSCRIPTION_CANCELLED | CANCELLED |
| Completed | `subscription.completed` | SUBSCRIPTION_CANCELLED | CANCELLED |
| One-time | `payment.captured` / `order.paid` | PAYMENT_SUCCEEDED | ACTIVE |
| Duplicate delivery | (any replayed) | — (deduped) | unchanged |

After every event: `BillingEvent` (append-only) → `BillingSubscription` update →
`CapabilityService` refresh → Builder/Theme authorization → Billing History.

## Failure testing

- **Duplicate webhook** → unique `idempotencyKey` prevents double-processing.
- **Out-of-order delivery** → lifecycle state machine rejects illegal
  transitions (recorded, state unchanged).
- **Failed signature** → 401, nothing persisted.
- **Missing payload / malformed JSON** → caught, `captureError`, 200 (Razorpay
  retries); idempotency prevents side effects.
- **Provider timeout** → webhook retry by Razorpay; idempotent.
- **Already-cancelled subscription** → `subscription.charged` on a cancelled
  sub is an illegal transition → recorded, not applied.
- **Missing workspace** → event with no `workspaceId` is acknowledged (no-op).

## Production rollout checklist

- [ ] `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_KEY_SECRET`,
      `NEXT_PUBLIC_RAZORPAY_KEY_ID` set in Vercel.
- [ ] Webhook endpoint registered with all 9 events.
- [ ] `creator_grow`/`creator_scale` Razorpay plan ids in config (test, then live).
- [ ] `/dev/billing` lifecycle walkthrough passes locally.
- [ ] Playwright `R9` green local + production.
- [ ] `1795+` unit tests green.
- [ ] Switch Razorpay keys to live; re-run `R9` against production.
