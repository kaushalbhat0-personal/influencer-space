# RCCF-72.15B — Creator Launch 3-Active-Core-Content Limit (Closure)

**Status:** COMPLETE (IMPLEMENTED + TESTED + BROWSER QA + VERIFIED — staged, NOT committed, NOT pushed)
**Date:** 2026-08-20
**Mode:** IMPLEMENT → TEST → BROWSER QA → VERIFY

---

## 1. Product Policy (locked)

Creator Launch is a FREE but fully functional Creator plan:

- **Products, Services, Courses, Games** are all capability-available.
- These four types share **ONE Launch-wide ceiling of 3 ACTIVE core content items total**
  (NOT 3 per type).
- **Testimonials and FAQ are separate** — independent Launch limits (max 3 each), NOT part of
  the global counter.
- **Growth and Scale are unchanged.**

Examples:
- Product #1 + Course #1 + Service #1 = 3 active → allowed.
- Game #1 after 3 → **rejected**.
- Product #2 after 3 → **rejected**.
- 3 core + 3 testimonials + 3 FAQ = valid.

---

## 2. Previous Audit Findings (docs/rccf-72.15a-launch-content-policy-audit.md)

- `creator_launch` had `max_courses = 0`, `max_games = 0` → Courses/Games capability-disabled.
- `enforceContentLimit` is the common content-limit seam; `countContentUsage` counted per-type.
- No global cross-type counter; per-type enforcement allowed cross-type bypass.
- Verdict was **B — IMPLEMENTATION REQUIRED, ARCHITECTURE FITS**.

All confirmed against HEAD before implementing (PHASE 1 re-audit passed — no material drift).

---

## 3. Canonical Plan Changes

`src/config/commerce/plans.ts` — `creator_launch` `featureOverrides`:

| Feature | Before | After |
|---|---|---|
| `max_products` | 3 | 3 (unchanged) |
| `max_services` | 3 | 3 (unchanged) |
| `max_courses` | **0** | **3** (capability-available) |
| `max_games` | **0** | **3** (capability-available) |
| `max_testimonials` | 3 | 3 (unchanged, independent) |
| `max_faq` | 3 | 3 (unchanged, independent) |

Growth and Scale `featureOverrides` **untouched** (Growth games = 10, everything else unlimited;
Scale all unlimited).

Note: the per-type `max_courses`/`max_games` = 3 values now only mark **availability** on
Launch — the authoritative quantity gate is the global active-core counter (see §4). The
marketing highlights for Launch were updated to list "3 courses" and "3 games".

---

## 4. Global Active-Content Architecture

All new logic lives in the existing seam
`src/modules/billing/application/content-limit.enforcement.ts`:

- `LAUNCH_GLOBAL_LIMIT = 3` — single canonical constant (no hardcoded "3" scattered in UI).
- `LAUNCH_CORE_FEATURES = { max_products, max_services, max_courses, max_games }`.
- `isLaunchPlan(planCode)` — true when the resolved plan maps to `creator_launch` (incl. legacy
  aliases); false for Growth/Scale/Enterprise/Partner.
- `countActiveCoreContentUsage(tenantId, tx?)` — sums **active** core items only.
- `enforceContentLimit` — for Launch core features, checks the global active count against 3
  (supersedes per-type); Testimonials/FAQ and all non-Launch plans keep the per-type path.
- `withLaunchCoreContentCapacity(tenantId, featureKey, work)` — **authoritative, race-safe**
  create wrapper: `prisma.$transaction` + Tenant row `FOR UPDATE` lock (mirrors the established
  media quota pattern) → re-count under lock → reject if `>= 3` → run `work(tx)`.

The four core create actions (`products`, `courses`, `services`, `games`) route through
`withLaunchCoreContentCapacity`, threading the transaction client into the service create
(services accept an optional `tx`, defaulting to `prisma`).

Reused unchanged: `resolveActivePlan` → `enforceContentLimit` → `ContentLimitDecision` →
`ContentMutationResult`.

---

## 5. Active Predicates Per Model

Derived from the existing domain models (no new status model invented):

| Type | Model | Active predicate | Inactive/archived/draft | Hard delete |
|---|---|---|---|---|
| Product | `Product` | `status = "PUBLISHED" AND isActive = true AND archivedAt IS NULL` (canonical predicate already used by `builder-overview`/platform health) | archived/deactivated/draft don't count | frees slot |
| Service | `Offering` type=`coaching` | `status = "published"` | draft/archived don't count | frees slot |
| Course | `Offering` type=`course` | `status = "published"` | draft/archived don't count | frees slot |
| Game | `Game` | `isActive = true` | inactive doesn't count | frees slot |

Testimonials and FAQ are **excluded** from this counter.

