# Runtime Trace Report

**IMPLEMENTATION-16 · Phase 16B · 2026-08-01**

## The tracer

`src/lib/observability/runtime-trace.ts` is the **single** instrumentation point
for every runtime. It computes everything centrally — aggregate counts,
resolved/visible/hidden sections, rendered components, the Runtime Signature and
render timings — and prints one identical block. There is no duplicated tracing.

```ts
traceRuntime({
  runtimeType,            // "builder" | "preview" | "publish" | "storefront" | "production"
  creator,                // creator display name
  theme,                  // resolved ThemeSnapshot
  layout,                 // LayoutSnapshot (draft or published)
  aggregate,              // WebsiteAggregate (live content)
  websiteId, tenantId, slug, correlationId,
  storeVersion,           // builder store mutation counter
  timings,                // aggregateMs / resolveMs / totalMs
});
```

## The standard block

Every runtime prints:

```
================================
Runtime Type:    storefront
Creator:         Test Creator 1
Theme:           com.creatos.creator-studio
Website:         -
Tenant:          eee52d43-…-dab36119
Slug:            test-creator-1
Store Version:   -
Correlation:     -

Aggregate counts
  hero: 1  products: 1  services: 2  courses: 2  gallery: 3
  faq: 2  testimonials: 2  timeline: 3  games: 2  contentFeed: 0  links: 3

Resolved sections: 12
Hidden sections:   0
Visible sections:  12
Rendered components: hero.default, products.grid, about.default, gallery.grid, services.default, courses.default, testimonials.default, faq.default, timeline.default, games.default, links.default, footer.default

Timings (ms)
  aggregate: -  resolve: 31  total: 31

Runtime Signature: a581407de4fd7b92c14d0788f7917a381d23bce5b3c95951337725260ab0f889
================================
```

A machine-readable line is also logged for tooling/E2E:
`[RuntimeTrace] {"runtimeType":…,"signature":…,"counts":{…},"resolvedSections":12,"hiddenSections":0,"visibleSections":12,"components":[…],"timings":{…}}`

## Emission points (all five runtimes)

| Runtime | Where | Layout | Emits |
|---|---|---|---|
| builder | `interactive-canvas.tsx` (effect) | draft (`builderStore.serialize()`) | ✅ |
| preview | `[domain]/page.tsx` `?preview=true` | draft (`BuilderService.load`) | ✅ |
| publish | `publishing/service.ts` | draft (the publish input) | ✅ |
| storefront | `[domain]/page.tsx` | published snapshot | ✅ |
| production | `[domain]/page.tsx` (production build) | published snapshot | ✅ |

## Evidence: identical traces

Builder (browser console):

```
Runtime Type: builder
Creator: Test Creator 1
Theme: com.creatos.creator-studio
…
Aggregate counts: hero 1 · products 1 · services 2 · courses 2 · gallery 3 · faq 2 · testimonials 2 · timeline 3 · games 2 · contentFeed 0 · links 3
Resolved sections: 12 · Hidden: 0 · Visible: 12
Runtime Signature: a581407d…
```

Storefront (server log):

```
Runtime Type: storefront
Creator: Test Creator 1
Theme: com.creatos.creator-studio
…
Aggregate counts: hero 1 · products 1 · services 2 · courses 2 · gallery 3 · faq 2 · testimonials 2 · timeline 3 · games 2 · contentFeed 0 · links 3
Resolved sections: 12 · Hidden: 0 · Visible: 12
Runtime Signature: a581407d…
```

The aggregate counts, section counts, component set and Runtime Signature are
identical. The E2E suite asserts this parity programmatically
(production.spec.ts `04b`).
