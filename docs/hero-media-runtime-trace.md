# Hero Media Runtime Trace — IMPLEMENTATION-20 (Phase D)

## Instrumentation

The hero media decision is logged at two layers with identical fields, so the
Builder and the Storefront produce byte-identical values:

### 1. Aggregate (`website-aggregate.service.ts`)

```
[RuntimeTrace] hero media: {
  videoAssetId, videoUrl, posterAssetId, posterUrl, backgroundUrl,
  resolvedMedia, rendererDecision
}
```

The aggregate resolves `videoAssetId`/`posterAssetId` to fresh storage URLs at
render time (never a stale baked URL), then computes the decision via
`resolveHeroMedia`.

### 2. LayoutEngine (`LayoutEngine.composeSectionConfig`)

The same fields are logged when a `hero.*` section is composed — for both the
storefront render and the builder live preview, because both consume this
engine.

## Deterministic decision (`src/lib/media/hero-media.ts`)

`resolveHeroMedia({ videoUrl, posterUrl, backgroundUrl })` is the SINGLE
resolver shared by the renderer and the trace:

```
video present      → { kind: "video", url, poster }
else poster present → { kind: "image", url }
else background     → { kind: "background", url }
else                → { kind: "placeholder", url: null }
```

`rendererDecision` is the human string ("render <video> with poster", "render
<img> poster", …). `resolvedMedia` is the machine kind.

## Verified

Local logs (identical values across requests):

```
videoAssetId: '120bf804-…'   resolvedMedia: 'video'
rendererDecision: 'render <video> with poster'
```

Production storefront video DOM (`readyState 4`, `src=608177fb-….mp4`) matches
the `resolvedMedia: 'video'` decision — the trace matches the rendered DOM.

## Parity

- Builder canvas and storefront render the same `<video>`/`<img>` source
  (verified by I4: same media kind + same URL on both surfaces).
- `data-runtime-signature` is present on both the storefront `<main>` and the
  builder canvas (04b asserts Builder signature == Storefront signature).
