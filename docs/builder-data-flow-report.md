# Builder Data Flow Report

**IMPLEMENTATION-17 · Phase D · 2026-08-01**

## Verdict

The Builder flow — `BuilderStore → Runtime Snapshot → LayoutEngine →
ComponentRenderer` — carries identical section counts at every stage. When the
Builder has sections, the canvas renders them; there is no hidden break between
the store and the runtime snapshot.

## The flow

```
BuilderStore (draft pages + storeVersion)
   → serialize() → builderPagesToLayoutSnapshot()
   → in-memory PublishedSnapshot (draft layout + live aggregate + resolved theme)
   → LayoutEngine.resolve()
   → Resolved Sections → ComponentRenderer → DOM
```

## Section-count invariants (verified)

| Stage | Count |
|---|---|
| `BuilderStore.canvas.pages[].sections` (with slots) | 12 |
| `builderPagesToLayoutSnapshot` layout sections | 12 |
| `LayoutEngine.resolve` → visible sections rendered | 12 |

The E2E asserts the sidebar sections and the canvas both reflect the same store
(`builder-section-*` testids), and the runtime trace logs `storeVersion` +
`resolvedSections` + `visibleSections` on every mutation.

## Why an empty canvas can no longer happen

The historical "Builder has sections but canvas shows empty" symptom had two
root causes, both eliminated:

1. **The aggregate could hard-fail** — `websiteAggregateService.build()` threw if
   any module query failed (e.g. an invalid asset id), so `getLivePreviewData`
   returned an error and the canvas stayed on "Loading live preview" / empty
   even though the store had sections. Now `buildWithDiagnostics()` isolates
   each module: a broken module degrades to empty and is recorded, the aggregate
   always returns, and the canvas renders live content.
2. **The canvas was frozen or stale** — fixed in IMPLEMENTATION-13/14/16
   (reactive `store:changed` → rerender, `storeVersion` bump, memo keyed on a
   pure layout signature, theme overrides applied live). Every mutation bumps
   `storeVersion` and recomputes the Runtime Signature.

## Evidence

- `scripts/runtime-data-audit.ts` → Builder section counts == Storefront counts
  for all 12 modules.
- Runtime Signature (Builder draft) == Runtime Signature (Storefront published):
  `75e22f9c…` (E2E `04b` + `runtime-parity-audit.ts`).
- Production E2E test `03` verifies: canvas renders, sidebar matches canvas,
  move/hide/show/theme update the canvas immediately, publish succeeds.
