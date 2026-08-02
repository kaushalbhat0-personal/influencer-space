# Playwright Batch Delete Report — IMPLEMENTATION-23

File: `tests/e2e/production/implementation23.spec.ts` (serial)

| Test | Verifies | Local | Production |
|---|---|---|---|
| M1 | Delete one unused image — DB cleaned, storage cleaned, UI refreshed | ✅ | ✅ |
| M2 | Batch delete ten unused assets — all removed, no stale rows | ✅ | ✅ |
| M3/M10 | Attempt deleting Hero video — blocked, "Used In: Hero Video" | ✅ | ✅ |
| M9 | Hero poster badge == Used; details list Hero Poster | ✅ | ✅ |
| M6 | Storage objects verified removed (origin check; notice reports it) | ✅ | ✅ |
| M5 | Batch delete 100 seeded assets — no N+1, no stale rows | ✅ | ✅ |
| M7 | Runtime refresh — storefront hero still renders after deletions | ✅ | ✅ |

## Key assertions

- **M1/M2/M5**: `assetRowCount(ids) === 0` after delete — DB fully consistent.
- **M3/M10**: the hero video card shows Used; details "Used In" lists
  "Hero Video"; the delete control is replaced by the "Replace instead of
  deleting" guard.
- **M6**: the batch-delete notice includes "storage objects removed" (origin
  verification ran).
- **M7**: storefront hero has a non-zero bounding box and a valid runtime
  signature after deletions.

## Test data notes

- Test uploads use a **unique 1×1 PNG** (random pixel) so they never deduplicate
  against existing assets — each upload creates a fresh, unused asset.
- M2/M5 seed assets directly via `pg` (fast, deterministic, never referenced).
- Leftover seeded assets are cleaned up between runs.

## Command

```
npx playwright test --project=production --grep "M[0-9]" --workers=1 --reporter=line
BASE_URL=https://influencer-space-alpha.vercel.app   # production
```
