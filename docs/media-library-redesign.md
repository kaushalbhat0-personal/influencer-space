# Media Library Redesign — IMPLEMENTATION-19 (Phase D)

## Problem

Creators saw raw backend states: **QUEUED**, **PENDING**, **PROCESSING**,
"3 refs". Upload had a spinner that never resolved until a manual refresh.
Video cards offered no duration/resolution/size. There was no "where is this
used" story.

## Redesign

### Friendly statuses (never technical)

| Backend state | Creator-visible badge |
|---|---|
| `status = DELETED` | **Trashed** |
| `processingStatus = FAILED` | **Failed** |
| `QUEUED / PENDING / PROCESSING` | **Processing…** |
| `READY` | **Ready** |
| `referenceCount > 0` | **Used** (pill, emerald) |
| `referenceCount = 0` | **Unused** (pill, zinc) |

`QUEUED`, `PENDING` and `PROCESSING` never reach the UI. J3 asserts no technical
string appears.

### Upload flow (no refresh)

```
Click Upload → real progress bar (% ) → new asset appears in the grid → Ready
```
Uses `uploadFileWithProgress` (XHR) + `mediaService.upload`'s synchronous
processing, so the asset is **Ready** the moment it lands in the grid.

### Cards

- **Video cards:** ▶ overlay, duration, resolution, size on hover.
- **Image cards:** thumbnail, dimensions, size on hover.
- Hover overlay: **Preview** · **Copy URL**.

### Asset detail panel

Shows Name, Type, Size, Resolution (image), Duration (video), Storage Provider,
Status, Used In count, Created, Last Updated, and a live `<video>` preview for
videos.

## Files

- `src/app/admin/media/_components/media-library.tsx` — rewritten UI.
- `src/actions/media-library.actions.ts` — `resolveAssetReferences`.
- `src/lib/media/client-upload.ts` — shared XHR uploader.

## Verified

- J3: Media Library shows only friendly statuses; no `QUEUED/PENDING/PROCESSING`.
- J4: Used In links render and delete is blocked for referenced assets.
- Test 07 now targets the detail-panel replace input (the top toolbar Upload is
  the first file input on the page).
