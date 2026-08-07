# Agency Client Performance Report

RCCF-VALIDATION-03 · Agency Client Launch.

Performance observations across the agency-client journey.

## Findings

| # | Sev | Area | Issue |
| --- | --- | --- | --- |
| C-17 | Medium | Dashboard | ~85–110 queries per `/admin/dashboard` load. Duplicated count queries across `getMetrics`, the health engine, quick-start, and success; `getCreatorSuccess` + `getProfile` were read twice (Runtime Context + recommendation context). **Fixed**: the shared context now passes pre-read profile/success; duplicate `productOrder.count` removed. |
| C-18 | Medium | Commerce | Product list (`productService.list`) is unpaginated — large catalogs degrade the admin page. Testimonials/FAQ are unbounded JSON arrays rewritten wholesale on every mutation (O(n)). |
| C-19 | Medium | Publish | Publish rebuilds the full content aggregate (~16 queries) even though the snapshot stores an empty aggregate (presentation-only layout). |
| C-20 | Low | Media/storefront | `mediaService.resolveUrls` is N+1 per asset; the storefront rebuilds the aggregate on every request (by design — live content). |

## Scaled test (per audit)

| Path | Query profile |
| --- | --- |
| `/admin/dashboard` | ~85–110 queries (was ~4 duplicated count waves; deduped where shared reads overlap). |
| `/admin/products` (100 products) | Loads all rows (unpaginated). |
| `/admin/gallery` (100 items) | Paginated (limit 24) ✅. |
| Builder load | ~3 queries (website + pages/sections/blocks) ✅. Builder page also mounts preview (~16) + overview (~18). |
| Publish | ~28–34 queries; snapshot is layout-only (no content payload). |
| Storefront | ~16–20 queries per view (live content, by design). |

## Recommended fixes

1. Paginate `productService.list` (skip/take + count), mirror the gallery.
2. Cap testimonials/FAQ arrays (or page them) to bound `Setting.value` growth.
3. Skip the content-aggregate rebuild during publish when the snapshot stores
   only layout/theme/navigation.
4. Batch `resolveUrls` (single `WHERE id IN` query) instead of per-asset.

## Verified wins

- Single Runtime Context per request (RCCF-INTEGRATION-01) confirmed — Knowledge,
  Goals, Recommendations, Business Health and Evolution share one build.
- The V-03 dedup removes ~4 redundant queries per dashboard load (duplicate
  success/profile reads + order count).
