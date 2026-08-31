# RCCF-MKT-08 — Partner Pricing Model & Commission Copy Truth Audit — Closure

**Status:** ⛔ **STOPPED AT ARCHITECTURAL GATE — NO CODE CHANGED, NOTHING STAGED**
**Date:** 2026-08-24
**Mode:** Read-only audit + this closure document. Zero source, config, schema, or test modifications.
**Trigger:** Ticket §18 stop conditions met (two independent conditions). Per the ticket's explicit
final architectural check: *"if the current backend actually treats Solo/Scale as recurring Razorpay
subscriptions, OpenCode should stop rather than merely change the marketing text."* It does.

---

## 1. Executive Verdict

**STOP — public economics and the billing engine disagree.**

The ticket's authoritative product decision is that Partner paid plans are **one-time plan costs**
(₹4,999 / ₹14,999) plus a **₹2,000 one-time** additional-client charge. The runtime billing engine
models Partner Solo/Scale as **recurring monthly Razorpay subscriptions** and the capacity add-on as
a **recurring internal entitlement priced ₹1,499** with no payment gate. Rewriting only the marketing
text to say "one-time" would make `/pricing` lie about what checkout actually does. The correction
must be sequenced after (or together with) an engine-level billing-form change, which §11 of this
ticket forbids touching ("no provider API calls… no schema migration… do not redesign billing
architecture").

Grade for the audit itself: **A** (evidence complete, every claim file:line-cited). Grade for shipping
the requested copy change: **withheld — blocked by design**.

## 2. Old-vs-Current Model (as requested in §17)

| Concept | OLD model (current marketing copy) | Ticket's CURRENT decision | Actual RUNTIME today |
|---|---|---|---|
| Partner Solo | ₹4,999/month subscription | ₹4,999 one-time | Recurring monthly Razorpay subscription |
| Partner Scale | ₹14,999/month subscription | ₹14,999 one-time | Recurring monthly Razorpay subscription |
| Additional client | "₹1,499/month each" | ₹2,000 one-time | ₹1,499 recurring-shaped addon, **not payment-gated** |
| Billing toggle | Monthly/Yearly shown for Partners | None (implies one-time) | Toggle renders because partner plans carry `annualPrice` |
| Commission example | "10 clients → ~₹1,998/month" | Remove unless runtime-derived | Hardcodes 0.2 fallback %; runtime % is configurable |

Note the trap this ticket correctly anticipated: today's "/month" card copy is actually *consistent*
with the engine; flipping it to "one-time" without an engine change would create the lie.

## 3. Partner Billing Model — Runtime Evidence (the decisive finding)

Every step of the real money path is recurring:

1. **Registry** — `src/config/commerce/plans.ts`
   - `partner_solo`: `cycle: "monthly"` (:460), `annualPrice: 49990` (:465), `razorpayPlanId: "plan_solo"` (:461)
   - `partner_scale`: `cycle: "monthly"` (:524), `annualPrice: 149990` (:529), `razorpayPlanId: "plan_scale"` (:525)
2. **Provider** — `src/modules/billing/infrastructure/providers/razorpay.ts:36-56`:
   any plan with a non-null plan id and not manual → `razorpay.subscriptions.create({ plan_id, total_count: 12 })`.
   The registry supplies non-null ids for both paid partner plans, so the **subscription branch is the default path**.
3. **Service** — `src/modules/billing/application/service.ts:595-620`: `changePlan` docstring and code:
   *"creates a NEW Razorpay subscription checkout"*; activation is webhook-driven.
4. **Pricing Center provisioning** — `src/actions/super-admin-pricing.actions.ts:132-161`: on any price edit
   of a paid non-manual plan (partners included) it calls `createRazorpayPlanForPlan` and stores a fresh,
   immutable provider subscription contract; DB `BillingPlan` upsert hardcodes `cycle: "monthly"` (:179).
   Precedent: RCCF-MKT-06.1 provisioned exactly such a live contract for Creator Scale.
5. **Partner UI entry point** — `src/app/agency/billing/_components/agency-plan-manager.tsx:42` →
   `changeAgencyPlanAction` (`src/actions/partner.actions.ts:225`) → `billingService.changePlan`. The billing
   page itself displays "Renews …" (`agency/billing/page.tsx:95`).
6. **Schema** — `prisma/schema.prisma:356`: `AgencyCapacityAddon` documented as *"A recurring internal
   entitlement"*; `unitPriceInr` persisted per row.
7. **Independent corroboration** — `docs/rccf-73.2-partner-commercial-architecture-audit.md` §12:
   the partner plan-change path *"creates a real Razorpay subscription for the Partner."*

No code path bills Partner Solo/Scale as a one-time order while a plan id resolves. No token such as
`one_time`/`oneTime` exists anywhere in `src` for partner plans. Nothing committed since the RCCF-73.2
audit (HEAD `68dc9dd`, == `origin/main`) changed these semantics.

## 4. Additional-Client Pricing — Conflicting Authorities

- Ticket decision: **₹2,000 ONE-TIME**.
- Single existing constant: `PARTNER_ADDON_UNIT_PRICE_INR = 1499` (`src/config/commerce/agency-addons.ts:8`),
  consumed by `addAgencyCapacityAction` (`src/actions/partner.actions.ts:256,266,272`), agency billing UI
  (`src/app/agency/billing/page.tsx:89`), and marketing (`src/components/marketing/Pricing/index.tsx:103`,
  rendered as "₹1,499/month").
- Deeper divergence: the addon today is created via plain upsert with **no checkout/webhook/invoice**
  (RCCF-73.2 §11), so even the current ₹1,499 figure is not payment-backed. Making it "₹2,000 one-time"
  truthfully requires the payment-gated rewire already scoped as future RCCF-73.x work — explicitly out of
  bounds here (§11 of this ticket).

Two stop conditions fire simultaneously: engine contradicts the one-time model, and the additional-client
price has conflicting authorities (ticket vs runtime constant vs un-gated grant).

## 5. Commission Audit (§2 of ticket)

Runtime (`src/lib/commission/runtime.ts`) — conceptually matches "passive/recurring commission from active clients":

- Trigger: PAID `BillingInvoice` webhook events (`created`/`renewed`/`upgraded`) on a CLIENT creator workspace
  with an ACTIVE `AgencyTenant` link (`recordSubscriptionCommission`, :150-252).
- Rate hierarchy (:66-129): partner rule → plan rule → global rule → loyalty tier → relationship
  `revSharePercent` → policy `agencyDefaultShare` → **default 80/20 fallback**.

Why no percentage may be marketed:

1. The rate is **operator-configurable at four levels** (`CommissionRule`, loyalty escalation, per-tenant
   rev-share, policy); the pricing page currently hardcodes `0.2` in its example (`Pricing/index.tsx:109`)
   — true only for the final fallback. Fabrication risk confirmed; example must go.
2. **Eligibility gaps**: there is NO partner-plan-level commission gate — `partner_free` would earn the
   default split if a client subscription existed (RCCF-73.2 §8). Conversely, due to defect F2, provisioned
   clients have **no Creator `BillingSubscription` at all**, so commission has **never fired** in practice
   (0 entries despite active links). "Commission eligibility begins with paid Partner plans" is NOT
   runtime-verifiable today — so that suggested sentence was rightly withheld too.

Truthful-safe language remains only: *"Earn recurring commission from eligible active clients"* (concept-level),
and even that describes machinery that cannot yet trigger end-to-end (F2 pending RCCF-73.3).

## 6. Pricing Surfaces Audited (§10)

| Surface | Finding |
|---|---|
| `src/config/commerce/plans.ts` | Partner = monthly cycle + annualPrice + subscription ids (engine-recurring) |
| `src/config/commerce/agency-addons.ts` | ₹1,499 constant — sole authority, but contradicts ticket value & form |
| `src/modules/pricing/application/runtime.ts` | Faithful pass-through of registry/DB; neutral |
| `src/modules/billing/application/service.ts` / `providers/razorpay.ts` | Subscription-first checkout (§3 above) |
| `src/actions/partner.actions.ts` | Upgrade = subscription checkout; addon = un-gated ₹1,499 grant |
| `src/actions/super-admin-pricing.actions.ts` | Auto-provisions recurring contracts on partner price edits |
| `prisma/schema.prisma` | Addon documented recurring; `BillingPlan.cycle` monthly |
| `src/components/marketing/Pricing/index.tsx` | Stale: ₹1,499/month line (:103), fabricated 0.2-based earnings example (:106-117), toggle for partners (:62), "/month" suffix (:166) |
| `src/components/marketing/Pricing/data.ts` | `PARTNER_VALUE_POINTS` old-economics block (:46-51) |
| `src/app/pricing/page.tsx` | Metadata "Partner plans from ₹X/month." (:27); JSON-LD category "Partner subscription" (:57) |
| `src/components/marketing/Agency.tsx`, `AgencyFeatures/data.ts` | "Recurring commission" claims — concept-true, inactive-in-practice (F2) |

Stale-token sweep classification (§8): all `/month`, `1499`, recurring-example hits are accounted for above;
`SellAnything.tsx` mentions are unrelated creator-membership copy (allowed); `tests/unit/rccf61-*` asserting
1499 intentionally pin the current constant (allowed); docs/historical closures allowed.

## 7. Monthly/Yearly Toggle Decision (§4)

Current implementation: shared component shows the toggle whenever any displayed plan has `annualPrice`
(`Pricing/index.tsx:62`) — partners qualify because the registry sets annual prices. The required change
(suppress for partners + relabel cards "one-time") was designed but **not applied**, because with the engine
unchanged it would present one-time economics over a recurring charging mechanism. Correct sequence: land the
one-time billing form first, then flip presentation in a single truthful step.

## 8. Partner Growth Verification (§13)

✅ Not publicly selectable and not displayed: `partner_growth` is fully retired from the registry
(`COMMERCE_PLANS` contains no such entry; commit `6ea07ba`; `plans.ts:653-655` documents the removal of its
legacy alias). `getMarketingPlans` renders only registry entries minus hidden/enterprise, so Growth cannot
appear on `/pricing`. Its historical DB records remain untouched (protected per §11).

## 9. Creator Regression (§9)

✅ Untouched by construction (zero diffs): Creator Launch ₹0/15-day trial, Growth ₹999/month (annual ₹9,990,
live plan `plan_TLTGQBU1EXkseF`), Scale ₹1,999/month (annual ₹19,990; checkout falls back to the DB-priced
one-time order until/unless a fresh subscription contract is provisioned — MKT-05/MKT-06/MKT-06.1 behavior
preserved verbatim). DIRECT_CREATOR / PLATFORM_COLLECT / storefront selling / webhooks / refunds /
fulfillment / WhatsApp commerce: not opened for modification.

## 10. Responsive QA (§12)

Not applicable — no UI was modified. The 8-width matrix (320→1440) requirement transfers unchanged to the
follow-up implementation ticket.

## 11. Tests (§13)

Not added — deliberately. The mandated suite pins "Solo represented as one-time / no monthly billing claim",
which the runtime contradicts; shipping assertions that fail (or pinning copy we know is wrong) would violate
the ticket's own truth discipline. Guardrails that DO hold today already exist elsewhere (rccf61 pins the
addon constant; rccf-mkt-05 pins marketing consuming constants instead of literals). The full suite defers to
the implementation ticket that changes the billing form, where it becomes the regression net.

