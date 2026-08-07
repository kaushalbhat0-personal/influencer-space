# Builder Performance — Final (RCCF-LAUNCH-01)

## Save (the hot path)

| Metric | Before | After |
| --- | --- | --- |
| Statements (100 pages / 500 sections / 5000 blocks) | ~1,100 sequential | **3** (`createManyAndReturn` for pages + sections, one `block.createMany`) |
| Atomicity | transactional (V-03) | preserved (same `$transaction`) |
| UUID regeneration | N/A (ids are DB-generated) | unchanged |
| Wall-time estimate @ 2ms RTT | 2–5 s | <20 ms of round-trips |

`builder-service.ts:saveInner` now builds page rows → `createManyAndReturn`,
flattens all sections → `createManyAndReturn`, flattens all blocks →
`createMany`. No behavioral change; load is unchanged (single nested query).

## Autosave

- Debounce re-arms after a failed save (V-03.5 B-1) — verified.
- `beforeunload` guard present (V-03.5 B-2).

## Preview

- Builder focus/visibility refetch **debounced 1.5s** (`interactive-canvas.tsx`) —
  previously each tab switch / focus event rebuilt the full aggregate (~15
  queries + full JSON serialization).
- The canvas `layoutSignature` still serializes per render (store.js) — marked
  roadmap (incremental signature) since the sidebar/canvas already memoize.

## Publish / rollback

- Publish is atomic + versioned (V-03/V-04) and instruments `publish` duration.
- Rollback flags changes-pending (V-03.5 B-9).
- `builder_save` duration now recorded (`metricsService`) for P50/P95/P99.

## Recovery

- Stuck generation sessions (`queued/running/publishing` > 60 min) are recovered
  to `timed_out` by `runSafeCleanup` (V-04) — now also run nightly by the
  `/api/cron/integrity-cleanup` job.

## Enterprise-size verification

- 100 pages / 500 sections / 5000 blocks: save = 3 statements; load = 1 query +
  nested relations; transaction bounded.
- Registered index `GenerationSession(status, updatedAt)` and
  `ProductOrder(tenantId, createdAt)` support the growth paths.
- Remaining roadmap: incremental draft signature (avoid per-render deep-clone)
  and diff-based saves keyed on stable IDs (V-03.5 B-7 roadmap).
