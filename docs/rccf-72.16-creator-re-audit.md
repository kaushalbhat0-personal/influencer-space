# RCCF-72.16 — Creator Post-72.15B Independent Re-Audit

- **Type:** Audit only (no code / schema / DB changes, no commit, no push).
- **Head:** `95cff86` (`feat(content): enforce Launch global core content limit`) on `main`.
- **Date:** 2026-08-20
- **Scope:** Security, 72.15B content-cap enforcement, correctness/regression, architecture, test coverage, performance, browser QA.
- **Baselines reconciled:** `docs/rccf-72.14-creator-post-remediation-audit.md`, `docs/rccf-72.15a-launch-content-policy-audit.md`.

## 1. Executive verdict

**B — APPROVE WITH FINDINGS.**

The 72.15B Launch core-content limit shipped correctly and the Launch experience works end-to-end
(allowance card, publish quota, all four core types, mobile storefront). No P0 defects were found.

Three P1 issues must be fixed before the platform can be considered hardened:

1. **Unauthenticated cross-tenant construction-snapshot read** (`getConstructionSnapshot`).
2. **Launch 3-active cap bypassable via status transitions on update** (products/services/courses).
3. **`release` E2E project collects 0 tests** (generated client import breaks collection).

Plus P2 security/ownership gaps on three onboarding actions and P2 perf/architecture debt.

## 2. Risk summary vs 72.14 baseline

| Severity | 72.14 baseline | 72.16 result | Notes |
|---|---|---|---|
| P0 | 0 | **0** | none |
| P1 | 0 | **3** | all NEW, introduced-or-unnoticed before 72.15B |
| P2 | 2 (F4, F5) | **2 carried + 5 new** | F4 RESOLVED, F5 still valid; +ownership, perf, arch |
| P3 | 13 | **1 re-confirmed + 1 new; 12 carried** | products-throw re-confirmed; products-vs-structured new |

## 3. Baseline finding reconciliation

### 72.14 P2 findings

| ID | Title | Verdict | Evidence |
|---|---|---|---|
| 72.1-F4 | Builder catalog leaks plan-blocked sections | **RESOLVED / OBSOLETE (policy)** | 72.15B makes Products/Services/Courses/Games all AVAILABLE on Launch; no remaining plan-blocked core-content section in the catalog. Reclassified OBSOLETE in 72.15A and confirmed. |
| 72.1-F5 | Dashboard quick actions expose locked pages | **STILL VALID (partial)** | Browser-verified on Launch dashboard: Quick Actions still include `Bookings` → `/admin/bookings` (dead-end, `max_bookings=0` on Launch). The 72.15B allowance card is a positive change but does not remove the dead-end CTA. |

### 72.14 P3 findings (13)

| ID | Verdict | Note |
|---|---|---|
| Products/Testimonials/FAQ throw (item-17 batch) | **STILL VALID** (products) | Re-confirmed: `createProduct` throws on limit (`products/actions.ts:38`) while courses/services/games return structured results. Testimonials/FAQ still throw on `enforceContentLimit` (item-17 remains open for those three). |
| F6, F7, F8 | carried forward | Not re-verified this pass; no 72.15B interaction. |
| N3, N8, N9, N10, N11 | carried forward | N8 (`max_messages` ungated) has no 72.15B interaction. |
| S4, S5, S6, S7 | carried forward | No 72.15B interaction. |

## 4. Security findings (new)

### S-A1 (P1, HIGH) — Unauthenticated cross-tenant construction-snapshot read
- `src/actions/construction.actions.ts:46-61` — `getConstructionSnapshot` (a `"use server"` action) resolves a tenant from **client-supplied** `sessionId` or `subdomain` with **no auth or ownership check**, then returns the tenant's Draft Layout + Live CMS snapshot (navigation, visible sections + config, meta/creatorName/tagline) through `buildRuntimeSnapshot` + `layoutEngine`.
- The subdomain path is directly predictable: `src/app/dev/generation-experience/page.tsx` hardcodes `SEEDED_SUBDOMAIN = "test-creator-1"`; storefront subdomains are derived from store names.
- Route classification keeps dev surfaces public: `src/lib/platform/routes.ts` (dev routes `requiresAuthentication === false`). Browser-verified: `http://localhost:3000/dev/generation-experience` loads unauthenticated with no console errors.
- **Impact:** an unauthenticated caller can exfiltrate any tenant's unpublished draft layout and live CMS content.
- **Fix:** require an authenticated session and verify the resolved tenant matches `session.user.tenantId`; drop the subdomain-resolution path or gate it behind the session.

