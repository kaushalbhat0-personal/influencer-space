# Implementation Roadmap — Commerce (Audit 07)

The implementation blueprint. Phase-gated so **existing creators, agencies,
subscriptions, and billing are never disrupted**.

## Phase 0 — Fix what exists (no model change)

| # | Work | Why | Risk |
| --- | --- | --- | --- |
| 0.1 | `billing/.../providers/razorpay.ts:57-66` fallback plan order `amount: 0` | Broken fallback (Razorpay rejects ₹0) | Low |
| 0.2 | `verifyPayment` + webhook: verify captured amount vs order amount | Money integrity | Low |
| 0.3 | Product-order webhook idempotency record | Replay safety | Low |
| 0.4 | `notes.planCode || "creator_launch"` fallback — require the plan note | Prevents silent free-tier activation | Low |
| 0.5 | Invoice amount from the **paid** amount, not plan price | Accuracy | Medium |
| 0.6 | Fix the commission paise/rupees unit bug | Correctness | Low |
| 0.7 | `settlement/service.ts` NaN bug (select `partnerShare`); write real amounts | Correctness | Low |

## Phase 1 — Subscription revenue sharing (agency model)

Reuse the existing commission/ledger/settlement runtimes (per
`docs/subscription-sharing.md`):

1. **Attribution**: map `BillingSubscription.workspaceId → Workspace.tenantId →
   AgencyTenant.agencyId` (creator workspaces already carry `tenantId`); or add
   `partnerId` to `BillingSubscription`/`BillingInvoice`.
2. **Rule hydration**: load `CommissionRule` into the engine on read; call
   `saveRule` on write; drop the never-invoked `bootstrap.initialize()` path.
3. **Split**: use `AgencyTenant.revSharePercent`/`CommissionPolicy` (platform +
   agency = 100) instead of the hardcoded 2-way default.
4. **Fire reliably**: `processCommission` writes `CommissionEntry` +
   `PartnerLedger` in one transaction; callers stop swallowing errors.
5. **Settlement**: allow pending entries; PAID → ledger rows with real amounts;
   wire `createSettlement`/`updateStatus` to super-admin actions.
6. **Payout**: real Razorpay Payouts/transfers provider + callers; wire to
   super-admin.

> Agency earns subscription revenue ONLY. Creator keeps 100% of product sales.
> No transaction fee on creator sales.

## Phase 2 — Creator revenue (DIRECT_CREATOR)

1. **Razorpay Linked Accounts**: creator onboarding (bank/UPI/account), store
   `Tenant.razorpayAccountId` (already in the schema).
2. **Route/transfers on product orders**: attach `transfers[]` to
   `orders.create`; store `ProductOrder.routeTransferId` (already reserved).
3. **Order capture webhook**: on `payment.captured` with a route, mark the
   creator's share settled.
4. **Alternative: PLATFORM_COLLECT** (default for existing creators) — platform
   collects then pays out via the Phase 1 payout provider.
5. **Per-creator opt-in**: keep PLATFORM_COLLECT default; DIRECT_CREATOR is a
   flag on the tenant so nothing breaks for existing creators.

## Phase 3 — Fulfillment & commerce

1. **Product type** persisted (`type: digital/physical/...` on `Product`).
2. **Digital delivery**: secure download flow (download URL/expiring key) after
   COMPLETED.
3. **Physical shipping**: `ShippingAddress` (name, phone, email, line, PIN,
   state, country) + tracking/courier/shipment-status fields on `ProductOrder`.
4. **Receipts + emails**: order confirmation/receipt; introduce an email
   provider (the platform has none).
5. **Bookings**: payment/provider fields on `Booking` + confirmation.

## Phase 4 — Add-ons & offers

1. **Add-ons**: purchasable storage / AI credits / themes / domains using the
   reserved `addon_*` codes + `ai_credits`/`storage_pack` capabilities (config →
   real purchase path).
2. **DB coupons/launch programs wired into checkout** (replace the hardcoded
   in-memory map; idempotent + atomic counters).
3. **Per-creator rev-share edit** in Super Admin.

## Phase 5 — Financial governance

1. Refunds end-to-end (`refunds.create` + `REFUNDED` + refund webhook).
2. Dunning/renewal cron (PAST_DUE → expired after grace).
3. Settlement/commission/payout versioning + `logAction`.
4. GST on `ProductOrder` + `BillingInvoice.taxAmount`; creator statements.
5. Revenue aggregates (drop `take` caps); subscription attribution reporting.

## Migration risk (Part 17)

| Change | Risk to existing? | Mitigation |
| --- | --- | --- |
| Price/name/limit changes via runtime pricing | ✅ None (IMPLEMENTATION-71; plan codes stable) | keep codes; legacy map intact |
| Billing v2 state machine | ✅ None | untouched |
| Adding `partnerId` to `BillingSubscription` (nullable) | Low | additive nullable column; backfill from AgencyTenant |
| DIRECT_CREATOR for sales | Low | per-creator opt-in; PLATFORM_COLLECT remains default |
| Phase 0 fixes (amount checks, idempotency) | Low | behavior-preserving for valid payments |
| Commission/settlement activation | Low for creators | only affects agency-managed subscriptions; no existing entries to corrupt |
| Payout provider (real transfers) | Medium | start in sandbox; manual approval; dry-run flag |

## What should never change

- Plan codes + `LEGACY_TO_CANONICAL` resolution.
- Creator owns their subscription (account = creator workspace).
- Creator keeps 100% of product revenue.
- Runtime Context + Runtime Pricing as canonical sources.
- Billing v2 event-driven state machine + idempotent webhooks.

## Production readiness (Part 18)

Scores in `docs/audit-07-commerce-revenue-model.md`. After Phase 1–2, the
partner-revenue (30 → 75) and creator-revenue (25 → 80) scores become
production-credible; after Phase 3–5, financial governance (60 → 85).