## 12. Build Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx prisma validate` | ✅ valid |
| `git diff --check` | ✅ clean (pre-existing CRLF warning only, untouched file) |
| `npm run lint` / `npm run build` | N/A — zero source changes (full suite remains the release workflow's job) |
| Focused vitest | N/A — no test added/modified |
| Live Razorpay access | Not required, none performed |

Read-only DB inspection from this shell failed to connect (local env); immaterial — source evidence is
conclusive and independently corroborated by RCCF-73.2's live-DB audit of the same paths.

## 13. Protected Work

- Pre-flight: HEAD `68dc9dd5…` == `origin/main`; working tree carried pre-existing dirty files belonging to
  other tickets (incl. protected `src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts`).
- This ticket's entire footprint: one temporary audit script created under `scripts/` and deleted;
  nothing else touched. No reset/restore/checkout/clean/stash/rebase/amend used. Dirty work preserved byte-for-byte.
- **Nothing staged.** `git diff --cached --stat` empty.

## 14. Exact Files Changed / Staged

Changed by this ticket: **none**. Staged: **none**. New files: `docs/rccf-mkt-08-partner-pricing-model-closure.md` (this document, untracked).

## 15. Deferred Items (required before MKT-08 copy can ship truthfully)

1. **Engine: one-time Partner billing form** — decide and implement how Solo/Scale charge once
   (order-based purchase vs `total_count: 1` semantics), including entitlement lifecycle without renewals
   and webhook activation parity; retire/replace auto-provisioned recurring contracts for partner codes.
2. **Engine: payment-gated ₹2,000 additional-client purchase** (RCCF-73.x item 3): update
   `PARTNER_ADDON_UNIT_PRICE_INR` → 2000 as part of the checkout→webhook→invoice→ACTIVE-addon rewire (D4 resolved to one-time).
3. **Engine: commission eligibility gate** — plan-level Free=0%/paid=rate rule (RCCF-73.x item 4) and F2 fix
   (RCCF-73.3) so commission can actually trigger before it is advertised.
4. **Then this ticket's presentation layer**: rewrite "How Partner plans work", remove the toggle for
   partners, relabel cards "one-time", drop the ₹1,499/month line and the 0.2-based example, fix
   `/pricing` metadata + JSON-LD categories, and land `tests/unit/rccf-mkt-08-partner-pricing-model.test.ts`.
5. Out-of-scope observation: partner checkout CTA links carry `persona=creator` (`Pricing/index.tsx:189`).

## 16. Recommendation

**BLOCK** the marketing-only execution of RCCF-MKT-08 as specified. Re-scope as the tail of the RCCF-73.x
billing-form sequence (items 15.1–15.3 first, 15.4 last) so public economics and the charging engine move
together. Do not commit anything for MKT-08 in its current form.

---

**AUDIT ONLY — no application code, DB, migration, billing, plan-registry, commission logic, or tests modified; nothing staged; no commit; no push.**
