# Checkout & Subscription Lifecycle Activation — IMPLEMENTATION-34

## 1. Architecture summary

Phase 2 of the Commerce Activation Initiative. Activated the existing Billing
v2 platform to **real Razorpay subscriptions** while keeping Billing v2
canonical — no Billing v3, no duplicate checkout, no duplicate webhooks. The
canonical commerce config + capability matrix became the single source for
pricing, capability grants and Razorpay plan mapping.

```
Razorpay subscription (plan_id from config)
  → webhook event
  → BillingEvent (idempotent)
  → BillingSubscription (status via lifecycle)
  → CapabilityService (derived from the plan)
  → Builder / Marketplace / Features
```

**Principle:** Payments never unlock features. Payments produce Billing Events →
Entitlements → Capabilities → Feature access (documented in
`docs/architecture/commerce-principles.md`).

## 2. Commerce Activation overview

- **Canonical plans + capability matrix** (`src/config/commerce/plans.ts`):
  Launch ₹0, Grow ₹699, Scale ₹1,995, Enterprise (manual). Razorpay plan ids
  (`plan_TLTGQBU1EXkseF`, `plan_TLTH45wQlPdW7v`) live in config only — code
  references internal codes via `razorpayPlanIdFor(code)`.
- **CapabilityService derives from the matrix**: 4 canonical creator plans were
  added to the capability catalog (features built from the matrix); legacy
  `creator_free/pro/elite` map to launch/grow/scale.
- **Pricing page, diagnostics, checkout and docs all read the same config** —
  no duplicated pricing anywhere.

## 3. Checkout flow

```
Creator selects Grow → BillingService.createCheckout(workspaceId, "creator_grow")
  → getPlan(code) → RazorpayProvider.createCheckout
    → razorpayPlanIdFor("creator_grow") → "plan_TLTGQBU1EXkseF"  (config)
    → razorpay.subscriptions.create({ plan_id, total_count:12, notes:{workspaceId, planCode} })
    → CheckoutResult { subscriptionId }
  → BillingEvent CHECKOUT_STARTED (idempotency key)
  → client opens Razorpay checkout.js
```

Manual plans (`creator_enterprise`) and free plans never create a public
subscription checkout. Legacy one-time order path preserved for free/plan-adjacent
flows.

## 4. Webhook lifecycle

`api/webhooks/razorpay/route.ts` now handles the full lifecycle:
`subscription.activated`, `subscription.charged`, `subscription.completed`,
`subscription.cancelled`, `subscription.paused`, `subscription.resumed`,
`payment.failed`, `order.paid`, `payment.captured`. Every event:
1. Signature-verified (HMAC-SHA256 + timingSafeEqual, `RAZORPAY_WEBHOOK_SECRET`).
2. Idempotent (`BillingEvent.idempotencyKey` unique; duplicate → early return).
3. Mapped by `modules/billing/domain/webhook.ts` → `BillingService.handleSubscriptionWebhook`
   → `BillingEvent` → `BillingSubscription` status (lifecycle-safe) → capability
   refresh (derived) → audit (`billing:subscription-webhook`).
4. Replay/duplicate protected (unique key + rate limit 30/s).
Illegal transitions are recorded as events but do NOT mutate the subscription.

## 5. Billing events

`BillingEventType` extended with `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_RESUMED`.
Every webhook writes an append-only BillingEvent with its idempotency key;
`payment.failed` → `PAYMENT_FAILED` (PAST_DUE), charged → `SUBSCRIPTION_RENEWED`
(ACTIVE + paid invoice + `PaymentCaptured` event), etc.

## 6. Capability matrix

`src/config/commerce/plans.ts`:

| Plan | Capabilities |
|---|---|
| creator_launch | basic_builder, basic_themes, creator_subdomain |
| creator_grow | premium_themes, custom_domain, advanced_builder, ai_generation, social_integrations |
| creator_scale | premium_themes, custom_domain, advanced_builder, advanced_ai, api_access, api_integrations, white_label, brand_removal, advanced_analytics, priority_support |
| creator_enterprise | scale + storage (manual sales) |

Capabilities map to feature values via `COMMERCE_CAPABILITY_TO_FEATURE`; future
add-ons (`ai_credits`, `storage_pack`, `theme_packs`) are reserved entries.

## 7. Plan configuration

`COMMERCE_PLANS` is the single source: code, name, price (₹0/₹699/₹1,995/manual),
currency, cycle, `razorpayPlanId`, `manual`, `capabilities`, CTA. `featuresForPlan`
derives capability features for `CapabilityService`. Pricing page
(`Pricing/data.ts`) + diagnostics (`/dev/billing-consolidation`) read it.

