# REF-01C.5 — Storefront Dependency Audit

## Current Dependencies

The storefront page (`[domain]/page.tsx`) currently depends on:

| Dependency | Why | Can Remove? |
|-----------|-----|-------------|
| `prisma.tenant` | Domain resolution (subdomain/customDomain lookup) | ❌ Needed — infrastructure |
| `published.service.ts` | Loads snapshot + legacy data | ❌ Needed — snapshot loading |
| `public.service.ts` | **LEGACY** — reads 8 tables unconditionally | ✅ In REF-01D — replace with snapshot content |
| `publishSnapshotService` | Snapshot reads | ❌ Needed |
| `extractSlots()` | Converts snapshot to renderable slots | ❌ Needed — but simplify to artifact-only |
| `extractTheme()` | Theme CSS variables | ❌ Needed — read from snapshot only |
| `DataBoundRenderer` | Renders slots with data resolution | ✅ In REF-01D — inject content, skip live resolver |
| `ComponentRenderer` | Registry lookup + rendering | ❌ Needed — core renderer |
| `ComponentRegistry` | Component lookup | ❌ Needed — core registry |
| `dataResolver` | **ILLEGAL** — reads 5 business tables live | ✅ In REF-01D — replace with snapshot content |
| `loaders.ts` | **ILLEGAL** — reads Product/Gallery/Link tables live | ✅ In REF-01D — remove all |
| `SectionRegistry` | **LEGACY** — FallbackStorefront only | ✅ In REF-01D — remove entirely |
| `FallbackStorefront` | **LEGACY** — renders from PublicPageData | ✅ In REF-01D — remove entirely |
| `buildStorefrontMetadata` | SEO from legacy profile | ✅ In REF-01D — use snapshot content |
| `buildStorefrontJsonLd` | JSON-LD from legacy profile | ✅ In REF-01D — use snapshot content |
| `sectionDefs` (nav) | Computed from legacy.*.length | ✅ In REF-01D — compute from snapshot content |

## Target Dependencies for REF-01D

```
Storefront page depends ONLY on:

  prisma.tenant                          (domain resolution — infrastructure)
  published.service.ts → PublishSnapshot (snapshot loading — canonical)
  WebsiteAggregateService                (content assembly — canonical)
  LayoutEngine                           (resolves sections from layout + content)
  ComponentRegistry                      (component lookup)
  ComponentRenderer                      (rendering)
```

## Illegal Dependencies to Remove

1. `public.service.ts` — entire file (8 business table reads)
2. `dataResolver` — live business data resolution
3. `loaders.ts` — product/gallery/timeline/affiliate/game queries
4. `SectionRegistry` — legacy rendering
5. `FallbackStorefront` — legacy rendering
6. `legacy` object — all usage
7. `extractSlots()` — replace with LayoutEngine

## Legal Dependencies to Keep

1. `publishSnapshotService.getLive()` — canonical snapshot read
2. `ComponentRegistry` — canonical component registry
3. `DataBoundRenderer` — renders slots (simplified to skip dataResolver)
4. `ComponentRenderer` — core rendering
5. `prisma.tenant.findFirst()` — domain resolution
