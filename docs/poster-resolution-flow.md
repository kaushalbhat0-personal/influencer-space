# Poster Resolution Flow — IMPLEMENTATION-20 (Phase B)

## The bug

Runtime reported `hasPoster = true`, yet Builder and Storefront showed nothing.

The stored `hero_data.posterUrl` pointed to a **stale storage object** that had
been **replaced** (the asset's `publicUrl` changed but the JSONB value kept the
old URL). The stale URL returned **HTTP 400** from storage, so the `<img>`
failed to render → "nothing shows".

## The trace

```
hero_data.posterUrl   (STALE: .../replace/1113a8d8-…png  → HTTP 400)
hero_data.posterAssetId (c51228ca-…)

asset lookup (assetRepository.findById)
  → Asset.publicUrl (FRESH: .../replace/57b3e5b3-…png → HTTP 200)

aggregate.hero.posterUrl
  ← overwritten with the FRESH URL when posterAssetId resolves
  ← falls back to the stored (stale) URL only if the asset lookup fails

LayoutEngine.composeSectionConfig
  → Object.assign(config, content.hero)  → config.posterUrl = fresh URL

HeroRenderer (resolveHeroMedia)
  → video? <video poster=fresh> : poster? <img src=fresh> : background/placeholder

DOM
  → <img> loads (HTTP 200) in Builder + Storefront
```

## The fix

- The aggregate already resolves asset ids to fresh storage URLs at render time
  (`mediaService.resolveUrls([videoAssetId, posterAssetId])`). The deployed
  build now runs that resolution, so the poster always uses the current asset
  URL — a stale `hero_data.posterUrl` can no longer surface.
- The renderer wires the poster correctly in both modes:
  - video present → `<video poster={posterUrl}>` (poster is the video frame),
  - video absent → `<img src={posterUrl}>` (poster is the media).
- Data hygiene: re-uploaded a real poster asset (`0747d3c9-…png`, 640×360) so
  the hero has a valid poster (the previous 1×1 test pixel was replaced).

## Verified

- K3: video element carries a `supabase` poster attribute on the storefront.
- K3: poster-only mode renders the media `<img>` in **Builder** and
  **Storefront** with the same source.
- I4: builder renders the same media (video or poster) as the storefront.
