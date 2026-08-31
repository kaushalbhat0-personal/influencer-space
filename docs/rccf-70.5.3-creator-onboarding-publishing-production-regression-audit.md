# RCCF-70.5.3 — Creator Onboarding & Publishing Production Regression Audit (Read-Only)

**Type:** Read-only forensic regression audit. No code, schema, migration, database, or UI changes made.
**Date:** 2026-08-16
**Scope:** NEW Creator on FREE/LAUNCH tier, Instagram profile URL onboarding → publish failure → "Retry Publishing" → "Go to Dashboard" → Builder → Builder Publish → `P2021: The table public.PlanUsage does not exist in the current database.`
**Status:** Complete. Root cause confirmed as a **migration deployment gap** (consistent with RCCF-70.4). Two secondary state-machine findings surfaced.

---

## 1. Executive verdict

The Builder publish error (`PrismaClientKnownRequestError` / `Invalid prisma.planUsage.updateMany() invocation … The table public.PlanUsage does not exist in the current database.`) is caused by a **production database that never received the committed Prisma migration `20260815000000_plan_usage`** (nor 9 later migrations). This is a **deployment/infrastructure gap, not a code, schema, or plan defect.** RCCF-70.4 (2026-08-15) already established this for onboarding + Builder publish; this audit re-confirms it against the current incident and additionally traces the dashboard/retry navigation behavior.

Every publish for a metered plan (Launch `lifetime/3`, Grow `monthly/10`) executes `tx.planUsage.updateMany` inside the publish transaction and throws P2021 while the table is absent. The FREE/LAUNCH onboarding publish is on this path, so **a brand-new creator cannot complete onboarding publish until the migration is applied.** The system is NOT safe to proceed to Stitch until the migrations are deployed to production (see §14, §18).

---

## 2. Exact root cause

`src/modules/billing/infrastructure/plan-usage-repository.ts:44` `reserveSlot()` calls `tx.planUsage.updateMany(...)`. The `PlanUsage` model exists in `prisma/schema.prisma` and the creation migration is committed, but the physical table was never created in production. Prisma's generated client therefore fails at execution time with **P2021**.

Chain (code-verified):

1. `src/app/onboarding/page.tsx` → `runCreatorGeneration(...)` (`src/actions/onboarding.actions.ts`).
2. Instagram URL → `detectPlatform` → `"instagram"`; acquisition normalizes the profile (non-causal, RCCF-70.4 §4).
3. Provisioning succeeds → tenant, website, workspace, `creator_launch` plan + subscription linkage (RCCF-07) created (`provisioning-service.ts:231-300`).
4. Auto-publish `publishingService.publish(provisioned.tenantId)` (`onboarding.actions.ts:600`):
   - `resolveActivePlan(undefined, tenantId)` → linked `BillingSubscription` (creator_launch, TRIALING) → code `creator_launch` (`plan-source.ts`).
   - `resolvePublishPolicy("creator_launch")` → `{ mode: "lifetime", limit: 3 }` — NOT unlimited (`publish-policy.ts:22`).
   - `commitPublishWithMetering` → `planUsageRepository.reserveSlot(tx, …)` (`publishing/service.ts:359`) → `tx.planUsage.updateMany` → **P2021** (table absent).
5. Catch → `{ success: false, error: P2021 message, retryable: true, tenantId }` (`onboarding.actions.ts:604-615`) → client shows the error screen with **Retry Publishing** + **Go to Dashboard** (`page.tsx:343-347, 720-762`).

Builder publish is the identical chain via `src/actions/publish.actions.ts` `publishWebsite()` → `publishingService.publish(tenantId)`.

**Instagram is not causal.** Any metered-plan publish (Launch/Grow) fails identically regardless of source platform while the table is missing.

---

## 3. Failure timeline

