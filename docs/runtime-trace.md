# Runtime Trace

**IMPLEMENTATION-13 · Phase F · 2026-08-01**

## Purpose

Prove `Builder Preview == Published == Live runtime` by emitting one structured,
comparable trace from every runtime. All four runtimes must report identical
aggregate counts and component id sets for the same website.

## Instrumentation

Helper: `src/lib/observability/runtime-trace.ts`

```ts
traceRuntime(stage, { websiteId, tenantId, slug, theme, correlationId, componentIds, layoutSections, counts })
aggregateCounts(content) // hero, products, services, courses, gallery, faq, testimonials, timeline, games, contentFeed, links
```

Stages:

| Stage | Emitted by | File:line |
|---|---|---|
| `builder-preview` | Builder canvas | `src/features/builder/canvas/interactive-canvas.tsx` |
| `publish` | `PublishingService.publish` | `src/lib/publishing/service.ts` |
| `storefront` / `storefront-preview` | Storefront page | `src/app/[domain]/page.tsx` |

> IMPLEMENTATION-14: the separate `dashboard-preview` stage is gone. Preview is
> the Builder Runtime full-page (`?preview=true` renders Draft Layout + Live
> Content through the same LayoutEngine + registry renderers).

## Trace Fields

- `websiteId` — the website row
- `tenantId` — the tenant row
- `slug` — tenant subdomain / custom domain / requested path segment
- `theme` — resolved theme package id (`snapshot.theme.packageId`)
- `correlationId` — publish correlation / `preview_<websiteId>` / `builder-preview`
- `componentIds` — every `moduleId` in the layout, in order
- `layoutSections` — total flattened sections across pages
- `counts` — aggregate counts: hero (0/1), products, services, courses, gallery, faq, testimonials, timeline, games, contentFeed, links

## Expected Invariant

For a fixed website, the four stages emit the **same** `counts`, the **same**
`componentIds`, and the same `theme`. The layout is flattened once by
`builderPagesToLayoutSnapshot` (shared by all four runtimes), and content is
built once by `websiteAggregateService.build` (also shared).

Existing aggregate- and layout-level traces remain in place:
- `website-aggregate.service.ts:buildWithTrace`
- `LayoutEngine.composeSectionConfig` `[RuntimeTrace]` logs (hero, products, gallery, links, testimonials, faq, timeline, games, contentFeed, courses, services)

## Reading The Trace

```
[RuntimeTrace] builder-preview   { ..., componentIds: ["hero.default","about.default"], layoutSections: 2, counts: { products: 4, ... } }
[RuntimeTrace] publish           { ..., componentIds: ["hero.default","about.default"], layoutSections: 2, counts: { products: 4, ... } }
[RuntimeTrace] storefront        { ..., componentIds: ["hero.default","about.default"], layoutSections: 2, counts: { products: 4, ... } }
[RuntimeTrace] storefront-preview{ ..., componentIds: ["hero.default","about.default"], layoutSections: 2, counts: { products: 4, ... } }
```

Identical `componentIds` + `counts` across all rows ⇒ convergence confirmed.
`publish` reports the live aggregate it assembled — publish itself persists only
the presentation blueprint (layout/theme/navigation); content is always read
live by the storefront.