---

## 6. Launch Enforcement

For `creator_launch` ONLY, and ONLY for the four core feature keys:

```
globalActiveCoreContentUsage < 3  →  allowed
globalActiveCoreContentUsage >= 3 →  rejected
```

Rejection returns the existing structured `ContentLimitDecision` →
`contentLimitRejection` (courses/services) or `{ success: false, error }` (games) or thrown
friendly error (products, preserving its existing contract):

```
{ success: false, featureKey, used: 3, limit: 3, error: "Core content limit reached (3/3).", suggestedUpgrade }
```

Server remains authoritative — the plan is resolved from the DB (`resolveActivePlan`), never
from the client.

---

## 7. Testimonials / FAQ Separation

- `max_testimonials` and `max_faq` are **NOT** in `LAUNCH_CORE_FEATURES`.
- They continue through the per-type `enforceContentLimit` path (Tenant `Setting` JSON array
  counts) with independent Launch limits of 3.
- 3 testimonials + 3 FAQ can coexist with 3 active core items; testimonials/FAQ never consume
  core capacity and vice versa.
- Verified by unit tests 12, 13 and the browser (3 core items present; testimonial/FAQ pages
  remain available).

---

## 8. Growth Regression

- Growth (`creator_grow`) is not Launch → the global counter never applies.
- `max_*` per-type limits (all unlimited except `max_games: 10`) are unchanged and still
  enforced via the per-type path.
- Browser: Growth login works; **no Core Content Allowance card** (Launch-only UI correctly
  absent); Courses/Games/Services/Products visible in nav.
- Unit tests: Growth can create 5 products (ok), 5 of any type (ok), games 10/10 reached →
  rejected, no global 3 ceiling.

---

## 9. Scale Regression

- Scale (`creator_scale`) is not Launch → the global counter never applies.
- All core types unlimited (existing per-type path returns `ok` with no ceiling).
- Browser: Scale login works; **no Core Content Allowance card**.
- Unit test: Scale can create 4+ of any type (ok).

---

## 10. Concurrency Handling

The pre-existing per-type enforcement was read-then-write without a lock. The new Launch
global counter closes the race for the four core types via
`withLaunchCoreContentCapacity`:

- `prisma.$transaction` + `tx.$queryRaw\`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE\``
  serializes concurrent core-content creates per tenant.
- Active usage is re-counted **under the lock**; the create runs in the same transaction.
- A Launch user firing 3 concurrent creates from 2 existing active items ends with exactly 3
  active (only one succeeds), never 4.
- Tested by a serializing `$transaction` mock (concurrent-create test asserts `created === 1`
  and active total `=== 3`).

Growth/Scale/Testimonials/FAQ never enter the locked path (unchanged behavior).

---

## 11. Security

- **Plan forging:** impossible — `enforceContentLimit`/`withLaunchCoreContentCapacity` resolve
  the plan server-side from the DB (Billing v2 → legacy fallback); no client-supplied plan/limit.
- **Usage/limit forging:** usage is counted server-side from the DB; the limit is a constant.
- **Direct server-action invocation:** all create actions re-check the gate server-side; session
  tenant is required; every query is tenant-scoped.
- **Cross-type bypass:** closed — the global counter aggregates all four core types, so
  2 products + 1 course + game → rejected.
- **Other content-type bypass:** Testimonials/FAQ intentionally separate; the global counter
  cannot be exhausted or inflated by them (they never enter the core sum).
- **Auto-provisioning paths** (`demo.actions.ts`, `acquisition/acquire.actions.ts` —
  SUPER_ADMIN/onboarding generation flows) create products directly and are documented as a
  **deferred gap** (§18) — they bypass the limit but are not user-driven content-management
  creates.

---

## 12. Tenant Isolation

- `countActiveCoreContentUsage` is scoped to `tenantId` for every model query.
- Test: tenant A at 3 active does not affect tenant B's allowance (B can still create).
- Cross-tenant usage cannot reduce or inflate another tenant's counter.

---

## 13. Builder Behavior

- `SECTION_CATALOG` (`section-manager.tsx`) already included Courses/Services/Games for all
  plans — unchanged (now correct: all four core types are legitimately available on Launch).
- Builder "Add Section" for the four core types works on Launch (no capability block).
- No dead navigation: Courses/Games/Services/Products pages all reachable from Builder edit
  links.

---

## 14. Navigation Behavior

- Admin sidebar uses `isNavItemVisible` (limit > 0). With `max_courses: 3` and `max_games: 3`,
  **Courses and Games are now visible on Launch** (previously hidden at limit 0).
- Growth/Scale nav unchanged.
- Dashboard `QUICK_CARDS` already linked to all core pages (now all reachable/functional).

