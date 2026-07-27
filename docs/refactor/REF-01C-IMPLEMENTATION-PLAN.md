# REF-01C — Implementation Plan

## Commit 1: WebsiteAggregateService

**Files added:** `src/lib/content/website-aggregate-service.ts`
**Files unchanged elsewhere.**

Create the canonical application service with `WebsiteAggregate` type. Reads from BrandRepository, SettingsService, ProductRepository, GalleryRepository, LinkRepository. No consumers yet.

**Risk:** LOW — additive.
**Verification:** `npx next build`

## Commit 2: Brand Repository — Add Active Product/Gallery Queries

**Files modified:**
- `src/modules/tenant/infrastructure/product-repository.ts` — add `findActiveByTenantId()`
- `src/modules/tenant/infrastructure/gallery-repository.ts` — add `findPublishedByTenantId()`
- `src/modules/tenant/infrastructure/link-repository.ts` — add `findActiveByTenantId()`

**Risk:** LOW — additive methods on existing repositories.
**Verification:** `npx next build`

## Commit 3: PublishingService — Use Aggregate

**Files modified:**
- `src/lib/publishing/service.ts` — replace `loadFromBuilder()` + enrichment with `WebsiteContentAssembler.assemble()`
- `src/lib/publishing/snapshot.ts` — replace `builderPagesToArtifact()` with direct `Snapshot` construction
- `src/lib/publishing/repository.ts` — accept new `Snapshot` format

**Risk:** MEDIUM — changes how Snapshot is created. Old snapshots remain readable.
**Verification:** Full E2E: dashboard → publish → storefront renders with correct content.

## Commit 4: Storefront LayoutEngine + Aggregate Consumption

**Files added:** `src/lib/renderer/layout-engine.ts`
**Files modified:**
- `src/app/[domain]/page.tsx` — replace `extractSlots()` with `LayoutEngine.resolve()`
- `src/services/published.service.ts` — remove `getPublicPageData()` call
- `src/lib/renderer/data-bound.tsx` — inject `content` from snapshot into component props

**Risk:** HIGH — changes storefront rendering logic.
**Verification:** E2E: storefront shows Hero, Products, Gallery, SEO correctly.

## Commit 5: Settings/Profile Consolidation

**Files modified:**
- `src/actions/settings.actions.ts` — remove identity field writes; delegate to profile
- `src/actions/onboarding.actions.ts` — use Brand repository for identity
- `src/features/profile/service.ts` — ensure writes are comprehensive
- `src/services/public.service.ts` — remove `getPublicPageData()` (delegate to aggregate)

**Risk:** MEDIUM — changes write paths for profile data.
**Verification:** Settings page saves hero correctly; Profile page saves identity correctly; storefront renders both.

## Commit 6: Dead Code Removal

**Files deleted:**
- `src/lib/publishing/snapshot.ts` — `builderPagesToArtifact()`, `isLegacySnapshot()`, legacy read paths
- `src/lib/storefront/sections.tsx` — legacy sections
- `src/lib/storefront/registry.ts` — SectionRegistry
- `src/features/storefront/service-legacy.ts` — dead service
- `src/features/storefront/service.ts` — `convertSnapshotToData()` removal
- Remove `ArtifactSnapshotRecord` type, `SnapshotData` union type

**Risk:** LOW — all replaced by new code in Commits 1-5.
**Verification:** `npx next build`

## Rollback Strategy

| Commit | Rollback |
|--------|----------|
| Commit 1 | `git revert` — additive only, no impact |
| Commit 2 | `git revert` — additive only |
| Commit 3 | `git revert` — old snapshots still exist in DB; old code still works |
| Commit 4 | `git revert` — old storefront rendering paths restored |
| Commit 5 | `git revert` — old write paths restored; Brand data preserved |
| Commit 6 | `git revert` — dead files restored (no runtime impact) |

## Total Effort Estimate

- Commit 1: 2 hours
- Commit 2: 1 hour
- Commit 3: 3 hours
- Commit 4: 4 hours
- Commit 5: 2 hours
- Commit 6: 1 hour
- **Total: ~13 hours**

## Open Questions

1. **Navigation storage:** Should navigation be stored in `WebsiteContent` or computed from the layout? Current recommendation: computed from the LayoutSnapshot pages at render time. Deprecate `Website.themeConfig.navigation`.

2. **Content freeze vs live reads:** Products/Gallery/Links are currently read live from DB (not from snapshot). Should the snapshot freeze them for version rollback support, or keep live reads? Recommendation: freeze in snapshot for consistency, but offer a "refresh content" feature in the dashboard that re-publishes with latest data without changing layout.

3. **Services/Courses/Testimonials/FAQ on storefront:** Currently not exposed. Should they be added to the aggregate/storefront now, or deferred? Recommendation: add to the aggregate type definition (to establish the canonical data model) but keep storefront rendering deferred — add it when those features get storefront components.
