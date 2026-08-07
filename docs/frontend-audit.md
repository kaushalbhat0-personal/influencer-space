# Frontend, API, Cache & Jobs Audit — RCCF-VALIDATION-05 (Phases 8, 9, 10, 12)

## Phase 8 — API routes

15 routes audited. **No route returns a full table** (all take/limit). Two are
rate-limited (register, razorpay). None use zod. **FIXED** items marked.

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| API-01 | HIGH | `/api/dev/seed` was unauthenticated outside `production` (staging/preview could reseed the DB) | **FIXED** — SUPER_ADMIN required in non-development |
| API-02 | MEDIUM | Rate limiting is per-instance (module Map) — bypassable across serverless instances | Redis/Upstash counters |
| API-03 | MEDIUM | No zod schemas; register accepts client `planCode` | zod + catalog validation |
| API-04 | MEDIUM | `computeAnalytics` scans all orders in range (bypasses `metricsRegistry` cache) | route through cached registry |
| API-05 | MEDIUM | Razorpay webhook idempotency check runs twice (route + service) | drop the route-level check |
| API-06 | MEDIUM | `sync-socials` awaits 3 platform fetches serially per tenant | `Promise.all` the platform pairs |
| API-07 | LOW | `support/search` runs 4 sequential `findMany` | `Promise.all` |
| API-08 | LOW | `cleanup-audit` `days` param unclamped (`days=0` deletes all) | clamp 7–730 |

## Phase 9 — Caches

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| C-01 | **CRITICAL** | Storefront `getSnapshotData` not memoized → metadata + page each ran the full pipeline | **FIXED** — `React.cache` |
| C-02 | HIGH | `intelligenceCache` no TTL / no cap — stable profiles cached forever, Map grows unbounded | **FIXED** — 48h TTL + 500-entry LRU |
| C-03 | HIGH | `costMonitor.costLog` array unbounded | **FIXED** — capped at 1,000 |
| C-04 | MEDIUM | `commissionLedger.initialize` loads the entire CommissionEntry table into memory | paginate; index `(partnerId, createdAt)` |
| C-05 | MEDIUM | rate-limiter Map leaks keys (only evicted on re-hit) | periodic sweep / Redis |
| C-06 | MEDIUM | `cacheRuntime` (intelligence runtime) TTL but no size cap; duplicate of `intelligenceCache` | LRU cap; consolidate |
| C-07 | MEDIUM | domain changes revalidate only the settings page (matters once ISR lands) | revalidate storefront roots |
| C-08 | GOOD | `React.cache` in `lib/tenant.ts` and `runtime-context/builder.ts` correct; revalidation via `afterContentChange` covers 80+ mutation sites | — |
| C-09 | GOOD | `bus.history` (500 cap), `seo/cache`, `analytics/metrics`, `billing invoiceCache`, `operations-aggregator` all bounded | — |

## Phase 10 — Background jobs

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| J-01 | **CRITICAL** | `sync-socials` synced the SAME 5 tenants every run (nothing advanced `updatedAt`) — long tail never synced | **FIXED** — cursor bump after each tenant |
| J-02 | **CRITICAL** | `jobRunner.start()` never invoked — `expire-invites` and `cleanup-audit` interval jobs are dead (only the cron works) | invoke bootstrap in `instrumentation.ts` or add `/api/cron/expire-invites` |
| J-03 | CRITICAL | Generation queue/worker-pool runtime is test-only; production generation is synchronous + fire-and-forget | wire a persisted queue or a recovery cron |
| J-04 | HIGH | No billing-reconciliation cron; reconciliation is manual-only | `/api/cron/reconcile` (idempotent by `idempotencyKey`) |
| J-05 | HIGH | No orphan-cleanup cron; `runSafeCleanup`/`runIntegrityScan` are super-admin-button-only | `/api/cron/integrity-cleanup` (CRON_SECRET) |
| J-06 | MEDIUM | Duplicate cleanup path (`cleanup-audit` cron + interval job would both run) | keep one |
| J-07 | GOOD | Both crons registered in `vercel.json`, CRON_SECRET-protected, retry-safe (idempotent upserts/deletes) | — |

## Phase 12 — Frontend

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| FE-01 | HIGH | `images.remotePatterns` missing YouTube/Instagram/Twitch — content-feed images broke live storefronts ("unconfigured host") | **FIXED** — hosts added |
| FE-02 | MEDIUM | Root `template.tsx` framer-motion wrapper on every route incl. public storefront | scope to marketing group or remove |
| FE-03 | MEDIUM | Storefront sections all hydrate client-side (incl. below-the-fold forms) | split static/client; lazy-hydrate below fold |
| FE-04 | MEDIUM | No `loading.tsx` for `[domain]`, `/builder`, `/agency/**` | add Suspense/loading UI |
| FE-05 | MEDIUM | Hero LCP image is a lazy raw `<img>` | `CreatorImage` + priority |
| FE-06 | MEDIUM | `recharts` + `Lightbox` (framer-motion) statically imported | `next/dynamic` |
| FE-07 | LOW | `minimumCacheTTL: 86400` — creator image edits stale 24h | lower / revalidate on publish |
| FE-08 | GOOD | `next/font/local` (no render-blocking font links); CreatorImage aspect-ratio + blur placeholders (CLS-safe); YouTube embeds in `aspect-video`; builder already `next/dynamic ssr:false` | — |
