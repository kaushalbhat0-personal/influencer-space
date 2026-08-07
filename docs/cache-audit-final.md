# Cache Audit — Final (RCCF-LAUNCH-01)

Every cache in the platform, with TTL / max entries / eviction / status. No
unbounded memory structures remain.

## Caches

| Cache | TTL | Max entries | Eviction | Bounded | Change |
| --- | --- | --- | --- | --- | --- |
| Runtime Context (`builder.ts`) | request | 1/request | request scope | ✅ | — |
| `getTenantContext` (`lib/tenant.ts`) | request | — | request scope | ✅ | — |
| `dashboardService.getMetrics` | request | — | request scope | ✅ | LAUNCH-01 (new) |
| `websiteHealthEngine.evaluate` | request | — | request scope | ✅ | LAUNCH-01 (new) |
| `intelligenceCache` (LLM) | 48h | 500 | LRU oldest | ✅ | V-05 |
| `cacheRuntime` (intelligence) | per-entry (7d default) | 1,000 | sweep expired + oldest | ✅ | LAUNCH-01 (new bound) |
| `costMonitor.costLog` | — | 1,000 | shift | ✅ | V-05 |
| `rate-limiter` Map | per-entry | sweep every 50 calls | expired keys | ✅ | LAUNCH-01 (new sweep) |
| `platformTelemetry.timer/histogram` | — | 1,000/key | shift | ✅ | LAUNCH-01 (new bound) |
| `bus.history` | — | 500 | shift | ✅ | existing |
| `seo/cache` | 5 min | 500 | — | ✅ | existing |
| `analytics/metrics` | 5 min | 50 | — | ✅ | existing |
| `billing invoiceCache` | 30 s | 100 | — | ✅ | existing |
| `operations-aggregator` | 30 s | 1 | — | ✅ | existing |
| `plan-restriction` | 30 s | 1 | — | ✅ | existing |
| `publications` (demo) | — | finite seed | — | ✅ | existing |
| `BuilderQueryService` | version-invalidated | — | version bump | ✅ | existing |
| `publishSnapshotService` | none (reads DB) | — | — | ✅ | existing (no stale layer) |

## Invalidation coverage

- `afterContentChange` revalidates storefront roots across 80+ mutation sites ✅
- Publish revalidates `/`, admin dashboard, subdomain, custom domain ✅
- **Gap (roadmap):** domain changes revalidate only the settings page — becomes
  relevant once ISR lands on the storefront.
- `markChangesPending` intentionally does not revalidate (presentation updates
  only on re-publish).

## Dead / duplicate caches

- `cacheRuntime` vs `intelligenceCache` overlap — both now bounded; consolidation
  into one LRU+TTL cache is a roadmap item (kept separate to avoid touching the
  intelligence runtime read path mid-sprint).
- `commissionLedger`/`payoutLedger` in-memory ledgers load whole tables on
  `rehydrateEngine` (V-04 critical, roadmap: paginate or index).

## Metrics

`platformTelemetry` exposes per-timer `count / total / min / max / avg / p50 /
p95 / p99` via `snapshot()` — cache hit/miss counters are recorded via
`metricsService.recordCacheAccess`.
