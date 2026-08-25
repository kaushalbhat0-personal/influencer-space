# RCCF-73 — Partner Commercial Model & Billing Architecture — Closure

**Date:** 2026-08-25 · **Branch:** main @ `68dc9dd5` (== origin/main) · **Commit:** NOT CREATED · **Push:** NOT PERFORMED
**Mode:** Engine-first implementation per ticket. Marketing surfaces untouched.

---

## 1. Executive Verdict

**A− (IMPLEMENTED AND VERIFIED in repository/TEST semantics; live-provider deployment verification outstanding → formally B).**

The billing engine now charges Partner Solo/Scale as **₹4,999 / ₹14,999 ONE-TIME Razorpay orders**, grants additional-client capacity **only after a webhook-verified ₹2,000-per-unit capture**, enforces **free-Partner = 0 commission**, and pins the committed **F2 fix** with regression tests. Creator billing is byte-for-byte behavior-preserved. No schema changes were required.

Final classification: **B — APPLICATION READY / PROVIDER DEPLOYMENT VERIFICATION REQUIRED** (all money-path logic verified by unit/integration tests against mocked provider boundaries; no live or TEST-mode provider call was made from this workspace).

## 2. Business Model (authoritative)

| Tier | Price | Billing form |
|---|---:|---|
| Partner Launch | ₹0 | 15-day trial, 1 client, **no commission** |
| Partner Solo | ₹4,999 | ONE-TIME order |
| Partner Scale | ₹14,999 | ONE-TIME order |
| Additional client | ₹2,000 | ONE-TIME, payment-gated, +1 capacity |
| Creator Launch/Growth/Scale | ₹0/₹999/mo/₹1,999/mo | UNCHANGED |

Commission: paid partners are ELIGIBLE; the percentage always resolves through the existing configurable hierarchy (rule → plan rule → global rule → loyalty tier → relationship rev-share → policy → 80/20 default). No percentage is hardcoded anywhere user-facing.

## 3. Old vs New Model

| Aspect | OLD (pre-RCCF-73) | NEW (this diff) |
|---|---|---|
| Solo/Scale charge | Recurring Razorpay subscription (`subscriptions.create{total_count:12}` via placeholder ids `plan_solo`/`plan_scale`) | Single ORDER at DB-authoritative price; subscription branch unreachable |
| Annual variant | annualPrice 49,990 / 149,990 (+ toggle) | Removed — one-time has no annual form |
| Pricing Center | Auto-provisioned recurring contracts on partner price edits | Skips provisioning for one-time plans (Creator provisioning untouched) |
| Capacity add-on | Un-gated upsert → instant ACTIVE addon at ₹1,499 | Razorpay ORDER → webhook identity+amount+idempotency verification → ACTIVE grant; ₹2,000/unit |
| Free-tier commission | Would earn default split if a client ever paid | Hard gate: skipped `"free-partner"` before any ledger write |
| F2 | Fixed in commit `68c7b54` but unpinned | Pinned by source+behavior guardrails |

## 4. Architecture Audit (Phase 1 summary)

Audited end-to-end: `plans.ts` registry; pricing runtime (`modules/pricing/application/runtime.ts`); billing service + repository + domain/webhook mappings + lifecycle; Razorpay provider; webhook route (signature→idempotency→routing); partner.actions (import/invite/plan-change/capacity); agency authorization (`requireAgencyMember/Active`, `canMutate`, access-lock); capacity relationship (`partner-relationship.ts` additive model, atomic `linkCreator`); commission runtime/ledger/settlement/refund-reversal/clawback; loyalty tiers; provisioning pipeline incl. committed RCCF-73.3 client-subscription fix (`creatorPlan` → TRIALING inside the provision transaction); Super Admin Pricing Center provisioning; Prisma models (`BillingPlan/BillingSubscription/BillingAccount/BillingInvoice/BillingEvent/AgencyCapacityAddon`). Key pre-existing facts honored: `order.paid`/`payment.captured` already map to activation; route-level idempotency keys on provider payment id; invoice+commission commit atomically with RECONCILIATION_REQUIRED repair path.