### S-A2 (P2) — `markOnboardingComplete` has no auth check
- `src/actions/onboarding.actions.ts:828-840` — takes a client-supplied `tenantId`, upserts `onboarding_completed` and emits `onboarding.completed` with **no `getServerSession`** at all.
- **Impact:** any unauthenticated caller can flip any tenant's onboarding state (and spam events).
- **Fix:** authenticate and verify `tenantId === session.user.tenantId`.

### S-A3 (P2) — `retryPublish` checks auth, not ownership
- `src/actions/onboarding.actions.ts:853-867` — verifies `sess?.user?.id` exists but never verifies the target `tenantId` belongs to the session user; then calls `publishingService.publish(tenantId)`.
- **Impact:** any authenticated user can trigger a publish (server work + storefront publish state) for any tenant.
- **Fix:** require `tenantId === session.user.tenantId`.

### S-A4 (P2) — `getGenerationSessionProgress` checks auth, not session ownership
- `src/actions/onboarding.actions.ts:762` — verifies a session exists but does not verify the generation session belongs to the user; `sessionService.getById(sessionId)` returns any session's full status/stages/activity.
- **Impact:** authenticated cross-tenant read of generation internals by id.
- **Fix:** scope the lookup to `session.user.id` (like `getActiveGenerationSession` at `:818`).

## 5. Content-limit enforcement (72.15B)

### CL-1 (P1) — Launch 3-active cap bypassable via status transitions on update
- Create paths ARE guarded: `createProduct` (`products/actions.ts:34`), `createCourse` (`courses/actions.ts:37`), `createService` (`services/actions.ts:31`), `createGame` (`games.actions.ts:49`) all route through the transactional `withLaunchCoreContentCapacity`.
- **But update paths are NOT:** `updateProduct` (`products/actions.ts:46-57` → `products/service.ts:83,85` writes `status` and `isActive`), `updateCourse` (`courses/actions.ts:53-63` → `courses/service.ts:86` writes `status: "published"`), `updateService` (`services/actions.ts:47-57` → `services/service.ts:78` writes `status: "published"`). No capacity re-check.
- `countActiveCoreContentUsage` (`content-limit.enforcement.ts:115-126`) counts only ACTIVE items (product `PUBLISHED+isActive+not archived`; offering `published`; game `isActive`). Drafts never count.
- **UI-reachable:** create/edit forms expose a DRAFT/PUBLISHED select — `products-page.tsx:187-193`, `courses-manager.tsx:188-189`, `services-manager.tsx:244-245`.
- **Exploit:** create 4+ items as DRAFT (create guard passes, drafts are inactive), then flip each to PUBLISHED via the form → unlimited active core items while the allowance card and counters report 3.
- Games are clean: `updateGame` (`games.actions.ts:80-127`) never touches `isActive`/status; `Game.isActive @default(true)` (`prisma/schema.prisma:699`).
- **Fix:** re-check `countActiveCoreContentUsage` (transactionally) whenever an update would transition an item to ACTIVE, or route the status/isActive transition through `withLaunchCoreContentCapacity`.

### CL-2 (P3) — Products still throw on limit; inconsistent client contract
- `products/actions.ts:38` throws `new Error(outcome.reason)` on rejection; courses/services/games return structured `ContentMutationResult` (`contentLimitRejection`). `createProduct` will surface as an unhandled error toast instead of a friendly "limit reached" message.
- **Fix:** return `contentLimitRejection(outcome)` from `createProduct`/`updateProduct`.

### CL-3 (P3) — Non-Launch plans also take the FOR UPDATE lock
- `withLaunchCoreContentCapacity` (`content-limit.enforcement.ts:202-211`) takes the tenant-row `SELECT … FOR UPDATE` lock **before** the `isLaunchPlan` check, so Growth/Scale core creates also serialize on the tenant row.
- **Fix:** branch on `isLaunchPlan` before acquiring the lock (only Launch needs the race-safe create).

### CL-4 (P3, design consequence) — Games cannot be de-activated
- `updateGame` exposes no active toggle and no status; a game once created is always ACTIVE. On Launch, 3 games exhaust the entire shared cap with delete as the only release. Documented as a consequence of the shared cap, not a defect.

## 6. Performance findings

### PERF-1 (P2) — `resolveActivePlan` re-resolved per request path
- Publish flow: `src/lib/publishing/service.ts:222,300,591` plus `publish-usage.ts:44` — 3-4 plan resolutions (each a DB hit via `plan-source`) in one publish.
- Also repeated: `content-limit.enforcement.ts:204` (+ `:157` in `enforceContentLimit`), `media/service.ts:667`, `storage.enforcement.ts:125,127`.
- **Fix:** resolve once per request/transaction and thread through; memoize.

### PERF-2 (P3) — redundant revalidation
- `afterContentChange` + `revalidatePath` fire on every create/update/delete including non-storefront mutations (`products/actions.ts:41-42,54-55`, etc.). Acceptable on current scale; batch or throttle if dashboards become hot.

