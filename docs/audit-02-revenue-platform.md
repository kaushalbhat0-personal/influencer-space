# AUDIT-02 — Revenue Platform & Billing Architecture Audit

Status: **Read-only audit** — no code modified. Implementation-driven (paths/lines verified).

---

## 1. High-level billing architecture

There are **three parallel billing layers** that overlap:

```
┌─ LEGACY (deprecated) ──────────────────────────────────────────────┐
│  Subscription table (prisma 182) + super-admin updateSubscriptionPlan│
│  + lib/billing/* (v1 façade; RazorpayProvider returns URL stub)     │
└─────────────────────────────────────────────────────────────────────┘
┌─ BILLING v2 (active) ──────────────────────────────────────────────┐
│  modules/billing/*  BillingService → BillingRepository → Prisma    │
│                     BillingSubscription / BillingInvoice /          │
│                     BillingEvent / BillingPlan / BillingFeature     │
│                     RazorpayProvider (orders.create amount:0 ⚠)    │
│  lib/capabilities/*  canonical plan catalog + CapabilityService     │
│  lib/commission/* + lib/payouts/*  (partner revenue share;          │
│                     payout providers are STUBS)                     │
└─────────────────────────────────────────────────────────────────────┘
┌─ COMMERCE (storefront one-time) ───────────────────────────────────┐
│  checkout.actions.ts + /api/checkout + BuyNowButton + ProductOrder  │
│  /api/webhooks/razorpay (payment.captured)                          │
└─────────────────────────────────────────────────────────────────────┘
```

Gateways: **Razorpay is the only live provider** (SDK `razorpay@^2.9.6`). Stripe /
LemonSqueezy / Paddle exist only as provider classes (`src/lib/billing/providers.ts`)
that are never enabled (`NEXT_PUBLIC_BILLING_PROVIDER` defaults to `razorpay`).

## 2. Runtime flow (actual)

**Storefront product purchase (live):**
```
BuyNowButton → createCheckout(productId, fanEmail, coupon)   checkout.actions.ts:21
  → validate product → applyCoupon (in-memory Map) → calculateTax (18% GST)
  → ProductOrder(PENDING) → razorpay.orders.create({amount=total*100, notes}) :68
  → window.Razorpay.open(order_id)  → handler → verifyPayment() :115 (HMAC-SHA256)
  → webhook payment.captured → ProductOrder → COMPLETED  webhooks/razorpay/route.ts:65-80
```

**Plan checkout (Billing v2, partially broken):**
```
BillingService.createCheckout(workspaceId, planCode) → RazorpayProvider.createCheckout
  → razorpay.orders.create({ amount: 0, notes:{planCode,accountId,email} })   ⚠ amount hardcoded 0
  → webhook payment.captured → BillingService.handlePaymentCaptured(workspaceId, planCode,...)
      → idempotency via BillingEvent.idempotencyKey
      → upsert BillingSubscription → create BillingInvoice → processCommission
      → publish PaymentCaptured / SubscriptionActivated → audit log
```

**Enrollment:** `/api/auth/register` creates `BillingAccount` + `BillingSubscription`
(`ACTIVE` for ₹0 plans, `TRIALING` for paid) on signup.

## 3. Database diagram

**Active billing models** (all in `prisma/schema.prisma`):
- `BillingAccount` (734) — `(accountType, accountId)` — **defined, zero application usage**
- `BillingPlan` (748) — immutable catalog: code/family/name/price/currency/cycle/status/version
- `BillingFeature` (766) + `BillingPlanFeature` (777) — typed join (int/bool/str values)
- `BillingSubscription` (792) — accountId, workspaceId @unique, planId, status
  (TRIALING/ACTIVE/PAST_DUE/CANCELLED/EXPIRED), trialEndsAt, renewsAt, cancelledAt
- `BillingEvent` (816) — append-only, `idempotencyKey @unique` (webhook dedup)
- `BillingInvoice` (835) — amount/taxAmount/currency/status/lineItems/provider/
  providerReference/invoiceUrl/dates