## 5. One-Time Billing Decision (§7)

**Option A chosen — one-time Razorpay Order**, implemented through the EXISTING provider fallback + existing `order.paid/payment.captured → activate` mapping.

- **Option B rejected:** `total_count:1` still mints a Subscription entity and drags renewal lifecycle states (`subscription.completed` maps to cancel!) onto a non-renewing purchase; also requires a provider contract per price.
- **Option C folded into A:** the "existing one-time Creator checkout infrastructure" *is* the provider order fallback (proven by MKT-05/06 Scale fallback), so C ≡ A with family-aware selection.
- A satisfies: no recurring semantics; reliable signature-verified webhook confirmation; idempotent exactly-once activation; authoritative PAID `BillingInvoice`; entitlement via canonical `handleSubscriptionWebhook`; zero schema change; provider abstraction intact (SDK usage confined to `razorpay.ts`; new capability added as a provider method).

## 6. Implementation (file → change)

| File | Change |
|---|---|
| `src/config/commerce/plans.ts` | `billingForm?: "one_time"` on config type; set for `partner_solo`/`partner_scale`; removed their `annualPrice` + placeholder `razorpayPlanId`s; helpers `planBillingForm`/`isOneTimePlan` |
| `src/modules/billing/infrastructure/providers/razorpay.ts` | Subscription branch requires NOT one-time (stale DB plan ids cannot resurrect recurring billing); new `createCapacityAddonOrder` (server-priced order w/ purpose-tagged notes) |
| `src/modules/billing/application/service.ts` | Strict amount-equality guard for one-time paid transitions (`one_time_amount_mismatch:no_activation`); repurchase guard (ACTIVE same-plan one-time checkout refused); import |
| `src/modules/billing/application/partner-capacity-purchase.ts` (**NEW**) | Webhook capture handler: identity → quantity-range → amount(paise-exact) → replay checks → single transaction {addon ACTIVE + PAID invoice + dedupe BillingEvent}; P2002 race → safe no-op; rejection records |
| `src/app/api/webhooks/razorpay/route.ts` | Purpose-routed branch for `partner_capacity_addon` BEFORE generic handling (handles both captured & lone order.paid); sanitized failure diagnostic event |
| `src/actions/partner.actions.ts` | `addAgencyCapacityAction` (un-gated) **removed**; new `createAdditionalClientCheckoutAction` (admin-only, session-derived agency, qty≤100, order-only); `changeAgencyPlanAction` returns server-derived `amountPaise/currency` |
| `src/actions/super-admin-pricing.actions.ts` | Provisioning skips one-time plans: `newPrice>0 && !isManual && priceChanged && !isOneTimePlan(input.code)` |
| `src/lib/commission/runtime.ts` | `isCommissionEligiblePartnerPlan` predicate + request-scoped `resolvePartnerCommissionEligibility` (agency BillingAccount → ACTIVE paid partner sub); gate inserted before split/ledger; skipped reason `"free-partner"` |
| `src/app/agency/billing/_components/agency-plan-manager.tsx` | Checkout opener supports ORDER flow (`order_id`+amount) alongside legacy subscription shape |
| `src/app/agency/billing/_components/agency-capacity-manager.tsx` | Buy = create order → Razorpay modal; truthful copy ("…one-time", button "Add another client — ₹X one-time"); recurring totals removed |
| `src/config/commerce/agency-addons.ts` | `PARTNER_ADDON_UNIT_PRICE_INR = 2000` (+ doc: payment-gated, not recurring) |

## 7. Partner Entitlement Lifecycle (§8/§10)

