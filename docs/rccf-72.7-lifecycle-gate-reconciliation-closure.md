# RCCF-72.7 — Lifecycle Gate Backfill + Resolver Reconciliation (Closure)

**Status:** Complete — implemented, verified, committed (`b78f404`)
**Date:** 2026-08-18
**Predecessors:** RCCF-72.6 (F2 root-cause audit — CONFIRMED). Fixes F2 (creator workspace-owner admin crash).

---

## 1. Root cause

Tenant **B** (`66941948-7f71-461d-aa26-db86598c945a`, provisioned pre-RCCF-72.0) had a Website but **no `onboarding_completed` Setting**. `requireTenant()` used the DB lifecycle resolver (`src/lib/lifecycle/service.ts`), which keyed onboarding off the Setting alone → state **ONBOARDING** → `redirect("/onboarding")`. The middleware used the token resolver (`src/lib/lifecycle/token-resolver.ts`), which returns **READY** for any ADMIN with a tenantId → bounced `/onboarding → /admin/dashboard`. The disagreement produced a redirect loop that crashed the App Router in dev ("Rendered more hooks than during the previous render") and left every `requireTenant()` admin page unreachable.

Not a workspace bug, not a billing bug, not a React hook bug (all three QA tenants are workspace owners; only B lacks the Setting).

---

## 2. Backfill before / after

Script: `scripts/backfill-onboarding-completed.ts` (supports `--dry-run` default and `--apply`). Also exposed as `npm run backfill:onboarding-completed`.

**DRY-RUN (before):** 28 tenants with a Website; **5 missing `onboarding_completed`**:

| tenantId | websiteId | lifecycle | plan | active |
|---|---|---|---|---|
| `16b53196-…` | `05ec7802-…` | PUBLISHED | creator_launch (TRIALING) | true |
| `2e015115-…` | `c84f6fad-…` | PUBLISHED | creator_launch (TRIALING) | true |
| `edc665f6-…` | `d4a9f27d-…` | PUBLISHED | creator_launch (TRIALING) | true |
| `b4190e34-…` | `34ac18b2-…` | READY | creator_launch (TRIALING) | true |
| `66941948-…` (B) | `eeabc8b5-…` | PUBLISHED | creator_grow (ACTIVE) | true |

**APPLY (after):** `scannedTenants=28, withWebsite=28, missingSetting=5, written=5, skippedHasSetting=23, skippedNoAdmin=0, remaining drift=0`. Verified B's Setting row exists. Idempotent by construction (upsert guarded by an existence check; re-run writes 0).

Only the `Setting` table was written. No Subscription / BillingSubscription / Website / Theme / content / capabilities / user / workspace rows changed.

---

## 3. Exact files changed (committed in `b78f404`)

| File | Change |
|---|---|
| `src/lib/lifecycle/service.ts` | DB resolver: `hasOnboardingCompleted = !!onboardingSetting \|\| !!websiteWithStatus` |
| `src/lib/lifecycle/backfill.ts` (new) | `backfillOnboardingCompleted()` + `findLifecycleDrift()` — idempotent, tenant-scoped, testable |
| `scripts/backfill-onboarding-completed.ts` (new) | Dry-run report (count, tenant IDs, website IDs, lifecycle, plan, active) + apply |
| `package.json` | Added `backfill:onboarding-completed` script |
| `tests/unit/lifecycle.test.ts` | Replaced the buggy-behavior test with the corrected expectation |
| `tests/unit/rccf72-7-lifecycle-gate-reconciliation.test.ts` (new) | 20 focused tests |

Note: an earlier, never-committed `scripts/backfill-onboarding-complete.ts` (RCCF-70.6.6, superseded) remains untracked in the working tree; it was never run (which is why B stayed broken). It is intentionally not part of this commit.

---

## 4. Lifecycle semantics (before → after)

| Scenario | Setting | Website | DB resolver BEFORE | DB resolver AFTER | Gate |
|---|---|---|---|---|---|
| Fresh new tenant | ✗ | ✗ | ONBOARDING | **ONBOARDING** | preserved → `/onboarding` |
| Provisioning tenant | ✓ | ✗ | PROVISIONING | **PROVISIONING** | preserved (no redirect) |
| Legacy tenant (F2) | ✗ | ✓ | ONBOARDING ❌ | **READY / PUBLISHED** | fixed — no trap |
| Normal tenant | ✓ | ✓ | READY / PUBLISHED | **READY / PUBLISHED** | unchanged |
| Published legacy | ✗ | ✓ live | ONBOARDING ❌ | **PUBLISHED** | fixed |

The token resolver (`resolveFromToken`) already returned READY for any ADMIN with a tenantId; the DB resolver now agrees for every tenant that has a Website. The middleware and `requireTenant` can no longer disagree for a Website tenant.

---

## 5. Tests

