# REF-01C.5 — Final Scorecard

| Domain | Single Writer | Single Reader | Aggregate | Snapshot | Storefront | Status |
|--------|---------------|---------------|-----------|----------|------------|--------|
| **Identity** | ❌ 4 writers (Brand, Setting x2, Tenant) | ❌ Reads from Setting.influencer_data (not Brand) | ✅ `WebsiteAggregate.identity` | ✅ `PublishedSnapshot.content.identity` | ❌ Reads live from DB | **❌ CRITICAL** |
| **Hero** | ✅ 1 admin writer (Settings) | ❌ Reads live from hero_data via getPublicPageData | ✅ `WebsiteAggregate.hero` | ✅ `PublishedSnapshot.content.hero` | ❌ Title/subtitle never rendered | **❌ BROKEN** |
| **Products** | ✅ 1 admin writer (Products page) | ❌ Reads live from Product table (two paths) | ✅ `WebsiteAggregate.products` | ✅ `PublishedSnapshot.content.products` | ❌ Reads live from DB | **⚠ DUPLICATE** |
| **Gallery** | ✅ 1 admin writer (Gallery page) | ❌ Reads live from GalleryImage table | ✅ `WebsiteAggregate.gallery` | ✅ `PublishedSnapshot.content.gallery` | ❌ Reads live from DB | **⚠ DUPLICATE** |
| **Links** | ❌ 3 active admin writers | ❌ Reads live from AffiliateLink table | ✅ `WebsiteAggregate.links` | ✅ `PublishedSnapshot.content.links` | ❌ Reads live from DB | **⚠ DUPLICATE** |
| **SEO** | ✅ 1 admin writer (SEO page) | ❌ Dual path (snapshot then legacy) | ✅ `WebsiteAggregate.seo` | ✅ `PublishedSnapshot.content.seo` | ❌ Dual read | **⚠ DUPLICATE** |
| **Theme** | ❌ 3 writers | ❌ Dual path (snapshot then niche fallback) | ✅ `WebsiteAggregate.theme` | ✅ `PublishedSnapshot.layout.theme` | ❌ Dual read | **⚠ DUPLICATE** |
| **Navigation** | ❌ Computed/broken | ❌ convertSnapshotToData returns [] | ❌ Not in aggregate | ❌ Not in snapshot | ❌ Rebuilt from legacy.*.length | **❌ BROKEN** |
| **Layout** | ✅ Builder | ❌ Dual format (legacy + artifact) | N/A | ✅ `PublishedSnapshot.layout` | ✅ `extractSlots()` reads snapshot | **⚠ DUAL FORMAT** |

## Totals

| Status | Count | Domains |
|--------|-------|---------|
| ✅ Complete | 0 | (none fully clean) |
| ⚠ Duplicate | 6 | Products, Gallery, Links, SEO, Theme, Layout |
| ❌ Critical | 2 | Identity (4 writers), Navigation (broken) |
| ❌ Broken | 2 | Hero (unrendered fields), Navigation (empty) |

## Go Decision for REF-01D

**✅ PROCEED.** The scorecard is poor (0/9 domains fully clean), but all issues are known and traceable to specific root causes:

1. **Identity**: 4 writers → consolidate to BrandRepository (REF-01D Commit 2)
2. **Hero**: Unrendered fields → fix HeroBanner component (REF-01D Commit 3)
3. **Products/Gallery/Links/SEO/Theme**: Live DB reads → replace with snapshot content (REF-01D Commits 1, 3)
4. **Navigation**: Broken → compute from layout (REF-01D Commit 1)
5. **Layout**: Dual format → keep artifact, add canonical alongside (REF-01C foundation complete)

**REF-01D should focus on:**
1. LayoutEngine to resolve sections + inject content
2. Removing getPublicPageData() live reads
3. Simplifying storefront to snapshot-only
4. Removing FallbackStorefront + SectionRegistry + legacy loaders