`partner_free TRIALING(15d)` → purchase → `CHECKOUT_STARTED` event → ORDER created → capture webhook (signature-verified) → amount==price → `upsertSubscription(ACTIVE, renewsAt=null)` + PAID invoice. There is NO renewal state: renewsAt stays null forever, no provider subscription exists to renew, re-purchasing an ACTIVE one-time plan is refused, upgrades (Solo→Scale) run their own one-time checkout. FAILED/zero/mismatched captures mutate nothing. Entitlement derives solely from server-side webhook state — never from redirect/frontend/provider-checkout-completion alone (RCCF-71.4.5 payment guard retained upstream).

## 8. Additional Client Purchase (§11/§12)

Request → admin-only, session-derived agency → qty range-checked → ORDER(amount=2000×qty×100 paise, notes `{purpose, agencyId, quantity, unitPriceInr}`) → user pays → webhook: purpose-routed → agency exists+ACTIVE → qty∈[1,1000] → capturedPaise===expected → replay check → tx{addon ACTIVE keyed `(agencyId, capacity_<paymentId>)` UNIQUE, invoice PAID providerReference=paymentId, dedupe event} → audit. Repeated webhooks: route-level payment-id key collapses; handler replay-check + unique constraints make it +0. Repeated checkout requests: only unpaid orders accumulate; no grant. Constant flipped to 2000 ONLY together with the gating flow (per §12).

## 9. Commission / F2

F2 was fixed in HEAD commit `68c7b54` (provisioning creates a real TRIALING 15-day Creator `BillingSubscription` inside the provision transaction; plan validated ≥ Grow via `validateAgencyCreatorPlanCode`; self-serve attach-existing-user path preserved). This ticket pins that fix with guardrails and closes the remaining §13 invariant: free/trialing partners can never earn — gate returns before any rule resolution or ledger write; paid partners keep the untouched configurable rate hierarchy. Commission still fires exclusively on PAID invoices of eligible active client subscriptions (activate/renew events with positive captured amount), idempotent per-invoice and per-payment-key.

## 10–12. Security / Tenant Isolation / Idempotency

- Identity never client-trusted: agencyId from session; workspace from `agencyId`; plan/price from registry/DB; capacity notes are SERVER-set at order creation and re-validated at capture; webhook tenant signals ignored (identity from persisted order notes + DB).
- Cross-tenant: wrong-agency captures reject (`unknown_or_inactive_agency`); commission attribution remains workspace→tenant→AgencyTenant-derived; capacity actions agency-scoped (`assertAgencyMembership`, ownership filters).
- Idempotency layers: HMAC signature → rate limit → route key `razorpay_payment_<id>` → service duplicate-event check → one-time amount equality → tx-unique addon/dedupe keys → P2002-safe catch. Replay of captured payment = +0 everywhere.
- Amount matrix enforced: 4998/5000/14998/15000/1999·q/2001·q all DENY with zero mutation; exact amounts ALLOW once.

## 13. Razorpay TEST Verification

**NOT VERIFIED (provider I/O out of scope for this workspace).** All provider interactions are covered by SDK-boundary mocks asserting exact payloads (`amount`, `notes.purpose/agencyId/quantity`, `plan_id/total_count`). TEST-mode E2E (checkout.js modal → sandbox capture → webhook delivery) requires a running deployment with configured test keys — deferred to release workflow. No live keys touched; no `RAZORPAY_LIVE_PROVISIONING_AUTHORIZED` path executed; secret scan clean (env-var reads only).

## 14. Creator Regression

Zero behavioral deltas: Growth ₹999/month keeps live contract `plan_TLTGQBU1EXkseF` + `total_count:12` subscriptions + annualPrice 9,990; Scale ₹1,999/month unchanged (DB-contract/fallback chain intact); Launch trial unchanged; DIRECT_CREATOR / PLATFORM_COLLECT / storefront selling gate / refunds / reconciliation / fulfillment / WhatsApp commerce files untouched (verified via diff scope). Guarded by: rccf71-4-5 (full pass), rccf-mkt-05/06/07 suites, new rccf73 creator-regression blocks, provider routing test.

## 15. Super Admin Regression

