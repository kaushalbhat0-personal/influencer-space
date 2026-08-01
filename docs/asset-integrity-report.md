# Asset Integrity Report

**IMPLEMENTATION-17 · Phase B · 2026-08-01**

## Verdict

There is now **one safe asset resolver**. Every asset lookup and every asset
write/processing path rejects empty strings, `undefined`, `null`, `"null"`,
`"undefined"` and malformed ids **before Prisma is called**, and logs the
originating module and field. Production logs show **zero** `Invalid UUID ""`
errors.

## The single resolver

`src/lib/media/resolve.ts`:

```ts
normalizeAssetId(id, ctx?)  // READ: returns null + warns on empty/invalid/not-a-UUID
requireAssetId(id, ctx)     // WRITE/PROCESSING: throws AssetResolutionError on invalid
filterValidAssetIds(ids, ctx?)
```

Every rejection logs the origin: `[AssetResolver] rejected invalid asset id "" (aggregate.hero.posterAssetId)`.

## Audit — every `prisma.asset` / asset query site

| Site | Path | Before | After |
|---|---|---|---|
| `assetQueries.findById` | read | ❌ raw id → `findUnique({id})` | ✅ `normalizeAssetId` |
| `assetQueries.getReferenceCount` | read | ❌ raw id | ✅ `normalizeAssetId` |
| `mediaService.getPublicUrl` | read | ❌ raw id → `findById` | ✅ normalize at entry |
| `mediaService.resolveUrls` | read | ❌ only filtered `!= null` | ✅ `filterValidAssetIds` |
| `assetCommands.update` | write | ❌ raw id → `update({id})` | ✅ `requireAssetId` |
| `assetCommands.softDelete/restore/hardDelete` | write | ❌ raw id | ✅ `requireAssetId` |
| `referenceRepository.create/remove/removeAll` | write | ❌ raw id | ✅ `requireAssetId` |
| `referenceRepository.findByAsset/countByAsset` | read | ❌ raw id | ✅ `normalizeAssetId` |
| `processingQueue.enqueue/acknowledge/fail/getStatus` | processing | ❌ raw id | ✅ `requireAssetId` |
| `processingQueue.dequeue` | processing | ❌ raw id (from row, safe) | ✅ `requireAssetId` |
| `processingProcessor.processAsset` | processing | ❌ raw id | ✅ `requireAssetId` |
| aggregate brand avatar/banner | read | ✅ (impl-13) | ✅ + module/field context + diagnostics |
| aggregate hero video/poster | read | ✅ (impl-13) | ✅ + module/field context + diagnostics |

## The failing path this eliminated

`prisma.asset.findUnique({ where: { id: "" } })` (or any invalid id) throws
`PrismaClientValidationError: Invalid UUID ""`. The remaining raw-id call sites
were the write/processing paths (`asset-commands`, `reference-repository`,
`processing/*`). They now fail fast with a clear `AssetResolutionError` naming
the module/field instead of letting Prisma throw an opaque error mid-pipeline.

## Aggregate diagnostics

`websiteAggregateService.buildWithDiagnostics(tenantId)` now returns:

```ts
{
  aggregate,                       // always returned (per-module isolation)
  invalidAssetIds: [{ id, module, field }],   // ids rejected by the resolver
  skippedAssets: number,           // valid ids that resolved to no public URL
  moduleFailures: string[],        // per-module query failures
}
```

For `testcreator1@gmail.com`: `invalidAssetIds: 0`, `skippedAssets: 0`,
`moduleFailures: 0`.

## Root cause — data rows referencing stale storage objects

A second integrity defect surfaced under verification: gallery/product rows
referenced Supabase storage objects that had been replaced/deleted, so the
storefront requested them and got **HTTP 400** → broken/placeholder images (the
"Storefront renders layout but placeholder content" symptom). Fixed at the data
source: `scripts/seed-prod-e2e.ts` now resolves the tenant's real `ACTIVE` asset
`publicUrl`s and repoints gallery + product images at valid objects.

## Verification

- `scripts/runtime-data-audit.ts` → invalid asset ids **0**.
- Dev server log scan for `Invalid UUID|invalid input syntax for uuid` → **0**.
- Production E2E suite → **9/9** (strict console/network assertion incl. the
  formerly-400 image load).