| # | Reported observation | Code path | Explanation |
|---|---|---|---|
| 4 | Onboarding publish failed; error screen with Retry Publishing + Go to Dashboard | `publishingService.publish` → `reserveSlot` → `planUsage.updateMany` → P2021 | Direct consequence of missing `PlanUsage` table. |
| 5 | Retry Publishing **succeeded** (returned to admin panel) | `retryPublish(tenantId)` → `publishingService.publish(tenantId)` | **Not reproducible while PlanUsage is absent.** `retryPublish` (`onboarding.actions.ts:837-851`) runs the same metered publish; it can only return success when the table exists (or the plan is unlimited — not the case here). Consistent with the migration having been applied **between** the first failure and this retry (timing / different deployment state), or with the report conflating a middleware-pass with a page-level bounce. See §6/§7 reconciliation. |
| 6 | Go to Dashboard did not navigate correctly | `handleGoToDashboard` (`page.tsx:414-424`): `markOnboardingComplete` → `refresh-session` → `router.replace("/admin/dashboard")` | Navigation depends on (a) the JWT carrying `tenantId` and (b) the `onboarding_completed` Setting existing. Best-effort refresh + best-effort Setting upsert mean a failure leaves the middleware (`resolveFromToken`) or the DB-backed `requireTenant()` to bounce the user back to `/onboarding`. See §7. |
| 7 | Builder was accessible | Middleware token-resolver allows `/builder` for READY/EDITING/PUBLISHED (`token-resolver.ts:36-40`) | Once the token has a `tenantId`, the middleware resolves READY; the Builder page itself has no `requireTenant` gate. |
| 8 | Builder Publish → P2021 | `publishWebsite` → `publishingService.publish` → `reserveSlot` → P2021 | Definitive current-state proof that the `PlanUsage` table is **still absent** in production. |

---

## 4. PlanUsage schema / migration evidence