## 7. Architecture findings

### ARCH-1 (P2) — Admin read paths are nav-gated, not server plan-gated
- Admin pages gate with `requireTenant` only (e.g., `src/app/admin/products/page.tsx:1,8`). No server-side plan/capability check on read pages; nav filtering is client-side. Direct URL access renders plan-inappropriate pages (e.g., `/admin/billing`, `/admin/analytics` on Launch). Data exposure is limited because reads are tenant-scoped and writes are server-gated, but the surface is inconsistent and produces dead-end CTAs (see F5 / Quick Actions Bookings).
- **Fix:** either server-gate the pages or remove dead-end CTAs; at minimum gate the top offenders (Bookings on Launch).

## 8. Test coverage

### TEST-1 (P1) — `release` E2E project collects 0 tests (reproduced)
- `npx playwright test --project=release --list` → `SyntaxError: Cannot use 'import.meta' outside a module` at `tests/e2e/shared/database.ts:1`.
- Chain: `tests/e2e/release/environment.spec.ts:2` imports `shared/database.ts`, which imports `../../../src/generated/prisma/client` — a **gitignored, generated** file (`git check-ignore` confirms) that uses `import.meta.url` (`src/generated/prisma/client.ts:16`).
- Affected: `release` project (release/accessibility/performance/responsive). `smoke`, `creator`, and other projects collect fine (verified live: 31 smoke tests, 16 creator tests list OK). Any global-setup path that dynamically imports `database.ts` will also fail at run time.
- **Fix:** stop importing the generated client in E2E; instantiate `PrismaClient` from `@prisma/client` in the test tree, and regenerate the client as ESM-compatible (or `prisma generate` in CI) so `import.meta` resolves.

## 9. Browser QA

- Dev server started canonically per `dev-server-lifecycle`; `GET /admin/login` → 200 (READY on port 3000).
- Authenticated Launch tenant session exercised (`rccf7151-launch`).
  - `/admin/dashboard`: **Core Content Allowance card** present and server-derived (`0 / 3 used · 3 remaining`); publish quota `1 of 3 used · lifetime · 2 remaining`; nav shows Products/Services/Courses/Games; **Quick Actions still include Bookings** (F5).
  - `/admin/products`: renders correctly (empty state), no crash.
  - Storefront `/rccf7151-launch`: renders; **no horizontal overflow at 375px** (prior responsive P3s hold).
- `/dev/generation-experience` loads publicly with zero console errors — confirms the S-A1 exposure surface is reachable.
- `/admin` (bare) returns 404 — prior bare-`/admin` P3 persists.
- No QA credentials were fabricated; the pre-existing authenticated session was reused.

## 10. Prioritized remediation backlog

| Priority | Finding | Action |
|---|---|---|
| P1 | S-A1 construction snapshot | Auth + ownership check in `getConstructionSnapshot`; gate subdomain path behind session. |
| P1 | CL-1 update-path cap bypass | Transactionally re-check active count on status→active transitions (products/services/courses). |
| P1 | TEST-1 release E2E 0 tests | Use `@prisma/client` in E2E; fix `import.meta` / generated-client import. |
| P2 | S-A2/S-A3/S-A4 onboarding ownership | Ownership checks on `markOnboardingComplete`, `retryPublish`, `getGenerationSessionProgress`. |
| P2 | PERF-1 plan re-resolution | Resolve plan once per request path. |
| P2 | ARCH-1 + F5 | Remove dead-end Quick Action (Bookings) on Launch or server-gate the page. |
| P3 | CL-2 products structured rejection | Return `contentLimitRejection` from product actions. |
| P3 | CL-3 lock placement | Move `isLaunchPlan` check before the FOR UPDATE lock. |
| P3 | baseline P3s | Carry forward F6/F7/F8, N3/N8/N9/N10/N11, S4/S5/S6/S7 per 72.14. |

## 11. Verification record

- `git status --short` (dirty tree preserved, no cleanup), branch `main`, HEAD `95cff86` confirmed.
- Direct reads: `construction.actions.ts`, `onboarding.actions.ts` (740-867), `content-limit.enforcement.ts`, `products/courses/services` actions+services+validators+types, `games.actions.ts`, `prisma/schema.prisma`, `products-page.tsx`, `courses-manager.tsx`, `services-manager.tsx`, `routes.ts`, `tests/e2e/shared/database.ts`, `playwright.config` scripts, `package.json`.
- Live reproductions: `npx playwright test --project=smoke --list` (31 tests), `--project=creator --list` (16 tests), `--project=release --list` (0 tests, SyntaxError). Browser pass on dashboard/products/storefront/dev route/mobile overflow.
- No source, schema, or DB changes made; no commit, no push.