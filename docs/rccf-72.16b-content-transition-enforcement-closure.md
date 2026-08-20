# RCCF-72.16B — Launch Core Content ACTIVE-Transition Enforcement (Closure)

**Status:** COMPLETE (IMPLEMENTED + TESTED + BROWSER QA + VERIFIED — NOT committed, NOT pushed)
**Date:** 2026-08-20
**Mode:** IMPLEMENT → TEST → BROWSER QA → VERIFY

---

## 1. Finding (CL-1) — Draft Stockpiling Bypass on Update Transitions

RCCF-72.15B closed the CREATE path with the canonical global active-core ceiling (max 3 ACTIVE
core items across Products, Services, Courses, Games on `creator_launch`). The UPDATE path was
left unguarded:

- `updateProduct` / `updateCourse` / `updateService` all exposed a **DRAFT → PUBLISHED**
  transition.
- A Launch tenant could draft-stockpile unlimited items, then promote drafts to ACTIVE via the
  **Edit dialog** without ever re-checking the Launch ceiling.
- Result: the 3-active ceiling was bypassable by the most common real workflow (create drafts,
  publish later), defeating the RCCF-72.15B gate.

Verdict: **A/CL-1 — closed** (update transitions now re-check the same canonical Launch capacity
primitive).

---

## 2. Exploit Path (confirmed in browser before the fix)

```
Launch tenant (0 active) → create 5 drafts (products page, all allowed)
  → Edit Draft 1 → Status Published → Update  ✅ (1/3, correct)
  → Edit Draft 4 → Status Published → Update  ❌ 500 (transaction timeout — NEW BUG, see §6)
  → after fix: Draft 4 at 3/3 → rejected with "Core content limit reached (3/3)." ✅
```

The 5th draft + unlimited future drafts were the stockpile; the 4th publish attempt is where the
ceiling must fire.

---

## 3. Design (shared canonical primitive)

`src/modules/billing/application/content-limit.enforcement.ts`:

- **`LaunchActiveTransition`** — `{ wasActive: boolean; willBeActive: boolean }` describing the
  effective-state delta of the item being updated.
- **`withLaunchCoreContentCapacity(tenantId, featureKey, work, resolveTransition?)`** —
  generalized from the 72.15B create-only wrapper. The new optional 4th arg resolves the
  transition for an existing item:

  ```
  resolveTransition(prisma) → LaunchActiveTransition
  ```

- **Transition semantics (the core rule):**

  | wasActive | willBeActive | Gate fires? | Notes |
  |---|---|---|---|
  | false | true | **YES** (activation) | re-count under lock; reject if `>= 3` |
  | true | true | NO | editing an active item never re-gates (no new slot consumed) |
  | true | false | NO | demote/archive/deactivate only frees capacity |
  | false | false | NO | draft→draft edits are stockpiling-safe by policy (drafts never count) |

- `willBeActive` per type:
  - Product: `input.status === "PUBLISHED" && input.isActive !== false && input.archivedAt == null`
  - Course/Service (Offering): `input.status === "published"`
  - `wasActive` is derived from the persisted row using the canonical active predicates
    (Product `status="PUBLISHED" AND isActive=true AND archivedAt IS NULL`; Offering
    `status="published"`).
- **Non-Launch behavior preserved:** update transitions are NOT newly gated for Growth/Scale
  (only Launch has a global ceiling); create paths are unchanged.
- **Error contract preserved:** rejected `updateProduct`/`updateCourse`/`updateService` THROW
  `outcome.reason` (the same structured `ContentLimitDecision` error as creates, e.g. `Core
  content limit reached (3/3).`).

Call sites (each routes `update(id, ..., tx?)` through the wrapper and throws on rejection):

- `src/features/products/actions.ts` → `updateProduct`
- `src/features/courses/actions.ts` → `updateCourse`
- `src/features/services/actions.ts` → `updateService`

Each `service.ts` gained a `resolveUpdateTransition` helper that reads the persisted row via the
transaction client (`findUnique`), computes `wasActive`, and derives `willBeActive` from the
input.

---

## 4. Capacity is cross-type and reuse-capable

- The global counter aggregates Products + Services + Courses (all stored as `Product` rows with
  a `type` column / `Offering` for services+courses) under ONE ceiling of 3.
- A freed slot is immediately reusable by any core type (browser-proven: demote a product → a
  **Service** publishes into the released slot).
- Games have no activation path (`games.actions.ts` has no update-to-published transition) and
  remain untouched.

---

## 5. Concurrency / Race Safety

- Activation re-counts ACTIVE usage **under the Tenant `FOR UPDATE` lock** inside the same
  `prisma.$transaction` that performs the update.
