# Audit 09B — Final Report

**Track:** RCCF-AUDIT-09B
**Type:** READ-ONLY architecture/readiness audit (Requirements A + B)
**Status:** No code changed, no commit

## Executive Verdict

| Requirement | Verdict |
| --- | --- |
| Section presentation runtime (persist/publish/render) | ✅ Already implemented |
| Creator-facing presentation editing **outside** the Builder | ❌ Missing |
| Builder stays presentation-only (no CMS leakage) | ✅ Already implemented |
| Independent content pages (`/products`, `/gallery`, `/games`, ...) | ❌ Missing |
| Homepage featured-only collection rendering | ⚠️ Partially implemented (fields exist; filtering does not) |
| Featured flags on content entities + tenant scoping | ⚠️ Partially implemented (4 of 7 collections) |
| "View all → /products" CTA | ❌ Missing |
| Performance for large collections | ❌ Not ready (unbounded + uncached) |

---

## Section Presentation Audit

- **Runtime complete:** `config.presentation` (`SectionPresentation`,
  `src/modules/section-presentation/domain/types.ts:5-16`) — `titleOverride`,
  `descriptionOverride`, `hideTitle`, `visible`, `hideWhenEmpty`.
- **Persist:** `updateSlotPresentation` (`store.ts:252-266`) → `Block.config`
  JSON → autosaves with the draft.
- **Publish:** carried verbatim in `builderPagesToLayoutSnapshot`
  (`layout.ts:30`) → published snapshot layout.
- **Render:** `LayoutEngine.composeSectionConfig` resolves to
  `config.resolvedTitle` (`LayoutEngine.ts:359-377`); renderers render it via
  `SectionHeading` (`renderers.tsx:54-63`). Verified by test
  (`products-rendering.test.ts:74-82`).
- **JSON-LD:** canonical names preserved (`LayoutEngine.buildJsonLd`).
- **Empty logic:** `hideWhenEmpty` enforced in 3 places (page filter,
  canvas filter, per-renderer `useVisibility`).
- **Loose typing:** `SectionPresentation` is cast-only; no runtime schema
  validation of the stored shape.
- **Hero nuance:** hero `titleOverride` replaces the identity H1/H2.

## Creator Editing Surface (Part 1A/1B)

- **Case 2 — only inside Builder.** The single editing surface is
  `section-presentation-panel.tsx` (right panel of `/builder`), shown only
  when a section is selected.
- **No edit-icon / "Edit Heading" affordance** anywhere. The Builder
  `SectionCard` external-link icon deep-links to content admin pages
  (Manage content), not presentation.
- **No admin/dashboard/website-settings surface edits section presentation.**
- **Products → Menu etc. is therefore not possible outside the Builder today.**
- The intended future action pattern (`[Manage Products] [Edit Heading]`)
  does not exist; "Manage" currently lives in `/admin/*` and "Heading" only in
  the Builder panel.

## Builder Responsibility Audit (Part 2)

| Builder Control | Current responsibility | Should remain? |
| --- | --- | --- |
| Theme | ✅ select/preview/apply | Yes |
| Theme variant | ✅ preview | Yes |
| Section layout | ✅ add/reorder/duplicate/delete | Yes |
| Section ordering | ✅ drag/order | Yes |
| Section visibility | ✅ toggle | Yes |
| Section title | ✅ presentation panel (`titleOverride`) | Yes (plus a creator surface outside Builder) |
| Product creation/editing | ❌ NONE (only count badge + deep link) | No — stays in `/admin/products` |
| Gallery upload/metadata | ❌ NONE | No — stays in `/admin/gallery` |
| Game creation | ❌ NONE | No — stays in `/admin/games` |
| Testimonial editing | ❌ NONE | No — stays in `/admin/testimonials` |
| Timeline/milestones | ❌ NONE | No — stays in `/admin/milestones` |
| Courses/Services/FAQ/Links/Content Feed | ❌ NONE | No — stay in `/admin/*` |

**No violations.** The Builder is presentation-only by design and enforcement
(`src/lib/builder/presentation.ts`; `updateBlockConfig` rejects non-presentation
keys; canvas "the Builder NEVER owns content"). Content editing lives in
`/admin/*` for every collection (routes verified present). The only genuine
gap is that **presentation editing also only lives in the Builder** — the
intended separation (CMS for content, a surface for presentation) is incomplete
on the presentation side.

## Page Architecture (Part 3)

- `Page` model exists (`schema.prisma:714`) with `slug`, `isHome`, `order`,
  `sections[]`/`blocks[]`.
- `admin/website/pages` is **read-only** (list + "Edit in Builder"); no
  create/edit outside the Builder.
