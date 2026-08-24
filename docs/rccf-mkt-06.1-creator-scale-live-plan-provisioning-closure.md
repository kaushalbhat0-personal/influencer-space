# RCCF-MKT-06.1 Closure — Creator Scale Live Razorpay Plan Provisioning

| | |
|---|---|
| **Ticket** | RCCF-MKT-06.1 (operational — closes the single BLOCKED item from RCCF-MKT-06) |
| **Date** | 2026-08-24 |
| **Status** | ✅ COMPLETE — live provider plan provisioned, persisted, and preserved; one product defect discovered & fixed with regression tests |
| **Baseline HEAD** | `fd92b982a57b9fab582746d6fb98173aafd25f8f` (= origin/main) |
| **Commit policy** | NO COMMIT / NO PUSH — files staged only; release handled by a later RCCF |

---

## 1. Executive Verdict

Creator Scale now has a real, LIVE Razorpay subscription plan wired into the runtime:

```text
Razorpay plan ID : plan_TTZhIq131KIkGH
Amount           : 199900 paise (₹1,999)
Currency         : INR
Interval         : monthly
Stored at        : BillingPlan(creator_scale).runtimeConfig.pricing.razorpayPlanId
```

The only provider-side mutation was the creation of this one plan object — exactly as authorized. No customer was charged, no subscription/order/payment/refund exists, no webhook or checkout code changed, and all 61 existing subscriptions are byte-for-byte unchanged. Along the way, a latent persistence defect was discovered (unchanged-price saves silently detaching the provider contract), fixed minimally in `savePlanConfig`, and pinned by six new regression tests.

## 2. Explicit Authorization

The operator authorized **only** the creation/provisioning of the Creator Scale Razorpay subscription plan at ₹1,999/month (199900 paise, INR). Explicitly NOT authorized (and not done): customer charges, subscriptions, payments, refunds, webhook/checkout changes, migration or repricing of existing subscriptions, any other Razorpay object mutation.

The MKT-06 fail-closed guard in `createRazorpayPlanForPlan` (`src/actions/super-admin-pricing.actions.ts`) was inspected first, left intact, and exercised in both directions during this ticket (§9).

## 3. Pre-flight

- HEAD = origin/main = `fd92b982a57b9fab582746d6fb98173aafd25f8f`.
- MKT-05 + MKT-06 work already staged (17 files); unrelated dirty/untracked files inventoried.
- Protected dirty-unstaged files untouched throughout: `src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts` (verified again post-staging).
- Forbidden git operations (`reset --hard`, `clean`, `checkout .`, `restore .`, `stash`, `add -A`, `add .`) never used.
- Read-only before-audit captured: `creator_scale` = ACTIVE / ₹1,999 / v2 / `runtimeConfig: null`; `creator_grow` = ACTIVE / ₹999 / rc null (registry fallback `plan_TLTGQBU1EXkseF` intact); subscriptions = 61 (18 ACTIVE, 43 TRIALING), billingEvents = 19; full subscription snapshot written to temp storage for byte-comparison.

## 4. Registry & BillingPlan Verification

Registry (`src/config/commerce/plans.ts`) pre-op check passed: `creator_scale.price = 1999`, `annualPrice = 19990`, `razorpayPlanId = null`, retired ID `plan_TLTH45wQlPdW7v` present only as an explanatory comment — never an assigned value. DB row matched (ACTIVE/1999/rc-null). No price was changed manually at any point; every DB transition went through the application's own Pricing Center operations.

## 5. Razorpay Environment

Credentials confirmed **LIVE** by prefix inspection only (`rzp_live_…`). No secret, full key, or credential value is quoted anywhere in this ticket's artifacts. `RAZORPAY_LIVE_PROVISIONING_AUTHORIZED` was absent from `.env`/`.env.local` before, during, and after.

## 6. Provisioning Operation (sanctioned path only)

A custom Razorpay API script was explicitly avoided. Because provisioning triggers only when `existingPlan.price !== newPrice` and the row already held ₹1,999 (post-MKT-06 sync), the sanctioned flow was executed in two steps that let the fail-closed guard itself absorb the intermediate state:

