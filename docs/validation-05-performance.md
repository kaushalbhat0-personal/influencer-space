# RCCF-VALIDATION-05 — Performance, Scale & Production Readiness

Audit-first, fix-only-high-confidence. No new features, no redesign, no new
runtimes. Everything measured against the production assumption: 5,000 creators,
500 agencies, 100k products, 2M gallery assets, 10M AnalyticsEvents, 500
concurrent users, 100 concurrent generations, Supabase + Vercel.

## Evidence Report (scores)

| Metric | Score | Notes |
| --- | --- | --- |
| **Performance** | **76 / 100** | Hot-path duplication fixed; storefront still rebuilds per request (by design, IMPLEMENTATION-16). |
| **Database** | **72 / 100** | Builder save batched (1,100→4 queries); missing composite indexes + seq scans are the remaining gap. |
| **Runtime** | **82 / 100** | Shared Runtime Context is the single aggregate build; duplicate scoring eliminated in the recommendation + health paths. |
| **Builder** | **80 / 100** | Save batched; load is single nested query; preview/focus refetches remain. |
| **Storefront** | **70 / 100** | ~19 queries/request (halved); hero LCP <img> + hydration remain. |
| **Dashboard** | **68 / 100** | Creator/admin dashboards re-count the same facts 3×; super-admin ledger unbounded. |
| **Super Admin** | **65 / 100** | Full-table lists + seq scans; websites page is the one correctly-paginated list. |
| **API** | **78 / 100** | No full-table API responses; no zod schemas; per-instance rate limits; dev-seed gate fixed. |
| **Cache** | **70 / 100** | React.cache patterns correct; unbounded LLM/cost logs bounded; no dead/stale caches. |
| **Frontend** | **72 / 100** | next/font self-hosted, CreatorImage CLS-safe; remotePatterns fixed; root framer-motion + missing loading UI remain. |
| **Production Readiness** | **74 / 100** | Pooled-vs-direct migrate config, sslmode=no-verify, anon storage policy, cron coverage are the gaps. |
| **Launch Readiness** | **78 / 100** | Launch-blocking hot-path + correctness fixes done; index migration + scale tooling are the roadmap. |

## Verification (post-fix)

- `tsc --noEmit` ✅
- `next build` ✅
- Full suite: **101 files / 1983 tests** ✅
- No architectural changes; Runtime Context remains the single aggregate build;
  no new runtimes; DDD/SOLID/DRY preserved.

## Fixes implemented (validated, high-confidence)

| ID | Sev | Area | Fix |
| --- | --- | --- | --- |
| P-01 | Critical | Storefront | `React.cache` around `getSnapshotData` — metadata + page previously each ran the full ~18-query pipeline (~38 queries/request → ~19). |
| P-02 | Critical | Builder | `BuilderService.save` batched with `createManyAndReturn` — ~1,100 sequential statements → 3 statements (atomic, same transaction). |
| P-03 | High | API/security | `/api/dev/seed` now requires SUPER_ADMIN outside `development` (was unauthenticated on any staging/preview deploy). |
| P-04 | High | Storefront images | `next.config.mjs` remotePatterns now include YouTube/Instagram/Twitch hosts — content-feed images threw "unconfigured host" on live storefronts. |
| P-05 | High | Cron | `sync-socials` batch cursor fixed — the same 5 tenants were synced every run; the long tail was never reached. |
| P-06 | High | Storefront CPU | `traceRuntime` logs + 11 per-section `LayoutEngine` logs gated to non-production (kept the E2E signature). |
| P-07 | High | Runtime | `websiteHealthEngine.evaluate` request-scoped memoized (13 queries once per request, not once per caller). |
| P-08 | Medium | Runtime | Recommendation `scoresSnapshot` builds the aggregate once (was twice per `complete()`). |
| P-09 | Medium | Cache | `intelligenceCache` bounded (48h TTL + 500-entry LRU) — was unbounded. |
| P-10 | Medium | Cache | `costMonitor` in-memory log capped at 1,000 entries — was unbounded. |

## Documents

- `docs/performance-audit.md` — phases 1/3/5/6/7/8 findings (queries, runtimes,
  storefront, dashboards, super-admin scale, APIs).
- `docs/database-audit.md` — full Prisma query + index audit (phases 1 + 2).
- `docs/runtime-audit.md` — Runtime Context + storefront render-path audit.
- `docs/frontend-audit.md` — frontend, cache, and background-job audit
  (phases 9/10/12).
- `docs/production-readiness.md` — Supabase/Prisma/Vercel/secrets/ISR (phase 11).
- `docs/performance-roadmap.md` — index migration plan, enforcement, scale tooling.
