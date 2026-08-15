# RCCF-70.4 — Forensic Audit: Onboarding + Publish failures (`PlanUsage` table does not exist)

**Type:** Read-only forensic audit (no code/schema/migration/DB/UI changes made).
**Date:** 2026-08-15
**Status:** Complete. Root cause identified as a **migration deployment gap**, not a code defect.

---

## 1. Verdict

Both reported incidents share **one root cause**: the Prisma migration
`20260815000000_plan_usage` — which creates the `PlanUsage` table — is **committed to
the repo but was never applied to the production database**. Every publish for a
metered plan (Launch `lifetime/3`, Grow `monthly/10`) executes
`tx.planUsage.updateMany` inside the publish transaction and throws
**P2021: "The table `public.PlanUsage` does not exist in the current database."**

The code, schema, and migration are correct and mutually consistent. The missing
table is a deployment artifact, not a stale-model / code bug. **Smallest remediation
is an infrastructure action**: run `npx prisma migrate deploy` against `DIRECT_URL`
in production (apply the pending committed migrations, including
`20260815000000_plan_usage`).

---

## 2. Incident A — New creator onboarding failure (Instagram link, FREE/LAUNCH)

**Reported:** new creator on FREE/LAUNCH tier, Instagram profile link; onboarding
publish step failed; error screen shown; button behavior inconsistent ("Go to
Dashboard" vs "Retry Publishing").

**Mechanism (code-verified):**

1. `src/app/onboarding/page.tsx` → `runCreatorGeneration(sourceUrl, ...)`
   (`src/actions/onboarding.actions.ts:265`).
2. Instagram → `detectPlatform("...instagram.com/...")` returns `"instagram"`
   (see §4 for causality ruling).
3. Provisioning succeeds — `buildProvisioningInput({ planCode: "creator_launch", ... })`
   (`onboarding.actions.ts:484-495`) → tenant/website/workspace created.
4. `publishingService.publish(provisioned.tenantId)` (`onboarding.actions.ts:600`).
   - `resolvePublishPolicy("creator_launch")` → `{ mode: "lifetime", limit: 3 }`
     (non-unlimited, `publish-policy.ts:22`).
   - Publish transaction calls `planUsageRepository.reserveSlot(tx, …)`
     (`publishing/service.ts:359` → `plan-usage-repository.ts:44` `tx.planUsage.updateMany`).
   - Production DB has **no `PlanUsage` table** → Prisma throws **P2021**.
5. Caught in `runCreatorGeneration` (`onboarding.actions.ts:604-615`) → returns
   `{ success: false, error: "The table `public.PlanUsage` does not exist...",
   retryable: true, tenantId }`.
6. Client (`page.tsx:343-347`): `res.retryable && res.tenantId` → `setRetryInfo({ tenantId })`,
   `setError(...)`, error step rendered with **"Retry Publishing"** + **"Go to Dashboard"**.

**Button behavior (§7):**

- `handleRetryPublish` (`page.tsx:394`) → `retryPublish(tenantId)`
  (`onboarding.actions.ts:837`) → `publishingService.publish(tenantId)`. This
  succeeds **only after** the `PlanUsage` migration is applied.
- `handleGoToDashboard` (`page.tsx:414`) → `markOnboardingComplete(tenantId)`
  (upserts `onboarding_completed` Setting — **Setting table exists, so this works**)
  → `refresh-session` → `router.replace("/admin/dashboard")`.
- `requireTenant()` (`src/lib/auth/require-tenant.ts:40`) then sees
  `hasOnboardingCompleted=true` → dashboard loads.

Under the pure PlanUsage-missing state, the code-level prediction is that **"Go to
Dashboard" works** and **"Retry Publishing" fails** (same P2021). The reported
opposite therefore indicates **timing**: the migration was applied between the first
publish failure and the retry click (or the incidents are from different deployment
states). A **secondary dead-end bug** exists independent of this root cause: the
**non-retryable** error screen's "Go to Dashboard instead" (`page.tsx:778`) calls
`router.push("/admin/dashboard")` with **no refresh-session and no
markOnboardingComplete** — if provisioning had failed before `user.tenantId` was
set, this bounces back to `/onboarding` (loop). That is not this incident's cause but
is documented in §12 as optional hardening.

---

## 3. Incident B — Builder publish error

**Reported:** Builder → Publish throws
`The table `public.PlanUsage` does not exist in the current database.`

**Mechanism (code-verified):**

1. `src/actions/publish.actions.ts` `publishWebsite()` → `publishingService.publish(tenantId)`.
2. `publishing/service.ts:271` resolves the publish policy; for Launch/Grow
   (`mode: "lifetime"` / `"monthly"`) the flow is **not** `unlimited` (`service.ts:352`).
3. `commitPublishWithMetering` computes the period
   (`computePublishPeriod`, `publish-period.ts`) and calls
   `planUsageRepository.reserveSlot(tx, ...)` (`service.ts:359`) **inside the same
   transaction that writes the PublishedSnapshot** (`service.ts` transaction block).
4. `reserveSlot` → `tx.planUsage.updateMany(...)` (`plan-usage-repository.ts:44`)
   → **P2021** because the table does not exist in the production database.
5. Error surfaces as the reported message. No graceful fallback — the publish fails.

This is the same single failure chain as Incident A; the builder is just a different
entry point into `publishingService.publish`.

---

## 4. Instagram causality — ruled out

- `detectPlatform` maps `instagram.com` → `"instagram"`.
- `InstagramAdapter` (`src/lib/generation/acquisition/adapters/instagram.ts`) is
  **deterministic profile-normalization** only — no scraping, no fabricated values,
  and its capability flags are effectively all false. It never touches billing/publish.
- Instagram is **not** registered as an import-provider card in
  `import-provider/providers.ts`, but the acquisition engine handles it via
  `getAdapterForUrl`.
- Instagram and YouTube both converge on `runCreatorGeneration` → the **same**
  `publishingService.publish` → the **same** PlanUsage P2021.

**Conclusion:** the Instagram link is incidental. Every metered-plan onboarding
publish would have failed identically regardless of source platform while the
migration is missing.

---

## 5. Launch plan (FREE/LAUNCH) and quota wiring

- `src/config/commerce/plans.ts`: `creator_launch` price 0, `trialDays: 15`.
- `src/lib/publishing/publish-policy.ts:21-26`:
  - `creator_launch` → `{ mode: "lifetime", limit: 3 }` → **touches PlanUsage on every publish**
  - `creator_grow` → `{ mode: "monthly", limit: 10 }` → **touches PlanUsage**
  - `creator_scale` / `creator_enterprise` → `{ mode: "unlimited", limit: null }` → **skips PlanUsage**
- Onboarding provisioning hardcodes `planCode: "creator_launch"`
  (`onboarding.actions.ts:491`), so a brand-new FREE user is always on the
  PlanUsage-touching path.
- `resolveActivePlan` (`plan-source.ts`): v2 `BillingSubscription` → `BillingPlan`
  first, legacy fallback, else `creator_launch`. A new FREE user has no v2
  subscription, so they resolve to `creator_launch` (lifetime/3).

---

## 6. Redirect path (how the error screen / dashboard behave)

- Onboarding error screen with `retryInfo` (`page.tsx:720-762`): primary button
  "Retry Publishing", secondary "Go to Dashboard".
- `handleGoToDashboard` (`page.tsx:414`): `markOnboardingComplete` (best-effort,
  never throws) → `fetch("/api/auth/refresh-session", POST)` (best-effort) →
  `router.replace("/admin/dashboard")`.
- `handleRetryPublish` (`page.tsx:394`): `retryPublish(tenantId)` → on success
  `refresh-session` → `router.replace("/admin/dashboard")`.
- Dashboard access gate (`require-tenant.ts:40`): requires the `onboarding_completed`
  Setting in DB (`lifecycle/service.ts:43-47`), which `markOnboardingComplete`
  upserts. The middleware token-resolver (`token-resolver.ts:18-22`) allows
  `/admin/dashboard` for state READY/EDITING/PUBLISHED and redirects to `/onboarding`
  otherwise.

So with the migration applied, both buttons land on the dashboard; the observed
"Retry works / Go to Dashboard fails" is consistent with the migration being applied
between the initial failure and the retry (timing), not with a PlanUsage-specific
block on the dashboard path.

---

## 7. Retry path

- `retryPublish` (`onboarding.actions.ts:837-851`): requires server session, then calls
  `publishingService.publish(tenantId)` directly. No re-provisioning, no idempotent
  reuse (that is the **uncommitted** working-tree RCCF-68.2 change — see §12).
- It succeeds only when the `PlanUsage` table exists (or the plan is unlimited).
  Under the deployment gap it fails with the same P2021, leaving the user on the
  error screen.

---

## 8. Migration / database state (the root cause)

- **Model:** `model PlanUsage` committed at `prisma/schema.prisma:1951-1963`
  (id, tenantId, featureKey, periodStart, periodEnd?, used, createdAt, updatedAt;
  `@@unique([tenantId, featureKey, periodStart])`, `@@index([tenantId, featureKey])`).
- **Migration:** `prisma/migrations/20260815000000_plan_usage/migration.sql`
  (CREATE TABLE + unique index + index) is present and **committed**
  (commit `eec30d6`, `git ls-files` shows it tracked).
- **Client:** `src/modules/billing/infrastructure/plan-usage-repository.ts` queries
  `tx.planUsage` / `client.planUsage` — generated client knows the model, so it
  reaches the DB and fails only because the physical table is absent.
- **Deployment evidence:**
  - `docs/launch-checklist.md:69` — "Apply `20260807000000_scale_hardening_indexes`
    + `_billing_plan_marketing` + `_pricing_runtime` migrations on `DIRECT_URL`" is
    **unchecked**; `:73` "Run `prisma migrate deploy`, ..." is **unchecked**.
  - `docs/production-readiness-final.md:39-44` — `DIRECT_URL` set in Vercel env and
    `prisma migrate deploy` items are **unchecked**.
  - RCCF-68.2 previously reported the migration deploy was DB-blocked (P1001).
  - `docs/runbooks/Database-Migrations.md:63` and `docs/runbooks/Deploy.md:42`
    require `npx prisma migrate deploy` as part of every production deploy.
  - `prisma.config.ts` prefers `DIRECT_URL || DATABASE_URL` for the CLI/migrate
    connection (direct 5432), so `prisma migrate deploy` is the correct apply path.
- **Conclusion:** production DB predates `20260815000000_plan_usage` (and the later
  committed migrations). The table was never created there. This is a **deployment
  gap**, not a schema/code inconsistency.

---

## 9. Test coverage

- `tests/unit/rccf68-retry-catalog-timeout.test.ts` covers `runCreatorGeneration`
  retry/idempotency paths (existing-tenant reuse, retry after catalog timeout).
- No unit test can catch a production deployment gap (the P2021 only occurs when the
  physical table is absent while the client expects it). No test asserts
  "PlanUsage table exists in prod" — that is a deploy/CI concern.
- Existing suite: `npx tsc --noEmit` clean; `npm run build` passes; 29 pre-existing
  baseline test failures unrelated to this audit.

---

## 10. Required regression checks (post-fix)

After applying the migration to production, verify:

1. Builder **Publish** on Launch (`creator_launch`) — succeeds; `PlanUsage` row
   created for the lifetime window.
2. Launch **3rd publish** — correctly rejected with `PUBLISH_QUOTA_EXCEEDED`
   (reserveSlot returns false when `used >= limit`).
3. Grow (`creator_grow`) monthly window — quota counted per calendar month.
4. Scale / Enterprise publish — succeeds and **does not** touch PlanUsage.
5. Onboarding (Instagram + YouTube + manual) on FREE/LAUNCH — publish completes,
   `onboarding_completed` set, both "Go to Dashboard" and "Retry Publishing" land on
   the dashboard.
6. `StorefrontStatusCard` usage meter renders (reads `getPublishUsage`).

---

## 11. Remediation (smallest, safe, infra-only)

1. **Apply the pending committed migrations to production** via the direct connection:
   `npx prisma migrate deploy` (prisma.config.ts already prefers `DIRECT_URL`).
   This creates `PlanUsage` (and brings `20260815000001..07`,
   `20260816000001` into sync). **No code change is required** to fix the P2021.
2. Confirm via `prisma migrate status` that `20260815000000_plan_usage` is applied.
3. Check off `docs/launch-checklist.md:69,73` and `docs/production-readiness-final.md`
   items after deploy.
4. Optional hardening (not required for the fix, documented in §12).

---

## 12. Files that would change

**Required:** none (infrastructure action only).

**Optional hardening (would touch code — NOT performed, NOT required for the fix):**

- `src/app/onboarding/page.tsx:778` — non-retryable "Go to Dashboard instead" should
  call `markOnboardingComplete` + `refresh-session` before navigating, to avoid the
  `/onboarding` bounce loop when provisioning failed before `tenantId` was set.
- `src/actions/onboarding.actions.ts` — commit the already-written RCCF-68.2
  idempotent retry (existing-tenant reuse, no Tenant/Website/Workspace #2). It is
  currently **uncommitted** in the working tree and is orthogonal to the P2021.

---

## 13. Frozen files

- `docs/design/Stitch-DNA.md` — **frozen**. Do not modify. Stitch work is PAUSED
  (MCP error -32001). No Stitch screens were generated or edited for this audit.

---

## 14. Stitch status

- **PAUSED.** All Stitch-related activity remains paused; RCCF-70.3 is not started.
  This audit made no Stitch changes.

---

## 15. Final verdict

- **Single root cause:** production DB is missing the `PlanUsage` table because
  migration `20260815000000_plan_usage` (committed, correct) was **never deployed**.
- Both incidents (onboarding publish failure and builder publish failure) are the
  same failure chain: metered-plan publish → `reserveSlot` → `tx.planUsage` → P2021.
- Instagram is not causal. The FREE/LAUNCH plan legitimately touches PlanUsage
  (lifetime limit 3); Scale/Enterprise (unlimited) never do.
- **Fix = apply migrations (`npx prisma migrate deploy`). No code changes needed.**
- Optional hardening items are documented (§12) and can be scheduled separately.