- **New focused suite** (`tests/unit/rccf72-7-lifecycle-gate-reconciliation.test.ts`, 20 tests): Website+Setting → READY/PUBLISHED; Website+missing Setting → READY/PUBLISHED (F2 case); no Website+no Setting → ONBOARDING (gate); Setting+no Website → PROVISIONING; token/DB agreement (Website tenant, fresh tenant, provisioning tenant); backfill idempotency; existing tenants skipped (no upsert); dry-run writes nothing; Setting shape matches `markOnboardingComplete`; no-ADMIN skip; `findLifecycleDrift` reporting; plan resolution unchanged (getPlan); capability resolution unchanged (`capabilityService`).
- **Updated** `tests/unit/lifecycle.test.ts`: `requireTenant` now returns a session for Website + missing Setting (was: redirect).
- **Full unit suite:** `vitest run` → **237 files / 3597 tests pass** (the lone prior run's `rccf68` flake passed in isolation and in the final full run).

---

## 6. Browser results (all 32 Creator admin routes, JS on, hard refresh)

| Account | PASS | LOCKED | FAIL | Notes |
|---|---|---|---|---|
| Launch A | 29 | 3 (appearance, domain, integrations) | 0 | correct capability gates |
| **Growth B** | **30** | 2 (domain, integrations) | **0** | **F2 FIXED** — dashboard 2985 chars (full), all content pages render, no crash/redirect/shell |
| Scale C | 32 | 0 | 0 | full access incl. integrations |

- No `Rendered more hooks`, no `/onboarding` bounce, no dashboard shell-only state on any route.
- `LOCKED` rows are the intended capability upgrade panels (Launch lacks advanced_builder/custom_domain/api_access; Growth lacks custom_domain/api_access).
- Browser-verified on the live dev server after both the backfill and the resolver change were in place.

---

## 7. Fresh-tenant regression

A brand-new account was created via the real `POST /api/auth/register` (role ADMIN, `tenantId: null`):

1. **Before provisioning:** login lands on **`/onboarding`**; navigating to `/admin/dashboard` redirects to **`/onboarding`** — the new-user gate is intact (no Website, no Setting ⇒ ONBOARDING).
2. **After provisioning** (minimal Tenant + Website + `onboarding_completed` Setting created, user linked): login lands on **`/admin/dashboard`** (full content, no page errors); `/admin/orders` and `/admin/messages` render normally.

The legacy fix does **not** weaken the new-user onboarding gate. (The test created two orphaned pre-provision users and one provisioned test tenant `cbe0b98f-…` / `rccf727-fresh-…`.)

---

## 8. Launch / Growth / Scale regression

- **Launch A:** all routes PASS; appearance/domain/integrations correctly LOCKED.
- **Growth B:** all routes PASS; domain/integrations correctly LOCKED; publish quota (6/10) and Growth capability grants unchanged (nav shows Courses/Bookings/Games; hides Domain/Integrations).
- **Scale C:** all 32 routes PASS, including Integrations (YouTube/Instagram UI).

Plan resolution (B via legacy `Subscription` fallback → `creator_grow`) and capability enforcement are unchanged — verified by the `getPlan`/`capabilityService` tests and by browser-observed nav/gating.

---

## 9. Security analysis

- **No privilege escalation / no cross-tenant exposure.** The change only *relaxes* the DB lifecycle gate up to the level the token-based middleware already applied (a Website tenant is de-facto onboarded). It never grants access to a tenant without a Website, and all content/action gates (tenant-scoped, capability-gated) are untouched.
- **New-user gate preserved:** fresh tenants (no Website, no Setting) still resolve ONBOARDING and are redirected to `/onboarding` (browser-proven).
- **Lifecycle authority now single-sourced** for Website tenants — the two resolvers agree, eliminating the redirect-loop class and future silent access drift.
- No secrets/config touched; `.env*` remain gitignored and unstaged.

---

## 10. Remaining findings

- **Fixed this ticket:** F2 (creator admin redirect-loop crash) — data backfill + resolver reconciliation.
- **Superseded/untracked:** `scripts/backfill-onboarding-complete.ts` (RCCF-70.6.6) — never run; functionally replaced by `backfill-onboarding-completed.ts`.
- **Out of scope / carried (untouched):** F1 (course/service write UX), S1–S9 (72.2), N1/N2 (72.4), N5–N12 (72.5), and the 72.7-recommended-but-optional data-integrity alert (covered here by `findLifecycleDrift` + tests instead of production polling, per the "no noisy polling" constraint).
- **Dev environment:** S9 latency remains (dev server restarted once during QA; not related to this fix).

---

## STOP — final verdict block

```
RCCF-72.7 STATUS:   COMPLETE (committed b78f404)
BACKFILL:           dry-run reported 5 tenants missing onboarding_completed (incl. B);
                    applied — 5 written, remaining drift 0; idempotent; Setting-only.
LIFECYCLE FIX:      src/lib/lifecycle/service.ts — hasOnboardingCompleted =
                    setting || website; fresh/provisioning tenants unchanged.
32-ROUTE RESULT:    A: 29 PASS + 3 LOCKED · B: 30 PASS + 2 LOCKED (F2 FIXED) · C: 32 PASS.
FRESH-TENANT RESULT: pre-provision → /onboarding (gate intact);
                    post-provision → /admin/dashboard + orders/messages render.
LAUNCH:             29 PASS / 3 LOCKED (appearance, domain, integrations) — expected gates.
GROWTH:             30 PASS / 2 LOCKED (domain, integrations) — F2 resolved, quota intact.
SCALE:              32 PASS (full access).
TESTS:              vitest 3597 pass (237 files); 20 new RCCF-72.7 + 1 updated lifecycle test.
BUILD:              npm run build OK; npx tsc --noEmit OK; eslint clean; git diff --check clean.
VERDICT:            F2 root cause resolved. Single lifecycle model restored for Website
                    tenants; new-user onboarding gate proven intact; no plan/capability/
                    auth/billing changes; no unrelated files committed.
```
