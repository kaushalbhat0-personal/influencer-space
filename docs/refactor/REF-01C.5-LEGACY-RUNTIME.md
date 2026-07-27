# REF-01C.5 — Legacy Runtime Detection

## All Legacy Code Paths

| # | Item | File | Line | Is Runtime? | Can Delete in REF-01D? |
|---|------|------|------|------------|----------------------|
| 1 | `getPublicPageData()` | `public.service.ts` | 111 | ✅ YES — always called | ✅ Replace with WebsiteAggregateService |
| 2 | `PublicPageData` type | `public.service.ts` | 91 | ✅ YES — referenced by storefront | ✅ Remove entirely |
| 3 | `ArtifactSnapshotRecord` | `snapshot.ts` | 8 | ✅ YES — core type | ❌ Keep — still used by publish |
| 4 | `builderPagesToArtifact()` | `snapshot.ts` | 26 | ✅ YES — called in publish/preview | 💭 Replace with PublishedSnapshot in future |
| 5 | `convertSnapshotToData()` | `features/storefront/service.ts` | 3 | ✅ YES — called by storefront service | 💭 Replace with LayoutEngine |
| 6 | `isLegacySnapshot()` | `snapshot.ts` | 52 | ✅ YES — called in publish/preview/rollback | ❌ Keep until single format enforced |
| 7 | `FallbackStorefront` | `[domain]/page.tsx` | 163 | ✅ YES — rendered when slots empty | ✅ Remove — replace with EmptyStorefront |
| 8 | `sectionRegistry` | `storefront/registry.ts` | 48 | ✅ YES — imported by FallbackStorefront | ✅ Remove with FallbackStorefront |
| 9 | `registerDefaultSections()` | `storefront/sections.tsx` | 12 | ✅ YES — called in FallbackStorefront | ✅ Remove with FallbackStorefront |
| 10 | `legacy` object usage (10 locations) | `page.tsx` | multiple | ✅ YES — used for theme, SEO, nav, JSON-LD | ✅ Replace all with snapshot content |
| 11 | `extractProfileFromPages()` | `published.service.ts` | 37 | ✅ YES — called as fallback | ✅ Remove — content comes from aggregate |
| 12 | `extractSeoFromPages()` | `published.service.ts` | 68 | ✅ YES — called for SEO metadata | ✅ Replace with aggregate seo |
| 13 | `FallbackStorefront` dynamic import | `page.tsx` | 166-167 | ✅ YES — lazy import | ✅ Remove |

## Removal Plan for REF-01D

### Safe to Delete Immediately

1. `src/lib/storefront/registry.ts` — 48 lines
2. `src/lib/storefront/sections.tsx` — 117 lines
3. `src/lib/storefront/index.ts` — update to remove sectionRegistry export
4. `src/app/[domain]/page.tsx` — remove `FallbackStorefront`, its dynamic imports, and the `legacy` object dependency
5. `src/services/public.service.ts` — entire file (150 lines)
6. `src/features/storefront/service-legacy.ts` — 60 lines
7. `src/lib/data/loaders.ts` — remove storefront-specific loaders (keep if used elsewhere)
8. `src/lib/data/resolver.ts` — remove or simplify to not read business tables

### Modify (not delete)

1. `published.service.ts` — remove `getPublicPageData()` call, return snapshot-only
2. `page.tsx` — remove all `legacy.*` references; use `PublishedSnapshot.content.*`
3. `metadata.ts` — use snapshot content instead of legacy profile
4. `extractSlots()` — simplify to handle only artifact format

### Keep (legacy but still needed internally)

1. `builderPagesToArtifact()` — still used by preview() — will be replaced in later commit
2. `isLegacySnapshot()` — still used by rollback() for old snapshots
3. `ArtifactSnapshotRecord` — still the publish format (will be replaced by PublishedSnapshot)
