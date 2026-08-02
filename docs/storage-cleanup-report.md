# Storage Cleanup Report — IMPLEMENTATION-23

## Storage removal

`StorageProvider.deleteMany(keys)` added to the interface and implemented for
Supabase (`src/lib/media/providers/supabase.ts`):

- `storage.remove([...keys])` in chunks of 900 (Supabase's per-call limit).
- Returns `{ removed, failed }`; failed keys are logged and reported.

The `local` provider falls back to per-key `delete` (dev only).

## Origin verification (PART 6)

Immediately after removal, `deleteAssetsBulk` verifies every deleted key via
`provider.exists(storageKey)` — this checks the **storage origin**, bypassing
Supabase's CDN (which can serve a cached 200 for up to an hour after a delete,
so an HTTP GET on the public URL is NOT a reliable 404 probe).

- `storageVerifiedRemoved` = keys that no longer exist at the origin.
- `storageFailed` = keys that failed to remove.
- A new action `verifyStorageObjects(keys)` exposes the same origin check for
  tests.

## Verification

- M1/M6: after delete the object is confirmed gone at the origin and the UI
  reports "storage objects removed".
- A direct probe confirmed the flow: upload → `remove` → `exists=false`
  (while the CDN public URL may still briefly return 200, the origin is clean).

## Consistency

DB rows are deleted in a transaction FIRST, then storage objects are removed.
If a storage removal fails, the DB is already consistent (no stale row); the
failure is logged in the audit trail and reported in the result so an orphaned
object can be cleaned up without affecting the database.
