# RCCF-MKT-07 Closure — Pricing, Upgrade & Subscription Journey Audit

| | |
|---|---|
| **Ticket** | RCCF-MKT-07 (AUDIT-FIRST) |
| **Date** | 2026-08-24 |
| **Status** | **A — AUDIT COMPLETE · ZERO P0/P1 BLOCKERS** (no production source changed; 1 new guardrail suite) |
| **Baseline HEAD** | `fd92b982a57b9fab582746d6fb98173aafd25f8f` (= origin/main) |
| **Commit policy** | NO COMMIT / NO PUSH |

---

## 1. Executive Verdict

Every layer of the journey — marketing → runtime registry → BillingPlan catalog → provider contract → checkout/subscription → webhook lifecycle → plan resolution → entitlement enforcement → dashboards — was traced to its authoritative source and probed against the approved pricing. The system describes and enforces one product:

```text
Creator  Launch Free(15d trial) · Growth ₹999 · Scale ₹1,999 (live plan_TTZhIq131KIkGH)
Partner  Launch Free(15d trial) · Solo ₹4,999 · Scale ₹14,999 · Enterprise custom · Growth RETIRED
```

Four findings, none blocking: F1/P2 cross-family plan-code asymmetry (policy), F2/P3 no self-serve downgrade-to-Launch, F3/P3 legacy partner_growth row cosmetics, F4/P3 stale test-fixture prices. Zero provider mutations; all 61 subscriptions untouched.

## 2. Baseline

171 dirty/clean-status entries inventoried; branch `main`; HEAD = origin/main = `fd92b98…`. Staged set = the accumulated MKT-05/06/06.1 release chain (19 files). Protected dirty work preserved: `src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts` (+ unrelated WIP). No forbidden git command used; nothing cleaned/reset/stashed.

## 3. Authority Map (traced, not assumed)

```text
src/config/commerce/plans.ts (registry + featuresForPlan → capability engine)
   ↓ seedBillingCatalog / Pricing Center savePlanConfig
BillingPlan (SupDev)  ← runtimeConfig.pricing.razorpayPlanId = DB-authoritative provider contract
   ↓ billingService.createCheckout → razorpayProvider (DB rc id ?? registry id ?? ₹0-order)
Razorpay subscription/order ──webhook──▶ api/webhooks/razorpay (HMAC+rate-limit+idempotency)
   ↓ handleSubscriptionWebhook (payment guard → BillingEvent → BillingSubscription → invoice+commission tx)
resolveActivePlan (plan-source: v2 → legacy → none; eligibility by status/period)
   ↓ capabilityService / entitlementService (static engine plans derived FROM registry via featuresForPlan)
Enforcement points (content-limit.enforcement, storage, orders, theme.actions gates)
   ↓ Dashboards: builder-overview / SubscriptionManager / agency surfaces (all read canonical resolvers)
Marketing: /pricing + homepage render getPublicPricingData()/runtime — no second price source
Super Admin: super-admin-pricing.actions (every entry requireSuperAdmin-gated)
```

Divergence analysis: registry↔catalog kept consistent by resync + tests; catalog↔provider linked only through stored `razorpayPlanId` with safe fallbacks; subscription state is the sole entitlement switch (`isSubscriptionEntitlementEligible`). Marketing cannot diverge (renders runtime).

## 4. Pricing Truth Audit (§4)

Sweeps for 699/1995/2999/7999/partner_growth across `src/**`: every hit classified — SVG path data & RSC chunk tokens (`T699`, key `s699le`) = unrelated numerics; `2999/7999` in demo seeds/acquisition strategies = creators' own product prices, not platform pricing; `revenue-service.test.ts` fixtures carry retired values as inert mock data (**F4/P3**); `partner_growth` refs are comments + negative guardrails only. Registry monthly prices resolve exactly 0/999/1999/0/4999/14999; annual = ×10 verified at registry, runtime, JSON-LD, and yearly-toggle display (annual÷12 shown as "billed yearly · Save 17%": ₹833/₹1,666 creator, ₹4,166/₹12,499 partner).

## 5. Creator Launch Entitlement Audit (§5) — RUNTIME TRUTH ESTABLISHED

`LAUNCH_GLOBAL_LIMIT = 3` (`content-limit.enforcement.ts`): Products + Services + Courses + Games share **one ceiling of 3 ACTIVE items combined**, enforced race-safely (tenant `FOR UPDATE` serialization, atomic count+create) including activation transitions (draft-stockpile bypass closed, RCCF-72.16B). Testimonials/FAQ/gallery/timeline/links/feed keep independent per-type limits of 3 (settings-stored or counted). **Bookings = 0 on Launch**; Orders 10/month; storage 20 MB; AI credits 0; hero video enabled (12 MB/15 s). Marketing card copy ("Up to 3 active items across products, services, courses & games"), comparison note ("combined allowance of up to 3 active items") and per-type "3" lines match runtime exactly. **PASS — copy is precise, not ambiguous.**

