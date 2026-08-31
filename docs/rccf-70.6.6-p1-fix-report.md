# RCCF-70.6.6 — P1 Fix Report

**Ticket:** RCCF-70.6.6 — Fresh Creator Login Loops Back to `/admin/login` After Build Manually Onboarding
**Type:** P1 — verified fix implementation (audit: `docs/rccf-70.6.6-fresh-creator-login-session-audit.md`)
**Status:** IMPLEMENTED + VERIFIED
**Date:** 2026-08-17

---

## 1. Root Cause

`createManualWebsite()` in `src/actions/onboarding.actions.ts` provisioned the
Tenant + Website + Workspace and published successfully, but **never called
`markOnboardingComplete(tenantId)`**. The DB-backed `requireTenant`
(`src/lib/auth/require-tenant.ts`) resolves lifecycle state through
`lifecycleService.resolve` (`src/lib/lifecycle/service.ts:44-67`), which treats
the `Setting { tenantId, key: "onboarding_completed" }` row as the **only**
source of truth for `hasOnboardingCompleted`. Without it the creator stays in
`ONBOARDING` even though a Website exists, and a fresh login bounces:

```
/admin/login  →  /admin/dashboard
  → requireTenant()  →  missing Setting  →  /onboarding
  → middleware (token-only READY)  →  /admin/dashboard
  → requireTenant()  →  ... infinite redirect loop
```

Signup sessions masked the bug because the Build-Manually flow navigates to
`/builder`, which never calls `requireTenant`; fresh logins are forced through
`/admin/dashboard`, which always does.

This was the **only** creator provisioning entry point missing the call — every
other path (`runCreatorGeneration`, `acquire.actions.ts:168`,
`provision.actions.ts:109`, `super-admin-provision.actions.ts:190`) already
invoked `markOnboardingComplete`.

---

## 2. Files Changed

| File | Change |
|---|---|
| `src/actions/onboarding.actions.ts` | **Fix A.** Added `markOnboardingComplete(tenantId)` (best-effort `try/catch` + `captureError`) inside `createManualWebsite` immediately after `applyBlueprintToWebsite` succeeds, mirroring `runCreatorGeneration:617-627` and the VALIDATION-03 pattern. |
| `scripts/backfill-onboarding-complete.ts` | **Fix B (new).** Idempotent one-time backfill for historic Build-Manually creators. |
| `package.json` | Added `backfill:onboarding-complete` npm script entry. |
| `tests/unit/rccf70-6-6-create-manual-website-onboarding.test.ts` | **New.** Unit regression tests for `createManualWebsite`. |
| `tests/unit/rccf70-6-6-provisioning-onboarding-contract.test.ts` | **New.** Contract test asserting all creator provisioning paths call `markOnboardingComplete`. |
| `tests/unit/lifecycle.test.ts` | Added the missing lifecycle case: ADMIN + tenantId + Website + **no** `onboarding_completed` Setting → redirect `/onboarding`. |

---

## 3. The Fix (source)

```ts
// src/actions/onboarding.actions.ts — createManualWebsite(), after:
//   const applied = await applyBlueprintToWebsite(...);
//   if (!applied.success) return applied;

// RCCF-70.6.6: every creator provisioning path must mark onboarding complete
// so the DB-backed requireTenant (lib/lifecycle/service.ts) enters READY for
// the new tenant. ...
try {
  await markOnboardingComplete(tenantId);
} catch (error) {
  captureError(error, {
    service: "onboarding-actions",
    operation: "createManualWebsite-markOnboardingComplete",
    tenantId,
  });
}

return { success: true, tenantId, websiteId };
```

`markOnboardingComplete` is already idempotent (`prisma.setting.upsert`, value
`{ completedAt }`). `tenantId` is derived from the authenticated server session
or the canonical `provisioningService.provision` result — never from the client
(`createManualWebsite` accepts no arguments).

---

## 4. Backfill Behavior

`npm run backfill:onboarding-complete` (`scripts/backfill-onboarding-complete.ts`):

1. Finds every tenant that has a `Website` row.
2. For each, skips if a `Setting { key: "onboarding_completed" }` already exists.
3. Requires a `User` with `role === "ADMIN"` whose `tenantId === T`; skips tenants
   without an ADMIN owner (never touches agency/self-serve non-creator tenants).
4. Writes **exactly the same Setting** that `markOnboardingComplete` writes
   (`prisma.setting.upsert`, value `{ completedAt: new Date().toISOString() }`).

**Guarantees:**
- Idempotent — safe to run multiple times; re-runs only skip/update.
- Only `Setting` rows are written. No `User`, `Tenant`, `Website`, `Workspace`,
  schema, or migration modification.
- Run once post-deploy to recover historic Build-Manually creators.

---

## 5. Tests

All new tests pass; full suite passes.

### `tests/unit/rccf70-6-6-create-manual-website-onboarding.test.ts` (6 tests)
- Success (fresh provision) writes `onboarding_completed` Setting via
  `prisma.setting.upsert` with `tenantId_key { tenantId, "onboarding_completed" }`.
