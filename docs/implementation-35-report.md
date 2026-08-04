# Customer Billing Experience & End-to-End Commerce Validation — IMPLEMENTATION-35

## 1. Architecture summary

Phase 3 of the Commerce Activation Initiative. Completed the customer-facing
billing experience and made the full subscription lifecycle exercisable +
validated end-to-end. Billing v2 remains canonical; no Billing v3, no duplicate
checkout/webhooks. Billing Events stay authoritative for every state change;
CapabilityService stays the only authorization layer.

```
Customer billing page → billing.actions.ts → BillingService
  (changePlan/cancel/resume/retry → checkout/webhook)
webhook / dev simulator → handleSubscriptionWebhook → BillingEvent → BillingSubscription → CapabilityService
/dev/billing (dev harness) → subscription + capabilities + events + plan mapping
```

## 2. Customer Billing Experience

`/admin/billing` (polished, not redesigned):
- Current plan, price, renewal date, cycle, status badge.
- **Capabilities Granted** (from CapabilityService via `getBillingDashboard`).
- **Billing Timeline** (append-only BillingEvents, read-only).
- Upgrade/Downgrade → `changePlanAction` → real Razorpay **subscription**
  checkout (`subscription_id` modal).
- Cancel → confirmation → `cancelSubscriptionAction` (BillingEvent).
- Resume (CANCELLED/PAST_DUE) → `resumeSubscriptionAction`.
- Retry Payment (PAST_DUE) → `retryPaymentAction` (new checkout).
- Graceful pending states + error banner; no external redirect.

## 3. Subscription lifecycle

- **Change plan** (`BillingService.changePlan`): validates status (ACTIVE/
  TRIALING/PAST_DUE/CANCELLED), creates a NEW subscription checkout; activation
  is webhook-driven (old capabilities persist until the new subscription
  activates).
- **Cancel** (`cancelSubscription`): emits `SUBSCRIPTION_CANCELLED` BillingEvent,
  sets `cancelledAt`/`cancellationReason`, publishes `SubscriptionCancelled`.
- **Resume** (`resumeSubscription`): emits `SUBSCRIPTION_RESUMED`, ACTIVE via the
  lifecycle (CANCELLED/PAST_DUE → ACTIVE legal).
- **Pause / renewal / payment failure**: handled by the webhook (paused→PAST_DUE,
  charged→ACTIVE+invoice, failed→PAST_DUE).
- **Retry**: re-runs checkout for a PAST_DUE plan.
Illegal transitions are recorded as BillingEvents and never mutate state.

## 4. Billing timeline

`getBillingInfo.history` exposes renewal date, status, cancelledAt/reason, the
append-only **events** list and **payment history** (invoices). Rendered as a
read-only timeline on the billing page + the dev harness.

## 5. Webhook validation

The full lifecycle is handled (`subscription.activated/charged/completed/
cancelled/paused/resumed`, `payment.failed`, `order.paid`, `payment.captured`).
Each event: HMAC signature → unique `BillingEvent.idempotencyKey` dedup →
`BillingService.handleSubscriptionWebhook` (lifecycle-safe status) → audit.
Robustness added: parent `BillingAccount` is auto-created (FK fix) and missing
`BillingPlan` rows are seeded from the canonical catalog — legacy/no-v2
workspaces now process subscriptions without corruption.

## 6. Razorpay CLI / webhook simulation

`docs/testing/commerce-e2e.md` documents Razorpay Dashboard + webhook setup,
`razorpay-cli` commands, replay/out-of-order/duplicate/signature testing, test
scenarios with the expected BillingEvent sequence, failure testing, and a
production rollout checklist. The **dev harness webhook simulator** drives the
exact same `handleSubscriptionWebhook` path in the browser (guarded to
non-production) so the lifecycle + idempotency + illegal transitions are
verifiable locally and by Playwright.

## 7. Diagnostics

`/dev/billing` (engineering tool, not a user feature) exposes: current
`BillingSubscription` (plan/status/renews/origin), enabled capabilities
(CapabilityService), capability matrix + Razorpay plan mapping, webhook event
count + last invoice, the append-only Billing timeline, and the webhook
simulator. This is the observability surface for Razorpay CLI / webhook
debugging.

## 8. Runtime flow

