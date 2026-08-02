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

## Files

- `src/app/api/media/upload/route.ts` — the endpoint (auth, validation, JSON).
- `src/lib/media/client-upload.ts` — XHR client (progress + contract handling).
- All clients migrated: `MediaField`, `MediaFieldMulti`, `ImageManager`,
  `MediaPickerDialog`, Media Library.
