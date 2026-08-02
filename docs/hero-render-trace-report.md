# Hero Render Trace Report — IMPLEMENTATION-21 (BUG 4)

## The full pipeline trace

Every stage logs the REAL runtime values — no inference, no assumptions.

```
DATABASE (hero_data)
  videoAssetId / posterAssetId / backgroundAssetId
  ↓
AGGREGATE (websiteAggregate.build)
  videoUrl / posterUrl / backgroundUrl   (fresh, resolved from asset ids)
  ↓
RESOLVEHEROMEDIA (resolveHeroMediaForRuntime)
  resolvedMedia / mediaType / rendererDecision
  ↓
BUILDER (LayoutEngine compose)
  received props: resolvedMedia / mediaType / mediaUrl / mediaPoster
  ↓
STOREFRONT (LayoutEngine compose)
  received props: same resolved fields
  ↓
HERORENDERER
  chosen element: <video> | <img> | placeholder   (from resolvedMedia only)
  ↓
DOM
  actual rendered element with src
  data-resolved-media + data-renderer-decision attributes
```

## Instrumentation points

1. **Aggregate** (`website-aggregate.service.ts`) — after asset resolution,
   logs `[RuntimeTrace] hero media:` with `videoAssetId, videoUrl, posterAssetId,
   posterUrl, backgroundUrl, resolvedMedia, rendererDecision`.
2. **LayoutEngine** (`LayoutEngine.composeSectionConfig`) — logs the resolved
   fields the renderer will receive (`resolvedMedia, mediaType, mediaUrl,
   mediaPoster, rendererDecision`) for every `hero.*` section. Builder and
   storefront both flow through this engine.
3. **Renderer** (`HeroRenderer`) — exposes `data-resolved-media` and
   `data-renderer-decision` attributes on the hero root, so the DOM itself
   proves which decision was applied.

## Equality proof (L5)

- Builder `data-runtime-signature` === Storefront `data-runtime-signature`.
- Builder `data-resolved-media` === Storefront `data-resolved-media`.
- The DOM element matches: `video` → `<video>` present; `image`/`background` →
  `<img>` present.

Sample (local log):

```
[RuntimeTrace] hero media: {
  videoAssetId: '31361d20-…', videoUrl: '…/91a9aeb2-….mp4',
  posterAssetId: 'c9cce7c3-…', posterUrl: '…/610db629-….jpg',
  backgroundUrl: null, resolvedMedia: 'video',
  rendererDecision: 'render <video> with poster'
}
```
