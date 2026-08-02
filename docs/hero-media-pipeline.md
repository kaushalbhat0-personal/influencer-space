# Hero Media Pipeline — IMPLEMENTATION-19 (Phase C)

## Root cause (three stacked defects)

1. **No upload progress.** `MediaField` called the `uploadAsset` server action
   via `fetch`. Server actions cannot expose upload progress, so for large
   videos the UI showed "Uploading…" indefinitely with zero feedback.
2. **Assets stuck at QUEUED forever.** `mediaService.upload` queued assets to a
   DB processing queue, but the background `startPolling` processor was **never
   wired into app startup**. Every asset stayed `QUEUED` (never `READY`), so the
   Media Library always showed a stuck "processing" state.
3. **Hero required a manual save + refresh.** After upload the creator had to
   click "Save Video" and the page reloaded for the storefront to reflect it.

## The fixed pipeline

```
<input file>
  → XHR POST /api/media/upload   (upload.progress → progress bar)
  → mediaService.upload
      → validator (magic bytes: ftyp / EBML / OggS)
      → dedup check (checksum)
      → Supabase storage upload
      → Asset row (processingStatus PENDING)
      → AssetReference (entityType=hero, field=videoUrl)
      → processAssetNow(asset, buffer)      ← NEW: synchronous
          → extract image dimensions/color from in-memory buffer
          → processingStatus = READY immediately
  → { assetId, url } to client
  → MediaField shows preview (object URL during upload, then final URL)
  → onUploadComplete(asset) → settings-form auto-saves hero_data
      → storefront updates WITHOUT refresh (content is live)
```

## Key fixes

- **`src/app/api/media/upload/route.ts`** — multipart upload endpoint so XHR can
  stream `upload.onprogress`. Auth via server session.
- **`src/lib/media/client-upload.ts`** — shared `uploadFileWithProgress()` used by
  `MediaField`, the Media Library toolbar, and replace flows.
- **`src/lib/media/service.ts`** — `processAssetNow()` runs during upload/replace
  (and on the dedup path) so assets are `READY` with metadata immediately. The
  fire-and-forget `enqueue()` that overwrote `READY` → `QUEUED` was removed.
- **`src/features/settings/components/settings-form.tsx`** — `onUploadComplete`
  saves the hero field with the **actual uploaded value** (not the still-stale
  React state — an async-state race), then revalidates. No manual click needed.
- **`src/components/shared/MediaField.tsx`** — real progress bar + immediate
  preview + "Uploading… %" label.

## Verified

- Progress bar appears during upload (J2).
- Auto-save succeeds without a manual click (J2).
- Asset is `READY` in the DB after upload.
- Storefront `<video>` plays (`readyState 4`, `paused:false`) — J2.
- Backfill script `scripts/backfill-asset-processing.ts` fixed the pre-existing
  QUEUED assets.
