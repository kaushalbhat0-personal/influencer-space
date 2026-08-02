# Builder Render Parity Report — IMPLEMENTATION-21

## Principle

One renderer. One resolver. One runtime.

- The Builder canvas and the Storefront both render through
  `ComponentRenderer` → `HeroRenderer` with config produced by the **same**
  `LayoutEngine` from the **same** aggregate.
- The aggregate attaches the single resolved media decision
  (`resolveHeroMediaForRuntime`) to `content.hero`; both surfaces consume it.
- There is NO preview-only renderer and NO builder-specific media logic.

## DOM equality

L1–L3 assert byte-level equality of the rendered media:

| Test | Builder DOM | Storefront DOM | Assertion |
|---|---|---|---|
| L1 (video) | `<video src=…mp4>` | `<video src=…mp4>` | `src` identical, `readyState === 4` |
| L2 (poster) | `<img src=…png>` | `<img src=…png>` | `src` identical |
| L3 (fallback) | `<img>` + `data-resolved-media="image"` | `<img>` + `data-resolved-media="image"` | no `<video>`, both resolve image |

## Runtime signature parity

`data-runtime-signature` = SHA-256(theme + layout + sha256(aggregate)). The
aggregate includes the resolved hero media fields, so:

- L5 asserts the builder canvas signature === storefront `<main>` signature.
- L5 asserts `data-resolved-media` is identical on both surfaces.

## Screenshot comparison

Playwright captured screenshots on both surfaces for every media state
(`playwright-report/screenshots/`):
- `l1-builder-video.png` vs `l1-storefront-video.png`
- `l2-builder-poster.png` vs `l2-storefront-poster.png`
- `l3-poster-fallback.png`

## Verified

- Local: L1–L5 5/5.
- Production (`influencer-space-alpha.vercel.app`): L1–L5 5/5.
