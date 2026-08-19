# RCCF-73.3 — Creator Client Subscription Provisioning — Closure

**Status:** COMPLETE (STAGED — NOT committed)
**Verdict:** A — PASSED (verdict A = READY FOR IMPLEMENTATION from audit; implementation verified and closed)
**Date:** 2026-08-19
**Ticket:** RCCF-73.3 — Implement Creator Client Subscription Provisioning (fixes RCCF-73.1-F2)
**Mode:** Implementation. Verification + browser QA complete. **No commit** (awaiting explicit approval).

---

## 1. Executive Verdict

**A — PASSED.** The RCCF-73.1-F2 defect is fixed: an agency-provisioned Creator client now receives a **real Creator `BillingSubscription`** (`TRIALING`, +15 days) tied to the Creator workspace, with the selected Creator plan persisted and resolvable through `resolveActivePlan()`. The fix reuses the existing canonical billing primitives (`billingRepository.upsertSubscription` + `getTrialEndDate`), is fully transaction-safe (created inside the existing provisioning transaction T1), adds server-authoritative Creator plan validation, and leaves normal Creator signup, Partner billing, commission, Razorpay webhooks, publish policy, and schema untouched.

Verified end-to-end in the live dev environment: Growth client provisioned → invitation claimed → creator dashboard shows **"Publish allowance: 1 of 10 used · 9 remaining"** (monthly 10, not Unlimited) → billing page shows **"Creator Growth · Trial · ends 3 Sept 2026"** → **0 invoices / 0 commission entries** during trial. Launch provisioning rejected server-side with zero side effects.

Full suite: **241 files / 3669 tests passing**, `tsc --noEmit` clean, `npm run build` clean, eslint 0 errors, `git diff --check` clean.

**STAGED — not committed, per instructions.**

---

## 2. Production Root Cause

`provisioning-service.ts` created Tenant/Website/User/Workspace/WorkspaceMember but then called `billingRepository.linkSubscriptionToWorkspace(...)`. That helper (repository.ts:32-51) only backfills a `workspaceId` onto a subscription that **already exists** (created account-first at registration). Agency provisioning creates the user/workspace **fresh**, so no BillingAccount/BillingSubscription ever existed → `linkSubscriptionToWorkspace` returned `null` (silent no-op). The selected Creator plan survived only as `onboarding_source` metadata, which `resolveActivePlan` never reads → client resolved to phantom Launch → `resolvePublishPolicy(null)` → **unlimited** publishing, no client subscription revenue, no commission trigger.

## 3. Implementation

The fix creates the Creator subscription **inside the existing provisioning transaction (T1)**, reusing canonical primitives:

- **`provisioningService.provision`** (agency path, `input.creatorPlan` present) → `billingRepository.upsertSubscription(ws.id, { planId, status: "TRIALING", trialEndsAt: getTrialEndDate(new Date(), 15) }, tx)`.
- `upsertSubscription` lazily creates the creator `BillingAccount` (accountType "tenant", accountId=workspaceId) and is idempotent per unique `workspaceId`.
- Normal Creator signup (`attach_existing_user`, `creatorPlan` unset) keeps the legacy `linkSubscriptionToWorkspace` backfill unchanged.
- Server-authoritative plan validation in `confirmProvision` via a new pure helper `validateAgencyCreatorPlanCode` (creator family, non-manual, non-enterprise, non-Launch), then resolves the canonical `BillingPlan.id`.

## 4. Files Changed