```
billing page → getBillingDashboard → getBillingInfo + capabilityService.planSummary
upgrade     → changePlanAction → changePlan → RazorpayProvider.subscriptions.create
webhook     → handleSubscriptionWebhook → seed plan if missing → BillingAccount ensure
              → statusForWebhookEvent (lifecycle) → upsertSubscription → createEvent → invoice → audit
cancel      → cancelSubscription → SUBSCRIPTION_CANCELLED event → CANCELLED + cancelledAt
resume      → resumeSubscription → SUBSCRIPTION_RESUMED event → ACTIVE
dev harness → /dev/billing → same BillingService + simulateRazorpayEvent (dev-only)
```

## 9. Files changed

| File | Change |
|---|---|
| `src/actions/billing.actions.ts` | getBillingDashboard / changePlan / cancel / resume / retry + dev-only simulateRazorpayEvent |
| `src/modules/billing/application/service.ts` | changePlan + resumeSubscription + cancel event/fields; invoice mapping completed (planName/total/etc.) |
| `src/modules/billing/infrastructure/repository.ts` | upsertSubscription creates parent BillingAccount (FK fix) |
| `src/components/billing/BillingPageClient.tsx` | Real actions + subscription checkout modal + capabilities + timeline + error/pending states |
| `src/components/billing/SubscriptionManager.tsx` | onResume/onRetry + capabilities section |
| `src/app/admin/billing/page.tsx` | passes workspaceId/tenantId |
| `src/app/dev/billing/page.tsx` + `_components/billing-harness-client.tsx` | NEW dev billing harness + webhook simulator |
| `docs/testing/commerce-e2e.md` | NEW commerce E2E guide |
| tests | `lifecycle.test.ts`, `implementation35.spec.ts` |

## 10. Unit test summary

**11 new tests** (plus 16 in the billing application suite): lifecycle
transitions (activate/renew/cancel/failed), idempotency (duplicate → no-op),
illegal transitions (payment.failed on CANCELLED → recorded, not applied),
missing-plan graceful failure (never corrupts), cancel/resume emit BillingEvents,
changePlan validation (unknown plan, valid upgrade, reactivation from CANCELLED).
Full suite: **87 files / 1806 tests**.

## 11. Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## 12. Playwright Local

`R9` — **4/4 passed (1.3m)**:
1. Harness exposes subscription + capability state + plan mapping.
2. Webhook simulator drives activate → PAST_DUE → CANCELLED (+ idempotent replay,
   append-only timeline after reload).
3. Billing page shows capabilities + timeline (Billing v2 runtime).
4. Capability transition after lifecycle events.

## 13. Playwright Production

`https://influencer-space-alpha.vercel.app` — **2 passed, 2 skipped** (R9.1 + R9.3
DOM↔runtime sync; R9.2/R9.4 are the dev-only simulator and correctly skip in
production). Deployed commit `e5260d7`.

## 14. Browser verification

The billing page DOM (capabilities + timeline), the dev harness, and the webhook
simulator DOM match the Billing v2 runtime locally; in production the harness +
billing page reflect the same subscription/capability state (the simulator is
dev-only). Browser DOM → Checkout → Webhook → BillingEvent → BillingSubscription
→ CapabilityService → Builder/Marketplace/Billing History remain synchronized.
Lifecycle correctness is unit-verified and locally browser-verified; real
Razorpay calls require configured keys.

## 15. Commerce E2E guide

`docs/testing/commerce-e2e.md` — Razorpay Dashboard setup (plans → config),
environment variables, webhook registration (9 events), Razorpay CLI commands,
test scenarios with the expected BillingEvent sequence, failure testing
(duplicate/out-of-order/signature/malformed/timeout/already-cancelled/missing
workspace), and the production rollout checklist.

## 16. Commit message suggestion

```
feat(billing): Customer Billing Experience & End-to-End Validation
- billing page wired to real actions (upgrade/downgrade/cancel/resume/retry)
  with Razorpay subscription checkout; capabilities + billing timeline
- BillingService changePlan/resumeSubscription; cancel emits BillingEvents;
  BillingAccount parent fix + plan seeding for legacy workspaces
- dev billing harness + webhook simulator (/dev/billing)
- commerce-e2e guide; 11 unit tests; R9 local & production
```