- Templates: creation-time only (`src/lib/template/`); `PAGE_REGISTRY`
  (`src/lib/pages/registry.ts`) is descriptive and **not wired to routing**;
  `composition-engine.ts` is pre-provisioning.
- Snapshots contain `layout.pages[].sections[]` (full section list), but
  content is emptied on publish and re-hydrated live.

## Public Routing (Part 4)

- **Exactly one storefront route:** `/[domain]/page.tsx` homepage.
- **All pages' sections flatten onto `/`** (`page.tsx:176-183`).
- No `/[domain]/products|gallery|games|services|courses|testimonials|checkout`,
  no `[slug]`, no `layout.tsx`.
- `/purchase` + `/purchase/[orderId]` exist (top-level order portal).
- Classification: hardcoded single homepage; independent pages **missing**.

## Featured Content (Parts 5/5A)

- Featured fields exist on: Products (`isFeatured`), Gallery (`isFeatured`),
  Services/Courses (`Offering.metadata.featured`), Testimonials (JSON
  `featured`). **Not on** Games, Timeline.
- Aggregate maps all of them into `WebsiteAggregate` (queryable).
- **Storefront does NOT filter on featured** — products/courses/services render
  it as a badge; gallery positional `slice(0,12)`.
- No `featuredAt`, `showOnHomepage`, `homepageLimit`, `displayLimit`,
  `collectionLimit` anywhere.
- Homepage renders all records (products render ALL; gallery renders 12).
- Zero-featured fallback and "View all → /products" CTA: **do not exist**.

## Collection Matrix (Part 6)

| Collection | Public page | Full collection | Featured homepage | Navigation |
| --- | --- | --- | --- | --- |
| Products | ❌ | ❌ | ❌ | anchor |
| Gallery | ❌ | ❌ | ❌ | anchor |
| Games | ❌ | ❌ | ❌ | anchor |
| Services | ❌ | ❌ | ❌ | anchor |
| Courses | ❌ | ❌ | ❌ | anchor |
| Testimonials | ❌ | ❌ | ❌ | anchor |
| Timeline | ❌ | ❌ | ❌ | anchor |

Commerce: no product listing/detail routes; checkout is modal/redirect via
`BuyNowButton → createCheckout` (PLATFORM_COLLECT / DIRECT_CREATOR);
fulfillment + purchase portal exist and are reusable.

## Navigation (Part 11)

- Stored as Setting `"navigation"`; defaults are all-anchor.
- `"page"` nav type is typed (`snapshot.ts:230`) but **non-functional** — no
  routes, and `StorefrontNav` degrades page items to anchor scroll.
- Admin nav manager adds external links only.
- Template nav written to `website.themeConfig` is never read back (dead data).

## SEO (Part 12)

- Storefront `generateMetadata` ✅ (title/desc/robots/canonical/OG/Twitter).
- Canonical is tenant-root only; sitemap lists tenant roots only; no per-page
  SEO; `admin/website/seo` is a placeholder; the full `src/lib/seo` toolkit is
  not wired into the storefront metadata pipeline. JSON-LD uses canonical names.

## Performance (Part 15)

- ~22–27 DB queries per homepage render, **uncached**, rebuilt every request
  (`force-dynamic` + `no-store` middleware).
- Products unbounded end-to-end (DB + composition + DOM + JSON-LD).
- Gallery over-fetched (DB fetches all, renderer slices to 12).
- No N+1 across collections (parallel `Promise.all`); bounded per-asset media
  N+1; potential hero_data upsert write on the hot path.
- 500 products/500 gallery ⇒ 1000-row aggregate + JSON-LD + signature hash per
  request. Cheapest fix: `take` at the repository layer (helpers already support it).

## Security / Tenant Scoping

- Every collection query in the aggregate filters by `tenantId`
  (`website-aggregate.service.ts:73-91`); repositories scope by tenant.
- Commerce scopes orders/fulfillment by `tenantId`; product lookups require
  active/published/tenant match. A creator cannot see another tenant's content.

## Existing Implementation Reuse (Part 16)

| Q | Answer |
| --- | --- |
| Q1 Rename Products→Menu without Builder? | ❌ No |
| Q2 Edit icon/action for section presentation? | ❌ No |
| Q3 Manage content independently of Builder? | ✅ Yes (`/admin/*`) |
| Q4 Products independent public page? | ❌ No |
| Q5 Gallery independent public page? | ❌ No |
| Q6 Games independent public page? | ❌ No |
| Q7 Other repeatable collections independent pages? | ❌ No |
| Q8 Homepage featured-only? | ❌ No |
| Q9 Creators select featured items? | ✅ Products/Gallery/Services/Courses/Testimonials (⚠️ not Games/Timeline) |
| Q10 Homepage links to full collection page? | ❌ No |
| Q11 Current Page/Template system solves this? | ⚠️ Partially — model/snapshot exist; routing/templates missing |
| Q12 Duplicate/parallel page systems? | ⚠️ `src/lib/pages` (descriptive), `src/lib/template` (creation-time), `src/modules/website-blueprint` (pre-provisioning) — none wired to routing; the single real runtime is the homepage |
| Q13 Builder owns CMS responsibilities it shouldn't? | ✅ No |
| Q14 Implementable with existing Page+Template+Aggregate+Section Registry? | ✅ Yes — all building blocks exist; routes + page resolution + a presentation surface + limits are the missing glue |

