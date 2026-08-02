# Video Playback Root Cause Report

**IMPLEMENTATION-18B · Phase E · 2026-08-01**

## Verdict

The storefront video pipeline **works** when the uploaded file is a real video.
The two real playback failures found and fixed:

1. **Invalid/truncated uploads** — the browser cannot decode them (no code defect
   in the renderer). Fixed by validating video magic bytes at upload.
2. **Media library 400s** — video assets were rendered through the Next Image
   optimizer (`/_next/image?url=…mp4` → **400**), which broke the dashboard
   journey and could surface as broken media. Fixed by rendering video thumbnails
   as `<video>`.

## Trace (upload → storage → aggregate → runtime → DOM → browser)

```
MediaField upload → uploadAsset → mediaService.upload
   → Supabase storage upload (contentType: video/mp4) → Asset.publicUrl
   → hero_data.videoUrl/videoAssetId (Save Video)
   → websiteAggregate.build(): resolveUrls([videoAssetId]) → public URL
   → HeroRenderer → HeroMedia <video src=… autoplay muted controls preload=metadata>
   → Browser: 206 video/mp4 range requests; readyState 4; playing
```

## Evidence (Playwright, real MP4)

```
[video resp 206 video/mp4 …/hero/d54470a9-….mp4]      ← storage serves correct Content-Type
[storefront <video> count] 1
[video state] {"readyState":4,"networkState":1,"error":null,"paused":false,"currentTime":3.96,"duration":10.03}   ← PLAYING
```

The earlier "does not play" uploads were truncated/non-video files whose bytes
were not a valid container; Supabase stored them, the browser could not decode
them.

## Root causes

| # | Cause | Evidence | Fix |
|---|---|---|---|
| 1 | Media library rendered video assets via Next `<Image>` | `/_next/image?url=…mp4&w=256&q=75` → **400** | render `<video>` thumbnails for `video/*` assets (grid + list) |
| 2 | No validation that a "video" file is a real video | uploaded invalid bytes never play | `MediaValidator.validateMagicBytes` rejects non-MP4/WebM/Ogg payloads |
| 3 | Hero video had no controls + no preload | autoplay-blocked states showed nothing | `HeroMedia` receives `controls` + `preload="metadata"` on the storefront |

## Verification

- Playwright: real MP4 plays (readyState 4, `paused:false`).
- Dashboard journey E2E: no 400s (media library video thumbnails).
- `npx playwright test --project=production` → 16/16.