`savePlanConfig` behaves identically for every recurring/manual plan (suite green incl. LIVE-guard fail-closed case); one-time plans now skip provider provisioning while keeping full price/version/marketing editing; Creator Scale's stored live contract untouched (RCCF-MKT-06.1 preservation suite green); historical subscriptions/invoices/commissions read-only.

## 16. Partner Growth Retirement

Still absent from `COMMERCE_PLANS`, unresolvable as canonical code, unselectable/unrenderable publicly; historical rows untouched; alias map unchanged. Re-asserted in rccf73 + mkt-06/07 suites.

## 17. Marketing Handoff Readiness

**MARKETING_READY = YES** (engine truth shipped; presentation flip is now UNBLOCKED). The next MKT ticket may execute §25 verbatim: cards "one-time", toggle auto-hides for Partners (annualPrice now absent — data-driven render condition, marketing component itself untouched this ticket), rewrite value-points block, remove 0.2%-based example, metadata/JSON-LD de-subscription wording. ⚠️ RELEASE ORDERING: deploy RCCF-73 engine changes and the MKT flip in the SAME release (or engine first, flip immediately after); never ship engine alone to production, else `/pricing` shows "/month" over one-time charging until the flip lands.

## 18. Tests

New `tests/unit/rccf73-partner-commercial-billing.test.ts` — 41 assertions across 10 blocks (registry forms; provider routing incl. stale-id defense & SDK payload shapes; Solo/Scale price-integrity matrices incl. 4998/5000/14998/15000/zero/duplicate; state machine incl. repurchase-refusal & upgrade-path; capacity handler incl. 399800/400200 rejects, replay no-op, P2002 race, garbage notes, unknown agency, constant purity, un-gated-action absence; commission predicate/resolver incl. TRIALING-paid ineligible + gate-before-ledger ordering; F2 pins; webhook security ordering; Pricing Center skip; Creator catalog invariants).
Modernized stale guardrails (old-token → new-token): rccf61 (1499→2000, direct-grant→checkout authority), rccf62 (action rename under lock), rccf41/46/48/56 (eligibility seeding for paid partner), rccf-mkt-05/06 (annual invariant scoped to recurring catalog), rccf-mkt-07 (annual scope + null provider ids). Totals: focused set 277 passing.

## 19. Build Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 |
| `npm run lint` / eslint on all touched files | ✅ 0 errors (3 pre-existing warnings in service.ts, untouched lines) |
| `npm run build` | ✅ success |
| `npx prisma validate` / `generate` | ✅ / ✅ (no schema change) |
| `git diff --check` | ✅ clean |
| Full vitest | ✅ 4556 passed / 21 failed — ALL 21 pre-existing or flaky (see §20) |
| Secret scan (diff surface) | ✅ no literals; env reads only |
| Provider TEST-mode E2E | ⏳ deferred (§13) |

## 20. Pre-existing Failure Accounting (not introduced here)

Verified against pristine HEAD worktree: products.test (payment-account mock gap), rccf66 commerceMode passthrough, rccf72-16b ×6 (identical counts at HEAD) — committed-tree failures. rccf70-4-3 + rccf71-* suites assert tokens in DIRTY/UNTRACKED theme/dashboard sources owned by other in-flight tickets (e.g., dirty `StorefrontStatusCard.tsx`, untracked docs) — they fail only due to that other work, disjoint from this diff. rccf68 is timing-flaky under full-suite load (green standalone here AND at HEAD). None intersect any file changed by RCCF-73.

## 21. Protected Work

Untouched & unstaged: `src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts`, `src/actions/billing.actions.ts`, `StorefrontStatusCard.tsx`, `Button.tsx`, comparison files, `.env.example`, e2e auth, screenshots/docs/assets, all untracked ticket artifacts. Baseline HEAD == origin/main throughout. No reset/stash/checkout/clean/rebase/amend used; baseline verification performed via throwaway `git worktree` (added & pruned).

## 22. Exact Staged Files (21)

