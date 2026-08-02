# Batch Delete Report — IMPLEMENTATION-23

## Server action

`deleteAssetsBulk(assetIds)` in `src/actions/media-library.actions.ts`:

1. **Batch fetch** assets (`where id IN (...)`, one query).
2. **Reference safety**: `resolveAssetUsage` for all selected → `blocked` list
   (asset + usages). If a selected asset is used, it is NOT deleted and is
   surfaced in a "Cannot delete — Used in: …" dialog. Never silent.
3. **Transactional DB cleanup**: `prisma.$transaction` deletes
   `AssetReference` rows (`deleteMany`) then `Asset` rows (`deleteMany`).
4. **Bulk storage removal**: `provider.deleteMany(keys)` (Supabase `remove`
   chunked at 900), then **origin verification** via `provider.exists` for each
   key → `storageVerifiedRemoved`.
5. **Audit** via `logAction("MEDIA_BULK_DELETE", …)`.
6. **Runtime refresh**: `afterContentChange` + path revalidation.

## Result contract

```ts
{
  success, deleted: [{assetId, bytes}], blocked: [{assetId, filename, usages}],
  failures, removedRefs, storageRemoved, storageFailed,
  storageVerifiedRemoved, totalBytes, durationMs
}
```

## UI

- Multi-select checkboxes (Shift = range, Ctrl/Cmd = toggle).
- Toolbar: `N Selected · Delete · Deselect · Select all filtered (N)`.
- Confirmation dialog: "Delete N assets? … N files · M videos · K images ·
  Storage objects will also be removed. Cancel / Delete."
- Reference-block dialog: "Cannot delete referenced assets — Used in: …"
  with `Go To Section` links.
- Notice after success: "Deleted N assets · M storage objects removed."
- Empty state with Upload + documentation.
- Single-item delete (details panel) routes through the same full-cleanup path.

## Performance (PART 10)

- Bulk `IN (...)` lookups; one resolver scan; chunked bulk storage removal.
- M5 proves a 100-asset batch delete completes with **no stale rows** and no
  N+1 (the test measures the seeded rows reaching 0).

## Verification

- M1: single unused image — DB + storage cleaned, UI refreshed.
- M2: ten unused assets — everything removed.
- M3/M10: Hero video delete blocked, "Used In: Hero Video".
- M5: 100 assets — no stale rows.
- M6: storage objects verified removed (origin check).
- Local 7/7 and Production 7/7.
