# Runtime Equality Report

**IMPLEMENTATION-14 · Phase F & H · 2026-08-01**

## Verdict

Builder Canvas == Storefront Renderer. One LayoutEngine, one ComponentRegistry,
one aggregate, one runtime. The only difference between the builder and the
storefront is the **layout source** (Draft vs Published).

## The canonical runtime

```
Live CMS content (websiteAggregateService.build)          ─┐
Draft layout  (builder pages)   ─┐                          ├─→ LayoutEngine.resolve()
Published layout (snapshot)     ─┼─ (only one of these)  ──┘         │
Live theme (website package)    ─┘                                   ▼
                                                       ComponentRenderer
                                                              │
                                                              ▼
                                                    registry renderer
```

| Layer | Builder Canvas | Storefront | Preview (?preview=true) | Publish |
|---|---|---|---|---|
| Aggregate | `getLivePreviewData()` → `websiteAggregateService.build` | `mergeLiveContent` → same build | same build | same build (traced, not persisted) |
| Layout | `builderStore.serialize()` → `builderPagesToLayoutSnapshot` | published snapshot `layout` | `builderService.load` → same flatten | same as draft (this IS the publish input) |
| Assembly | in-memory `PublishedSnapshot` | snapshot + `mergeLiveContent` | `buildRuntimeSnapshot` | `buildRuntimeSnapshot` |
| Resolve | `layoutEngine.resolve()` | `layoutEngine.resolve()` | `layoutEngine.resolve()` | (same shape) |
| Render | `ComponentRenderer` | `DataBoundRenderer` → `ComponentRenderer` | `DataBoundRenderer` → `ComponentRenderer` | — |

Every path terminates in `ComponentRenderer`, which looks up the component in
the ComponentRegistry and renders with the **registry-owned renderer**. There is
no builder-only renderer, no builder-only component, no builder-only runtime.

## Removed to reach equality (Phase A)

- `PreviewRuntime` (a bespoke `RenderSection/RenderSlot` tree renderer).
- `RenderTreeBuilder` + Html/React/Static adapters (a second DOM render path).
- `platformAPI.preview` / `platformAPI.render`.

## Publish copies presentation only (Phase H)

`PublishingService.publish()` builds a full runtime snapshot, traces the live
aggregate counts, then persists:

```ts
const canonicalSnapshot = { ...runtimeSnapshot, content: EMPTY_AGGREGATE };
```

The published artifact therefore contains ONLY the presentation blueprint —
layout, theme, navigation. Content is never copied. The storefront always reads
content live:

```ts
// [domain]/page.tsx
published.snapshot            // layout/theme/nav only (EMPTY content)
  → mergeLiveContent(snapshot, tenantId)   // content = live aggregate
  → layoutEngine.resolve()
```

### Proof the layout is the only delta

| Concern | Published artifact | Live render |
|---|---|---|
| Content (products, gallery, faq, ...) | `EMPTY_AGGREGATE` (never persisted) | `websiteAggregateService.build()` every request |
| Layout | `builderPagesToLayoutSnapshot(draft)` — copied on publish | from published snapshot |
| Theme | theme package + overrides | same |
| Navigation | nav items | same |

A builder **layout** change is invisible on the storefront until Publish. A
Dashboard **content** change is visible immediately — no publish required.

## Regression guard

`tests/unit/builder-presentation.test.ts` asserts:
- `insertComponent` seeds presentation-only config (no `title`/`buttonText`).
- `updateBlockConfig` rejects content keys.
- `EMPTY_AGGREGATE` carries no content.
- `buildRuntimeSnapshot` still produces a full, correct snapshot shape.
