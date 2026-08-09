# Audit 09B — Performance

**Track:** RCCF-AUDIT-09B
**Type:** READ-ONLY architecture audit (Part 15)
**Status:** No code changed

## Storefront render path (verified)

`src/app/[domain]/page.tsx` is `force-dynamic` (`page.tsx:31`); middleware sets
`Cache-Control: no-store` (`middleware.ts:77`). The full content aggregate is
rebuilt **on every storefront request** (`live-content.ts:32` →
`websiteAggregateService.buildWithDiagnostics`).

### Query inventory per homepage render (~22–27 DB queries)

| # | Query | Limit? |
| --- | --- | --- |
| tenant lookup | `prisma.tenant.findFirst` (`page.tsx:41`) | 1 |
| published snapshot | website + publishStatus + publishSnapshot (`snapshot.ts:82-91`) | 3 |
| **products** | `prisma.product.findMany` PUBLISHED+ACTIVE (`product-repository.ts:82-87`) | **NO take/skip** |
| **gallery** | `prisma.galleryImage.findMany` PUBLISHED+ACTIVE (`gallery-repository.ts:92-97`) | **NO take/skip** |
| **links** | `prisma.affiliateLink.findMany` (`link-repository.ts:64-67`) | NO limit |
| **timeline** | `prisma.timelineEvent.findMany` (`aggregate:79`) | NO limit |
| **games** | `prisma.game.findMany` (`aggregate:80`) | NO limit |
| **contentFeed** | `prisma.contentFeedItem.findMany` (`aggregate:81-84`) | NO limit |
| **offerings** | `prisma.offering.findMany` (`aggregate:87-91`) | NO limit (has select projection) |
| testimonials/faq/hero/seo/website/brand/knowledge | Setting/single-row lookups (`aggregate:72-93`) | single rows |
| brand/hero assets | `mediaService.resolveUrls` per-asset (`aggregate:260-316`) | ≤4 |
| plan resolution | workspace + billingSubscription + legacy subscription + agencyTenant (`plan-source.ts:49-65`, 30s cached) | 4–5 |
| maintenance flag | tenant + setting (`platform-config.ts:10-25`) | 2 |

All 14 content fetchers run in a single `Promise.all` (`aggregate:68`), so
there is **no N+1 across collections** (per-collection cost is flat). The only
N+1 is the bounded per-asset media resolution (≤4 lookups).

## Confirmed scalability problems

### 1. [HIGH] Products: fully unpaginated end-to-end

- DB: all PUBLISHED+ACTIVE products, no `take`/`skip` (`product-repository.ts:82-87`).
- Composition: `LayoutEngine` maps the full array into `resolvedData` (`LayoutEngine.ts:231-245`).
- DOM: `ProductsRenderer` renders **every** product card (`renderers.tsx:290`),
  each with a client `BuyNowButton`.
- JSON-LD: `buildJsonLd` emits **every product** into the schema.org `ItemList`
  (`LayoutEngine.ts:166-187`).

500 products → 500 full-row fetches + 500 DOM cards + 500-entry JSON-LD,
rebuilt on every request.

### 2. [HIGH] Gallery: over-fetched

- DB fetches ALL gallery rows (`gallery-repository.ts:92-97`).
- LayoutEngine composes all (`LayoutEngine.ts:246-258`).
- Only the renderer slices to 12 (`renderers.tsx:242`).
- The other 488 rows are fetched + serialized + hashed but never rendered.

### 3. [HIGH] No caching on the storefront

- No `unstable_cache`, no `cache()` (only React per-request memo), no Redis.
- Page `force-dynamic` + middleware `no-store`.
- The aggregate rebuilds on every request; ~22–27 queries regardless of
  collection size. `revalidatePath` is a no-op for this route.

### 4. [MEDIUM] JSON-LD scales with all products

The inline schema.org `ItemList` serializes every product into the HTML
(`page.tsx:217-219`).

### 5. [MEDIUM] Per-asset media resolution

`mediaService.resolveUrls` does `Promise.all` of individual `prisma.asset.findUnique`
(`media/service.ts:418-421`) — bounded to ~4 in the storefront but the pattern
is per-asset.

### 6. [MEDIUM] Potential write on the storefront hot path

`getHeroData` **upserts** `hero_data` when the setting is missing during a GET
render (`settings.service.ts:66-70`).

### 7. [LOW] Runtime signature hashes the full aggregate per request

`traceRuntime` computes a SHA-256 over theme + layout + aggregate even in
production (`runtime-trace.ts:226`).

## Part 15 answers

| Requirement | Current | Needed |
| --- | --- | --- |
| Homepage must not load 500 products to show 3 | ❌ loads all | DB-level `take`/limit in the aggregate |
| Independent page may paginate | ❌ no independent pages, no pagination anywhere | page + pagination |
| Limit queries | ❌ only render-time gallery `slice(0,12)` | repository-level limits |
| Count queries | ✅ zero count() on the storefront path (only preview nav generation, `navigation/service.ts:34-41`) | keep |
| Aggregate loading | ⚠️ parallel (no N+1) but unbounded and uncached | add limits + caching |
| Caching | ❌ none | tag-based cache/invalidation |

## Recommended (NOT implemented)

The single cheapest win is pushing a `take`/limit down to the repository layer
— the generic `findMany` helpers already accept `take`/`skip`
(`product-repository.ts:58-59`, `gallery-repository.ts:60-61`), but the
aggregate never uses them. This audit makes no changes.

## Files inspected

- `src/modules/tenant/application/website-aggregate.service.ts`
- `src/lib/products/repository.ts` (`product-repository`), `src/lib/gallery/`, `src/lib/link-repository*`
- `src/lib/storefront/layout-engine/LayoutEngine.ts`
- `src/lib/registry/components/renderers.tsx`
- `src/app/[domain]/page.tsx`, `src/middleware.ts`
- `src/lib/storefront/live-content.ts`, `src/lib/publishing/snapshot.ts`
- `src/lib/observability/runtime-trace.ts`
- `src/modules/billing/application/plan-source.ts`, `plan-restriction.ts`
- `src/lib/platform/platform-config.ts`
- `src/services/settings.service.ts`, `src/lib/media/service.ts`