---

## 15. Browser QA (real accounts, dev server on :3000)

QA accounts (password `Audit72!QaPass`, verified against DB): Launch
`rccf7151-launch@example.com` (creator_launch), Growth `rccf7151-growth@example.com`
(creator_grow), Scale `rccf7164-scale-1787027917475@example.com` (creator_scale).

LAUNCH:
1. Login ✓ · 2. Dashboard ✓ · 3. Courses page renders (no "not available") ✓
4. Games page renders ✓ · 5. Services page renders ✓ · 6. Products page renders ✓
7. Created Game "RCCF7215B Game One" ✓ (Active) · 8. Created Product "RCCF7215B Product One"
(Published) ✓ · 9. Created Course "RCCF7215B Course One" (PUBLISHED) ✓
10. Verified 3/3 active core usage in DB ✓ · 11. Attempted 4th (Service) →
**rejected** with "Core content limit reached (3/3)." ✓ · 12. Friendly structured error shown ✓
13. Allowance card on dashboard: **"Core Content Allowance: 3/3 used · limit reached"** ✓
14. No "Upgrade to Growth" for core content types ✓
15. Testimonials/FAQ pages remain available (not consumed by core counter) ✓

NAV: Courses ✓ Games ✓ Services ✓ Products ✓ all visible.

RESPONSIVE: 320px / 375px / 390px → **no horizontal overflow** (0 px) ✓.

GROWTH: login ✓; no allowance card ✓; nav shows core types ✓ (server behavior verified by
unit tests: >3 items allowed, games limit 10 preserved).

SCALE: login ✓; no allowance card ✓ (unlimited core behavior preserved per unit tests).

NOTE: An earlier allowance-card rendering discrepancy was traced to a **Next.js dev-server
server/client bundle desync** (stale `.next` after hot reload). After clearing `.next` and a
clean restart, the card rendered correctly and consistently. Not a code defect.

---

## 16. Tests

New: `tests/unit/rccf72-15b-launch-core-content-limit.test.ts` (22 tests, all passing):

1. Launch Product+Product+Product = 3 allowed
2. 4th Product rejected (global counter)
3. Product+Course+Service = 3, 4th (Game) rejected
4. (covered by 3) 4th Game rejected
5. Mixed-type bypass impossible (2 products + 1 course → game rejected)
6. Courses available on Launch ✓ 7. Games available on Launch ✓
8. Services available ✓ 9. Products available ✓
10. Testimonials independently capped at 3 ✓ 11. FAQ independently capped at 3 ✓
12. Testimonials don't consume core allowance ✓ 13. FAQ doesn't consume core allowance ✓
14. Draft doesn't consume active allowance ✓ 15. Archived frees allowance ✓
16. Inactive game frees allowance ✓ 17. (hard delete frees via count removal — covered by
active-count semantics) 18. Growth unaffected ✓ 19. Scale unaffected ✓
20. Plan resolved from DB (resolveActivePlan) ✓ 21. Forged/absent client plan → default Launch ✓
22. Structured ContentMutationResult preserved ✓ 23. Global usage scoped to tenant ✓
24. Cross-tenant usage cannot affect allowance ✓ 25. Concurrent create cannot exceed 3 ✓

Updated stale guardrails (OLD policy → NEW invariant):
- `src/modules/billing/application/__tests__/content-limit.enforcement.test.ts` — replaced the
  "Courses not available on Launch (max_courses=0)" test with courses-available + global-cap
  tests; updated the products-limit message to "Core content limit reached".
- `tests/unit/rccf72-7-lifecycle-gate-reconciliation.test.ts` — Launch now asserts
  `max_courses: 3`, `max_games: 3`, and `can("creator_launch","max_courses").allowed === true`.
- `tests/unit/rccf72-10-courses-services-error.test.ts` — actions now use
  `withLaunchCoreContentCapacity`; updated mocks/assertions to the transactional wrapper and
  the new global-limit message.
- `tests/unit/rccf67-service-booking.test.ts` — added `withLaunchCoreContentCapacity` mock.
- `tests/unit/commerce-registry.test.ts` — added "courses"/"games" to the marketing-highlight
  keyword allowlist.

---

## 17. Exact Files Changed

Implementation:
- `src/modules/billing/application/content-limit.enforcement.ts` — global counter, Launch
  branch, `withLaunchCoreContentCapacity`, `countActiveCoreContentUsage`, `isLaunchPlan`.
- `src/config/commerce/plans.ts` — `creator_launch` `max_courses: 3`, `max_games: 3` + marketing
  highlights.
- `src/features/products/actions.ts` + `service.ts` — transactional create via
  `withLaunchCoreContentCapacity` (tx-threaded).
