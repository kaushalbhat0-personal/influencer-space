# Platform Performance Audit — RCCF-VALIDATION-04

## Profile at 5,000 creators / 500 agencies / 100,000 orders

| Surface | Current behaviour | Verdict at scale |
| --- | --- | --- |
| Dashboard | Loads ALL tenants (no `take`) + renders an un-virtualized full-table ledger on every load; per-tenant plan resolution is batched (good) | **Fails** — O(n) full-table serialization per request |
| Tenants list | `getAllTenants` unbounded; `DataTable` paginates client-side only | **Fails** — browser receives all rows |
| Users | `take: 200`, no pagination; counts were window-derived (fixed) | **Degrades** — no deep navigation |
| Payments/Invoices | `take: 200`, no pagination | **Degrades** |
| Websites | Server-paginated (skip/take 50) — the only correctly scaled list; status filter was broken (fixed) | **Good** |
| Recommendations / Business Health / Experience / Evolution | Thin wrappers over canonical runtimes reading persisted rows; `businessHealth.platformHealth()` loads all `influencer_data` settings | **Good**, with aggregation roadmap |
| Revenue | `findMany(take: 1000/5000)` then reduce → numbers silently understated past the cap | **Fails** — must use Prisma aggregates |
| Integrity scan | Loads all workspace/billing/booking/website rows into memory per request; re-run on every page load | **Fails** — heavy + noisy |
| Domains | `Promise.allSettled` of up to 100 Vercel `GET`s per render | **Fails** — rate-limited, slow |
| AI Ops | Reads an in-memory cost monitor (never recorded) | **Empty** — no real work to measure |
| Event Runtime | `AnalyticsEvent` insert per event; indexed on `(tenantId, occurredAt)` | **Good** for 1000 events |

## Findings

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| P-01 | HIGH | Unbounded tenant list + dashboard ledger (`super-admin.service.ts:62-83`, `super-admin/page.tsx:141`) | Server-side `skip/take` + `searchParams` (mirror websites page) or defer ledger behind an API |
| P-02 | HIGH | `?status=` filter on websites was discarded (no-op) | **FIXED** — single `where` |
| P-03 | MEDIUM | Revenue computed from capped `findMany` | Prisma `aggregate` |
| P-04 | MEDIUM | Integrity scan O(all rows) on every page load | Persist last scan, index, run on demand |
| P-05 | MEDIUM | Domains page fires up to 100 Vercel calls per render | Cache `domainVerifiedAt`, nightly re-verify cron |
| P-06 | MEDIUM | `AnalyticsEvent` has no `updatedAt` index on `GenerationSession` | Add `@@index([status, updatedAt])` |
| P-07 | LOW | Users/role counts derived from a 200-row window | **FIXED** — `groupBy` |
| P-08 | GOOD | Builder/save/publish already profiled in V-03.5 (`docs/builder-performance.md`); save is atomic but O(n) rewrite — roadmap there |

## Recommendations (priority)

1. Server-side pagination + search for tenants/users/payments (reuse the websites pattern).
2. Prisma aggregates for all revenue/invoice totals (no `take` truncation).
3. Persist integrity scan results; run scans on demand, not per request.
4. Cache domain verification status and reconcile in a cron.
5. Back AI cost telemetry with a DB table and render from it (see Operations Report).
