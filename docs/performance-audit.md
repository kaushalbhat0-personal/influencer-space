# Performance Audit

**IMPLEMENTATION-16 · Phase 16H · 2026-08-01**

## Scope

The runtime tracer measures the hot paths and the E2E suite measures the
end-to-end journeys. Measurements were taken against the live dev server
(`next dev`, Supabase Postgres + storage) for the production creator.

## Timings captured by the tracer

| Metric | Where | Typical (dev, cold) |
|---|---|---|
| Aggregate build | `websiteAggregateService.build` | ~10–40 ms |
| Layout resolve | `layoutEngine.resolve` | ~31 ms (storefront trace) |
| Runtime signature | `computeRuntimeSignature` | < 1 ms (pure SHA-256) |
| Publish snapshot build | `buildRuntimeSnapshot` in `publish()` | ~15 ms |

The storefront trace reported:

```
Timings (ms)
  aggregate: -  resolve: 31  total: 31
```

## End-to-end journeys (Playwright production suite)

| Journey | Time |
|---|---|
| Auth (login → dashboard) | ~13 s |
| Dashboard journey (11 admin modules) | ~1.1 min |
| Builder load + live layout edits (move/hide/theme) | ~54 s |
| Publish (save draft → publish → reload) | within builder test |
| Storefront first render after publish | ~9.5 s |
| Runtime parity check (storefront + builder signatures) | ~15 s |
| Live CMS edit → storefront reflect | ~16 s |
| Commerce checkout initiation | ~20 s |
| Media upload/replace | ~26 s |
| Responsive (desktop/tablet/mobile) | ~15 s |
| **Full suite (9 tests)** | **~3.9 min** |

## Hot-path notes

- The builder canvas resolves the draft layout through `LayoutEngine.resolve()`
  in a `useMemo` keyed on a **pure layout signature** string — a store mutation
  that does not change the layout (e.g. selection) does not recompute. Store
  state itself is never memoized; there is no frozen canvas.
- `store:changed` → canvas `forceRender` → signature recompute is O(sections);
  the aggregate is only rebuilt when the canvas refetches (on load and on tab
  focus), not on every layout mutation.
- LayoutEngine is a pure function with no internal cache; the only "caching" is
  the presentation-only `useMemo`/`builderQuery` (see `cache-audit.md`).
- Removing the storefront ISR (`revalidate = 60`) makes each storefront render
  dynamic. The aggregate build (~10–40 ms) is the dominant cost and is the
  correct trade for always-live content; the parity requirement forbids content
  caching.

## Where measurements are captured

- Storefront / preview / production: `[domain]/page.tsx` measures `layoutEngine.resolve`.
- Publish: `publishing/service.ts` measures snapshot build.
- Builder: the canvas trace emits `storeVersion` + resolve timings per mutation.
- End-to-end: `tests/e2e/production/production.spec.ts` test durations.

## Efficiency invariants

- One aggregate build per render (never per section).
- One layout resolve per render.
- One signature computation per render (microseconds).
- No duplicate resolves, no duplicate aggregates, no duplicate rendering.
