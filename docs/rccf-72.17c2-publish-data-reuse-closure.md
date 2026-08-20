# RCCF-72.17C.2 Publish Data Reuse Closure

## Verdict
**A — PASSED**

Confirmed the publish-path duplication, measured it against the real DB, and implemented the provably-safe reuse: the two aggregate builds (full + homepage) now share 9 identical reads, cutting the homepage aggregate build from **18 → 8 queries (10 saved per publish)** with **byte-identical output** (deep-equal verified). Tenant isolation, authorization, billing freshness, transaction boundaries, and publish semantics all preserved. Full derivation of the homepage aggregate in memory was audited and **deferred** (not provably output-identical — see Deferred).

## Problem
The 72.17C audit and live measurement showed `publish()` builds the website aggregate **twice**: `buildWithDiagnostics(tenantId)` (full) + `build(tenantId, { homepage: true })` (homepage-curated). Both builds re-run the SAME 9 shared reads (brand, hero, links, seo, website, testimonials, faq, knowledge, open bookings). Measured baseline (real DB, patched-pg harness):
- Full publish: **54 queries**
- Homepage aggregate build alone: **18 queries**
- Repeated groups: workspace ×6, website ×4, billingSubscription ×4, billingPlan ×5, tenant ×4

## Baseline (measured)
| Query Group | Before |
|---|---|
| Full aggregate build | 16 |
| Homepage aggregate build | 18 |
| Total publish | 54 |

## Implementation
- **`src/modules/tenant/application/website-aggregate.service.ts`** (additive, backward-compatible):
  - Added `SharedReads` type (the 9 shared reads).
  - `buildWithCollector` now accepts an optional `preload?: SharedReads` and returns `{ aggregate, sharedReads }`.
  - New `loadSharedReads()` — issues the 9 shared reads OR reuses a preload (identical committed rows, same request).
  - New `buildWithDiagnosticsAndShared()` (full build + returns shared reads) and `buildHomepageFromShared()` (homepage build reusing the shared reads).
  - `build()` / `buildWithDiagnostics()` signatures unchanged → storefront/builder/preview callers unaffected.
- **`src/lib/publishing/service.ts`**: `publish()` calls `buildWithDiagnosticsAndShared` then `buildHomepageFromShared(tenantId, sharedReads)` instead of two independent builds.
- The collection queries that genuinely differ in homepage mode (products/gallery featured+topUp, timeline/games/contentFeed/offerings caps) **still run** — output is unchanged by construction.

## After (measured)
| Query Group | Before | After |
|---|---|---|
| Full aggregate build | 16 | 16 |
| Homepage aggregate build | **18** | **8** |
| Total publish | 54 | **44** (54 − 10) |

**Reduction: 10 queries per publish (~18% of publish, ~55% of the homepage aggregate build).** Output equivalence: `JSON.stringify(reused) === JSON.stringify(oldHomepage)` = **true** (real-DB harness). No wall-clock latency claimed (only DB round-trips measured).

## Data Reuse Safety
- **Tenant isolation:** all reads remain tenant-scoped by the caller-provided `tenantId`; the preload is only ever the SAME tenant's data fetched earlier in the same request (test 4).
- **Authorization:** unchanged — no query scope widened, no global access.
- **Billing freshness:** the reuse is request-scoped (identical committed rows within one request, no intervening writes); new requests re-read. C.1's request-scoped plan guarantee untouched.
- **Transaction boundaries:** the reuse happens entirely OUTSIDE the publish commit transaction (both aggregate builds precede `$transaction`); nothing moved across a boundary.
- **Publish semantics:** the homepage aggregate's curation (featured-first, capped, fallback-to-all) and the full aggregate are produced by the exact same code paths; only the shared reads are preloaded. Snapshot output deep-equal verified.

## Tests (tests/unit/rccf72-17c2-publish-aggregate-reuse.test.ts — 4 focused)
1. **Output equivalence:** `buildHomepageFromShared` output === `build(tenantId, { homepage: true })` output (deep-equal).
2. **Query reduction:** the reuse path adds ZERO shared-read queries (2 full builds × 9 shared reads; the 2 homepage reuse builds add none).
3. **Collection queries preserved:** homepage-mode featured+topUp products/gallery queries still issue.
4. **Tenant scoping:** all repository reads stay keyed to the caller's `tenantId`.

## Full Verification
| Gate | Result |
|---|---|
| Focused (C.2 + publish + billing) | 42/42 pass |
| `npx tsc --noEmit` | PASS (0) |
| `npm run lint` | PASS (0, pre-existing warnings) |
| `npm run build` | PASS (0) |
| `npx prisma validate` | PASS |
| Full unit suite | 3810 passed; 7 failures = pre-existing rccf71-* theme guardrails (no regressions) |
| E2E smoke | PASS (super-admin login, homepage, invalid-login) |
| Playwright discovery | 304 tests / 47 files |
| `git diff --cached --check` | PASS |

## Staging — exactly 3 files (surgical)
```
M src/lib/publishing/service.ts                      (2 call-site swaps only)
M src/modules/tenant/application/website-aggregate.service.ts  (C.2 hunks only)
A tests/unit/rccf72-17c2-publish-aggregate-reuse.test.ts
```
- `service.ts` had pre-existing RCCF-71.2 work (`themeConfig`/`applyExperienceOverride`) — **excluded** (staged blob verified themeConfig-free).
- `website-aggregate.service.ts` had pre-existing RCCF-71.x hero-background work — **excluded** (staged diff = only the 5 C.2 hunks).
- The uncommitted RCCF-72.17C.1 files were **unstaged** from the index so C.2 is a standalone commit (C.1 remains staged for its own authorization).

## Deferred
- **Full in-memory homepage aggregate derivation** (eliminate the homepage build entirely, ~8 more queries): audited and found NOT provably output-identical. The homepage `courses`/`services` come from a `take: 24` offerings window; deriving them from the full aggregate can miss an old featured course outside that window. Requires a dedicated RCCF with careful equivalence handling.
- Website-read merge (line 148 + 172, ~1 query): entangled with the pre-existing 71.2 `themeConfig` select — deferred to avoid mixing protected work.

## Git
- Commit: **NOT CREATED**
- Push: **NOT PERFORMED**