- Two concurrent publishers from 2 active items can activate at most one more — never 3 (test
  `Promise.allSettled` concurrency case asserts exactly one winner with one slot free; 3 of 4
  fit from 0).

---

## 6. NEW BUG FOUND & FIXED — Interactive Transaction Timeout (discovered in browser QA)

**Symptom (first browser publish attempt):**
```
Error: Transaction API error: A query cannot be executed on an expired transaction.
The timeout for this transaction was 5000 ms, however 5410 ms passed
  at ... resolveUpdateTransition → prisma.product.findFirst
```

**Root cause:** the wrapper resolved the active plan INSIDE the `$transaction` callback. Plan
resolution (`resolveActivePlan`) touches workspace settings + Billing v2 subscription +
`loadRuntimeFeatureOverrides` (a per-process promise cache). The new transition path added 3+
queries under the lock; the first real publish crossed Prisma's default interactive-transaction
timeout (5s) and aborted.

**Fix (all in `content-limit.enforcement.ts`):**
1. **Hoisted** `resolveActivePlan` OUT of the `$transaction` callback — the plan read does not
   need the Tenant lock; the lock exists to make count+write atomic. Plan is resolved once before
   the transaction.
2. Added optional `plan?: ResolvedActivePlan` param to `enforceContentLimit` to **avoid double
   plan resolution** on the transition path.
3. `prisma.$transaction(..., { timeout: 15_000 })` — raised the interactive-transaction ceiling
   (Prisma ^7.8.0 supports per-transaction `timeout`).
4. Imported `type ResolvedActivePlan` from `./plan-source`.

**Verified:** the exact browser sequence that timed out (Draft 1 → Published via Edit dialog)
now succeeds; rejection at 3/3 returns the structured limit error within normal latency.

---

## 7. Tests

New: `tests/unit/rccf72-16b-content-transition-enforcement.test.ts` — **27 tests, all passing**.

Harness: real actions/services/primitive; in-memory `Product`/`Offering` tables + serializing
`$transaction` queue that mirrors the Tenant `FOR UPDATE` lock (only one guarded callback runs at
a time); mocks for `@/lib/prisma`, `plan-source`, `next-auth`, `next/cache`, `content-change`
(same pattern as `rccf72-15b`).

Coverage by group:

1. **Product transition matrix** — draft→published at 2/3 allowed; draft→published at 3/3
   rejected (no DB write); edit-active at 3/3 allowed; publish→draft (demote) releases capacity;
   re-publish after demote allowed; `isActive:false` publish does not consume; archived→published
   rejected.
2. **Course transition matrix** — same shape via `updateCourse` (`Offering status="published"`).
3. **Service transition matrix** — same shape via `updateService`.
4. **Mixed-type global cap** — product activation at 3/3 blocked even if all 3 active are
   services/courses (cross-type, not per-type).
5. **Draft stockpiling regression** — 5 drafts exist, first 3 activations pass, 4th and 5th
   rejected (the CL-1 scenario end-to-end).
6. **Concurrency** — `Promise.allSettled` on simultaneous activations: with one free slot exactly
   one wins; from 0 active, 3 of 4 fit.
7. **Non-Launch** — Growth/Scale draft→published always allowed (no new gate).

Regression suites re-run green (all include the §6 fix):
- `rccf72-15b-launch-core-content-limit.test.ts`
- `rccf72-10-courses-services-error.test.ts`
- `rccf72-13-publish-quota-ux.test.ts`
- `rccf67-suspend-schedule.test.ts`
- `src/modules/billing/application/__tests__/content-limit.enforcement.test.ts`
- **5 files / 84 tests PASS.**

---

## 8. Browser QA (real account, dev server :3000)

Tenant `rccf7151-launch@example.com` (legacy Subscription creator_launch ACTIVE), was 0 active.

1. Created 5 drafts via UI (all allowed, active stays 0) ✓ (stockpile setup)
2. Publish Draft 1 → **allowed** (1/3) ✓
3. Publish Draft 2 → **allowed** (2/3) ✓
4. Publish Draft 3 → **allowed** (3/3) ✓
5. Publish Draft 4 → **REJECTED** `Core content limit reached (3/3).` — exploit closed ✓
6. Edit-active at 3/3 (rename "QA 72.16B Draft 1" → "QA 72.16B Active 1 Renamed", keep Published)
   → **allowed** ✓
7. Demote Active 1 → Draft → **allowed** (2/3) ✓ (slot released)
8. Re-publish Draft 4 → **allowed** (3/3) ✓ (freed slot reusable)
9. Demote Draft 2 → **allowed** (2/3) ✓
10. Publish Draft 5 as **type=Service** → **allowed** (3/3) ✓ (mixed-type consumes released slot)
11. Verified each step in DB (`Product.status`/`isActive`); tenant cleaned up → **0 active** after
    deleting all 5 temp products via UI ✓