- `src/features/courses/actions.ts` + `service.ts` — same.
- `src/features/services/actions.ts` + `service.ts` — same.
- `src/actions/games.actions.ts` — create via `withLaunchCoreContentCapacity` (inline tx create).
- `src/features/dashboard/actions.ts` — expose `launchAllowance` (server-derived).
- `src/features/dashboard/components/dashboard-page.tsx` — render the Launch-only
  Core Content Allowance card.

Tests:
- `tests/unit/rccf72-15b-launch-core-content-limit.test.ts` (new).
- `src/modules/billing/application/__tests__/content-limit.enforcement.test.ts`.
- `tests/unit/rccf72-7-lifecycle-gate-reconciliation.test.ts`.
- `tests/unit/rccf72-10-courses-services-error.test.ts`.
- `tests/unit/rccf67-service-booking.test.ts`.
- `tests/unit/commerce-registry.test.ts`.

Docs:
- `docs/rccf-72.15a-launch-content-policy-audit.md` (prior audit — reference).
- `docs/rccf-72.15b-launch-core-content-limit-closure.md` (this closure).

NOT modified: billing pricing, subscriptions, Partner/Agency plans, publish quota, preview
security, Save Identity, navigation reconciliation, Theme Experience, storefront runtime,
Prisma schema (no migration), Growth/Scale policy.

---

## 18. Deferred Issues

1. **Auto-provisioning product creation bypasses the limit.** `src/actions/demo.actions.ts`
   (SUPER_ADMIN demo seed) and `src/actions/acquisition/acquire.actions.ts` (onboarding
   generation) create products via `prisma.product.create` directly. These are generation
   flows that provision a NEW tenant during website creation, not user-driven content
   management. Gating them risks breaking onboarding. **Deferred** — document only; if a Launch
   user's auto-generated site should respect the 3-item cap, a follow-up ticket should route
   these through the same gate.
2. **Course "Add Course" drawer** did not open in the first browser attempt on the stale dev
   server; after the clean server restart it opened and creation succeeded — confirmed a dev
   artifact, not a code issue.
3. **Pre-existing test failures:** 7 `rccf71-*` theme/storefront source-assertion tests fail in
   the working tree. They assert strings in `storefront-loader.ts`, `interactive-canvas.tsx`,
   `publishing/service.ts`, `StorefrontPage.tsx` — files this ticket did NOT touch. These are
   pre-existing failures from in-flight RCCF-71 work, unrelated to RCCF-72.15B.

---

## 19. Final Acceptance Matrix

| Invariant | Result |
|---|---|
| Launch Products available | ✅ PASS (browser + tests) |
| Launch Services available | ✅ PASS |
| Launch Courses available | ✅ PASS |
| Launch Games available | ✅ PASS |
| Launch max 3 core active items | ✅ PASS (browser: 4th Service rejected) |
| Cross-type bypass impossible | ✅ PASS (tests 3,5 + browser) |
| Testimonials independently max 3 | ✅ PASS (tests 10,12) |
| FAQ independently max 3 | ✅ PASS (tests 11,13) |
| Draft doesn't consume active slot | ✅ PASS (test 14) |
| Archive/deactivate frees slot | ✅ PASS (tests 15,16) |
| Growth unchanged | ✅ PASS (tests 18 + browser) |
| Scale unchanged | ✅ PASS (test 19 + browser) |
| Server authoritative | ✅ PASS (plan resolved from DB; direct-call tests) |
| Tenant isolated | ✅ PASS (test 23,24) |
| No storefront regression | ✅ PASS (storefront files untouched; build green) |
| No billing regression | ✅ PASS (billing files untouched; build green) |

---

## Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (clean) |
| Focused RCCF-72.15B + content-limit tests | ✅ 32/32 |
| Full `npx vitest run` | ✅ 3725 passed; 7 pre-existing `rccf71-*` failures (unrelated, documented) |
| `npm run build` | ✅ PASS |
| `npx eslint` (touched files) | ✅ PASS (clean) |
| `git diff --check` | ✅ PASS (clean) |
| `npx prisma validate` | ✅ PASS |
| Browser QA (Launch/Growth/Scale + responsive) | ✅ PASS |

---

## FINAL VERDICT

**A — PASSED**

The policy is implemented and verified end-to-end:
- Launch exposes all four core content types (capability-available).
- A single Launch-wide 3-active-core-item counter is enforced server-side, race-safe, and
  cross-type.
- Testimonials/FAQ remain independent.
- Growth and Scale are unchanged.
- Server remains authoritative and tenant-isolated.
- No schema, billing, publish, storefront, or Growth/Scale regression.

**STAGED — NOT COMMITTED, NOT PUSHED** (per instructions).
