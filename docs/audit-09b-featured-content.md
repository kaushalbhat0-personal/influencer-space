# Audit 09B — Featured Content

**Track:** RCCF-AUDIT-09B
**Type:** READ-ONLY architecture audit (Requirement B — homepage featured-only)
**Status:** No code changed

## Featured field inventory (verified against current source)

Search across `prisma/schema.prisma` and `src` for `featured`, `isFeatured`,
`featuredAt`, `homepage`, `showOnHomepage`, `homepageLimit`, `displayLimit`,
`collectionLimit`.

**No occurrences anywhere** of: `featuredAt`, `showOnHomepage`,
`homepageLimit`, `displayLimit`, `collectionLimit`.

| Collection | Featured field | Where stored | Homepage filtering | Full-page support |
| --- | --- | --- | --- | --- |
| Products | `isFeatured Boolean @default(false)` | `Product` (`schema.prisma:433`) | ❌ none | ❌ no route |
| Gallery | `isFeatured Boolean @default(false)` | `GalleryImage` (`schema.prisma:608`) | ❌ none | ❌ no route |
| Games | none | — | ❌ | ❌ |
| Services | `featured` in `metadata` JSON | `Offering.metadata.featured` (set via `src/features/services/service.ts:79`) | ❌ | ❌ |
| Courses | `featured` in `metadata` JSON | `Offering.metadata.featured` (set via `src/features/courses/service.ts:86`) | ❌ | ❌ |
| Testimonials | `featured` boolean | `Setting` JSON key `"testimonials"` (`website-aggregate.service.ts:196`) | ❌ | ❌ |
| Timeline | none | — | ❌ | ❌ |

## Where featured is consumed

- **Admin toggles (creators can set it):**
  - Products: `isFeatured` checkbox in `/admin/products` (`src/features/products/components/products-page.tsx:52,183`).
  - Gallery: `toggleFeatured` action + bulk feature in `/admin/gallery` (`src/features/gallery/components/gallery-page.tsx:183`).
  - Services/Courses: `featured` in metadata (drawers in `/admin/services`, `/admin/courses`).
  - Testimonials: featured toggle in `/admin/testimonials`.
- **Aggregate mapping (queryable):** `website-aggregate.service.ts` maps
  `products[].isFeatured` (line 166), `gallery[].isFeatured` (177),
  `testimonials[].featured` (196), `courses[].featured` (240),
  `services[].featured` (255). Games/timeline have no featured.
- **Storefront renderers:**
  - Products: renders `isFeatured` as a **badge only** (`renderers.tsx:305-309`) — NO filtering.
  - Courses/Services: render `featured` as a **badge only** (`renderers.tsx:674,722`) — NO filtering.
  - Gallery: `slice(0, 12)` positional, NOT featured-based (`renderers.tsx:242`).
  - Testimonials: renders all; featured not filtered.
- **LayoutEngine:** maps the full arrays into `config.resolvedData` with **no
  limits and no featured filter** (`LayoutEngine.ts:231-357`).

## Homepage behavior (Part 5)

| Behavior | Current |
| --- | --- |
| Homepage renders all records? | ✅ Products render ALL (`renderers.tsx:290`); gallery renders first 12 (`slice(0,12)`, `renderers.tsx:242`); others render all |
| Homepage renders featured only? | ❌ no filter anywhere |
| Limit? | Gallery 12 (render-time only, over-fetch still happens); everything else unbounded |
| Ordering? | Products/gallery order asc; timeline year desc; games order asc; content feed pinned desc |
| Featured stored? | ✅ products/gallery/testimonials/services/courses (games & timeline: no) |
| Featured queryable? | ✅ in aggregate; ❌ not used for filtering |
| Aggregate supports featured filtering? | ❌ none |
| Layout engine supports collection limits? | ❌ none (only render-time `slice`) |
| Renderer supports featured-only mode? | ❌ no `featuredOnly` prop exists |

## Part 5A — Featured content model conclusion

**There is no shared "featured" model** — the concept is expressed four
different ways across collections (two real boolean columns, two JSON metadata
flags, one JSON setting flag, two collections with nothing). Do not assume one
model is shared.

## Part 13 — Empty/featured-state behavior

- With N featured items: **no mechanism** selects only featured for the
  homepage today. If featured-only rendering is added, the renderer-level
  filter would be trivial (the field already flows through `resolvedData`).
- Zero-featured fallback: **does not exist** (no featured filtering to fall
  back from).
- Empty-state per renderer: products → `EmptyState "Add products in
  Dashboard"` (`renderers.tsx:335`); gallery → `EmptyState "Add images to your
  gallery"` (`renderers.tsx:273`); others render nothing when `resolvedData`
  is empty. `hideWhenEmpty` (presentation) also suppresses empty sections.
- "View all products" CTA: **does not exist** — there is no `/products` route
  to point at.

## Part 14 — Data ownership

- Featured state lives on the content entity where it exists
  (`Product.isFeatured`, `GalleryImage.isFeatured`, `Offering.metadata.featured`,
  testimonial setting JSON) — no duplicate `*Featured` sidecar tables exist.
  This is the correct pattern to extend.
- **Tenant scoping is consistent:** every collection query filters by
  `tenantId` in the aggregate (`website-aggregate.service.ts:73-91`) and the
  repositories. A creator can never see another tenant's content.

## Gap summary

1. Featured flags exist but are **display-only badges** — no homepage
   featured-only filtering anywhere.
2. No homepage limit/`take` at the query layer (see performance doc).
3. No "View all → /products" CTA; no independent pages.
4. Games and Timeline have no featured concept at all.
5. Testimonials featured is JSON-schema-less (stringly typed in the Setting).

## Files inspected

- `prisma/schema.prisma` (Product 433, GalleryImage 608, Offering 1425)
- `src/modules/tenant/application/website-aggregate.service.ts`
- `src/lib/registry/components/renderers.tsx`
- `src/lib/registry/components/builtins.ts`
- `src/lib/storefront/layout-engine/LayoutEngine.ts`
- `src/features/products/components/products-page.tsx`
- `src/features/gallery/components/gallery-page.tsx`
- `src/features/services/service.ts`, `src/features/courses/service.ts`
- `src/types/snapshot.ts`
