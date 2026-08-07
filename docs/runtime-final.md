# Runtime — Final (RCCF-LAUNCH-01)

## Canonical aggregate

`runtimeContextBuilder.build()` (`src/modules/runtime-context/application/builder.ts`)
remains the **only** WebsiteAggregate build per request, memoized with
`React.cache` (fallback for tests). Every runtime evaluates from that snapshot:
Knowledge, Goals, Success, Recommendations, Storefront Score, Health, dashboard
metrics. No new runtime, no duplicate aggregate.

## Duplicate computation eliminated this sprint + V-05

| Consumer | Before | After |
| --- | --- | --- |
| Recommendation `scoresSnapshot` | 2 aggregate builds per `complete()` | 1 (reuse `ctx.snapshot`) |
| Super-admin tenant page health | `evaluate` direct (13 q) + again inside context (unused) | `evaluate` request-cached → 1 |
| Dashboard metrics | re-queried per consumer | request-cached → 1 |
| Super-admin dashboard | metrics aggregated twice | collected once, threaded into alert eval |

## Verified canonical consumers

- Knowledge runtime → `builder.build` (snapshot-driven) ✅
- Goals runtime → `goalRuntime.evaluateFrom(snapshot, profile)` ✅
- Recommendations → `recommendationContextSource.buildFromSnapshot(snapshot)` ✅
- Business Health → `businessHealthRuntime.evaluateFrom(context)` ✅
- Website Evolution → snapshot-driven ✅
- Experience Intelligence → canonical analytics over persisted rows ✅
- Storefront → the two intentional exceptions (live + preview content) remain
  per IMPLEMENTATION-16/19; `getSnapshotData` now `React.cache`d so metadata +
  page share one build.

## Runtime Context cache policy

`builder.ts` caches on `(tenantId, markShown)` — documented latent footgun
(two modes in one request = two builds); marked as roadmap (key on tenantId only)
since no current flow triggers it.

## Score-calculation dedup

`buildFromSnapshot` accepts `preRead` (profile/success) — the pattern to extend
to knowledge/goal/storefront scores (roadmap item RT-04) so scores are computed
once and passed in, not recomputed in `score-service` + `context-source` +
`builder`.
