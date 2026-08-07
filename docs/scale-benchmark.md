# Scale Benchmark — RCCF-LAUNCH-01

Evidence (code-measured statement/query counts — no live 5,000-tenant DB was
available during the sprint; a load-test methodology is included for the
production run).

## Before / After

| Benchmark | Before | After | Method |
| --- | --- | --- | --- |
| Builder save — 100 pages / 500 sections / 5000 blocks | ~1,100 sequential DB statements (≈2–5s @2ms RTT) | **3 statements** (<20ms round-trips) | statement-count analysis of `saveInner` |
| Storefront page — per request | ~38 DB queries (metadata + page both built the aggregate) | **~19** | query-count analysis of `getSnapshotData` |
| Storefront SSR — layout resolve | 2× per request | 1× | call-path analysis |
| Storefront CPU — trace/hash + logs | full-aggregate SHA-256 + 11 logs/section per request | hash only; logs gated | code analysis |
| Super-admin dashboard | metrics aggregated twice (collect + alert eval) | once | call-path analysis |
| Super-admin tenant list payload | full Tenant row (incl. secrets) + all users × 5,000 | lean select + `take:1` user | payload analysis |
| Recommendation `complete()` | 2 aggregate builds | 1 | call-path analysis |
| Website health eval per request | 13 queries × per-caller | 13 once | requestCache analysis |
| `sync-socials` coverage | same 5 tenants every run | cursor advances (full coverage) | batch-cursor analysis |
| Index coverage — AnalyticsEvent page-view | `(tenantId, occurredAt)` + JS filter on eventType | `(tenantId, eventType, occurredAt)` | index audit |

## Target profile (500 concurrent users / 100 concurrent generations)

| Surface | Query estimate | Risk | Mitigation |
| --- | --- | --- | --- |
| Storefront view | ~19 (indexed) | medium | index migration + aggregate-derived metrics (roadmap Phase B) |
| Builder save | 3 statements in 1 tx | low | tx slots freed (~1,100 → 3) |
| Generation | synchronous + fire-and-forget | high | queue wiring is the documented roadmap |
| Dashboard load | ~26 (deduped) | medium | requestCache + pagination |
| Integrity cleanup | nightly, index-backed | low | `(status, updatedAt)` + `(key)` indexes |

## Load-test methodology (run against production Supabase/Vercel)

1. **Seed:** 5,000 tenants, 100k products, 2M gallery rows, 10M analytics rows
   (scripted `createMany` batches).
2. **Storefront:** k6 ramp 0→500 VUs over 10 min against `[domain]`; record P50/
   P95/P99 SSR latency, DB queries/sec (pg_stat_statements), error rate.
3. **Builder:** parallel `saveBuilderPages` at 100 concurrent users; record
   save wall-time P95 and transaction-slot pressure.
4. **Generation:** 100 concurrent `runCreatorGeneration`; record duration P95
   and stuck-session recovery latency (cron).
5. **Checkout:** Razorpay sandbox, 100 VUs; verify webhook idempotency and
   invoice/commission consistency.
6. **Dashboards:** super-admin + creator at scale; record load time, payload
   size, DB scans (EXPLAIN).

## Expected results after the index migration

- Analytics page-view: seq scan → index scan on 10M rows (target <50ms).
- Platform-wide `Setting(key)` views: seq scan (~100k rows) → index.
- Storefront `findPublished` (gallery/products): tenant+status composite.
- Revenue windows: `BillingInvoice(status, issuedAt)` + `BillingEvent(type,
  createdAt)`.
