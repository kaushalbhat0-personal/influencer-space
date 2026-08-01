# Runtime Contract

**IMPLEMENTATION-16 · Phase 16A · 2026-08-01**

## The ONLY legal runtime

CreatorStore has **exactly one rendering pipeline**. The Builder is a layout
editor; the Dashboard is a CMS; the Storefront is the renderer. The Builder
simply invokes the storefront renderer with the draft layout.

```
Database
   ↓
websiteAggregate.build()              ← live CMS content (the ONLY content source)
   ↓
Draft Layout / Published Layout       ← the ONLY variable (builder draft vs published)
   ↓
LayoutEngine.resolve()                ← the ONLY layout engine
   ↓
Resolved Sections
   ↓
ComponentRenderer                     ← the ONLY renderer (registry-owned)
   ↓
DOM
```

## Non-negotiable rules

- **One aggregate** — `websiteAggregateService.build()`; content never owned or
  persisted by the builder.
- **One LayoutEngine** — `layoutEngine.resolve()`; no duplicate resolution.
- **One renderer** — `ComponentRenderer` → the component's registry renderer;
  no builder renderer, no preview renderer, no server-side DOM tree.
- **One layout variable** — the builder renders the draft; the storefront
  renders the published snapshot; after publish they are identical.
- **Content is always live** — no content caching that can serve stale content.
- **No compatibility layers, no feature flags, no hardcoded fallbacks.**

## Entry-point matrix

Every entry point must traverse the same pipeline. The only differences are the
layout source and the caller.

| # | Entry point | Layout source | Content source | Resolve | Render |
|---|---|---|---|---|---|
| 1 | **Builder canvas** (`/builder`) | `builderStore.serialize()` → draft | `getLivePreviewData()` → `websiteAggregate.build()` | `layoutEngine.resolve` | `ComponentRenderer` |
| 2 | **Dashboard Preview** (`?preview=true`) | `BuilderService.load` → draft | `websiteAggregate.build()` | `layoutEngine.resolve` | `DataBoundRenderer` → `ComponentRenderer` |
| 3 | **Publish** (`publishingService.publish`) | `BuilderService.load` → draft | `websiteAggregate.build()` (traced, not persisted) | builds snapshot via `buildRuntimeSnapshot` | persists presentation-only snapshot |
| 4 | **Storefront** (`/[slug]`) | published snapshot layout | `mergeLiveContent()` → `websiteAggregate.build()` | `layoutEngine.resolve` | `DataBoundRenderer` → `ComponentRenderer` |
| 5 | **Production** (`/[slug]` in a production build) | published snapshot layout | `websiteAggregate.build()` | `layoutEngine.resolve` | `DataBoundRenderer` → `ComponentRenderer` |

Rows 4 and 5 are the **same code path** (`src/app/[domain]/page.tsx`); the
runtime trace labels them `storefront` (dev) and `production` (production build).

## Proof of single runtime

- `computeRuntimeSignature()` — identical for all five runtimes when they render
  the same theme + layout + live content (see `runtime-signature-report.md`).
- `traceRuntime()` — the same block is emitted by all five runtimes
  (see `runtime-trace-report.md`).
- `ComponentRenderer` is the terminal renderer in every path; there is no other
  renderer in the codebase (the removed `PreviewRuntime`/`RenderTreeBuilder`
  were deleted in IMPLEMENTATION-14).
- The `scripts/runtime-parity-audit.ts` report and the E2E parity test
  (production.spec.ts `04b`) verify Builder == Storefront == Production
  bit-for-bit (see `runtime-convergence-report.md`).
