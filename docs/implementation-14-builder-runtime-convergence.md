# Implementation 14 — Builder Runtime Convergence (WYSIWYG Builder)

**Status:** COMPLETE
**Date:** 2026-08-01
**Type:** Architecture completion (no redesign, no new runtime)

---

## The Vision

> The Builder Canvas **IS** the storefront renderer.

There is ONE renderer, one LayoutEngine, one aggregate, one runtime. The only
thing that changes is the **layout source** — Draft (builder) vs Published
(storefront).

```
Builder:    Draft Layout  +  Live CMS Content  → LayoutEngine → Registry Renderer → Canvas
Storefront: Published Layout + Live CMS Content → LayoutEngine → Registry Renderer → Storefront
```

---

## What changed

### Phase A — Removed the Preview Runtime

Three independent preview mechanisms existed. Removed:

- `PreviewRuntime` (`src/lib/builder/preview/*`) — a bespoke client renderer.
- `RenderTreeBuilder` + Html/React/Static adapters (`src/lib/builder/render/*`).
- Persisted preview snapshots — `PublishingService.preview()`,
  `PublishRepository.createPreview()`, `PublishSnapshotService.getPreview()`,
  and the `previewWebsite()` action.

Delegated to the canonical runtime:

- Storefront `?preview=true` now renders the **Draft Layout + Live Content**
  through the same `buildRuntimeSnapshot` → `layoutEngine.resolve()` →
  `ComponentRenderer` used everywhere else. Dashboard **Preview Draft** just
  opens that URL.

### Phase B/C — Live Canvas & Store Synchronization

- Every `BuilderStore` mutator now emits `store:changed` (add/move/duplicate/
  delete/hide/config/device/zoom/undo/redo/paste/hydrate/select/...).
- The canvas and sidebar subscribe to `store:changed` and re-render
  immediately. The sidebar's 1500ms polling is gone.

### Phase D — Live CMS Integration

- The builder never owns content. The canvas loads
  `websiteAggregateService.build()` and **refetches when the tab regains
  focus**, so Dashboard edits appear instantly on return.

### Phase E — Presentation Only

- `src/lib/builder/presentation.ts` defines the PresentationBlueprint filter.
- `insertComponent` seeds presentation-only defaults; `updateBlockConfig`
  rejects content keys. Content can never leak into the builder's `Block.config`.

### Phase F — Runtime Equality

- One LayoutEngine, one ComponentRegistry, one aggregate. Every path terminates
  in `ComponentRenderer`. No builder-only renderer/components/runtime.

### Phase H — Publish copies Presentation only

- Publish persists `{ ...snapshot, content: EMPTY_AGGREGATE }`. Content is never
  copied into the published artifact; the storefront always reads it live.

### Phase J — Performance

- The canvas memoizes only pure calculations (a layout signature); store state
  is never memoized.

---

## Success criteria

| Criterion | Status |
|---|---|
| Builder Canvas == Storefront Renderer | ✅ one `ComponentRenderer` path |
| No separate Preview runtime | ✅ removed |
| Dashboard edits appear instantly in Builder | ✅ focus refetch + live aggregate |
| Builder edits affect presentation only | ✅ `presentation.ts` filter |
| Publish copies only Draft → Published Layout | ✅ `EMPTY_AGGREGATE` |
| One LayoutEngine / One Renderer / One Aggregate / One Runtime | ✅ |
| WYSIWYG | ✅ |
| `npx tsc --noEmit` | ✅ passes |
| `npm run build` | ✅ passes (`✓ Compiled successfully`) |
| `npm test` | ✅ **1643 tests, 0 failures** |

---

## Deliverables

- `docs/preview-runtime-audit.md`
- `docs/builder-contract.md`
- `docs/runtime-equality-report.md`
- `docs/wysiwyg-verification.md`
- `docs/runtime-trace.md` (updated: `dashboard-preview` stage removed)