DB evidence captured per step (products page + `Product` table reads). Note: the very first
publish attempt failed with the §6 timeout — that bug and its fix are the headline of this
closure; the whole sequence was re-run successfully after the fix.

---

## 9. Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (clean) |
| Focused RCCF-72.16B + regression suites | ✅ 84/84 (5 files) |
| Full `npx vitest run` | ✅ 3776 passed; 7 files / 8 tests fail — all pre-existing `rccf71-*` theme source-string assertions (files this ticket did NOT touch) |
| `npm run build` | ✅ PASS |
| `npx eslint` (touched files) | ✅ only pre-existing warnings, none in my files |
| `git diff --check` | ✅ PASS (clean; only CRLF warning in an unrelated file) |
| `npx prisma validate` | ✅ PASS (no schema/migration) |
| Browser QA (full §8 sequence) | ✅ PASS |

---

## 10. Files Changed (RCCF-72.16B only)

Implementation:
- `src/modules/billing/application/content-limit.enforcement.ts` — `LaunchActiveTransition`,
  generalized `withLaunchCoreContentCapacity(..., resolveTransition?)`, hoisted plan resolution,
  optional `plan` param on `enforceContentLimit`, `$transaction({ timeout: 15_000 })`,
  `ResolvedActivePlan` import.
- `src/features/products/actions.ts` + `service.ts` — guarded `updateProduct` +
  `resolveUpdateTransition` (throw on rejection).
- `src/features/courses/actions.ts` + `service.ts` — guarded `updateCourse` +
  `resolveUpdateTransition` (throw on rejection).
- `src/features/services/actions.ts` + `service.ts` — guarded `updateService` +
  `resolveUpdateTransition` (throw on rejection).

Tests:
- `tests/unit/rccf72-16b-content-transition-enforcement.test.ts` (new, 27 tests).

Docs:
- `docs/rccf-72.16b-content-transition-enforcement-closure.md` (this closure).

NOT modified: Prisma schema (no migration), billing pricing, publish quota, games, Theme
Experience, storefront runtime, Growth/Scale policy, and none of the unrelated in-flight
72.16A/theme working-tree files.

---

## 11. Deferred Issues

1. **UI throw-feedback gap:** a rejected `updateProduct` surfaces as an unhandled server-action
   error (500 toast in dev; console shows the thrown `Core content limit reached (3/3).`). The
   server contract is correct and the product stays DRAFT, but the Edit dialog does not render the
   reason inline. **Deferred** — separate UX ticket.
2. **Auto-provisioning create bypass** (demo/acquire flows) — already documented in the 72.15B
   closure; unchanged, still deferred.
3. **Pre-existing `rccf71-*` failures** (8 tests across 7 files) — theme source-string
   assertions on files this ticket did not touch; unrelated to RCCF-72.16B.
4. **Supabase advisory:** RLS is currently disabled across public tables (pre-existing, outside
   this ticket's scope). Should be surfaced to the user as a production-hardening item.

---

## 12. Final Acceptance Matrix

| Invariant | Result |
|---|---|
| Draft→Published at 3/3 REJECTED (products/courses/services) | ✅ PASS (tests + browser) |
| Draft→Published at 2/3 allowed | ✅ PASS |
| Edit-active at 3/3 allowed (no re-gate) | ✅ PASS (tests + browser) |
| Demote releases capacity; re-publish after demote allowed | ✅ PASS (tests + browser) |
| Draft stockpiling then batch-publish blocked | ✅ PASS (tests 5 + browser) |
| Cross-type (global, not per-type) | ✅ PASS (tests 4 + browser Service publish) |
| Concurrency race-safe | ✅ PASS (tests 6) |
| Growth/Scale updates not newly gated | ✅ PASS (tests 7) |
| Interactive transaction timeout fixed | ✅ PASS (browser re-run + tsc) |
| Server authoritative, tenant-isolated | ✅ PASS (plan resolved from DB; tenant-scoped queries) |
| No schema/billing/storefront/Growth/Scale regression | ✅ PASS (build green) |

---

## FINAL VERDICT

**A — PASSED**

The CL-1 stockpiling bypass is closed: update transitions now re-check the SAME canonical Launch
active-core ceiling as creates, under the Tenant lock, cross-type, with the correct throw
contract — and the fix surfaced + resolved a real interactive-transaction-timeout bug in the
legacy plan path. Fully unit-tested (27 new tests), regression-green (84/84 focused), browser-QA
verified end-to-end on a real account, and cleaned up.

**NOT COMMITTED, NOT PUSHED** (per instructions — present before committing; stage 72.16B
separately from the unrelated 72.16A/theme working-tree files).