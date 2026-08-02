# Upload Response Contract — IMPLEMENTATION-20 (Phase A)

## The contract

`POST /api/media/upload` is a plain Route Handler. It returns `application/json`
for **every** response — success and failure:

| Case | HTTP | Body |
|---|---|---|
| Upload ok | 200 | `{ success: true, assetId, url, deduplicated }` |
| Not authenticated | 401 | `{ success: false, error: "Unauthorized" }` |
| Invalid multipart body | 400 | `{ success: false, error }` |
| No file | 400 | `{ success: false, error: "No file provided" }` |
| Validation error | 400 | `{ success: false, error }` |
| Storage/processing error | 400 | `{ success: false, error }` |

Never HTML. Never a redirect. Never a Server Action response. No action id
(so the endpoint survives deployment changes and can never go stale).

## Client handling (`src/lib/media/client-upload.ts`)

`uploadFileWithProgress()` decides by `content-type` + HTTP status:

1. `application/json` with body → parse and resolve.
2. `text/html` → resolve `{ success:false, error: "Upload endpoint returned an
   HTML page (HTTP n)…" }` — surfaces the broken layer instead of masking.
3. Other content types → report `unexpected response type (HTTP n)`.
4. Empty body → `empty response (HTTP n)`.
5. Transport failure → `Network error during upload`.

The generic "Invalid server response" is gone; every failure names its HTTP
status and content type so the misbehaving layer is identifiable.

## Why a Route Handler (not a Server Action)

Server actions embed an action id in the client bundle. After each deployment
the server no longer recognizes pre-deploy ids (`Failed to find Server Action`).
A Route Handler has no id — uploads work across deployments unconditionally.

## HTTP 413 — direct-to-storage upload (IMPLEMENTATION-20 follow-up)

Vercel's serverless functions cap request bodies at ~4.5 MB; a real hero video
exceeds that, so the multipart route returned **HTTP 413** (`text/plain`), which
the client surfaced as `Upload failed: unexpected response type text/plain
(HTTP 413)`.

Fix: the file body no longer travels through the app server. Two-step signed
upload:

1. `POST /api/media/upload-url` → validates metadata, dedupes by checksum, and
   returns a **signed upload URL** (`SupabaseStorageProvider.createSignedUploadUrl`).
2. The client **PUTs the file directly to the signed URL** (XHR progress) — the
   bytes go straight to Supabase, never through Vercel, so a 413 is impossible.
3. `POST /api/media/register` → registers the Asset row + reference
   (client supplies width/height/duration read from the file locally).

Local magic-byte validation runs client-side (the server never sees the buffer),
preserving the "reject fake videos" behavior. When a provider does not support
signed uploads (`supportsSignedUpload: false`), the client falls back to the
multipart route.

Verified: a **6.2 MB** video uploads on production with `upload-url 200
application/json`, no 413, auto-saved, storefront plays it (K5 regression).

## Files

- `src/app/api/media/upload/route.ts` — the endpoint (auth, validation, JSON).
- `src/app/api/media/upload-url/route.ts` — signed-URL step.
- `src/app/api/media/register/route.ts` — register step.
- `src/lib/media/client-upload.ts` — XHR client (progress + contract handling).
- All clients migrated: `MediaField`, `MediaFieldMulti`, `ImageManager`,
  `MediaPickerDialog`, Media Library.
