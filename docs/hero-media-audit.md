# Hero Media Audit

**IMPLEMENTATION-18A · Phases 2 & 3 · 2026-08-01**

## Verdict

Hero media — video, poster, and (new) background — all flow through one path:
**MediaField upload → storage → hero_data → aggregate → storefront**. Video and
poster upload/replace/delete/preview are wired through the shared media pipeline
with validation. Both were verified in the browser.

## The unified media pipeline

```
MediaField (upload / replace / remove / choose-from-library)
   → uploadAsset() server action
   → mediaService.upload() (mime + size validation, storage provider)
   → Asset row + Storage object + public URL
   → form state { url, assetId }
   → updateHeroData / updateHeroPartial → hero_data (poster/video/background)
   → websiteAggregate.build() resolves asset ids → URLs
   → HeroRenderer (HeroMedia) renders <video>/<img>
```

## Video (Phase 2)

| Capability | Status | Evidence |
|---|---|---|
| Upload | ✅ | E2E probe: `input[accept*="video"]` → upload → storage → `<video src=supabase>` preview appears; 0 console errors |
| Replace | ✅ | same MediaField "Replace" button (existing asset replaced) |
| Delete | ✅ | MediaField "Remove" → clears hero_data + dereferences asset |
| Re-upload | ✅ | re-upload after remove |
| Preview | ✅ | MediaField renders `<video>`; HeroRenderer renders `HeroMedia` |
| Poster fallback | ✅ | `HeroMedia` shows poster when `videoUrl` absent |
| Validation | ✅ | `MediaValidator` (mime: mp4/webm/ogg/quicktime; ≤500 MB) |

## Poster (Phase 3)

| Capability | Status | Evidence |
|---|---|---|
| Upload | ✅ | E2E `H4` — upload persisted; preview image appears |
| Replace / Delete | ✅ | MediaField buttons |
| Responsive loading | ✅ | `CreatorImage`/`HeroMedia` with alignment classes |
| Image optimization | ✅ | `resolveImageProps` variants (fixed in IMPLEMENTATION-17) |

## Background (new)

- `hero_data.backgroundUrl/backgroundAssetId` + a dedicated MediaField card in
  the Hero form; rendered when video/poster are absent (background is the
  lowest-priority media layer).

## Storage truth (verified)

- Uploads land in the tenant's Supabase bucket; `Asset` rows are `ACTIVE` with a
  `publicUrl`; hero_data stores both `url` and `assetId`; the aggregate resolves
  the live URL via `resolveUrls` (asset ids normalized — no `Invalid UUID ""`).