- `RevenueConfiguration` (868), `CommercialPricing` (886), `CommissionPolicy` (905),
  `BillingConfiguration` (921) — **created by runtime SQL only, NOT a Prisma migration**
  (`scripts/sql/platform-registry-runtime.sql`)
- `CommissionRule` (1398) / `CommissionEntry` (1417) — platform↔partner revenue share
- `PayoutBatch` (1445) / `PayoutReservation` (1471) — payouts (providers are stubs)
- `Partner`/`PartnerMember`/`PartnerWorkspaceAssignment`/`PartnerInvite` (1319–1394)
- **Commerce:** `Product` (330), `ProductOrder` (359 — the active storefront payment record,
  includes platformFeePercent 5 / agencyFeePercent / routeTransferId),
  `Offering` (1164), `Purchase` (1188), `AffiliateLink` (382)
- **Legacy:** `Subscription` (182, `@deprecated`) — tenantId/razorpaySubscriptionId/status/plan
  (default `STARTER`)/currentPeriodEnd. Still read by theme marketplace, builder-overview,
  super-admin pages.
- **Not present:** no `Credits`, `Wallet`, `Ledger`, `Coupon`, `SubscriptionItem`,
  `TaxRegistration`, `Refund` tables. `AgencySubscription` exists only in old migrations (orphaned).

## 4. Razorpay integration map

