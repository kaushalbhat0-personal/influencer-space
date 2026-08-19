# RCCF-72.10 — Courses/Services Structured Error Remediation (Closure)

**Status:** Complete (audit + implementation + verification + browser QA — **no commit**)
**Date:** 2026-08-19
**Ticket:** Closes **72.3-F1** — "Course/Service write-block → 500 + unhandled pageerror, no UX" (P2)
**Predecessor:** RCCF-72.8 (Creator Remediation Consolidation) §12 → recommended **RCCF-72.10 — Structured Commerce Write Errors**
**Mode:** AUDIT FIRST → IMPLEMENT → VERIFY → report. **DO NOT COMMIT.**

---

## 1. Root cause

Both commerce write actions rejected the content limit by **throwing** the raw
`enforceContentLimit` decision across the server-action boundary:

- `src/features/courses/actions.ts:36` — `if (!limit.ok) throw new Error(limit.reason);`
- `src/features/services/actions.ts:30` — `if (!limit.ok) throw new Error(limit.reason);`

The consuming client managers (`courses-manager.tsx`, `services-manager.tsx`) call
`createCourse`/`createService` inside a `try { … } finally { … }` with **no catch**, so a
thrown error surfaced as an **unhandled server-action rejection**: the drawer stayed open,
**no friendly message** was shown, and in dev this presented as a pageerror / 500-class
failure. The human-readable `limit.reason` (e.g. "Services limit reached (3/3).") never
reached the user.

This is the exact class the codebase already fixed for Games/Bookings/Gallery/Milestone/Link/
Affiliate (`return { success: false, error: limit.reason }`), but courses and services (plus
products/testimonials/faq) remained on the throwing pattern.

## 2. Shared architectural cause

A single anti-pattern was duplicated per surface: `enforceContentLimit` returns a rich,
structured `ContentLimitDecision` (`ok`, `reason`, `used`, `limit`, `suggestedUpgrade`), but
the actions **discarded** that structure by `throw`ing `limit.reason`, forcing the client to
treat every write as either an unhandled rejection or a successful data return. There was no
shared "limit rejected" result contract that a server action could return safely and a client
could inspect.

The consolidation ticket (RCCF-72.8 §12) explicitly directed: *"Match Games/Bookings
structured-error contract."* The Games contract is `{ success: boolean; error?: string; fieldErrors? }`.

## 3. Implementation

Introduced one shared structured limit-error primitive and used it from **both** surfaces
(no per-feature taxonomy):

**New shared primitive — `src/modules/billing/application/content-limit.result.ts`:**
- `ContentFailure` — `{ success: false; error: string }` (generic write failure).
- `ContentLimitRejection extends ContentFailure` — adds `featureKey`, `used`, `limit`,
  `suggestedUpgrade?` (the structured limit-rejection result).
- `ContentMutationResult<T>` — `{ success: true; data: T } | ContentFailure`.
- `contentLimitRejection(decision)` — builds a `ContentLimitRejection` from a
  `ContentLimitDecision` (`error = reason ?? "Limit reached for this plan."`).

**`src/features/courses/actions.ts` — `createCourse`:**
- Returns `Promise<ContentMutationResult<CourseData>>`.
- `!limit.ok` → `return contentLimitRejection(limit)` (no throw, no record).
- Success → `return { success: true, data: result }`.
- Whole body wrapped in `try/catch` → `return { success: false, error: "Failed to create course" }`
  (matches the Games catch-all; never leaks Prisma/Postgres text; never an unhandled rejection).

**`src/features/services/actions.ts` — `createService`:** identical change, `ServiceData`,
generic message "Failed to create service".

**UI (the "no UX" half of 72.3-F1):**
- `courses-manager.tsx` / `services-manager.tsx`: added `error` state; `handleSave` checks
  `res.success`; on rejection it sets `error`, **keeps the drawer open**, and preserves the
  typed form; a red inline alert (`<p>` with the `error` text) renders above the action
  buttons. Error clears on open (create/edit).

