# Database Integrity Report — IMPLEMENTATION-23

## What is removed on delete

For every deleted asset:
- `AssetReference` rows (bulk `deleteMany where assetId IN (...)`).
- `Asset` row (bulk `deleteMany where id IN (...)`).
- Storage object(s).
- The audit trail entry (new).

No orphaned `AssetReference` rows, no dangling FK targets, no deleted-but-kept
rows: the delete is a **hard delete** (not a soft/trash delete), so the DB is
immediately consistent.

## Transaction safety (PART 5)

`deleteAssetsBulk` wraps the reference + asset deletes in a single
`prisma.$transaction`. If anything fails mid-batch:

- The transaction rolls back → no partial DB state.
- Per-key failures (`storageFailed`) and any action error (`failures`) are
  reported back, so the caller knows exactly which assets succeeded/failed.

## No stale rows (PART 10)

- All lookups are bulk (`id IN (...)`, chunked inserts for seeds).
- M5 seeds 100 assets, batch-deletes them, and asserts **zero** seeded rows
  remain (`assetRowCount(ids) === 0`).
- M2 asserts the same for 10 assets.

## Used/Unused accuracy (PART 8)

- The badge is computed live from `resolveAssetUsage` on every `listAssets`
  call — never a cached or estimated boolean.
- After any delete, the remaining assets re-scan, so counts stay correct.

## Verification

- tsc ✅ · 1647 unit tests ✅ · build ✅
- M1/M2/M5/M6 confirm DB rows are removed; M3/M10 confirm referenced assets
  are protected (blocked, not deleted).