```
src/actions/partner.actions.ts
src/actions/super-admin-pricing.actions.ts
src/app/agency/billing/_components/agency-capacity-manager.tsx
src/app/agency/billing/_components/agency-plan-manager.tsx
src/app/api/webhooks/razorpay/route.ts
src/config/commerce/agency-addons.ts
src/config/commerce/plans.ts
src/lib/commission/runtime.ts
src/modules/billing/application/partner-capacity-purchase.ts   (NEW)
src/modules/billing/application/service.ts
src/modules/billing/infrastructure/providers/razorpay.ts
tests/unit/rccf41-commission-refund.test.ts
tests/unit/rccf46-commission-authority.test.ts
tests/unit/rccf48-commission-propagation.test.ts
tests/unit/rccf56-commission-effective-dating.test.ts
tests/unit/rccf61-agency-commercial-closure.test.ts
tests/unit/rccf62-partner-trial-expiry.test.ts
tests/unit/rccf73-partner-commercial-billing.test.ts           (NEW)
tests/unit/rccf-mkt-05-pricing-truth.test.ts
tests/unit/rccf-mkt-06-pricing-catalog-sync.test.ts
tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts    (PARTIAL: only the two RCCF-73 hunks;
   the foreign RCCF-RELEASE-02 hunk remains UNSTAGED working-tree-only)
docs/rccf-73-partner-commercial-billing-architecture-closure.md (staged after writing)
```
Staged diff: 21 files, +1215/−130 (before this doc).

## 23. Deferred Items

1. TEST-mode provider E2E (checkout → capture → webhook → grant) on a deployed environment.
2. §25 marketing execution (next MKT ticket) + responsive sweep (320→1440, scrollWidth===clientWidth) + SEO metadata/JSON-LD flip.
3. Commit the currently-untracked historical closure docs so repo-dependent spot-checks pass in clean clones (mkt-04 doc etc.).
4. Optional hardening: admin tooling to view PARTNER_CAPACITY_* events; refund policy for one-time purchases (currently manual/support-led, consistent with "no refund automation invented").
5. `persona=creator` param on partner CTAs in `/pricing` card links (MKT-surface observation, untouched).

## 24. Risks

- Release-ordering mismatch window (§17) — mitigated by pairing instruction; nothing ships until commit anyway.
- Agencies holding legacy ACTIVE recurring Solo/Scale subscriptions continue on old contracts (grandfathered; untouched by design).
- Stale DB `runtimeConfig.pricing.razorpayPlanId` values for partner codes are now intentionally ignored (defense-in-depth tested); harmless residue.
- Capacity purchases rely solely on webhook for grant (standard for this codebase's subscription path); CHECKOUT_STARTED/CAPACITY events give support a trail; failed-delivery scenario would need the existing reconciliation pattern (deferred item 4).

## 25. Rollback

Configuration-gated & surgical: (a) revert the staged commit → provider regains old routing, un-gated action returns, marketing unchanged (engine rollback restores prior behavior exactly; no data migration exists to undo); (b) without revert, disable new purchases by Super Admin marking partner_solo/scale `hidden` or price=0-guard — existing ACTIVE one-time entitlements, invoices, addons, and commission history remain intact automatically since entitlements derive from persisted state, not from the checkout path; (c) Creator billing unaffected in every scenario (shared files changed additively behind `isOneTimePlan` guards). No refund automation invented.

## 26. Final Verdict

**B — APPLICATION READY / PROVIDER DEPLOYMENT VERIFICATION REQUIRED.** Repository logic fully implemented and verified; deployment-time TEST-mode provider verification outstanding (explicitly out of scope here).

## 27. Git State

HEAD `68dc9dd5…` == origin/main. Working tree retains all pre-existing foreign dirt byte-for-byte plus this ticket's unstaged-by-design RELEASE-02 hunk in mkt-07. Index holds exactly the 21(+1 doc) RCCF-73 files. **COMMIT NOT CREATED. PUSH NOT PERFORMED.**