**Tests updated/added** (see §8).

## 4. Plan behavior

The enforcement logic and plan source are **unchanged** — this only changes how a rejection
is *delivered*, never whether one occurs. Verified against the canonical plan config
(`src/config/commerce/plans.ts`):

| Plan | max_services | max_courses | Behavior after fix |
|---|---|---|---|
| `creator_launch` | 3 | 0 | Services: allow 3, then "Services limit reached (3/3)." — Courses: immediately "Courses is not available on your current plan." |
| `creator_grow` | −1 (∞) | −1 (∞) | Create always allowed (no rejection surfaced) |
| `creator_scale` | −1 (∞) | −1 (∞) | Create always allowed |
| partner_* | 5/20/100 | — | Services limited (unchanged); courses inherit default |

No limit values, capabilities, or plan definitions were altered. `-1` (unlimited) continues
to short-circuit to `ok: true` in `capabilityService.checkLimit`.

## 5. Security

- **No limits weakened, no server-side bypass.** The canonical `enforceContentLimit` →
  `capabilityService.checkLimit` → plan-source gate remains the single authority and is
  untouched. The rejection is still enforced server-side before any write.
- **No tenant-isolation change.** Session-derived `tenantId` auth (`getServerSession`) is
  unchanged; ownership checks in the service layer (RCCF-63.3) still apply.
- **No internal leakage.** The generic `try/catch` returns a fixed "Failed to create
  course/service" string — Prisma/Postgres/Zod internals are never serialized to the client.
- **No fabricated success.** Every failure returns `success: false`; the UI never appends a
  record that was not created.

## 6. Persistence behavior

- On a limit rejection (`!limit.ok`) the action returns before calling
  `courseService.create`/`serviceService.create` → **no Offering row is written**, and
  `revalidatePath`/`afterContentChange` are not invoked.
- On success exactly one `Offering` row (`type "course"` / `type "coaching"`) is written, as
  before.
- Browser QA confirmed: at 3/3 a 4th service attempt created **no** row; on the disabled
  courses surface a course attempt created **no** row. All QA fixtures were deleted to restore
  original state.
- No schema change; `Prisma schema` untouched.

## 7. Browser QA

Dev server on `localhost:3000` (PID 14720), real accounts, password `Audit72!QaPass`.

| # | Scenario | Result |
|---|---|---|
| A | **Launch services 0→3** (`rccf7151-launch@example.com`, subdomain `rccf7151-launch`): created 3 services successfully | PASS — 3 rows appear |
| B | **Launch 4th service (3/3)** → attempt "…QA Service Overflow" | PASS — drawer shows **"Services limit reached (3/3)."**, drawer stays open, form preserved, **no 4th row** |
| C | **Launch courses (disabled, max_courses=0)** → attempt "…QA Locked Course" | PASS — drawer shows **"Courses is not available on your current plan."**, **no course row** |
| D | **Growth normal create** (`rccf7151-growth@example.com`, unlimited) — created service + course | PASS — both succeed, rows appear |
| E | **Scale normal create** (`rccf7164-scale-1787027917475@example.com`, unlimited) — created service | PASS — succeeds |
| F | **Console** across all flows | 0 errors (only a benign Next.js CSS-preload warning) — no unhandled pageerror / 500 |
| G | **Storefront unchanged** (`/rccf-7164-scale-qa`, `/rccf7151-launch`) | PASS — render clean, 0 errors |
| H | **Fixture restore** | All QA services/courses deleted; Launch/Growth/Scale returned to original 0-service/0-course state |

Evidence screenshots (uncommitted): `rccf7210-launch-services-overflow-rejected.png`,
`rccf7210-launch-courses-disabled-rejected.png`.

## 8. Tests

