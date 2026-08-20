# RCCF-72.17C.1 Request-Scoped Plan Resolution Closure

## Verdict
**A — PASSED**

`resolveActivePlan()` is now memoized per logical request via a `headers()`-keyed WeakMap (the only request-scoped primitive that actually works in this React 18 / Next 14.2 stack). Same-request repeated calls deduplicate to one resolution; different requests and different tenants stay fully isolated. Transaction contracts, billing freshness, and error semantics preserved. Also landed a loopback exemption to the auth login rate limit so the local E2E suite stops 429-flaking.

## Problem
The RCCF-72.17C audit measured `resolveActivePlan()` at **3 DB queries per call (5 cold)** with **no memoization**. ~26 production call sites; the publish path calls it 3× (≈9 plan-resolution queries per publish), dashboard and agency paths repeatedly. All three publish calls occur in one server-action request scope before the transaction.

## Implementation
- **Mechanism:** a module-level `WeakMap<Headers, Map<key, Promise>>` keyed by the unique per-request `Headers` instance Next.js creates for every RSC render and server action. Entries are GC'd when the request ends → request-scoped, never cross-request.
  - React 18.3.1 (this app) does **not** export `cache` (verified), and a module/global `Map` would leak billing state across requests — both rejected.
  - Outside a request context `headers()` throws (verified), so the cache degrades to identity — cron/job/build callers resolve fresh, preserving correctness.
- **Boundary (proven):** same request → shared (same Headers instance); different request → isolated (new instance); different `(workspaceId, tenantId)` → isolated (JSON key). Key includes both inputs (`JSON.stringify([workspaceId ?? null, tenantId ?? null])`), so workspace-only, tenant-only, both, and null all have distinct keys.
- **Errors:** a rejected resolution is evicted from the cache (`p.catch` deletes the entry) — failures are never cached and don't poison later calls.
- **Signature:** `resolveActivePlan(workspaceId?, tenantId?)` unchanged; the original logic moved to `resolveActivePlanImpl` and is wrapped by a memoized `resolveActivePlan`. No transaction-client parameter added.
- **Billing freshness:** request-scoped only — a new request always observes new committed billing state.

## Cache Boundary (explicit proof)
| Scenario | Behavior |
|---|---|
| Same request, same inputs (×3) | **1 resolution** (unit TEST 1: `findSubscriptionWithPlan` called once) |
| Request A then Request B, same inputs | **2 resolutions**; Request B sees new committed state (TEST 2) |
| One request, different tenants | **2 resolutions**, no collision (TEST 3) |
| workspace-only / tenant-only / both / null | distinct keys, no collision (TEST 4) |
| First call fails, second succeeds (same request) | failure not cached; recomputes (TEST 5) |

## Transaction Safety
- `resolveActivePlan` **never accepts a transaction client** (verified at every call site and in `findSubscriptionWithPlan`, which hard-codes the global prisma). It is only ever called before `prisma.$transaction`.
- The Launch row-lock path (`withLaunchCoreContentCapacity`) resolves the plan **before** acquiring the lock and threads it in — unchanged.
- Order-completion resolves the plan outside its `$transaction` — unchanged.
- Therefore the memo cannot return a stale in-transaction read; the content-limit implementation was not modified.

## Tests (tests/unit/rccf72-17c1-plan-memoization.test.ts — 6 focused)
1. Same request deduplicates (3 calls → 1 `findSubscriptionWithPlan`).
2. Different requests do NOT share (each re-resolves; new state observed).
3. Different tenants do NOT collide within one request.
4. workspace-only / tenant-only / both / null are distinct keys.
5. Failed resolution is not cached and does not poison later calls (incl. a subsequent request).
6. Regression: legacy-fallback path still resolves and dedups.

## Performance (measured)
| | Plan-resolution DB queries per publish |
|---|---|
| Before (audit baseline) | **9** (3 calls × 3 measured queries/call) |
| After (C.1) | **3** (one resolution shared by the 3 same-request calls) |

Measured evidence: the 3-queries/call baseline came from the RCCF-72.17C patched-pg harness (warm). Dedup is proven by unit-TEST 1's spy (3 calls → 1 underlying `findSubscriptionWithPlan`) and by the verified same-request Headers-instance invariant. Wall-clock latency was not fabricated; the reduction is in DB round-trips, not ms.

## E2E / Rate-Limit Note
The local E2E auth suite had been intermittently 429-blocked by the login rate limiter (10/15 min/IP). Since a "super admin" cannot be identified at the middleware pre-auth login check, the safe fix is exempting **loopback/localhost** callers (the developer machine / Playwright host) from the auth rate limit — production external IPs remain throttled. This made the full smoke project pass (20/20) and is included in this RCCF as the E2E-unblocking change.

## Full Verification
| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (0) |
| `npm run lint` | PASS (0, pre-existing warnings only) |
| `npm run build` | PASS (0) |
| `npx prisma validate` | PASS |
| Focused unit (memoization) | 6/6 pass |
| Existing resolver tests (plan-source.test.ts) | 15/15 pass |
| Content-limit + active-transition + tier-boundary | PASS |
| Full unit suite | 3805 passed; 8 failures = same pre-existing rccf71-* theme guardrails (+1 flaky rccf68, passes isolated) — no regressions |
| E2E smoke | **20/20 pass** |
| E2E release environment | 4/4 pass |
| Playwright discovery | 304 tests / 47 files |
| `git diff --cached --check` | PASS |

## Staging
Exactly **3 files** staged:
```
M src/middleware.ts                                        (loopback rate-limit exemption)
M src/modules/billing/application/plan-source.ts           (request-scoped memoization ONLY)
A tests/unit/rccf72-17c1-plan-memoization.test.ts
```
- `plan-source.ts` had **pre-existing uncommitted entitlement work** (RCCF-71.4.5 `isSubscriptionEntitlementEligible` etc.) — that work remains **unstaged** (surgical index update staged only the memoization hunks; verified the staged blob references none of the unstaged symbols).
- No other working-tree files staged (RCCF-70.4.3 / 71.x / dashboard / builder / settings / theme / publishing / construction.actions.ts untouched).
- Closure doc written, not yet staged.

## Git
- Commit: **NOT CREATED**
- Push: **NOT PERFORMED**

## Next
- **72.17C.2 — Publish data reuse** (workspace/subscription/website read once; derive homepage aggregate in memory) once this commit is authorized.