1. **Step A — guard armed (no authorization):** Super Admin → Pricing Center → Creator Scale → Save Plan Configuration at a transient ₹2,000. Result: save succeeded **with the LIVE-provisioning blocked** (guard threw; surfaced as non-fatal warning) — an end-to-end live proof of fail-closed behavior under production keys. Only the scalar price moved to ₹2,000 (v3); no provider call occurred.
2. **Step B — one-time authorization:** dev-server process restarted with `RAZORPAY_LIVE_PROVISIONING_AUTHORIZED=1` injected via its process environment only (never written to any file, never committed). Pricing Center → Save Plan Configuration at ₹1,999 → `priceChanged` true → guard satisfied → `plans.create` executed once → returned ID stored in `runtimeConfig.pricing.razorpayPlanId` (v4).

Net provider mutations: **exactly one plan created** (the correct ₹199,900-paise contract). The transient ₹2,000 state existed for ~2 minutes on internal surfaces with no customer traffic.

Provider-plan contract evidence: creation parameters are code-pinned (`period: "monthly"`, `interval: 1`, `item.amount = Math.round(price*100) = 199900`, `currency: "INR"`, `notes.planCode = "creator_scale"`), pinned by unit tests, accepted by Razorpay which returned `plan_TTZhIq131KIkGH`.

## 7. Defect Discovered & Fixed — provider-ID detachment

While restoring configuration after Step A, a **latent product bug** surfaced: `savePlanConfig` rebuilds `runtimeConfig` from scratch and writes `pricing.razorpayPlanId` *only* inside the provisioning branch. Therefore **any save without a price change silently erased the freshly provisioned contract** (observed live: v5 lost the ID after an unrelated corrective edit).

**Fix (minimal, guard untouched):** preserve the existing DB-authoritative ID across non-reprovisioning saves —

```ts
runtimeConfig.pricing!.razorpayPlanId =
  (existingPlan?.runtimeConfig as PlanRuntimeConfig | null | undefined)?.pricing?.razorpayPlanId ?? null;
```

placed just before the provisioning branch (which still overwrites it on success). Side benefit: a failed reprovision now retains the previous working contract instead of nulling it — matching the warning copy ("may still charge the previous provider amount").

**Recovery sequence (all via sanctioned operations):** Versions tab → Rollback to the v4 payload (restored ID + full config; v6) → corrective Save restoring Clients capacity to Unlimited (-1); the preservation fix kept the ID intact through that unchanged-price save (**v7 — final**). Verified end-to-end live.

Residual note (documented, zero behavioral reach): `runtimeConfig.capabilities` holds the 11 catalog-visible capability keys; the editor has no checkboxes for `advanced_ai` and the ten `theme_background_*`/`theme_effects_*` keys. These remain fully granted at runtime because `entitlementService.has()` resolves them through the static engine plans (registry-derived `featuresForPlan`), not through `BillingPlan.runtimeConfig`; `getCapabilities()` (the only reader of the rc array) has no consumers outside its module export.

Also disclosed: an automation checkbox sweep briefly flipped the Clients capacity control to `max_clients: 1`; corrected to `-1` (Unlimited) and verified. `max_clients` enforcement is Partner-only (`partner-relationship.ts`); creator paths are capability-gated upstream (`agency_clients` false for Scale).

## 8. Preservation Evidence (final DB audit)

| Check | Result |
|---|---|
| `creator_scale` | ACTIVE · price **1999** · annualPrice **19990** · version 7 · `razorpayPlanId = plan_TTZhIq131KIkGH` ✓ |
| Marketing config | badge/description/targetAudience/highlights(8)/ctaLabel/ctaType/comparisonOrder/bestValue — full approved set restored ✓ |
| `featureOverrides.max_clients` | `-1` (Unlimited) restored ✓ |
| `creator_grow` | ACTIVE · ₹999 · rc null → registry `plan_TLTGQBU1EXkseF` fallback intact; **no new plan provisioned for Growth** ✓ |
| Subscriptions | 61 rows (18 ACTIVE / 43 TRIALING) — snapshot diff vs before-operation: **byte-identical** ✓ |
| Billing events | count 19, unchanged ✓ |