## 8. Roadmap documentation

- `docs/roadmap/creatorstore-product-roadmap.md` — Creator Operating System
  vision, one account/creator/website philosophy, roadmap, launch/growth/
  revenue philosophies, marketplace/enterprise/agency roadmaps, postponed items.
- `docs/roadmap/commerce-roadmap.md` — plan status matrix + add-ons/marketplace/
  AI credits/storage/API/white-label/referrals/enterprise status (completed/in
  progress/planned).
- `docs/architecture/commerce-principles.md` — the invariant "Payments never
  unlock features" + the Billing Event → Entitlement → Capability → Feature flow.

## 9. Files changed

| File | Change |
|---|---|
| `src/config/commerce/plans.ts` | NEW canonical matrix + plans + razorpay mapping |
| `src/lib/capabilities/plans.ts` | 4 canonical creator plans derived from the matrix |
| `src/modules/billing/domain/webhook.ts` | NEW razorpay event → status mapping (pure) |
| `src/modules/billing/domain/types.ts` | `CheckoutResult.subscriptionId` |
| `src/modules/billing/domain/events.ts` | `SUBSCRIPTION_PAUSED/RESUMED` |
| `src/modules/billing/infrastructure/providers/razorpay.ts` | Real subscription checkout from config |
| `src/modules/billing/application/service.ts` | `handleSubscriptionWebhook` + billing history on `getBillingInfo` (+ usage metric fix) |
| `src/app/api/webhooks/razorpay/route.ts` | Full webhook lifecycle |
| `src/components/marketing/Pricing/data.ts` | Creator pricing from the matrix |
| `src/app/dev/billing-consolidation/page.tsx` | Matrix + capabilities diagnostics |
| docs | 3 roadmap/principle docs |
| tests | `commerce-plans.test.ts`, `implementation34.spec.ts` |

## 10. Runtime flow

```
pricing page   → getCreatorCommercePlans()                 (matrix)
checkout       → BillingService.createCheckout → RazorpayProvider → subscriptions.create
webhook        → handleSubscriptionWebhook(eventName, workspaceId, planCode, idempotencyKey)
                 → isDuplicateEvent? skip
                 → mappingForRazorpayEvent → statusForWebhookEvent (lifecycle-safe)
                 → upsertSubscription(status, renewsAt) → createEvent → invoice → audit
diagnostics    → resolveActivePlan + capabilitiesForPlan + matrix
```

## 11. Unit tests

**15 new tests** (plus updates to `capabilities.test.ts` for the canonical
catalog): matrix integrity (4 plans, canonical prices), razorpay plan-id config
mapping, manual-plan flag, legacy→canonical mapping, capability→feature
derivation, `CapabilityService` grants (premium_themes/custom_domain/white_label
per plan), pricing-catalog resolution, and the full webhook mapping
(event→action→status, lifecycle legality, same-state no-op, unmapped events).

Full suite: **86 files / 1795 tests**.

## 12. Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## 13. Playwright Local

`R8` — **4/4 passed (58.5s)**:
1. Pricing page reflects Launch/Grow/Scale/Enterprise with canonical prices.
2. Diagnostics expose the canonical matrix codes + derived capabilities.
3. Billing page loads with the Billing v2 runtime (read-only history; fixed a
   pre-existing UsageDashboard metric/key issue).
4. Diagnostics DOM matches the billing runtime (origin + counts).

## 14. Playwright Production

`https://influencer-space-alpha.vercel.app` — **4/4 passed (36.2s)** (deployed
commit `33757bc`).

## 15. Browser verification

Pricing DOM, diagnostics DOM and the billing page reflect the canonical
commerce config + Billing v2 runtime, locally and in production. The matrix
(`creator_launch/grow/scale/enterprise`) is the single source: pricing page,
diagnostics capabilities, and `CapabilityService` decisions all derive from it.
Browser DOM → Checkout (config) → Webhook → BillingSubscription →
CapabilityService → Builder/Marketplace remain synchronized (webhook logic is
unit-verified; real Razorpay requires configured keys).

## 16. Commit message suggestion

```
feat(billing): Checkout & Subscription Lifecycle Activation
- canonical plan config + capability matrix (launch/grow/scale/enterprise);
  razorpay plan ids config-only; pricing/checkout/capabilities derive from it
- real Razorpay subscription checkout; full webhook lifecycle -> BillingEvent ->
  BillingSubscription -> capability refresh (idempotent + audited)
- billing history on getBillingInfo; product roadmap + commerce principles docs
- 15 unit tests; R8 local & production
```
