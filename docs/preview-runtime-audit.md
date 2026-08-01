# Preview Runtime Audit

**IMPLEMENTATION-14 · Phase A · 2026-08-01**

## Verdict

There is no longer a separate Preview runtime. Preview IS the Builder Runtime
rendered full-page: Draft Layout + Live CMS Content → LayoutEngine → Registry
Renderer. There is exactly ONE renderer, one LayoutEngine, one aggregate, one
runtime.

## What the audit found

Four independent "preview" mechanisms existed. Three were removed; one was
delegated to the canonical runtime.

| # | Preview mechanism | Where | Disposition |
|---|---|---|---|
| 1 | `PreviewRuntime` client renderer | `src/lib/builder/preview/runtime.ts` | **REMOVED** — duplicate renderer building a bespoke `RenderSlot/RenderSection/RenderPage` tree via `builderQuery`, not through LayoutEngine + registry renderers |
| 2 | `RenderTreeBuilder` + Html/React/Static adapters | `src/lib/builder/render/*` | **REMOVED** — a second render path (`creatos-root` DOM tree) that never touched the registry renderers |
| 3 | Persisted preview snapshots | `publishingService.preview()` → `publishRepository.createPreview()` → `PublishSnapshot` row (`state: "preview"`), read by `publishSnapshotService.getPreview()` | **REMOVED** — preview no longer writes or reads a snapshot; nothing to keep in sync, no version-race with publish |
| 4 | `?preview=true` storefront route | `src/app/[domain]/page.tsx` | **DELEGATED** — now renders the DRAFT layout + live content through the SAME `buildRuntimeSnapshot` → `layoutEngine.resolve()` → `DataBoundRenderer` → `ComponentRenderer` used by the builder canvas and publish |

## Removed in code

- `src/lib/builder/preview/runtime.ts`, `src/lib/builder/preview/index.ts` — `PreviewRuntime`
- `src/lib/builder/render/engine.ts`, `render/types.ts`, `render/index.ts` — `RenderTreeBuilder`, adapters
- `PublishingService.preview()`
- `PublishRepository.createPreview()`
- `PublishSnapshotService.getPreview()`
- `previewWebsite()` server action
- `platformAPI.preview` / `platformAPI.render` exports
- Dead test suites: `tests/unit/preview-runtime.test.ts`, `tests/unit/render-system.test.ts`

## Behavior change

Dashboard **Preview Draft** no longer creates a snapshot. It opens
`${storefrontUrl}?preview=true`, which the storefront renders as the current
**draft layout + live CMS content**. Because the layout is read from the builder
DB directly, the preview always shows the latest draft — no publish, no preview
snapshot, no stale copy.

## Remaining surface

- `getPreviewUrl()` / `buildPreviewUrl()` — retained; they only build the
  `?preview=true` URL.
- `PublishStatus` may still carry a legacy `"preview"` state from old rows; no
  code writes it anymore.

## One runtime after this phase

```
Builder draft pages ─┐
Published snapshot ──┼─→ buildRuntimeSnapshot / mergeLiveContent
Live CMS aggregate ─┘      │
                           ▼
                    layoutEngine.resolve()
                           ▼
                    ComponentRenderer → registry renderer
                           ▼
              Builder Canvas  ·  Storefront  ·  ?preview=true
```