## Gaps

1. No creator-facing section-presentation surface outside the Builder.
2. No independent page routing (single homepage URL).
3. No runtime page template engine wiring `Page.slug` → rendered route.
4. Navigation page-type is dead; no collection-page links; template nav never read back.
5. Featured is badge-only — no homepage featured filtering, no limits, no CTA.
6. Games/Timeline lack featured entirely; testimonials featured is untyped JSON.
7. Performance: unbounded + uncached collections.
8. SEO: no per-page metadata/sitemap; admin SEO feature not wired to storefront.
9. `SectionPresentation` is cast-only (no validation); hero titleOverride replaces H1/H2.

## Recommended Implementation Plan (NOT implemented — future phases)

- **Phase 0 — blockers:** none code-blocking today; document desired
  `SectionPresentation` validation and storefront featured/limit contracts.
- **Phase 1 — section presentation management:** creator surface outside the
  Builder (dashboard/admin) writing the same `config.presentation` via a server
  action; "Edit Heading" affordance on section cards; keep Builder panel as-is.
- **Phase 2 — independent pages:** add `[domain]/[slug]` (or explicit
  collection routes) resolving a page from the published snapshot and rendering
  its sections through the existing `ExperienceSection` + `DataBoundRenderer`
  path; stop flattening non-home pages onto `/`.
- **Phase 3 — featured content:** aggregate-level featured filters + limits;
  homepage featured-only rendering; "View all → /products" CTA; add featured to
  Games/Timeline or drop the concept for them; home fallback when zero featured.
- **Phase 4 — navigation:** wire `page`-type nav items to real routes; admin
  UI for internal/page items; surface template-generated nav.
- **Phase 5 — SEO:** per-page metadata/canonical/sitemap from `PAGE_REGISTRY`
  + page SEO fields; wire the existing `src/lib/seo` toolkit into the storefront.
- **Phase 6 — performance:** repository-level `take`/limits for homepage
  collections; pagination for independent pages; caching/invalidation.

## Files Inspected

- `src/modules/section-presentation/domain/types.ts`, `application/resolver.ts`, `application/runtime.ts`
- `src/features/builder/components/section-presentation-panel.tsx`, `section-manager.tsx`, `workspace.tsx`, `properties.tsx`
- `src/lib/builder/store.ts`, `presentation.ts`, `layout.ts`
- `src/lib/storefront/layout-engine/LayoutEngine.ts`, `live-content.ts`, `build-snapshot.ts`
- `src/lib/renderer/index.tsx`, `data-bound.tsx`
- `src/lib/registry/components/types.ts`, `builtins.ts`, `renderers.tsx`
- `src/modules/tenant/application/website-aggregate.service.ts`
- `src/lib/publishing/service.ts`, `snapshot.ts`
- `src/app/[domain]/page.tsx`, `not-found.tsx`, `_components/buy-now-button.tsx`
- `src/app/admin/website/pages/page.tsx`, `navigation/*`, `seo/page.tsx`
- `src/lib/navigation/service.ts`, `src/lib/pages/registry.ts`, `src/lib/template/registry.ts`
- `src/components/storefront/StorefrontNav.tsx`
- `prisma/schema.prisma` (Page 714, Section 733, Block 751, Product 433, GalleryImage 608, Offering 1425, OrderFulfillment 482)
- `src/types/snapshot.ts`
- `src/actions/checkout.actions.ts`
- `src/features/products/components/products-page.tsx`, `src/features/gallery/components/gallery-page.tsx`
- `src/features/services/service.ts`, `src/features/courses/service.ts`
- `src/lib/products/repository.ts`, `src/lib/gallery/`, `src/middleware.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`

## Verification

- **Read-only audit.** No source files, schema, database, or migrations changed.
- Claims verified against current source (grep/read/glob/route inspection);
  speculative features were cross-checked and corrected (e.g., a `featuredOnly`
  renderer filter and `FEATURED_VARIANTS` registry do **not** exist).
- Existing test suite remains untouched (last run: 2104/2104 pass on `c9b55fb`).

## Git Status

Working tree matches commit `c9b55fb`. **No commit made.**