| Capability | Status | Location |
|---|---|---|
| One-time order (storefront products) | ✅ live | `checkout.actions.ts:68`, `api/checkout/route.ts:45`, `buy-now-button.tsx` |
| One-time order (plan checkout) | ⚠️ `amount: 0` | `modules/billing/infrastructure/providers/razorpay.ts:30` |
| Webhook `payment.captured` | ✅ live | `api/webhooks/razorpay/route.ts:36` |
| Signature verification | ✅ HMAC-SHA256 + timingSafeEqual (`RAZORPAY_WEBHOOK_SECRET`) | `route.ts:22-24`; also `provider.verifyWebhookSignature:65` (unused by route) |
| Idempotency | ✅ `BillingEvent.idempotencyKey` unique | `route.ts:29-34`; `billingRepository.isDuplicateEvent:133` |
| Subscriptions / `subscriptions.create` | ❌ **never used** | — |
| Payment links | ❌ none | — |
| Customer creation (`customers.create`) | ❌ none | — |
| Plan synchronization | ✅ catalog→DB via `catalog-seed.ts` + `PlatformRegistrySyncService` | — |
| Refund / payout via Route | ⚠️ `RazorpayRouteProvider` is a stub (fabricates `rzp_route_…`) | `lib/payouts/providers.ts:51` |
| `razorpayAccountId` / `razorpaySetupComplete` (Tenant 47–48, WebsiteAgency 202–203) | ⚠️ **schema-only, never read/written in src/** | — |
| Env | `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; config validation also requires `RAZORPAY_KEY_ID` (mismatch: code only reads the public one) | `lib/config/validation.ts:12-15` |

## 5. Subscription lifecycle

- **Plan catalog (source of truth):** `src/lib/capabilities/plans.ts` — 6 plans
  (`creator_free ₹0`, `creator_pro ₹999`, `creator_elite ₹2999`, `agency_free ₹0`,
  `agency_studio ₹1999`, `agency_agency ₹4999`, INR/month) + `LEGACY_PLAN_MAP` +
  `RESERVED_PLAN_CODES` (`addon_ai`, `addon_storage`, `addon_team`, `addon_whitelabel`).
- **State machine:** `modules/billing/domain/lifecycle.ts` — legal transitions
  DRAFT↔TRIALING/ACTIVE/PAST_DUE/CANCELLED/EXPIRED; `statusAfterEvent` in
  `domain/events.ts`; v1 helpers in `lib/billing/subscription-engine.ts`
  (canUpgrade/canDowngrade/getTrialEndDate 14d/getGracePeriodEndDate 7d/
  getNextRenewalDate/statusAfterCancellation).
- **Implemented:** signup TRIALING → payment.captured → ACTIVE; `cancelSubscription`
  (`service.ts:150`); invoice creation on payment.
- **Not implemented:** no automated renewal/dunning/cron (only cron routes `sync-socials`,
  `cleanup-audit`); no proration execution (flag exists); no upgrade/downgrade checkout in
  the UI (billing page buttons only redirect to `NEXT_PUBLIC_UPGRADE_URL` or toast);
  no Razorpay recurring subscriptions at all.

## 6. Entitlement architecture

Three overlapping systems:

1. **Canonical (code):** `src/lib/capabilities/**` — `CapabilityService` +
   `CapabilityEngine` + `EntitlementService` (`entitlementService`), 16 feature ids,
   boolean + numeric limit features, `requiresUpgrade/missingFeatures/planSummary`.
2. **Billing-v2 façade:** `modules/billing/application/entitlements.ts` —
   `entitlement`/`featureGate` wrapping the canonical service (`has/limit/can/remaining/
   audit`).
3. **Theme-specific:** `src/lib/theme/access.ts` — `PLAN_TO_TIER` (legacy string plans +
   canonical codes) → `ThemeTier`; `TIER_THEME_LIMITS` (free 5 / starter 15 / pro 30 /
   business 50 / enterprise ∞).

**Plan source-of-truth inconsistency (facts):**
- Theme marketplace reads **legacy** `Subscription.plan` (`admin/themes/page.tsx:24`).
- Appearance page reads **v2** `billingPlan.code` (`admin/appearance/page.tsx:40`).
- Custom-domain gating calls `billingService.getSubscriptionStatus()` which
  **hardcodes the returned planCode to `"creator_free"`** (`service.ts:186-188`) — so
  domain gating always evaluates the free plan.
- `applyThemePackage()` (`theme.actions.ts:67`) does **no server-side tier check** —
  enforcement is client-only in the marketplace component.

## 7. Commerce capabilities

**Implemented (live):**
- Storefront one-time product purchases (Buy-Now + Razorpay orders + webhook completion).
- Product catalog (`Product`, `ProductOrder`), admin orders/customers pages.
- Coupons: **in-memory only** (`lib/commerce/coupons.ts` — `LAUNCH10`, `CREATOR25`,
  `FLAT100`; usage counters reset on restart; `calculateTax` 18% GST).
- Invoice math/format (`lib/billing/invoice-engine.ts`), invoice center UI.

**Defined but unwired:**
- `Offering`/`Purchase` + `PurchaseService` (`lib/commerce/purchases.ts`) — no route/UI.
- `CommercialPricing`, `AffiliateLink` (click count only), `PlatformFeePercent` on orders.

**Not present:** credits, storage packs, gift codes, bundles, digital-product delivery UI,
theme packs, custom-domain purchase, coupons in DB.

## 8. AI billing capabilities

- **Cost estimation:** `ProviderCostEstimator` (per-token model rates) +
  `GenerationEstimator` (per-strategy budgets) — real math, in-memory.
- **Budgets:** `GenerationBudgetMonitor`, `GenerationRateControl`,
  `generation-budget-monitor.ts` — **all in-memory, none wired into the runtime**;
  `BudgetManager`/`CostTracker` are interfaces with **no production implementation**
  (a no-op stub in `provision-pipeline.ts:31`).
- **Persisted AI usage:** ❌ none. `GenerationSession` has no cost/token fields; no
  `Credits` table. The only quota table is `YouTubeQuotaUsage` (API quota, not billing).
- **Rate limiting:** `ProviderRateLimiter` is per-server-process in-memory;
  `GenerationRateControl` counts globally (ignores creatorId).
- **Strategy budgets** (hardcoded per tier): FREE $0/0 calls, PRO $0.06/day/3 calls,
  ELITE $0.30/day, AGENCY $1.00/day.

## 9. Feature gating inventory

| Gate | Mechanism | Location |
|---|---|---|
| Premium themes (marketplace) | legacy `Subscription.plan` → `PLAN_TO_TIER` (client-only enforcement) | `admin/themes/page.tsx:24`, `theme-marketplace-client.tsx` |
| Custom branding | `entitlementService.has(plan, "custom_branding")` (v2 code) | `admin/appearance/page.tsx:40` |
| Custom domain | `entitlement.can(planCode,"custom_domain")` but plan code always `creator_free` | `domain.actions.ts:46` + `service.ts:186` |
| Builder/Publishing | ❌ no plan gate found | — |
| Storage/Domains/Analytics | ❌ no plan gate | — |
| Plan→feature model | ✅ config-driven catalog | `lib/capabilities/**` |

**Centralized entitlement:** two overlapping services exist (canonical
`lib/capabilities` + `modules/billing/application/entitlements.ts` façade) plus a
theme-specific mapping — a known consolidation topic (`docs/billing-00-discovery-audit.md`,
`docs/architecture-decisions.md:142`).

## 10. Webhook architecture

- **Single route:** `api/webhooks/razorpay/route.ts`. No provider-agnostic dispatcher
  (the generic `EventRegistry.registerWebhookMapping` exists but is never called).
- **Verification:** HMAC-SHA256 + `timingSafeEqual` against `RAZORPAY_WEBHOOK_SECRET`
  (401 on mismatch); IP rate limit 30 req/s.
- **Idempotency:** unique `BillingEvent.idempotencyKey` (early return on duplicate).
- **Retries/ordering/replay-protection/queue:** ❌ none (no retry queue; no event order
  handling; `BillingIdempotency` in-memory dedup is not wired into the route).
- **Handled events:** `payment.captured` only → plan activation (by workspaceId or guest
  email) + Creator-CMS product order completion. No `payment.failed`,
  `subscription.charged/cancelled`, `refund` branches.
- **Logging/monitoring:** `captureError`, `logger`, `AuditLog` `payment:captured`;
  the super-admin `/super-admin/webhooks` page reads `AuditLog action LIKE 'webhook:%'`
  which **no code writes** (page is effectively empty).

## 11. Admin capabilities

**Super-admin (mostly read-only):** Revenue (legacy), Revenue Management
(`revenueService.getDashboard` — MRR/ARR/take-rate/commissions), Subscriptions (legacy),
Invoices (ProductOrder), Payments, Transactions, Webhooks (empty), Audit, Operations
(rehydrate engines, `retryFailedPayouts`), Platform Registry Sync (dry-run by default),
Tenant detail. **Missing:** refund tools, coupon management, v2 subscription mutation UI,
billing settings / commission edit forms (services exist but no UI calls them), analytics
page (placeholder `SUPERADMIN-01`).
**Creator/agency:** `/admin/billing` (read-only + external upgrade URL),
`/agency/billing` (invoices/subscriptions). **Dead link:** nav references
`/admin/payments` (no page). `/admin/orders`, `/admin/customers` live.
**Only manual adjustment:** `updateSubscriptionPlan` (legacy table only).

## 12. Security review

| Concern | Status |
|---|---|
| Webhook signature | ✅ HMAC + timingSafeEqual |
| Webhook secrets | ✅ env-only, never logged |
| Idempotency/replay | ⚠️ unique key dedup but no retry/failure recovery; fallback key uses `Date.now()` (non-deterministic) when payment id absent (`route.ts:31`) |
| Checkout signature (`verifyPayment`) | ✅ HMAC over `orderId|paymentId` |
| PCI | ✅ no raw card data in the codebase (Razorpay checkout.js handles cards) |
| Authorization (who may buy/upgrade) | ⚠️ plan checkout has no client/tenant permission check; `applyThemePackage` has no entitlement check |
| Privilege escalation | ⚠️ super-admin actions guard on `role===SUPER_ADMIN` (consistent); no role escalation path found |
| Audit logging | ⚠️ `checkout:*`/`payment:captured` logged; refunds/payouts not audited end-to-end |
| Amount integrity | ⚠️ v2 plan order `amount: 0`; invoices derive amounts from plan price (not payment amount) |

## 13. Business limitations

**Architectural:** three overlapping billing/entitlement stacks; plan source-of-truth
inconsistency; no Razorpay recurring subscriptions; `amount: 0` bug; client-only theme
enforcement; payout/commission providers are stubs; revenue-management tables not under
Prisma Migrate; no per-user AI usage persistence; in-memory coupons/budgets/rate limits.

**Business:** no real subscription checkout in the UI (paid CTAs → signup/external URL);
no refunds; no GST/TAX engine beyond a flat 18% checkout calculation; no Smart Collect /
Route payouts / marketplace payouts; no wallet or ledger for creators; no revenue split
engine beyond commission percentages; no coupons in DB.

**Compliance:** no tax-inclusive reconciliation; `BillingInvoice.taxAmount` exists but is
never populated; no tax registration/region engine; no refund audit trail.

## 14. Cost analysis

- **Live payment flow cost:** effectively $0 incremental (Razorpay standard fees; ~3
  Razorpay SDK calls per purchase — order create + webhook + verify).
- **Operational complexity:** high — three parallel implementations to reason about;
  dedup + retry absent means manual reconciliation; revenue tables outside Migrate.
- **Duplicate billing logic:** plan catalogs defined in `lib/capabilities/plans.ts`,
  mirrored in `modules/billing` catalog-seed + `CommercialPricing`, and legacy string
  plans — three representations of the same price list. V1 + v2 provider layers both
  exist. Two entitlement services + a theme tier map.
- **Future complexity risk:** adding subscriptions/AI-credits/marketplace payouts on top
  of the current split would multiply surface area unless consolidated onto the v2
  models + canonical capability catalog.

## 15. Safe extension points

1. **Billing v2 models** (`BillingSubscription`/`BillingInvoice`/`BillingEvent`) — the
   correct base for subscriptions; add Razorpay `subscriptions.create` in
   `modules/billing/infrastructure/providers/razorpay.ts` and webhook branches for
   `subscription.*` + `payment.failed` events.
2. **Canonical capability catalog** (`lib/capabilities/**`) — add `addon_ai` /
   `addon_storage` / `addon_whitelabel` (already reserved codes) as boolean/numeric
   features; wire `entitlementService` into a central gate helper.
3. **Commission/Payout** (`lib/commission/**`, `lib/payouts/**`) — replace stub providers
   with real Razorpay Route/payout calls; add creator revenue-split and ledger/wallet on
   the existing `PayoutBatch`/`CommissionEntry` tables.
4. **Commerce** (`Offering`/`Purchase` + `PurchaseService`) — wire digital products,
   credits, bundles behind the existing checkout provider interface.
5. **AI billing** — implement `BudgetManager`/`CostTracker` (interfaces exist) against a
   new `AICreditUsage` table; persist `GenerationSession` cost fields; route through the
   existing `ProviderCostEstimator`.
6. **Admin** — the `RevenueService` mutation methods (billing settings, commission config)
   already exist; add forms. Add refunds/coupons on `BillingInvoice`/new `Coupon` table.
7. **Webhook** — extend `api/webhooks/razorpay/route.ts` with new event branches and a
   retry queue over `BillingEvent`; the generic `EventRegistry.registerWebhookMapping`
   API is ready to use.
8. **Registry Sync** — `PlatformRegistrySyncService` already propagates catalog changes;
   extend it as the single source of truth for pricing/features.

## 16. Recommended implementation roadmap

1. **Phase 1 — Consolidate the plan/entitlement source of truth** on
   `lib/capabilities/**` + `BillingPlan`; migrate legacy `Subscription.plan` readers
   (theme marketplace, builder-overview, super-admin) to v2; fix
   `getSubscriptionStatus` hardcoded plan.
2. **Phase 2 — Real subscription checkout**: Razorpay `subscriptions.create` in the v2
   provider, fix `amount`, wire `/admin/billing` upgrade buttons, add
   `subscription.*`/`payment.failed` webhook branches + renewal cron + dunning.
3. **Phase 3 — Revenue tables under Prisma Migrate**; add invoice tax population + GST
   engine; admin billing settings/commission/refund/coupon UI.
4. **Phase 4 — AI billing**: `AICreditUsage` table, `BudgetManager`/`CostTracker`
   implementations, per-creator quotas wired to the enrichment engine.
5. **Phase 5 — Marketplace payouts**: real payout/Route providers, creator wallet/ledger,
   revenue split on existing commission tables; affiliate program on `AffiliateLink`.

Every phase extends the existing v2 models, canonical capability catalog, commission/
payout and provider abstractions — no replacement of current systems.
