# Builder Runtime Report

**IMPLEMENTATION-13 · Phase B & G · 2026-08-01**

## Verdict

There is exactly ONE `BuilderStore` (module singleton at
`src/lib/builder/store.ts:416`). Every consumer — Sidebar, Canvas, Inspector,
Save, Publish — reads the same `state.canvas`. The canvas no longer diverges
from the store, and every sidebar section renders immediately after insertion.

## Root Cause — "Sidebar has sections, Canvas shows Add Sections"

The Sidebar reads `builderStore.canvas.pages[].sections` directly (every 1.5s),
while the Canvas computed sections through a frozen, transformed projection:

1. **`InteractiveCanvas` was wrapped in `memo`** (`interactive-canvas.tsx:24`).
   Its props (`device`, `zoom`) never change on store writes, and its
   `node:inserted`/`node:deleted` handlers were no-ops (`:49-56`). The canvas
   computed its section list exactly once and then froze, permanently out of
   sync with the store and sidebar.
2. **The canvas gated on a second server action** (`getLivePreviewData`) — if
   that failed (e.g. the `Invalid UUID ""` bug), `liveContent` stayed `null`,
   `dataReady` flipped, and the canvas showed the empty "Add Sections" state
   while the store was fully populated.
3. **Empty sections were dropped by the flatten** (`builderPagesToLayoutSnapshot`
   omits sections with zero slots), so a section whose component insert was
   skipped vanished from the canvas but stayed in the sidebar.

## Fixes

### `src/features/builder/canvas/interactive-canvas.tsx`
- Removed `memo` — the canvas re-renders whenever the workspace re-renders.
- Subscribed to `store:changed` → `forceRender`, so every store mutation is
  reflected immediately (no polling, no no-op handlers).
- The "Add Sections" empty state now reads the store (`storeHasSections`), not
  the flattened projection. When sections exist but preview data is still
  loading, a distinct "loading" message is shown instead of "Add Sections".

### `src/features/builder/components/section-manager.tsx`
- The sidebar catalog is now a single `SECTION_CATALOG` whose entries are
  validated against the ComponentRegistry at module load. Sidebar entries and
  registered components can no longer drift.
- `addSection` inserts the section **and** the default slot in one action,
  seeding the registry `defaultProps`.

### `src/lib/builder/store.ts`
- `hydrate` now calls `builderQuery.invalidate()` (previously the query cache
  served pre-hydration data to the preview runtime / drag controller).
- `insertComponent` accepts `defaultProps` from the registry.
- `paste` invalidates the query cache.

## Section Insertion — Verified (Phase G)

Every catalog entry produces the full chain immediately:

| Sidebar entry | Registered component | Renderer | Inspector schema |
|---|---|---|---|
| Hero | `hero.default` | `HeroRenderer` | ✅ |
| About | `about.default` | `AboutRenderer` | ✅ |
| Products | `products.grid` | `ProductsRenderer` | ✅ |
| Gallery | `gallery.grid` | `GalleryRenderer` | ✅ |
| Timeline | `timeline.default` | `TimelineRenderer` | ✅ |
| Testimonials | `testimonials.default` | `TestimonialsRenderer` | ✅ |
| FAQ | `faq.default` | `FaqRenderer` | ✅ |
| Courses | `courses.default` | `CoursesRenderer` | ✅ |
| Services | `services.default` | `ServicesRenderer` | ✅ (added) |
| Games | `games.default` | `GamesRenderer` | ✅ (added) |
| ContentFeed | `contentFeed.default` | `ContentFeedRenderer` | ✅ (added) |
| Newsletter | `newsletter.default` | `NewsletterRenderer` | ✅ |
| Contact | `contact.default` | `ContactRenderer` | ✅ |
| Footer | `footer.default` | `FooterRenderer` | ✅ |

No placeholders. No "Add Sections" screen for a populated page. The canvas
renders through the SAME runtime as the storefront
(`serialize → builderPagesToLayoutSnapshot → LayoutEngine → ComponentRenderer`).

## Runtime flow

```
builderStore (single source of truth)
   ├── Sidebar        → store.canvas.pages[].sections        (live)
   ├── Canvas         → serialize → LayoutEngine → renderers  (live, store:changed)
   ├── Inspector      → store selection / block config        (live)
   ├── Save           → builderStore.serialize()              (live)
   └── Publish        → save → publishingService.publish      (same runtime)
```
