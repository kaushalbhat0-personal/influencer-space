# Hero Media Root Cause — IMPLEMENTATION-20

## The production failure

Upload reaches 100% → UI shows **"Invalid server response"** → preview never
appears → hero video is not saved → runtime reports `hasVideo: false`.

Production logs contained:
- `Failed to find Server Action ...`
- `Cannot read properties of undefined (reading 'workers')`

## Root causes

### 1. Endpoint contract violation → "Invalid server response"

The XHR client parsed `xhr.responseText` with `JSON.parse` and, on failure,
returned the generic **"Invalid server response"**. Any non-JSON response — a
404 HTML page, a 500 error page, a dev overlay, or a **Server Action response**
(which is not the JSON shape the client expected) — hit that catch-all.

`Failed to find Server Action` is a Next.js error raised when a client calls a
server action whose action id is **stale after a deployment** (the old bundle
still holds the pre-deploy action id; the new server no longer recognizes it).
Any upload path still using the `uploadAsset` **server action** after a
deployment would produce exactly this.

`Cannot read properties of undefined (reading 'workers')` is a Next.js runtime
error that surfaced on the stale production build when the route/action crashed
inside the serverless function; it confirmed the endpoint could not serve the
stable JSON the client needed.

### 2. Three upload paths still used server actions (stale action ids)

`MediaFieldMulti`, `ImageManager` and `MediaPickerDialog` all called the
`uploadAsset` server action directly. After every deployment their action ids
went stale → "Failed to find Server Action" → upload failed at the UI layer.

## Fixes

1. **One stable JSON contract.** `POST /api/media/upload` is a plain Route
   Handler (no action id) that returns `application/json` for EVERY response —
   success and failure (auth, validation, storage errors). It can never return
   HTML, a redirect, or a Server Action response, and survives deployments.
2. **Robust client.** `client-upload.ts` inspects `content-type` + HTTP status;
   non-JSON responses are reported with the status/type instead of being masked
   as "Invalid server response".
3. **All upload paths migrated** to the XHR route: `MediaField`,
   `MediaFieldMulti`, `ImageManager`, `MediaPickerDialog`, Media Library. No
   client upload uses a Server Action anymore → no stale action ids.

## Verified

- Upload responses: `200 application/json` (local + production).
- No "Invalid server response" in the UI (K1).
- No "Failed to find Server Action" during upload.
- Upload → auto-save → storefront video plays (`readyState 4`) on production.
