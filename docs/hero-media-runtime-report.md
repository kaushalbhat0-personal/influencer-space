# Hero Media Runtime Report — IMPLEMENTATION-21

## The single resolver

`src/lib/media/hero-media.ts` is the ONLY media resolver in the runtime:

```
resolveHeroMedia({ videoUrl, posterUrl, backgroundUrl })
  → { kind: "video" | "image" | "background" | "placeholder", url, poster }

resolveHeroMediaForRuntime(input) → {
  resolvedMedia, mediaType, mediaUrl, mediaPoster, rendererDecision
}
```

The priority is fixed: **video → poster → background → placeholder**. The avatar
NEVER replaces the media and always overlaps it.

## Where resolution happens

Resolution runs ONCE, in the runtime resolver layer (`websiteAggregateService`),
after asset ids are resolved to fresh storage URLs:

```ts
const heroMediaPayload = resolveHeroMediaForRuntime({
  videoUrl: result.hero.videoUrl,
  posterUrl: result.hero.posterUrl,
  backgroundUrl: result.hero.backgroundUrl,
});
result.hero.resolvedMedia = heroMediaPayload.resolvedMedia;
result.hero.mediaType = heroMediaPayload.mediaType;
result.hero.mediaUrl = heroMediaPayload.mediaUrl;
result.hero.mediaPoster = heroMediaPayload.mediaPoster;
result.hero.rendererDecision = heroMediaPayload.rendererDecision;
```

`content.hero` then carries the decision down the pipeline. The renderer, the
runtime signature, and every trace consume ONLY these resolved fields.

## No bypasses (BUG 3 audit)

- `HeroRenderer` no longer reads `videoUrl / posterUrl / backgroundUrl` or any
  `*_AssetId`. It reads `resolvedMedia`, `mediaType`, `mediaUrl`, `mediaPoster`,
  `rendererDecision` (plus presentation alignment props).
- `LayoutEngine` passes `content.hero` through and logs the resolved decision.
- `data-resolved-media` + `data-renderer-decision` attributes on the hero root
  expose the decision in the DOM for parity proof.
- The only raw-field readers are the admin authoring surfaces
  (`settings-form`, `settings-live-preview`) — correct, they manage the fields.

## Proof (local + production)

- `data-resolved-media="video"` on storefront AND builder when a video exists;
  both render `<video>` with the same `src`.
- `data-resolved-media="image"` when poster-only; both render `<img>` with the
  same `src`.
- Runtime signature (`data-runtime-signature`) is byte-identical between builder
  and storefront (it hashes the aggregate, which carries the resolved fields).
