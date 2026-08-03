# AUDIT-02A — Revenue Platform Stabilization Audit

Status: **Read-only** — no code changed. Builds on AUDIT-02; every consumer/duplicate
below was verified by grep + file read (paths:lines included).

---

## 1. Revenue architecture map

```
┌─ CANONICAL (should survive) ────────────────────────────────────────────┐
│ lib/capabilities/**        plan catalog + CapabilityService +           │
│                            entitlementService (single logic engine)     │
│ modules/billing/**         BillingService / RevenueService /            │
│                            EntitlementService façade / BillingRepository│
│                            / Billing models / catalog-seed              │
│ lib/commission/**, lib/payouts/**   commission + payout engines         │
│ commerce (Product/ProductOrder)     live storefront payments            │
│ api/webhooks/razorpay               live webhook                        │
└─────────────────────────────────────────────────────────────────────────┘
┌─ LEGACY (must be migrated) ─────────────────────────────────────────────┐
│ Subscription table (deprecated) + updateSubscriptionPlan (super-admin)  │
│ lib/billing/* v1 (service/provider-registry/mapper/query/engine)        │
│ features/billing/* (dead)                                               │
└─────────────────────────────────────────────────────────────────────────┘
┌─ STUB / SCAFFOLD ───────────────────────────────────────────────────────┐
│ lib/billing/providers.ts (Stripe/LS/Paddle/Razorpay-URL)  never enabled │
│ lib/payouts/providers (Manual/Route/Bank stubs)                         │
│ lib/commerce/purchases.ts + Offering/Purchase  (no callers)             │
│ generation budget/cost/rate-control (in-memory, unwired)                │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Billing dependency graph

```
admin/billing/page.tsx
   ├─ modules/billing/application/service (v2 billingService) ── cast to v1 types
   │     └─ BillingRepository ── Prisma Billing*
   │     └─ RazorpayProvider (amount:0)
   └─ @/lib/billing/types (v1 types)                       ← type mismatch (v2 data → v1 types)

