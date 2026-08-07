# Performance — Final (RCCF-LAUNCH-01)

Production Scale Hardening Sprint — performance work and evidence.

## Optimized query paths

| Path | Before | After | Evidence |
| --- | --- | --- | --- |
| Storefront data pipeline | ~38 DB queries/request (metadata + page both built the full aggregate) | **~19** (single build via `React.cache`) | `[domain]/page.tsx` — `getSnapshotData` memoized |
| Builder save | ~1,100 sequential statements (per-page create + per-section create) | **3 statements** (`createManyAndReturn`) | `builder-service.ts:saveInner` |
| Super-admin dashboard | metrics aggregation ran twice (collect + alert eval) | once (metrics threaded into `evaluateAllRules`) | `super-admin/page.tsx` + `alert-evaluator.ts` |
| Super-admin tenant list | full Tenant row (incl. secrets) + every user per tenant | lean `select` + `take:1` user | `super-admin.service.ts:getAllTenants` |
| Recommendation `complete()` | aggregate built 2× per call | 1× (reuse `ctx.snapshot`) | `recommendation-runtime/runtime.ts:scoresSnapshot` |
| Website health eval | 13 queries per caller per request | 1× per request (`requestCache`) | `platform/health/engine.ts:evaluate` |
| Dashboard metrics | re-queried per consumer | 1× per request (`requestCache`) | `dashboard/service.ts:getMetrics` |

## Runtime consolidation (Phase 2)

- `dashboardService.getMetrics`, `websiteHealthEngine.evaluate` now request-cached
  (same `requestCache` convention as the Runtime Context builder) — repeated
  reads within one render are deduplicated.
- Super-admin dashboard alert evaluation reuses the collected metrics instead of
  re-running the full aggregation.
- Runtime Context remains the **only** canonical aggregate build; no new runtimes
  or caches introduced.

## Cache hardening (Phase 6)

| Cache | TTL | Max entries | Eviction | Status |
| --- | --- | --- | --- | --- |
| `intelligenceCache` (LLM) | 48h | 500 | LRU (oldest) | V-05 |
| `costMonitor.costLog` | — | 1,000 | shift | V-05 |
| `cacheRuntime` (intelligence) | per-entry | 1,000 | sweep expired + oldest | LAUNCH-01 |
| rate-limiter `requestCounts` | per-entry | sweep every 50 calls | expired keys | LAUNCH-01 |
| `platformTelemetry.timer/histogram` | — | 1,000 / key | shift | LAUNCH-01 |

## Observability (Phase 10)

Added `builder_save` and `generation` duration/outcome telemetry (publish,
provision, billing already recorded). `platformTelemetry.snapshot()` already
computes **P50/P95/P99** per timer key; arrays are now bounded.

## Background jobs (Phase 9)

- **New** `/api/cron/integrity-cleanup` (daily, CRON_SECRET) — runs
  `runSafeCleanup` (recovers stuck generation sessions + purges stale terminal
  sessions) + `partnerEngine.expireStaleInvites()` + records the integrity scan.
- `sync-socials` batch cursor fixed in V-05 (no longer re-syncs the same 5
  tenants). `jobRunner` interval jobs remain documented as roadmap (run via
  `initialize()` or dedicated crons) — the cron routes are the execution path.

## Regression verification

`tsc --noEmit` ✅ · `next build` ✅ · **101 files / 1983 tests** ✅ · no new lint
warnings · no duplicate runtime logic · Runtime Context canonical · DDD/SOLID/DRY
preserved.