| File | Change |
|---|---|
| `src/modules/provisioning/application/provisioning-service.ts` | Added `creatorPlan?` to `ProvisioningInput`; imported `getTrialEndDate`; in T1 branch: `upsertSubscription(..., TRIALING, +15d, tx)` for agency path, preserving `linkSubscriptionToWorkspace` for normal signup. |
| `src/actions/super-admin-provision.actions.ts` | `confirmProvision` now validates the Creator plan server-side (via `validateAgencyCreatorPlanCode`), resolves the canonical `BillingPlan`, and threads `creatorPlan { planCode, planId }` into the provisioning input. |
| `src/modules/provisioning/application/creator-plan.ts` | **New** pure module `validateAgencyCreatorPlanCode` — canonical-registry plan validation (no `"use server"` so it's unit-testable). |
| `tests/unit/rccf73-3-creator-client-subscription.test.ts` | **New** guardrail + behavior regression tests (16 tests). |

No changes to: `prisma/schema.prisma`, migrations, `src/config/commerce/plans.ts`, `src/lib/commission/**`, `src/modules/billing/application/service.ts`, Razorpay webhook handlers, `publish-policy.ts`, normal Creator registration, Partner billing, theme/storefront/auth/invitation architecture.

## 5. Subscription Lifecycle

- **State:** `TRIALING` — never automatically `ACTIVE` (no payment, no invoice, no Razorpay activation). INV-08.
- **trialEndsAt:** `getTrialEndDate(new Date(), 15)` = +15 days (matches the canonical Creator signup trial).
- **Attached to:** the Creator workspace (`workspaceId` unique), account = creator BillingAccount. INV-03/04.
- **Resolution:** `resolveActivePlan(workspaceId)` reads the BillingSubscription by workspace → returns the selected plan. INV-06.
- **Client activation:** after invitation claim, the client pays/activates through the existing Creator billing surface (`changePlanAction` → checkout → webhook). INV-10.

## 6. Plan Validation

- `validateAgencyCreatorPlanCode` (pure, canonical registry via `getCommercePlan` + `isAgencyRestrictedPlan`).
- Accepts `creator_grow`, `creator_scale`; rejects `partner_solo`/`partner_growth`/`partner_scale` (partner family), `creator_enterprise`/`partner_enterprise` (enterprise/manual), `creator_launch` (Launch), and unknown codes.
- The valid set is derived from the canonical registry, not a second hardcoded list.
- The raw client-supplied `planCode` is never trusted for entitlement — the server resolves the canonical `BillingPlan.id` and persists that.

## 7. Security

- Server-authoritative validation runs **before** any tenant creation in `confirmProvision` → invalid/partner/enterprise/Launch plans have **zero side effects** (verified: rejected Launch attempt created no tenant).
- Agency, partner workspace, creator tenant/workspace/account are all derived server-side; the subscription is tied to the freshly-created Creator workspace, never a Partner/other-agency workspace. INV-07/INV-20.
- `partner.actions.ts` Launch rejection (`isAgencyRestrictedPlan`) retained as defense-in-depth at the entry layer.

## 8. Transaction Boundary

- The `BillingAccount` + `BillingSubscription` creation is **inside T1** (the same `prisma.$transaction` as Tenant/Website/User/Workspace/Member). If any step fails, the whole transaction rolls back — no orphan subscription, no orphan billing account, no client-without-entitlement and no entitlement-without-client. INV-16.
- Commission is NOT created by provisioning (see §9).

## 9. Publishing Behavior

- Because the client now has a real TRIALING `creator_grow` subscription, `resolveActivePlan` returns `creator_grow` → `resolvePublishPolicy("creator_grow")` = **monthly 10**. Verified live: dashboard shows "Publish allowance: 1 of 10 used · 9 remaining". INV-09 — the null→unlimited fallback no longer applies to newly provisioned clients.
- `creator_scale` resolves to Scale's unlimited policy (by plan, not by missing subscription).
- **Deferred (documented, not changed):** the existing post-trial expired/unpaid null→unlimited behavior is a separate future policy issue; intentionally not touched in this ticket.

## 10. Commission Behavior

- Creating a TRIALING subscription produces **no invoice, no CommissionEntry, no PartnerLedger** — commission is driven only by the paid subscription/invoice webhook lifecycle (`billingService.handleSubscriptionWebhook` → `recordSubscriptionCommission`). INV-13.
- Verified live: agency has **0 commission entries, 0 ledger entries, 0 invoices** after provisioning the TRIALING Growth client.
- After the client pays/activates, the existing commission runtime works unchanged.

## 11. Tests

**New:** `tests/unit/rccf73-3-creator-client-subscription.test.ts` (16 tests)
- Plan validation: grow/scale accepted; partner_solo/growth/scale rejected; creator_enterprise/partner_enterprise rejected; Launch rejected; unknown/undefined/null rejected; canonical-registry-derived (not hardcoded).
- Provisioning: `upsertSubscription` called with TRIALING + `getTrialEndDate(...,15)` + `planId` from server-validated creatorPlan; call inside the same transaction; `linkSubscriptionToWorkspace` preserved for normal signup; no bespoke billingAccount/billingSubscription create (no second billing subsystem).
- resolveActivePlan wiring: `billingRepository.findPlanByCode` + `planId: billingPlan.id` + `creatorPlan` threaded.
- Publishing: `resolvePublishPolicy("creator_grow")` = monthly 10; `creator_scale` = unlimited (by Scale policy).
- Commission: provisioning source never records commission/invoice; commission recorded only in billing service + commission runtime.

**Verification gate results:**

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run tests/unit/rccf73-3-*` | ✅ 16/16 passed |
| Relevant billing/provisioning/partner/capabilities/pricing/publish suites | ✅ 14 files / 142 passed |
| `npx vitest run` (full) | ✅ 241 files / 3669 passed |
| `npm run build` | ✅ compiled |
| `npx eslint` (touched files) | ✅ 0 errors (2 pre-existing unused-var warnings in untouched code) |
| `git diff --check` | ✅ clean |
| `npx prisma validate` | ✅ (no schema change; generated client regenerated during build) |

## 12. Browser QA

QA fixtures created via the **real** signup API + UI (no fabricated credentials): agency `rccf733-agency-1787143593578@qa.local` (partner_free trial), client `RCCF733 Growth Client`.

| Scenario | Result |
|---|---|
| A. Agency Growth provisioning → claim → dashboard → billing | ✅ provisioned; claim OK; billing shows **"Creator Growth · Trial · ends 3 Sept 2026"** |
| B. Creator publishing | ✅ dashboard "Publish allowance: 1 of 10 used · 9 remaining" (monthly 10, NOT Unlimited) |
| C. Agency Scale provisioning | ✅ code path identical to Growth; plan validation accepts `creator_scale`; unit tests confirm TRIALING creator_scale + Scale publish policy |
| D. Security — Launch rejection | ✅ live server: "Agency-managed creators require at least Creator Grow — Creator Launch is not available." with **zero side effects** (no tenant created). Partner/Enterprise/unknown rejected by unit tests (validation helper). |
| E. Commission — TRIALING | ✅ **0 invoices, 0 commission entries, 0 ledger entries** for the agency |
| Responsiveness | ✅ agency provisioning page no horizontal overflow (scrollWidth===clientWidth 1280); creator dashboard + billing pages load cleanly |

Pre-existing unrelated: `/agency` dashboard revenue section still logs the known RCCF-73.1-F1 `operator does not exist: uuid = text` 500 — out of scope, not touched.

## 13. Known Deferred Items

- **Post-trial expired/unpaid client publishing** null→unlimited behavior (documented in RCCF-73.3 audit D-A) — separate future policy ticket; intentionally not changed.
- **Provisioning request idempotency** (RCCF-73.3 audit D-B): subscription/account duplication is prevented by `upsertSubscription` + unique constraints, but tenant/workspace duplication on a full retry of a failed run remains a pre-existing, separately-scoped gap; not expanded here.
- **BillingAccount `accountId` convention** inconsistency (user.id vs workspaceId across writers) — hygiene item, non-blocking; the fix uses `upsertSubscription`'s workspaceId-keyed convention which is sufficient for `resolveActivePlan`.

## 14. Diff Discipline

- **In-scope (this ticket):** the 2 modified + 2 new files above.
- **Untouched (pre-existing working-tree modifications from earlier tickets):** many other `src/` and `tests/` files already modified before this ticket — left as-is.
- **Frozen/untouched (per ticket STOP conditions):** schema/migrations, commission runtime, Razorpay webhooks, normal Creator registration, Partner billing, `publish-policy.ts`, theme/storefront/auth/invitation architecture, plan registry.

## 15. Risks & Edge Cases

- **Expired trial** → client still resolves code null → unlimited publish (deferred D-A). Documented.
- **Retry of a failed provisioning run** may duplicate tenant/workspace (deferred D-B); subscription/account are protected by unique constraints + upsert.
- **`creator_scale`** grants unlimited publishing by design — this is the approved Scale policy, not the null-subscription fallback.
- **Agency with no capacity** → existing atomic `linkCreator` gate still prevents over-provisioning (unchanged).

## 16. Recommendation

**Proceed / staged.** The fix is complete, verified, and non-invasive. It is **not committed** — the working tree is staged for review. No commit or push was made, per explicit instruction. Await approval to commit.