New: **`tests/unit/rccf72-10-courses-services-error.test.ts`** — 9 cases covering both actions:
ok-path returns `{ success: true, data }` + calls limit check & persistence & revalidate;
rejection (disabled / reached) returns structured `{ success: false, error, featureKey, used,
limit, suggestedUpgrade }` and **does not** call persistence/revalidate/content-change;
persistence-throw returns generic failure; no-tenant returns generic failure.

Updated: **`tests/unit/rccf67-service-booking.test.ts`** — the three `createService` call sites
unwrap the new `{ success: true, data }` shape; the "max_services enforced" case now asserts a
structured rejection and that **no offering is created** (previously asserted `rejects.toThrow`).

Result:
- Focused 72.10 + rccf67 + courses/services + content-limit suites: **44/44 PASS**.
- Enforcement-related suites (affiliate, rccf12, rccf67-capability-surface, rccf69, rccf65,
  rccf63, runtime-config): **77/77 PASS**.
- Full suite: **3676 passed / 7 failed** — the 7 failures are the **pre-existing**
  `rccf71-6-2-partner-theme-entitlement` theme-guardrail assertions (Theme surface, frozen +
  out of scope; identical baseline before this change). No new regressions.

## 9. Files changed

In scope (72.10):
- `src/modules/billing/application/content-limit.result.ts` — **new** shared primitive.
- `src/features/courses/actions.ts` — `createCourse` returns `ContentMutationResult<CourseData>`.
- `src/features/services/actions.ts` — `createService` returns `ContentMutationResult<ServiceData>`.
- `src/app/admin/courses/_components/courses-manager.tsx` — error state + result handling + UI.
- `src/app/admin/services/_components/services-manager.tsx` — error state + result handling + UI.
- `tests/unit/rccf67-service-booking.test.ts` — updated to the new structured contract.
- `tests/unit/rccf72-10-courses-services-error.test.ts` — **new** test suite.

Modified-diff stat (5 tracked files): **68 insertions(+), 35 deletions(-)**.

Evidence (untracked): `rccf7210-launch-services-overflow-rejected.png`,
`rccf7210-launch-courses-disabled-rejected.png`.

NOT touched: billing, Partner commission, Partner pricing, preview security, Save Identity,
publishing quota, Theme Experience, storefront architecture, Prisma schema. The large
pre-existing working-tree diff (70.x/71.x/72.x/73.x files) was left untouched.

## 10. Deferred findings

- **products / testimonials / faq still throw** `limit.reason` on `!limit.ok` (same class).
  Out of scope for this ticket; a follow-up can adopt the same shared primitive
  (`contentLimitRejection`) and UI pattern.
- **update/delete** course/service paths still throw on unexpected errors (no limit check, not
  part of 72.3-F1). Managers' update/delete branches are unchanged.
- **Upgrade CTA not wired.** The rejection carries `suggestedUpgrade`, but the managers render
  only `error`. A future enhancement could surface an "Upgrade to Growth/Scale" action.
- **Validation (`courseFormSchema.parse`) still throws** ZodError on malformed input; the UI
  gates on a non-empty title so this is effectively unreachable via the drawer.

## 11. Final verdict

**CLOSED.** 72.3-F1 remediated: `createCourse` and `createService` no longer throw the raw
content-limit rejection across the server-action boundary. Both now return a single shared,
structured result contract (`ContentMutationResult`) that carries a friendly `error` (and limit
context) on rejection and the created record on success; both admin managers surface the message
inline and **never create a record** on rejection. The server-side limit gate, plan source, and
tenant ownership are unchanged; security and persistence semantics are preserved.

Verification: `npx tsc --noEmit` clean; focused + related suites green; full suite only the
pre-existing 7 out-of-scope `rccf71-6-2` failures; `npm run build` clean; eslint clean on
touched files; `git diff --check` clean; browser QA across Launch (limit + disabled + overflow),
Growth (unlimited), Scale (unlimited), storefronts unchanged, fixtures restored.

**Not committed** per ticket instructions. Ready for review / commit approval.