## 6. Creator Subscription Journey (§6)

- **Signup**: `/api/auth/register` hardcodes FREE plans (client `planCode` removed since RCCF-LAUNCH-01): creator→`creator_launch` TRIALING 15d; agency→`partner_free` TRIALING 15d. Zero Razorpay imports — a free account can never mint a paid contract.
- **Growth ₹999**: checkout resolves DB-authoritative amount + provider id (registry `plan_TLTGQBU1EXkseF`); webhook activation requires a positive captured amount (`payment_guard:no_activation`); invoice+commission commit atomically; duplicate payments collapse on payment-id idempotency; RECONCILIATION_REQUIRED durable repair on tx failure.
- **Scale ₹1,999**: checkout reads `rc.pricing.razorpayPlanId` = live `plan_TTZhIq131KIkGH`. No new provisioning occurred in this ticket.

## 7. Upgrade / Downgrade Audit (§7)

Supported self-serve transitions = any same-family plan change from ACTIVE/TRIALING/PAST_DUE/CANCELLED via `changePlan` → new checkout; **activation is webhook-driven so old entitlements persist until the new subscription activates** (payment-success-but-entitlement-failure fails safely: status unchanged + reconciliation event; entitlement-without-payment impossible via the payment guard). Status gate rejects other states. Downgrade-to-Launch self-serve is NOT functional (₹0 order rejected by Razorpay → graceful error; re-entry to Launch is Super Admin `adminSetPlan`) — **F2/P3**. Cross-family selection blocked on the Partner path (`family !== "partner"`); the Creator path accepts any valid code — **F1/P2 policy finding** (documented by test; not "fixed" without a business decision). Agency add-on capacity (₹1,499/client) is separate and idempotent.

## 8. Cancellation / Expiry / Failed Payment (§8)

State machine: DRAFT/TRIALING/ACTIVE/PAST_DUE/CANCELLED/EXPIRED with validated legal transitions (illegal throws). Eligibility truth: ACTIVE grants until period end; TRIALING only while open; **PAST_DUE/CANCELLED/EXPIRED never grant** — cancellation is effective immediately, no grace period exists in code. If product promises grace anywhere it would be P2; none found in current copy. Failed payment → PAST_DUE semantics + retryPaymentAction (same changePlan path); payment.failed webhooks record sanitized failure reasons on pending product orders without touching subscriptions.

## 9. Partner Journey (§9)

`changeAgencyPlanAction`: server-derived workspace, admin-only, family-validated, canonical resolution. Partner pricing everywhere = Launch free-trial/Solo 4,999/Scale 14,999/Enterprise manual (never public checkout — `isManualPlan` blocks provider subscriptions). `partner_growth` absent from registry, signup, selectors, upgrade ladders (`getUpgradePath` filters family+price), and runtime resolution; its legacy DB row remains for history and is excluded from public surfaces because it holds no `runtimeConfig` and no canonical mapping (**F3/P3**: exposure safety currently rests on that null rc — defensive hardening deferred since touching the row is forbidden here). Client capacity add-ons enforce RCCF-40 minimums.

## 10. Super Admin Pricing Center (§10)

All 8 exported operations gated by `requireSuperAdmin()`; simulator additionally SUPER_ADMIN-checked and dev-only. MKT-06.1 invariants re-proven by suite: unchanged-price save ⇒ same razorpayPlanId; failed reprovision ⇒ previous contract retained; intentional reprovision ⇒ new contract replaces. No live provisioning performed (mocks only).

## 11. BillingPlan Catalog (§11 — application read paths, read-only)

`creator_launch 0/v2 · creator_grow 999/v2 · creator_scale 1999/v7 + plan_TTZhIq131KIkGH · partner_free 0/v2 · partner_solo 4999/v2 · partner_scale 14999/v2` — runtime resolver mirrors these exactly (incl. annuals). Legacy `partner_growth` row present (ACTIVE/4999/v1, historical sub intact) but unresolvable publicly. No mutations performed.

## 12–13. Marketing & Dashboard Consistency

`/` and `/pricing` render exclusively from runtime (`getPublicPricingData`/`getRuntimePlansByFamily`); metadata + JSON-LD derive from runtime mins; no hardcoded plan prices in components (source guards assert this). Dashboards: builder overview returns canonical `{plan, code, status}`; SubscriptionManager renders matrixPlans from runtime with Upgrade/Downgrade classification via `getUpgradePath` (price-sorted, family-scoped); billing page shows runtime-configured prices (RCCF-36). One truth everywhere.

## 14. Entitlement Truth (§14 — executed decision matrix)