- **Model:** `model PlanUsage` at `prisma/schema.prisma:1951-1963` — `id, tenantId, featureKey, periodStart, periodEnd?, used, createdAt, updatedAt`, `@@unique([tenantId, featureKey, periodStart])`, `@@index([tenantId, featureKey])`. Model and generated client are correct and consistent.
- **Migration:** `prisma/migrations/20260815000000_plan_usage/migration.sql` present on disk and committed (`git ls-files` → tracked; introduced in `eec30d6`). Body: `CREATE TABLE "PlanUsage"` + unique index + index.
- **Repository:** `src/modules/billing/infrastructure/plan-usage-repository.ts` — `reserveSlot` uses `tx.planUsage.updateMany` (atomic `used < limit` increment, line 44) with a P2002-safe first-create retry; `getUsage` reads via `planUsage.findUnique`. `PUBLISH_FEATURE_KEY = "publish"`.
- **Consumers:** `publishing/service.ts:359` (publish commit), `publish-usage.ts:69` (`getPublishUsage` → dashboard `StorefrontStatusCard` meter), and any other feature-key metering.
- **Verification query (idempotent, safe to run):**
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='PlanUsage';
  SELECT "migration_name" FROM "_prisma_migrations" ORDER BY "finished_at";
  ```

---

## 5. Migration / deployment evidence (the root cause)

- `docs/rccf-70.4-remaining-migrations.sql` (2026-08-15) documents that **production has NO `_prisma_migrations` table** and 10 committed migrations were verified missing via `information_schema`/`pg_indexes` through the pooled endpoint: tables `LoyaltyTier, PlanUsage, AgencyTeamInvitation, AgencyCapacityAddon`; columns `AgencyTenant.offboardedAt, AuditLog.agencyId, Product.commerceMode, Offering.bookable, Booking.offeringId`; constraints `SettlementItem_commissionEntryId_key, AuditLog_agencyId_fkey, AuditLog_one_scope_check, Booking_offeringId_fkey`; and their indexes (incl. both `PlanUsage` indexes).
- `docs/launch-checklist.md:69,73` — "Apply … migrations on `DIRECT_URL`" and "Run `prisma migrate deploy` …" are **unchecked**.
- `docs/production-readiness-final.md:39-44` — `DIRECT_URL` set in Vercel env and `prisma migrate deploy` items are **unchecked**.
- `prisma.config.ts` — CLI/migrate use `DIRECT_URL || DATABASE_URL` (direct Supavisor :5432); runtime uses pooled `DATABASE_URL` (`src/lib/prisma.ts`). So the deploy path is `prisma migrate deploy` against `DIRECT_URL`.
- **No CI/automated migrate exists:** `package.json` `build` = `prisma generate && next build`; `vercel.json` has no build/install migrate hook; `.github/workflows/*` — none exist; `migrate deploy` appears in **no** `.yml`/`.ts`. Migration application is manual-only (also noted in `docs/audit-02-partner-platform.md:189`).
- 70.4 reported `DIRECT_URL:5432` unreachable (P1001) from the dev network — the pooled endpoint worked. Do not treat unreachability as the failure; the table is simply absent regardless of connectivity.
- Today's Builder P2021 (this incident) independently confirms the table is still absent **as of the test date**.

**Conclusion:** the production database predates `20260815000000_plan_usage`; the committed migrations were never applied. This is a deployment gap.

---

## 6. Onboarding lifecycle (state machine)

`src/app/onboarding/page.tsx` — steps `welcome | import | preview | generating | complete | error`.

- `handleGenerate` creates a generation session, polls `getGenerationSessionProgress`, and awaits `runCreatorGeneration`. 
- On `runCreatorGeneration` success → `markOnboardingComplete(tenantId)` → `refresh-session` → `router.replace("/admin/dashboard")` (`page.tsx:308-342`).
- On `res.retryable && res.tenantId` → `setRetryInfo({ tenantId })`, error screen with **Retry Publishing** + **Go to Dashboard** (`page.tsx:343-347`).
- `runCreatorGeneration` (`onboarding.actions.ts`):
  - RCCF-68.2 idempotent retry is **committed** in this tree (`onboarding.actions.ts:431-509`): an existing tenant+website is reused (no Tenant/Website/Workspace #2); non-destructive. (70.4 §12 listed this as uncommitted — it is now landed.)
  - Publish failure catch returns `retryable: true` and does **NOT** call `markOnboardingComplete` (`onboarding.actions.ts:604-627`) — the `onboarding_completed` Setting is only set on the success path.
- `retryPublish(tenantId)` (`onboarding.actions.ts:837-851`) runs `publishingService.publish` directly. **It never sets `onboarding_completed`** — even on success, the Setting is not written by this path.

**Finding (secondary, P2):** after a successful `retryPublish`, the `onboarding_completed` Setting may still be absent, so the DB-backed `requireTenant()` (`src/lib/auth/require-tenant.ts:40`) can bounce `/admin/dashboard` back to `/onboarding`. The middleware alone is insufficient to reach the dashboard because `requireTenant` re-resolves lifecycle from the DB (`src/lib/lifecycle/service.ts:43-57`).

---

## 7. Dashboard navigation lifecycle

Gate stack:
1. **Middleware** (`src/middleware.ts`): `lifecycleService.resolveFromToken(token)` — for an ADMIN whose JWT has `tenantId`, returns `READY` (`token-resolver.ts:87-94`), so `/admin/dashboard` passes middleware.
2. **Page-level** `src/app/admin/dashboard/page.tsx` → `requireTenant()` → `lifecycleService.resolve(...)` — **DB-backed**: reads the `onboarding_completed` Setting (`lifecycle/service.ts:43-47`). Missing Setting → `hasOnboardingCompleted=false` → `redirect("/onboarding")`.

So "Go to Dashboard" (step 6) navigates only if **both** (a) the JWT carries `tenantId` and (b) the `onboarding_completed` Setting exists.

- `handleGoToDashboard` (`page.tsx:414-424`): `markOnboardingComplete(retryInfo.tenantId)` (best-effort — swallows errors), `fetch("/api/auth/refresh-session", POST)` (best-effort), `router.replace("/admin/dashboard")`. Any failure in the best-effort steps leaves the user to the gate above → bounce to `/onboarding` (perceived as "did not navigate correctly").
- `refresh-session` (`src/app/api/auth/refresh-session/route.ts`) re-encodes the JWT from `prisma.user` (with `tenantId`) + `resolveWorkspace`. It 401s on role change and 500s on any DB error — those failures are swallowed client-side.
- **Non-retryable dead-end still present:** the plain error screen's "Go to Dashboard instead" (`page.tsx:778`) does `router.push("/admin/dashboard")` with **no** `markOnboardingComplete` and **no** refresh-session — the documented `/onboarding` bounce loop (RCCF-70.4 §12, IMPLEMENTATION-07 finding H2). If provisioning had not yet attached `tenantId` to the user, this loops. This is NOT this incident's cause (the incident used the retryInfo screen, both buttons present) but remains latent.

**Finding (secondary, P2):** `retryPublish` success does not write `onboarding_completed`, and both navigation helpers treat Setting-upsert and session-refresh as best-effort. The dashboard gate is therefore not reliably satisfiable after a partial onboarding publish, independent of PlanUsage.

---

## 8. Builder publish lifecycle

- Entry: `src/actions/publish.actions.ts` `publishWebsite()` (server action from the Builder workspace).
- `requireTenant()` inside the action reads `session.user.tenantId` from the JWT (no DB lifecycle check) → `publishingService.publish(tenantId)`.
- `publishing/service.ts` (~255-325): builds the canonical aggregate, resolves the plan → `resolvePublishPolicy(publishPlanCode)` → for `creator_launch`/`creator_grow` it is metered → `commitPublishWithMetering` → `reserveSlot` → `tx.planUsage.updateMany` → **P2021**.
- The error surfaces through `publishWebsite`'s catch as `{ success: false, error: <P2021 message> }` — matching the reported text exactly.
- `getPublishUsage` (`publish-usage.ts:69`) would also throw P2021 on the dashboard usage meter for metered plans, but it is caught by `getCreatorPublishUsage` (`publish.actions.ts:26-35`) and returned as an error field — the dashboard degrades, not crashes.

No graceful fallback exists for a missing metering table; publish is hard-blocked for metered plans.

---

## 9. Launch (FREE) plan capability analysis

- `src/config/commerce/plans.ts`: `creator_launch` price 0, `trialDays: 15`.
- `publish-policy.ts:21-26`:
  - `creator_launch` → `{ mode: "lifetime", limit: 3 }` → **touches PlanUsage on every publish**.
  - `creator_grow` → `{ mode: "monthly", limit: 10 }` → **touches PlanUsage**.
  - `creator_scale` / `creator_enterprise` → `{ mode: "unlimited", limit: null }` → **skips PlanUsage**.
- Onboarding provisioning hardcodes `planCode: "creator_launch"` (`onboarding.actions.ts:491`), so every brand-new FREE creator is on the PlanUsage-touching path.
- `resolveActivePlan` (`plan-source.ts`) resolves the linked v2 `BillingSubscription` → `creator_launch` (a new self-serve creator gets this subscription at register, linked to the workspace by RCCF-07 during provisioning). `resolveRestrictedPlanCode` may clamp agency-managed creators, but a self-serve creator stays `creator_launch`.
- Edge (defensive, not this incident): a tenant with **no** linked subscription resolves `{ code: null }` → `resolvePublishPolicy` falls back to `{ mode: "unlimited" }` (`publish-policy.ts:58`) → publish succeeds without touching PlanUsage. That is the only state where publish works while the table is absent; it does **not** apply to a properly-provisioned FREE/LAUNCH creator.

---

## 10. Data integrity impact

- **No data loss.** Provisioning (tenant, website, workspace, subscription link, builder pages, settings) commits independently of the publish transaction; publish failure only skips the `PublishedSnapshot` + `PublishStatus("live")` write.
- **No quota leak.** `reserveSlot` throws before any `PublishedSnapshot` write, so the snapshot and quota stay consistent (atomic by transaction).
- **State harm is liveness only:** the creator is left with a draft website, no live snapshot, no `onboarding_completed` Setting, and a failed generation session — i.e., they cannot reach `/admin/dashboard` via the DB gate until the Setting is written or onboarding is re-run (RCCF-68.2 idempotent retry safely reuses the tenant).
- **Duplicate-risk is mitigated:** RCCF-68.2 reuse is committed (existing-tenant path, `onboarding.actions.ts:442-482`) — no Tenant/Website/Workspace #2 on retry.
- **Broader missing migrations** (70.4 §5 list, 10 migrations) mean other features (LoyaltyTier, agency team/capacity, `Product.commerceMode`, `Offering.bookable`, `Booking.offeringId`, `AgencyTenant.offboardedAt`, `AuditLog.agencyId`, `SettlementItem` unique) also silently lack their schema in production. Verified no duplicate `SettlementItem.commissionEntryId` rows exist, so that migration is safe to apply.

---

## 11. Security impact

- **No privilege escalation / auth bypass found.** Middleware + `requireTenant` keep `/admin` and `/builder` gated. The Builder's publish action checks `session.user.tenantId`.
- **Minor info disclosure:** the raw P2021 message (table name) is returned to the client via `publishWebsite`/`retryPublish` error strings and rendered on the error screen/toast. It leaks an internal schema table name; low severity. Do not surface raw Prisma errors to end users in future hardening.
- No secrets are exposed; `NEXTAUTH_SECRET`-gated middleware behaves as designed.

---

## 12. Exact files involved

**Root-cause (read-only traced):**
- `prisma/schema.prisma:1951` — `PlanUsage` model.
- `prisma/migrations/20260815000000_plan_usage/migration.sql` — committed, never deployed.
- `src/modules/billing/infrastructure/plan-usage-repository.ts:44` — `reserveSlot` (`tx.planUsage.updateMany`).
- `src/lib/publishing/service.ts:270-374` — publish plan resolution + `commitPublishWithMetering`.
- `src/lib/publishing/publish-policy.ts:21-26` — metered policies.
- `src/modules/billing/application/plan-source.ts` — `resolveActivePlan`.
- `src/actions/publish.actions.ts` — Builder publish entry.
- `src/actions/onboarding.actions.ts:592-615, 624, 812-851` — onboarding auto-publish, `markOnboardingComplete`, `retryPublish`; RCCF-68.2 reuse `431-509`.
- `src/app/onboarding/page.tsx:343-347, 394-424, 720-790` — error screen + button handlers.

**Secondary (state-machine findings, NOT part of the fix):**
- `src/lib/auth/require-tenant.ts:40-45` — DB-backed dashboard gate.
- `src/lib/lifecycle/service.ts:43-57` — `onboarding_completed` gate.
- `src/lib/lifecycle/token-resolver.ts:87-94, 180-198` — middleware token resolution vs DB resolution mismatch.
- `src/app/onboarding/page.tsx:778` — non-retryable dead-end (no refresh/mark).

---

## 13. Smallest safe fix

**Infrastructure action only (no code change required to resolve P2021):**

1. Apply the pending committed migrations to the production database via the direct connection:
   ```
   npx prisma migrate deploy   # prisma.config.ts already prefers DIRECT_URL
   ```
   (or, if `prisma migrate` cannot reach the direct endpoint, run the idempotent SQL in `docs/rccf-70.4-remaining-migrations.sql` in the Supabase SQL Editor — it reproduces all 10 migration bodies in order).
2. Confirm `20260815000000_plan_usage` is applied:
   ```
   npx prisma migrate status
   ```
   and/or the `_prisma_migrations` + `PlanUsage` verification queries in §4.
3. Check off `docs/launch-checklist.md:69,73` and `docs/production-readiness-final.md:39-44` after deploy.

This creates `PlanUsage` (and brings `20260815000001..07`, `20260816000001` into sync). No code changes needed for the P2021.

**Optional hardening (separate workstream, NOT required for the fix, do not bundle into the deploy):**
- `retryPublish` should call `markOnboardingComplete` on success (mirrors the auto-publish success path).
- `page.tsx:778` non-retryable "Go to Dashboard instead" should call `markOnboardingComplete` + refresh-session before navigating.
- Stop surfacing raw Prisma P2021 messages to the client.

---

## 14. Migration-deployment requirement

- Deployments must run `npx prisma migrate deploy` (or an equivalent idempotent apply) against `DIRECT_URL` **before** the new build's runtime queries (see `docs/runbooks/Deploy.md:42`, `docs/runbooks/Database-Migrations.md:63`).
- Currently there is **no automated migrate step** in build/CI (`package.json` build, `vercel.json`, no workflows). This is why the gap went unnoticed. Recommend adding migrate-on-deploy (e.g., a Vercel Build Command `prisma migrate deploy && prisma generate && next build`) or a pre-deploy script.
- `prisma.config.ts` already prefers `DIRECT_URL`, so no config change is needed to run migrate.

---

## 15. Tests required (post-fix regression)

After the migration is applied, verify against a real FREE/LAUNCH creator:

1. Onboarding (Instagram + YouTube + manual) on FREE/LAUNCH — publish completes; `onboarding_completed` set; both "Go to Dashboard" and "Retry Publishing" land on `/admin/dashboard` (RCCF-70.4 §10 item 5).
2. Builder **Publish** on Launch — succeeds; `PlanUsage` row created for the lifetime window (used=1).
3. Launch **3rd publish** — correctly rejected with `PUBLISH_QUOTA_EXCEEDED` (`reserveSlot` returns false at `used >= limit`).
4. Grow (`creator_grow`) monthly window — quota counted per calendar month.
5. Scale / Enterprise publish — succeeds and does **not** touch `PlanUsage`.
6. Dashboard `StorefrontStatusCard` usage meter renders real usage (`getPublishUsage`).
7. Retry-after-failure: simulate publish failure → `retryPublish` → dashboard reachable (guards the §13 optional hardening if implemented).
8. Non-retryable error screen "Go to Dashboard instead" → no `/onboarding` bounce loop (guards §13 optional hardening).
9. `npx prisma migrate status` shows all committed migrations applied.
10. Full suite: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `vitest run`, Playwright smoke.

---

## 16. Files that MUST NOT change

- **No code changes are required or should be shipped to fix the P2021.** The smallest fix is purely infrastructure.
- `prisma/migrations/*` — do not edit existing migration bodies; only apply them. (New migrations, if any hardening is later approved, go in new files.)
- `docs/design/Stitch-DNA.md` — **frozen**. Do not modify. Stitch is paused.
- Do not add a "graceful PlanUsage fallback" or catch P2021 in `reserveSlot` — that would silently disable quota enforcement and is the wrong fix.
- Do not drop/recreate the schema via `prisma db push` on production without a migration plan.
- Do not modify `prisma.config.ts` (already correct for DIRECT_URL).

---

## 17. Implementation boundary

- **In scope for THIS task:** read-only root-cause confirmation + classification (done); deploy the committed migrations to production; check off the launch-checklist deploy items; post-fix regression testing per §15.
- **Deferred (separate workstreams):** the §13 optional hardening (retry → markOnboardingComplete; non-retryable dead-end fix; P2021 message hygiene); automated migrate-on-deploy in CI/Vercel; the broader missing-migrations remediation beyond PlanUsage (70.4 §5 list).
- **Out of scope:** any Stitch work; any code changes; any production data cleanup (there is no data to clean — nothing corrupted).
- **Preserved:** RCCF-68.2 idempotent retry semantics — the reuse path is committed and must not be regressed. Do not "fix" retry by creating a second tenant.

---

## 18. Classification & Stitch-safety verdict

- **P0 — Production-blocking (fix before any launch/proceed):** missing `PlanUsage` table (migration `20260815000000_plan_usage` never deployed) → every metered-plan publish (FREE/LAUNCH onboarding auto-publish, Retry Publishing, Builder Publish) fails with P2021; the same deploy gap blocks 9 additional committed migrations. **Fix = `npx prisma migrate deploy` against `DIRECT_URL` (or the idempotent SQL). No code change.**
- **P1 — (none new confirmed):** no additional production-blocking defect beyond the migration gap was verified in code. The Builder P2021 and onboarding P2021 are the same root cause.
- **P2 — Correctness/UX (schedule after deploy):** dashboard navigation is fragile — `retryPublish` success does not set `onboarding_completed` (`onboarding.actions.ts:837-851`); `handleGoToDashboard` treats Setting-upsert + refresh-session as best-effort; the non-retryable "Go to Dashboard instead" (`page.tsx:778`) still lacks both and can loop on `/onboarding`.
- **P3 — Hardening (nice-to-have):** surface friendly publish errors instead of raw P2021 text; add automated `prisma migrate deploy` to build/CI to prevent recurrence.

**Safe to proceed to Stitch?** Only **after** the P0 migrations are deployed to production and the §15 regression checks pass. The current production state (PlanUsage absent) hard-blocks the FREE/LAUNCH creator journey end-to-end (onboarding publish, retry, and Builder publish all fail), so proceeding with the UI/design workstreams before the database is migrated would leave the product unusable for exactly the audience Stitch targets. Stitch itself remains PAUSED.