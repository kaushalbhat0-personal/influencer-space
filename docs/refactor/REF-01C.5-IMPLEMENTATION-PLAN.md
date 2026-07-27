# REF-01C.5 — Implementation Plan for REF-01D

## Prerequisites

- REF-01C Commits 1-3 complete ✅
- WebsiteAggregateService exists ✅
- PublishedSnapshot type exists ✅
- Repository extensions complete ✅

## REF-01D Commit Plan

### Commit 1: LayoutEngine

Create `src/lib/renderer/layout-engine.ts`:
- Takes `PublishedSnapshot` as input
- Resolves semantic section types to registry module IDs (hero → hero.default)
- Injects `content` from snapshot into section configs
- Handles visibility rules
- Returns `ResolvedSection[]`

### Commit 2: Published Service Cleanup

Modify `published.service.ts`:
- Remove unconditional `getPublicPageData()` call
- Return snapshot data only
- When no snapshot, return null (no legacy fallback)
- SEO metadata from snapshot.content.seo
- Identity data from snapshot.content.identity

### Commit 3: Storefront Page Simplification

Modify `[domain]/page.tsx`:
- Remove `legacy` object dependency
- Remove `getPublicPageData()` path
- Remove `FallbackStorefront`
- Remove dynamic imports of storefront modules
- Replace `extractSlots()` with `LayoutEngine.resolve(snapshot)`
- SEO from snapshot.content.seo
- JSON-LD from snapshot.content.identity
- Nav from snapshot.content (products.length, gallery.length, etc.)

### Commit 4: DataResolver Removal

Modify `DataBoundRenderer`:
- Remove `dataResolver.resolve()` call
- Config props already contain all needed content from snapshot
- Tenant-specific lookups forwarded through snapshot content

### Commit 5: Dead Code Deletion

Remove:
- `src/services/public.service.ts`
- `src/lib/storefront/registry.ts`
- `src/lib/storefront/sections.tsx`
- `src/features/storefront/service-legacy.ts`
- `src/app/[domain]/page.tsx`: FallbackStorefront, dynamic imports, legacy references
- `src/features/storefront/service.ts`: simplify or remove

### Rollback Strategy

Each commit atomic and revertible. Commit 5 is the only deletion commit — safe because all replaced code is confirmed dead in previous commits.
