# Storefront Performance — Final (RCCF-LAUNCH-01)

## Per-request budget (production, after fixes)

| Step | Queries |
| --- | --- |
| Tenant lookup (subdomain/customDomain OR) | 1 |
| Published snapshot (website + publishStatus + snapshot) | 3 |
| Aggregate build (`websiteAggregateService.buildWithDiagnostics`) | ~14 |
| Goal profile | 1 |
| Platform config (maintenance flag) | 1 |
| **Total** | **~19** |

Before this sprint the pipeline ran **twice** (~38 queries) because
`generateMetadata` and the page component each invoked the un-memoized
`getSnapshotData`. Now wrapped in `React.cache` (per-request).

## Fixes applied

| Fix | Effect |
| --- | --- |
| `React.cache(getSnapshotData)` | halves DB load + one `layoutEngine.resolve` per request |
| `traceRuntime` logs gated to non-production | removes per-request block construction + 2 large log writes (signature kept for E2E) |
| `LayoutEngine` 11 per-section `console.log` gated to non-production | removes per-request log I/O |
| Hero LCP `<img>` → `loading="eager"` + `fetchPriority="high"` + `decoding="async"` | faster LCP (fixed-aspect container ⇒ no CLS) |
| `next.config.mjs` remotePatterns (ytimg/instagram/jtvnw) | fixes "unconfigured host" breaking content-feed images |

## Verified good (no change)

- Navigation + legal generation are **publish-time** — no per-request work.
- Adaptive visibility / experience resolution runs once, O(registry ~20).
- Goal nav/section ordering O(n log n) on ~15 sections — negligible.
- `CreatorImage` uses `fill` + aspect-ratio + blur placeholder (CLS-safe);
  YouTube embeds `aspect-video`; fonts self-hosted via `next/font/local`.
- 60s CDN `Cache-Control` + SWR on `/:slug` absorbs repeat views; the page
  remains `force-dynamic` per IMPLEMENTATION-16 (live content).

## Roadmap (documented, not a sprint item)

- Hero via `CreatorImage` (srcset/AVIF) once remotePatterns are settled.
- ISR (`revalidate = 30`) if live-content freshness is ever relaxed — the
  invalidation machinery (`afterContentChange`) is already wired.
- Split client hydration: keep static sections server-rendered, lazy-hydrate
  below-the-fold (forms, buy buttons).
- `loading.tsx` for `[domain]` (perceived performance on the slowest route).
