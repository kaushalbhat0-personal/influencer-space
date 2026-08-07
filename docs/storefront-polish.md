# Storefront Polish — RCCF-LAUNCH-TRACK-01

## Render path (verified premium)

- **~19 queries/request** (React.cache'd pipeline), indexed hot paths, 60s CDN
  cache + SWR — fast and live.
- **Hero LCP**: `HeroMedia` uses `loading="eager"` + `fetchPriority="high"` +
  `decoding="async"` in a fixed-aspect container (no CLS).
- **Images**: `CreatorImage` uses `fill` + aspect-ratio + blur placeholder;
  YouTube embeds in `aspect-video`; remote patterns include YouTube/Instagram/
  Twitch.
- **Fonts**: self-hosted via `next/font` (no render-blocking font link).
- **Themes**: experience-aware theme runtime; every section composed through the
  canonical LayoutEngine.

## Conversion
- Buy Now buttons are links with proper accessibility; product cards carry
  prices + CTAs; trust indicators, testimonials, milestones, gallery and FAQ
  sections all present.
- Checkout is Razorpay-backed with a confirmation path (verified in the
  commerce audit).

## Copy
- Section copy is creator-authored; no platform/developer jargon leaks onto the
  storefront (verified — "Runtime"/"Aggregate"/"Snapshot" appear nowhere in
  `[domain]` rendering).

## Gaps (roadmap)
- Hero media via `CreatorImage` (srcset/AVIF) once remotePatterns settle.
- `loading.tsx` for `[domain]` (blank until HTML streams today).
- Storefront hydration split: keep static sections server-rendered, lazy-hydrate
  below-the-fold forms/buy buttons.