- Provisioning failure (empty result) does **not** write the Setting.
- Provisioning throw does **not** write the Setting.
- Blueprint failure does **not** write the Setting.
- Already-provisioned tenant path re-entry stays idempotent (upsert, no `Tenant #2`).
- `tenantId` always derives from the server session, not a client-supplied value.

### `tests/unit/lifecycle.test.ts` (added case)
- ADMIN + tenantId + Website + **missing** Setting → `requireTenant` redirects to
  `/onboarding` (the loop's first leg). Complements the existing positive case
  (Setting present → returns TenantSession).

### `tests/unit/rccf70-6-6-provisioning-onboarding-contract.test.ts` (3 tests)
- `onboarding.actions.ts`, `acquire.actions.ts`, `provision.actions.ts`,
  `super-admin-provision.actions.ts` each invoke `markOnboardingComplete`.
- `createManualWebsite` calls `markOnboardingComplete` **after**
  `applyBlueprintToWebsite`.
- `acquire.actions.ts` only marks onboarding complete on publish success.

---

## 6. Verification

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ no errors |
| Unit tests (targeted) | `npx vitest run tests/unit/rccf70-6-6-create-manual-website-onboarding.test.ts tests/unit/rccf70-6-6-provisioning-onboarding-contract.test.ts tests/unit/lifecycle.test.ts` | ✅ 3 files / 37 tests passed |
| Full test suite | `npx vitest run` | ✅ 221 files / 3318 tests passed |
| Production build | `npm run build` (prisma generate + next build) | ✅ compiled + 160 static pages |
| Schema | `npx prisma validate` | ✅ valid |
| Lint (touched files) | `npx eslint ...` | ✅ 0 errors (1 pre-existing `logger` unused warning, unchanged) |
| Whitespace | `git diff --check` | ✅ clean |

**Note on the rccf68 timeout:** during the first full-suite run the
`rccf68-retry-catalog-timeout.test.ts` "reuses existing tenant" test hit its
5000 ms timeout under load. It passes in isolation both with and without this
change (verified via `git stash`), and the full suite passed on re-run. It is a
pre-existing flaky timeout unrelated to RCCF-70.6.6.

---

## 7. Security / Architecture Preservation

Frozen files (mission rules) — **not modified**:

- `src/lib/auth.ts` (NextAuth config, `authorize`, JWT/session callbacks)
- `src/lib/auth/require-tenant.ts` (DB-backed boundary — unchanged semantics)
- `src/lib/lifecycle/token-resolver.ts` (middleware token-only READY — untouched)
- `src/lib/lifecycle/service.ts` (DB resolver — untouched)
- `src/middleware.ts` (rate-limit, redirect orchestration, security headers)
- `src/app/api/auth/refresh-session/route.ts`, `src/app/api/auth/register/route.ts`
- `src/components/admin/LoginForm.tsx`, `src/app/admin/login/page.tsx`
- `src/app/admin/dashboard/page.tsx`, `src/app/builder/*`
- `src/actions/create.actions.ts` (`applyBlueprintToWebsite` untouched)
- Provisioning service, Prisma schema, migrations, billing, capabilities, Builder UI

Preserved invariants:

- **No auth bypass / no new auth path / no test-only auth.** The fix is DB-side only.
- **No middleware weakening.** Prisma stays out of the Edge bundle.
- **No client tenantId authority.** `createManualWebsite()` takes no arguments;
  tenantId comes from session/provisioning result only.
- **`requireTenant` still enforces the lifecycle contract.** Absence of the Setting
  still means ONBOARDING for genuine non-provisioned users; the fix writes the
  Setting on the previously-broken success path.
- **No schema / migration change.** The backfill writes only a `Setting` row.

---

## 8. Manual Verification Steps

1. **New creator, Build Manually:** sign up → onboarding → **Build Manually** →
   provisioning + publish → `router.replace("/admin/dashboard")`. Confirm the
   dashboard renders (no redirect loop).
2. **Fresh login (regression):** log out → log in again at `/admin/login`.
   Confirm the session is established and `/admin/dashboard` renders directly
   (no bounce to `/onboarding`).
3. **`/builder` still works** after the fix for a fresh-creator session.
4. **Backfill dry sense:** run `npm run backfill:onboarding-complete`. Confirm it
   reports `N written, M skipped`; the DB now has
   `Setting { tenantId, key: "onboarding_completed", value: { completedAt } }`
   for every Build-Manually creator tenant with an ADMIN owner. Re-run — output
   is stable (idempotent).
5. **Agency / AI-import / super-admin flows unaffected:** regression-check a
   super-admin `provisionCreator` and an agency provisioning run — both already
   called `markOnboardingComplete` and are untouched.

---

RCCF-70.6.6 implementation complete. Verdict: FIXED — one-line semantic fix
(`markOnboardingComplete` added to `createManualWebsite`) plus idempotent data
backfill and class-regression contract tests; all frozen auth/middleware/schema
files untouched; full verification gate green.