No customer migrated, repriced, or charged; partner plans untouched; `partner_growth` legacy row untouched.

## 9. Checkout Safety

No checkout code modified (verified: zero diffs outside the declared files). Fallback chain intact and asserted by tests: DB plan id → registry id → one-time-order at DB-authoritative price. With the live plan now stored, new Creator Scale subscriptions will use the immutable ₹199,900 contract; existing behavior for every other plan is unchanged.

## 10. Temporary Authorization Removal

`RAZORPAY_LIVE_PROVISIONING_AUTHORIZED=1` existed **only** in the process environment of one intermediate dev-server instance (and inside unit-test processes). It was never written to `.env`, `.env.example`, source, docs, or git-tracked config, and never committed. That server process was killed immediately after the authorized save; the current running server was started without the variable (fail-closed default restored). Guard verified re-armed three ways: Step A live E2E (warning + no provider call under live keys), fresh-process env absence, and two dedicated unit regressions.

## 11. Marketing & Pricing-Matrix Verification

Post-restoration HTTP + browser checks on `/` and `/pricing`: metadata "from ₹999/month" derivation intact; creator cards ₹999 / ₹1,999; Partner tab ₹4,999 / ₹14,999; JSON-LD offers 999/1999/4999/14999; launch note "combined allowance of up to 3 active items" rendering; matrix columns Launch/Growth/Scale (+Partner Free/Solo/Scale); **zero stale prices** (699/1995/2999/7999 absent — raw-text "699"/"T699" hits were RSC chunk tokens/SVG keys, confirmed by context). NO marketing source change required.

## 12. Tests

- New: `tests/unit/rccf-mkt-061-provider-planid-preservation.test.ts` — **6/6**: unchanged-price save preserves existing ID; no prior contract stays unset; reprovision overwrites; failed reprovision retains previous contract; LIVE guard blocks without auth; guard permits only with auth.
- Existing MKT-06 suite: **22/22** still green (provisioning contract unaffected).
- Pricing cluster (MKT-05, super-admin-pricing-actions, rccf36/rccf60, pricing-runtime×2, commerce-registry, plans-alignment): **111/111** across 9 files.
- Full suite: failure set identical to the MKT-05/MKT-06 classified baseline (21 pre-existing: dashboard/theme WIP + prisma-mock drift + whatsapp/products). One additional full-run failure (`rccf68-retry-catalog-timeout`) passes **11/11 in isolation** — parallel-load timing flake, not a regression. Zero failures attributable to MKT-06.1.

## 13. Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors (after temp-script cleanup) |
| `eslint` on changed/new files | ✅ clean |
| `npm run build` | ✅ exit 0 (re-run to completion) |
| `npx prisma validate` | ✅ valid |
| `git diff --check` | ✅ clean (only pre-existing CRLF notice on protected fixture) |
| Dev hygiene | build clobbered `.next` → server killed, rebuilt fresh, restarted clean; `/pricing` 200 re-verified |

Temp artifacts removed: read-only audit script deleted; its `.git/info/exclude` entry removed.

## 14. Protected Work

`src/app/onboarding/page.tsx` and `tests/fixtures/test-seed.ts` remain dirty-unstaged exactly as at baseline — never modified, never staged. No forbidden git command used at any point.

## 15. Exact Staged Files (nothing else)

1. `src/actions/super-admin-pricing.actions.ts` — provider-ID preservation lines only (fail-closed guard untouched).
2. `tests/unit/rccf-mkt-061-provider-planid-preservation.test.ts` — new regression suite.
3. `docs/rccf-mkt-06.1-creator-scale-live-plan-provisioning-closure.md` — this document.

## 16. Final Verdict

The MKT-06 blocker is formally closed: Creator Scale carries a valid LIVE Razorpay subscription plan (`plan_TTZhIq131KIkGH`, ₹1,999 → 199900 paise INR monthly) persisted at the DB-authoritative path and proven durable across unrelated edits. Subscription readiness is complete; every safety invariant held; authorization was temporary, scoped, and is now removed. Work staged and stopped — **DO NOT COMMIT / DO NOT PUSH** (release RCCF consolidates).
