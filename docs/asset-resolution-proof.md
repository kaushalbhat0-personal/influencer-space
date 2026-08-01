# Asset Resolution Proof

**IMPLEMENTATION-18 · Phase 7 · 2026-08-01**

## Claim

Locate every point where a data row is dropped or a lookup breaks between the
database and the renderer, and prove the `Invalid UUID ""` source.

## Reproduction (1:1 against the shared production DB)

Using the **committed (impl-12)** code logic:

```
heroData.videoAssetId = ""                          ← defaultHeroData merge (stored row lacks the key)
heroData.posterAssetId = "97cabab1-3b18-406a-a971-5de7f6bcd2d0"
Committed aggregate guard: if (videoAssetId || posterAssetId) -> true
resolveUrls inputs: ["","97cabab1-3b18-406a-a971-5de7f6bcd2d0"]
  findById("") THREW: invalid input syntax for type uuid: ""
```

**Result:** `Invalid `prisma.asset.findUnique()` invocation:
invalid input syntax for type uuid: ""` — byte-for-byte the production error.

## The committed-code defects (proven from `git show HEAD:`)

| File | Committed line | Defect |
|---|---|---|
| `src/config/hero.ts` | `videoAssetId: "", posterAssetId: ""` | defaults seed empty ids |
| `src/services/settings.service.ts` | `{ ...defaultHeroData, ...(data) }` | merge resurrects `""` when the stored row lacks the key |
| `src/modules/tenant/application/website-aggregate.service.ts` | `if (result.hero.videoAssetId \|\| …) resolveUrls([videoAssetId, posterAssetId])` | `""` enters the resolver |
| `src/lib/media/service.ts` | `resolveUrls: ids = assetIds.filter(id => id != null)` | **keeps `""`** |
| `src/lib/media/service.ts` | `getPublicUrl(assetId)` → `findById(assetId)` | passes `""` through |
| `src/lib/media/repositories/asset-queries.ts` | `prisma.asset.findUnique({ where: { id } })` | Prisma throws on `""` |

## Current working tree already fixes it (verified locally)

- `src/config/hero.ts`: `videoAssetId: null`, `posterAssetId: null`.
- `src/lib/media/resolve.ts`: `normalizeAssetId`/`requireAssetId`/
  `filterValidAssetIds` reject `""`, `undefined`, malformed ids with
  module+field logging.
- `resolveUrls`/`getPublicUrl`/`findById` all route through the resolver.
- `website-aggregate.service.ts`: normalizes hero/brand asset ids + per-module
  isolation (`buildWithDiagnostics`), so a single failure can never empty the
  whole aggregate.

## Asset inventory (shared DB, tenant)

| Asset | status | URL |
|---|---|---|
| 97cabab1-… | ACTIVE | storage `products/aad9397f-….png` (HTTP 200) |
| ee4a7105-… | ACTIVE | storage `replace/ee4a7105-….png` |

No deleted references; the only broken lookup is the empty `""` id injected by
the committed defaults.