components/billing/* (UI)  → @/lib/billing (v1 formatting/type helpers only)

features/billing/*         → lib/billing/service (v1)      ← NO consumers (dead)

theme marketplace (admin/themes) → prisma.subscription.plan (legacy) → theme/access PLAN_TO_TIER
appearance (admin)         → entitlementService.has (canonical) via billingPlan.code
domain.actions             → entitlement.can + billingService.getSubscriptionStatus (hardcodes creator_free)
builder-overview / workspace → prisma.subscription.plan (legacy)
super-admin (subscriptions/revenue/tenants) → prisma.subscription (legacy)

webhook → modules/billing/service.handlePaymentCaptured (v2) + ProductOrder (commerce)
```

## 3. Legacy vs v2 matrix

| Capability | v1 (`lib/billing`) | v2 (`modules/billing`) | Canonical? |
|---|---|---|---|
| Service | `billingService` object (URL-stub checkout) | `BillingService` class (real) | **v2** |
| Repository | `queries.ts` (30s invoice cache) | `BillingRepository` | **v2** |
| Provider abstraction | `ProviderRegistry` + 4 providers | `BillingProvider` + `RazorpayProvider` | **v2** (v1 Razorpay makes no real order) |
| Lifecycle | `subscription-engine.ts` | `domain/lifecycle.ts` + `domain/events.ts` | **v2** (v1 helpers still used by UI) |
| Invoice logic | `invoice-engine.ts` | `BillingRepository.createInvoice` | split — consolidate on v2 |
| Checkout | `provider-registry.createCheckoutWithFallback` (v1) | `BillingService.createCheckout` (v2) | **v2** |
| Types | `lib/billing/types.ts` | `modules/billing/domain/types.ts` | **v2** |

**Verdict:** Billing v2 (`modules/billing`) is canonical. v1 survives only as UI
formatting helpers (`formatCurrency`, `getUpgradePath`, `getUsageStatus` from
`lib/billing`) and dead scaffolding. The `features/billing/*` feature-service is dead.

## 4. Subscription storage audit

**Storage sites (facts):**
- Legacy `Subscription` (schema 182, `@deprecated`): tenantId @unique, plan default `STARTER`.
- v2 `BillingSubscription` (792): workspaceId @unique → BillingPlan.
- `Workspace.billingSubscription` (rel 261), `Tenant.subscription` (rel 75).

**Remaining legacy READS (verified):**
| Reader | File:Line | What it reads |
|---|---|---|
| Theme marketplace | `admin/themes/page.tsx:24` | `prisma.subscription` → `plan` → `PLAN_TO_TIER` |
| Builder overview | `actions/builder-overview.actions.ts:120,184` | `subscription.plan` |
| Workspace chip | `features/builder/components/workspace.tsx:77` | `subscription.plan` |
| Super-admin subscriptions | `super-admin/subscriptions/page.tsx` | legacy table |
| Super-admin tenant detail | `super-admin/tenants/[id]/page.tsx:27` | legacy `Subscription` |
| Super-admin revenue | `super-admin/revenue/page.tsx` | legacy plan distribution + MRR |
| Pro-sub count | `billingRepository.countProSubscriptionsLegacy:61` | legacy |

**Legacy WRITES (verified):**
- `super-admin.actions.ts updateSubscriptionPlan:393-414` — the only legacy write.
- Registration writes **v2** (`BillingSubscription`), not legacy.

**Migration complexity:** LOW-MEDIUM. Five reads + one write; all can be repointed to
`BillingSubscription.plan.code` + a plan→tier mapper (already exists as `PLAN_TO_TIER`).
The legacy `Subscription` table then becomes read-only → dropped after all readers migrate.

## 5. Plan catalog audit

**Single source of truth (recommended):** `src/lib/capabilities/plans.ts` (6 plans).
Seeded into `BillingPlan` by `catalog-seed.ts` + `PlatformRegistrySyncService`.

**Duplicate representations (facts):**
- `lib/capabilities/plans.ts` (canonical, 6 plans).
- `BillingPlan` table (mirror via catalog-seed).
- `CommercialPricing` (monthly/yearly prices — DB, runtime SQL only).
- Legacy string plans (`STARTER/PRO/GROWTH/...`) via `LEGACY_PLAN_MAP` + `PLAN_TO_TIER`.

**Mappings:** `LEGACY_PLAN_MAP` (lib/capabilities), `PLAN_TO_TIER` (lib/theme/access),
`UPGRADE_PATHS`, `RESERVED_PLAN_CODES` (addon_ai/storage/team/whitelabel — constants only).
**Unused plans:** none (all 6 referenced). **Reserved add-ons:** no logic yet (correct —
future).

## 6. Entitlement consistency audit

| Consumer | Mechanism | Bypasses canonical? | Plan source |
|---|---|---|---|
| Theme marketplace (client lock) | local `indexOf` rank re-implementation | ✅ duplicates `tierRank` | legacy `Subscription.plan` |
| `applyThemePackage` (theme.actions) | **no check** | ✅ **no enforcement** | — |
| Custom branding (appearance) | `entitlementService.has` | ❌ | v2 `billingPlan.code` |
| Custom domain (domain.actions) | `entitlement.can` | ❌ logic, ⚠️ wrong plan | `getSubscriptionStatus` hardcodes `creator_free` |
| `handlePaymentCaptured` | `capabilityService.can(planCode,"custom_domain")` | ❌ | capture-time planCode |
| Blueprint marketplace (`lib/marketplace/registry.ts:72`) | `capabilityService.can` on `requiredCapabilities` | ❌ | canonical |
| Builder / Publishing / AI / Storage / Analytics | **no plan gate** | — | — |

**Key gaps:** theme apply has no server-side entitlement check; domain gating evaluates
against a hardcoded free plan; theme marketplace duplicates tier-ranking client-side.

## 7. Checkout audit

| Flow | Implementation | Status |
|---|---|---|
| Storefront product checkout | `checkout.actions.ts` (coupon+tax+order+audit) + `verifyPayment` + webhook | ✅ production |
| `/api/checkout` (plan, one-time) | `api/checkout/route.ts:45` | ⚠️ no UI caller |
| v2 plan checkout | `BillingService.createCheckout` → `RazorpayProvider` (amount 0) | ⚠️ no UI caller + amount bug |
| v1 plan checkout | `lib/billing/providers.ts` (URL stub) | 🚫 dead |
| Subscriptions | — | ❌ not implemented |
| Coupons | `lib/commerce/coupons.ts` (in-memory Map) | ⚠️ ephemeral |
| Tax | `calculateTax` 18% flat | ⚠️ single-rate |
| Provider fallback | `lib/billing/provider-registry.ts` (v1) — v2 uses one provider | split |

**Duplicates:** three checkout implementations (commerce action, /api/checkout, v2
service) + v1 stub. Only the commerce action is production; the other three are unwired.

## 8. Razorpay audit

| Item | Status |
|---|---|
| Order creation (products) | ✅ `checkout.actions.ts:68` |
| Order creation (plans v2) | ⚠️ `amount:0` (`modules/billing/.../razorpay.ts:30`) |
| Subscriptions (`subscriptions.create`) | ❌ never |
| Webhook | ✅ `api/webhooks/razorpay/route.ts` — HMAC + unique-key idempotency, `payment.captured` only |
| Signature validation | ✅ route (webhook secret) + `verifyPayment` (key secret) |
| Retries / queue | ❌ |
| Provider abstraction | ✅ v2 `BillingProvider`; v1 provider dead |
| Dead code | `RazorpayProvider.handleWebhook` (route bypasses), `verifyWebhookSignature` (unused by route), `lib/billing/providers.ts` Razorpay |
| Dormant fields | `Tenant.razorpayAccountId/razorpaySetupComplete` (47-48), `WebsiteAgency` same (202-203), legacy `Subscription.razorpaySubscriptionId` (185) — never read/written |
| Env mismatch | `config/validation.ts` requires `RAZORPAY_KEY_ID`; code reads `NEXT_PUBLIC_RAZORPAY_KEY_ID` |

## 9. Commerce audit — implementation status

| Capability | Status |
|---|---|
| Products + one-time orders | 🟢 **Production** |
| Buy-Now + Razorpay checkout | 🟢 **Production** |
| Order admin (orders/customers/analytics) | 🟢 **Production** |
| Coupons | 🟡 Partial (in-memory) |
| `Offering`/`Purchase` + `PurchaseService` | 🟠 Scaffolding (no callers) |
| Theme sales | 🔴 Absent |
| AI credits | 🔴 Absent |
| Storage packs | 🔴 Absent |
| Bundles / gifts | 🔴 Absent |
| Marketplace / payouts to creators | 🔴 Absent (stubs) |

## 10. Revenue audit

| Component | Readiness |
|---|---|
| `RevenueService.getDashboard` (MRR/ARR/take-rate) | 🟢 Production (internal) |
| Invoices (`BillingInvoice`, `BillingRepository.createInvoice`) | 🟢 Production; `taxAmount` never populated |
| Commission engine (`lib/commission`) | 🟢 Production; shares configured via `CommissionPolicy` |
| Payout engine (`lib/payouts`) | 🟡 Providers are stubs; `retryFailedPayouts` action exists |
| `RevenueConfiguration`/`BillingConfiguration`/`CommercialPricing` | 🟡 DB rows exist (runtime SQL), read-only UI; **mutations (`updateBillingSettings`/`updateCommissionConfig`) have no callers** |
| Super-admin revenue pages | 🟢 read-only dashboards |
| Tax configuration | 🟠 single flat 18% at checkout; no tax engine |

## 11. Admin audit — missing wiring

| Area | Present | Missing |
|---|---|---|
| Creator billing | `/admin/billing` (v2 service cast to v1 types) | upgrade/downgrade/cancel do nothing (redirect/toast) |
| Agency billing | `/agency/billing` (read-only) | — |
| Super-admin revenue | dashboards | edit forms for settings/commissions (services exist, no UI) |
| Super-admin subscriptions | legacy table | v2 subscription management |
| Payments/Transactions/Invoices | ProductOrder-based views | v2 `BillingInvoice` views |
| Refunds | ❌ | no UI/action |
| Coupons | ❌ | no DB model/UI |
| `/admin/payments` | **dead nav link** (no page) | page or nav fix |
| Analytics (super-admin) | placeholder | implementation |

## 12. Dead code inventory

| Item | Location | Why dead |
|---|---|---|
| v1 `billingService` object | `lib/billing/service.ts` | only caller = `features/billing` (itself dead) |
| `features/billing/*` | actions/service/types | no consumers (own test only) |
| v1 providers (Stripe/LS/Paddle/Razorpay-URL) | `lib/billing/providers.ts` | never enabled (default razorpay) |
| `ProviderRegistry.createCheckoutWithFallback` | `lib/billing/provider-registry.ts` | no caller |
| `purchaseService` / `Offering`/`Purchase` path | `lib/commerce/purchases.ts` | no route/UI |
| `RazorpayProvider.handleWebhook`/`verifyWebhookSignature` | `modules/billing/.../razorpay.ts:54,65` | route bypasses them |
| `EventRegistry.registerWebhookMapping` | `lib/billing/event-registry.ts:72` | never registered |
| `BillingIdempotency` (in-memory) | `modules/billing/infrastructure/idempotency.ts` | not wired into webhook |
| `BillingAccount` model | schema 734 | zero application usage |
| Generation `BudgetManager`/`CostTracker` interfaces | `generation/application/interfaces` | no implementation; stub in provision-pipeline |
| Budget monitor / cost dashboard / rate control | `generation/operations/*` | in-memory, not wired |
| `razorpayAccountId`/`razorpaySetupComplete` (Tenant+WebsiteAgency), legacy `razorpaySubscriptionId` | schema | never read/written |
| `AgencySubscription` table | old migrations only | not in current schema |

## 13. Technical debt classification

**CRITICAL**
1. `getSubscriptionStatus` returns hardcoded `creator_free` → custom-domain gating always free (`service.ts:186`).
2. v2 plan `RazorpayProvider` creates orders with `amount: 0` (`razorpay.ts:30`).
3. `applyThemePackage` performs **no entitlement check** → premium themes applyable for free server-side (`theme.actions.ts`).
4. Revenue-management tables not under Prisma Migrate (runtime SQL only).

**HIGH**
5. Theme marketplace reads legacy `Subscription.plan`; plan source-of-truth split across three systems.
6. `/admin/billing` mixes v2 service with v1 types; v1 + v2 provider/service layers coexist.
7. Coupons in-memory (reset on restart); no DB coupon/usage model.
8. No subscription lifecycle enforcement (no renewal/dunning/proration cron); webhook handles only `payment.captured`.
9. Admin billing upgrade/downgrade/cancel are non-functional (redirect/toast).

**MEDIUM**
10. `features/billing/*` dead; `lib/billing` v1 service/providers dead (confusing parallel stack).
11. `Offering`/`Purchase`/`PurchaseService` unwired scaffolding.
12. Payout providers are stubs; `razorpayAccountId` fields dormant.
13. Env key mismatch (`RAZORPAY_KEY_ID` vs `NEXT_PUBLIC_RAZORPAY_KEY_ID`).
14. `/admin/payments` dead nav link; `/super-admin/webhooks` reads an unused audit prefix.
15. `BillingInvoice.taxAmount` never populated; single flat 18% tax.
16. `RevenueService` mutations have no UI.

**LOW**
17. Dead `EventRegistry.registerWebhookMapping`, `BillingIdempotency`, v1 provider abstractions.
18. `BillingAccount` unused model; `AgencySubscription` orphan.
19. Generation budget/cost/rate-control scaffolding (in-memory).

## 14. Safe migration plan (never break production)

**Phase 1 — Consistency (no behavior change)**
- Point the 5 legacy `Subscription` readers to `BillingSubscription.plan.code`
  (theme marketplace, builder-overview, workspace, super-admin pages, pro-sub count).
- Fix `getSubscriptionStatus` to return the real plan code.
- Add server-side entitlement check to `applyThemePackage`.
- Unify `PLAN_TO_TIER`/`LEGACY_PLAN_MAP` consumers onto `lib/capabilities` helpers.

**Phase 2 — Activation**
- Fix v2 `RazorpayProvider` `amount`; wire `/admin/billing` upgrade to
  `BillingService.createCheckout` (drop external `NEXT_PUBLIC_UPGRADE_URL`).
- Add `subscription.*`/`payment.failed` webhook branches; add renewal/dunning cron over
  `BillingSubscription` + `RevenueConfiguration` (trial/grace/proration already modeled).
- Bring the four revenue-management tables under Prisma Migrate; populate
  `BillingInvoice.taxAmount`; add admin settings/commission edit forms
  (services already exist).
- Move coupons to a DB model; migrate `features/billing`/v1 consumers to v2.

**Phase 3 — Decommission**
- Remove dead code: v1 `lib/billing` service/providers/registry, `features/billing/*`,
  `Offering`/`Purchase` scaffolding (or activate), stub payout providers, dormant
  `razorpay*` schema fields, `/admin/payments` nav or page.
- Drop the legacy `Subscription` table after all readers are migrated.

Each phase is independently shippable; legacy remains until its readers migrate.

## 15. Commerce Activation readiness score

| Dimension | Score /10 | Notes |
|---|---|---|
| Storefront payments (one-time) | 9 | live, audited, HMAC-verified |
| Data models (plans/invoices/events/subs) | 8 | v2 solid; 4 tables need Migrate |
| Entitlement engine | 6 | canonical exists; gating inconsistent (3 bypasses) |
| Subscriptions | 2 | state machine exists; no checkout/renewal/webhook branches |
| Checkout unification | 3 | 3 unwired implementations + 1 stub |
| Coupons/promotions | 3 | in-memory only |
| AI credits / add-ons | 1 | reserved codes only; no usage persistence |
| Payouts/commission | 4 | commission live; payout providers stubbed |
| Admin tools | 4 | read-only dashboards; no refunds/coupons/mutations |
| Tax/compliance | 3 | flat 18%; no engine/reconciliation |

**Overall: 4.3 / 10** — solid foundation, not yet Commerce-Activation ready. Blocking
gaps are the critical/high items in §13 (gate consistency, real plan checkout,
subscription lifecycle, Migrate-owned revenue tables).

## 16. Recommended IMPLEMENTATION-33 scope

Recommend the next implementation be **Phase 1 + the critical fixes** (low risk, unlocks
activation):
1. **Plan/entitlement single source of truth** — migrate the 5 legacy `Subscription`
   readers to `BillingSubscription.plan.code`; fix `getSubscriptionStatus`; add
   server-side theme-tier enforcement in `applyThemePackage`; route `PLAN_TO_TIER` and
   `LEGACY_PLAN_MAP` consumers through `lib/capabilities`.
2. **Checkout activation** — fix the v2 `RazorpayProvider` `amount`; wire `/admin/billing`
   upgrade to `BillingService.createCheckout`; add the `payment.failed` webhook branch +
   idempotent retry queue over `BillingEvent`.
3. **Subscription lifecycle** — renewal/dunning cron over `BillingSubscription` +
   `RevenueConfiguration` (trial/grace/proration are already modeled).
4. **Revenue tables under Prisma Migrate** + populate `BillingInvoice.taxAmount`.
5. **Coupons to DB** + admin forms for `RevenueService` mutations.

This scope strengthens the existing v2/capabilities/commission/payout systems without
introducing any new architecture, and removes the critical inconsistencies that block
subscriptions, add-ons, AI credits and premium commerce.
