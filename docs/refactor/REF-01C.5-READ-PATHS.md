# REF-01C.5 — Illegal Read Detection

## Active Runtime Code Reading Directly from Business Tables

### Violations (must fix in REF-01D)

| # | File | Line | Table | Why it's illegal | Fix |
|---|------|------|-------|-----------------|-----|
| V1 | `src/services/public.service.ts` | 113-114 | `Setting` (influencer_data) | Reads identity data live instead of from snapshot | Replace with WebsiteAggregateService |
| V2 | `src/services/public.service.ts` | 116 | `Setting` (hero_data) | Reads hero data live instead of from snapshot | Replace with WebsiteAggregateService |
| V3 | `src/services/public.service.ts` | 117 | `Product` | Reads products live via loaders | Replace with snapshot content |
| V4 | `src/services/public.service.ts` | 118 | `AffiliateLink` | Reads links live via loaders | Replace with snapshot content |
| V5 | `src/services/public.service.ts` | 119 | `GalleryImage` | Reads gallery live via loaders | Replace with snapshot content |
| V6 | `src/services/public.service.ts` | 120 | `TimelineEvent` | Reads timeline live via loaders | Replace with snapshot content |
| V7 | `src/services/public.service.ts` | 121 | `Game` | Reads games live via loaders | Replace with snapshot content |
| V8 | `src/services/public.service.ts` | 122 | `ContentFeedItem` | Reads feed live via loaders | Replace with snapshot content |
| V9 | `src/lib/data/resolver.ts` | 17 | `Product` | DataResolver reads products live at render time | Inject snapshot content instead |
| V10 | `src/lib/data/resolver.ts` | 20 | `GalleryImage` | DataResolver reads gallery live | Inject snapshot content instead |
| V11 | `src/lib/data/resolver.ts` | 23 | `TimelineEvent` | DataResolver reads timeline live | Inject snapshot content instead |
| V12 | `src/lib/data/resolver.ts` | 26 | `AffiliateLink` | DataResolver reads links live | Inject snapshot content instead |
| V13 | `src/lib/data/resolver.ts` | 36-38 | `Website` + `Brand` | DataResolver reads social links live | Inject snapshot content instead |
| V14 | `src/services/published.service.ts` | 29 | ALL (via getPublicPageData) | **Dual-read**: calls getPublicPageData even when snapshot exists | Remove unconditional legacy call |

### Allowed Infrastructure Reads

| # | File | Line | Table | Why allowed |
|---|------|------|-------|-------------|
| A1 | `src/app/[domain]/page.tsx` | 18 | `Tenant` | Domain resolution (subdomain/customDomain lookup) — necessary for routing |
| A2 | `src/services/published.service.ts` | 17-20 | `Website` | Website lookup to find snapshot — necessary infrastructure |
| A3 | `src/services/published.service.ts` | 28 | `PublishSnapshot` | Primary snapshot read — correctly reads from snapshot store |
| A4 | `src/services/published.service.ts` | 24 | ALL (via getPublicPageData) | **Temporary** — fallback when no website exists |

### Dead Code (safe to remove)

| # | File | Line | Table | Why dead |
|---|------|------|-------|----------|
| D1 | `src/features/storefront/service-legacy.ts` | all | N/A | Zero importers |
| D2 | `src/features/storefront/actions.ts` | all | N/A | Zero importers |

## Summary

- **14 active violations** (V1-V14) that read business tables live during storefront rendering
- **4 allowed infrastructure reads** (A1-A4) for tenant resolution and snapshot retrieval
- **14 violations must be replaced** in REF-01D by reading from PublishedSnapshot.content
