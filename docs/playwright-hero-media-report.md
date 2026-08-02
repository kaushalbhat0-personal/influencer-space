# Playwright Hero Media Report — IMPLEMENTATION-21

## Coverage

| Suite | Test | Local | Production |
|---|---|---|---|
| IMPLEMENTATION-19 (J) | J1 media-first+overlap, J2 upload progress, J3 friendly statuses, J4 used-in, J5 no-about | ✅ | ✅ |
| IMPLEMENTATION-20 (K) | K1 upload contract, K2 video priority, K3 poster mapping, K4 runtime trace, K5 large-video no-413 | ✅ | ✅ |
| IMPLEMENTATION-21 (L) | L1 video parity, L2 poster parity, L3 poster fallback, L4 sidebar persist, L5 signature parity | ✅ 5/5 | ✅ 5/5 |

## Key evidence

### L1 — video parity (builder == storefront)
```
builder:  <video src=…/91a9aeb2-….mp4>   data-resolved-media="video"
storefront:<video src=…/91a9aeb2-….mp4>   data-resolved-media="video"  readyState=4
```
Same `src`, same decision, playing.

### L2 — poster parity
```
builder:  <img src=…/….png>   data-resolved-media="image"
storefront:<img src=…/….png>  data-resolved-media="image"
```
Same `src`.

### L3 — poster fallback (video removed)
Both surfaces: `data-resolved-media="image"`, `<img>` present, `<video>` absent.

### L4 — sidebar lifecycle
Collapse → hidden; toggle visible (re-open); expand → restored; refresh →
collapsed state persisted; toggle visible.

### L5 — runtime convergence
`data-runtime-signature` identical on builder canvas and storefront `<main>`;
`data-resolved-media` identical; DOM element matches the decision.

## Screenshots (playwright-report/screenshots)
- `l1-builder-video.png` · `l1-storefront-video.png`
- `l2-builder-poster.png` · `l2-storefront-poster.png`
- `l3-poster-fallback.png`
- `l4-sidebar-persisted.png`
- `l5-signature-parity.png`

## Command
```
npx playwright test --project=production --grep "L[0-9]" --workers=1 --reporter=line
BASE_URL=https://influencer-space-alpha.vercel.app   # production
```

## Conclusion
Builder, Storefront, Runtime Trace and Production DOM all render the EXACT same
hero media (video or poster) through the single runtime pipeline
(Database → websiteAggregate.build() → resolveHeroMediaForRuntime →
HeroRenderer → DOM).