Executed `capabilityService.can/limit` across 6 plans × headline capabilities: advanced_builder (Launch✗/Grow✓/Scale✓, Solo✓), ai_automation mapped from the commerce `advanced_ai` claim (**true for Grow/Scale/Solo/Scale — marketing claim TRUE**; earlier "denied" probe used a non-engine key), api_access/webhooks/custom_domain/analytics_advanced/white_label exactly per tier, premium_themes Grow✓, granular theme caps via engine (`theme_background_image` Launch✗, `theme_background_video` Scale✓). Limits table verified incl. Launch 3/3/0-bookings/10-orders/20MB and Scale unlimited content/100 bookings/300MB/10 team. No contradiction found; no capability definitions altered.

## 15. Free/Trial Safety (§15) — PASS

Free plans carry null provider ids; ₹0 flows can never produce paid contracts (subscription path needs an id; order path rejects ₹0). Trials are truthful TRIALING rows with expiry-driven eligibility; stale TRIALING never reports active (server-derived `isTrialActive`).

## 16. Provider Safety (§16) — READ/AUDIT ONLY honored

Zero Razorpay calls issued by this ticket. Live state touched only through existing app read paths. All provider behavior evidence = mocks/source contracts/unit tests.

## 17. Security (§17) — PASS

Tenant scoping on every billing action (session tenantId match + workspace ownership); amounts/provider ids always server-resolved (client supplies only a plan *code* resolved against the catalog); registration ignores client plan selection; webhook HMAC with length-safe compare + rate limiting + secret-presence check; pricing mutations SUPER_ADMIN-only; simulator locked to dev+SUPER_ADMIN. Guardrail coverage added in the new suite.

## 18. Responsive QA (§18) — PASS

Playwright `scrollWidth === clientWidth` verified at 320/360/390/414/768/1024/1280/1440 on `/pricing` — zero overflow at every width; persona tabs and yearly toggle functional; matrix intentionally scrollable; no global overflow-x hacks needed or added.

## 19. SEO (§19) — PASS

Title "Pricing", runtime-derived description ("Paid plans from ₹999/month. Partner plans from ₹4999/month."), canonical `/pricing`, OG fixed-copy without numbers, JSON-LD offers 999/1999/4999/14999 from runtime.

## 20. Stitch Exploration — not used

No UX change warranted by findings; redesign risk outweighed benefit for an audit ticket.

## 21. Findings Register

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| F1 | **P2** | Creator-path `changePlanAction` accepts any valid canonical code (cross-family e.g. partner_solo); Partner path enforces family. Policy decision required: should creators self-select Partner plans? | Documented + pinned by test; NO code change (business decision — §26 STOP honored) |
| F2 | P3 | Self-serve downgrade/re-entry to Launch fails gracefully (₹0 Razorpay order rejection); Launch changes are admin-mediated today | Deferred UX/policy improvement |
| F3 | P3 | Legacy `partner_growth` BillingPlan row still status=ACTIVE (historical sub attached); hidden from runtime only via missing rc/registry membership | Deferred defensive hardening (row mutation forbidden here) |
| F4 | P3 | `revenue-service.test.ts` fixtures use retired 699/1995 as inert mock data | Cosmetic modernization candidate |
| — | PASS | Pricing truth · Launch quota · journeys · lifecycle · catalog · entitlements · trials · security · responsive · SEO | Verified green |

## 22. Implementation Changes

None to production source. New test suite only (audit guardrails). MKT-06.1's preservation fix remains staged and is regression-covered here again.

## 23. Tests

New: `tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts` — **30/30** covering pricing truth, annual invariant, retired exclusion, Launch quota truth, entitlement matrix, resolution eligibility, lifecycle legality, upgrade ladder, free/trial safety, super-admin gating, injection resistance, provider-contract alignment, webhook signature/guard source contracts.

Related suites re-run: MKT-06 (22) + MKT-06.1 (6) + pricing cluster (111 across 9 files) — all green.

Full suite: fresh post-MKT-06.1 baseline stands (this ticket adds no source); failure set = the classified pre-existing list (+1 parallel-load flake passing isolated).

## 24. Verification Gates

`tsc --noEmit` ✅ 0 · `eslint` (new file) ✅ 0 · `prisma validate` ✅ · `git diff --check` ✅ · build ✅ (green at HEAD-equivalent source in MKT-06.1; MKT-07 changes no production source, so the result carries) · focused suites ✅.

## 25. Protected Work & Exact Staged Files

Protected dirty files untouched and unstaged. Newly staged (only):
1. `tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts`
2. `docs/rccf-mkt-07-pricing-subscription-journey-audit-closure.md`

Cumulative staged set otherwise = the intended MKT-05→06→06.1 release chain (unchanged).

## 26. Final Report Format

```text
Verdict : A — AUDIT COMPLETE, ZERO P0/P1 BLOCKERS
P0      : none
P1      : none
P2      : F1 (creator-side cross-family plan selection — policy decision)
P3      : F2 (self-serve Launch downgrade), F3 (legacy partner_growth row),
          F4 (stale revenue-test fixture prices)
Commit  : NOT CREATED
Push    : NOT PERFORMED
Next    : release RCCF (consolidated staging already correct) or P2 policy call
```
