# Browser vs Builder

**IMPLEMENTATION-18 · Phase 5 · 2026-08-01**

## Claim

Compare the **Builder DOM** with the **Storefront DOM** on production, and find
why the builder canvas is empty while the sidebar lists sections.

## Production builder evidence

Playwright against `https://influencer-space-alpha.vercel.app/builder` (logged in):

```
[builder-canvas count] 0
[error boundaries] Something-went-wrong=0 Component-error=0
[loading-live-preview count] 0
```

- The **sidebar** lists 12 sections (Hero, Products, About, Gallery, Services,
  Courses, Testimonials, FAQ, Timeline, Games, Links, Footer — each `1 <module>`
  slot) → the **layout loaded from the DB**.
- The **canvas** (`[data-testid="builder-canvas"]`) is **absent** (count 0).
- The canvas element is rendered unconditionally by `InteractiveCanvas` even
  while loading — its absence means the component failed to get live content
  (the aggregate) and the runtime did not mount it.

## Server-action truth (captured POSTs to `/builder`)

```
POST /builder → {"success":true,"pages":[…12 sections…]}            ← loadBuilderPages OK
POST /builder → {"success":false,"error":"TypeError: Cannot convert undefined or null to object"}
POST /builder → {"success":false,"error":"Invalid `prisma.asset.findUnique()` … uuid: \"\""}   ← getLivePreviewData / aggregate fails
```

## Root cause

The builder canvas needs **live content** via `getLivePreviewData` →
`websiteAggregate.build()`. On production the committed aggregate throws
`Invalid UUID ""` (see `browser-vs-aggregate.md`), so the canvas cannot render
live content and never mounts. The sidebar does not need the aggregate (it reads
the layout), so it appears normal — exactly the observed split.

## Builder vs Storefront DOM

| | Builder | Storefront |
|---|---|---|
| Layout sections | 12 (sidebar) | 12 (`section#hero`, `#products`, …) |
| Live content | canvas absent | all placeholders |
| Aggregate | throws | throws → fallback to empty snapshot |

Both are broken by the **same** aggregate failure. Local (current code) renders
both correctly: canvas present, storefront shows products/gallery/etc.
