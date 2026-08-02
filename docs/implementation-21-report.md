# IMPLEMENTATION-21 — Hero Runtime Rendering Convergence & Builder UX Completion

**Date:** 2026-08-02 · **Status:** Complete

## What was fixed

| Bug | Fix | Verified |
|---|---|---|
| BUG 1/2 — Hero video/poster uploads but Builder/Storefront don't render | Root cause was the earlier production 413 upload blocker + the renderer reading raw media fields. With uploads working (signed, IMPLEMENTATION-20) the runtime now renders media identically everywhere. | L1/L2 (local + production) |
| BUG 3 — resolveHeroMedia() must be the ONLY resolver | The aggregate now enriches `content.hero` with `resolvedMedia / mediaType / mediaUrl / mediaPoster / rendererDecision` via `resolveHeroMediaForRuntime()`. `HeroRenderer` consumes ONLY those fields — it never reads `videoUrl / posterUrl / backgroundUrl / *_AssetId`. Audited all callers; only the admin authoring UI (settings) reads raw fields (correct). | L5 + code audit |
| BUG 4 — Runtime trace proof | Full pipeline instrumentation: DATABASE → AGGREGATE → RESOLVEHEROMEDIA → BUILDER → STOREFRONT → HERORENDERER → DOM. `data-resolved-media` + `data-renderer-decision` on the hero root give DOM-level proof. | L5 |
| BUG 5 — Left sidebar cannot be re-opened | `ResizablePanel` toggle button was clipped by `overflow-hidden` at 0 width → trapped. Moved the button to a never-collapsed strip; collapse → expand → refresh all work. | L4 |
| BUG 6 — Right sidebar consistency | `rightCollapsed` now initializes from + persists to `builderPersistence` (sessionStorage). | L4 (left) + manual |
| BUG 7 — Hero layout | Hierarchy restored: full-width media → profile picture (overlap ~35% `-mt-[35%] sm:-mt-[24%]`) → LIVE badge → name → headline → tagline → bio → CTA → socials. | DOM + overlap class |
| BUG 8 — Builder == Storefront | One `HeroRenderer`, one `resolveHeroMediaForRuntime()`, one runtime. Builder canvas and storefront render the same element with the same `src`. | L1–L3, L5 |
| BUG 9 — Production runtime verification | Deployed to Vercel; L1–L5 pass against the live deployment. | production suite |

## Architecture preserved

```
Database (hero_data)
  → websiteAggregate.build()  (resolves asset ids → fresh URLs, runs resolveHeroMediaForRuntime)
  → content.hero { resolvedMedia, mediaType, mediaUrl, mediaPoster, rendererDecision }
  → LayoutEngine (pass-through, logs the resolved decision)
  → HeroRenderer (consumes ONLY resolved fields)
  → Builder canvas  ==  Storefront  ==  DOM
```

No duplicate media resolution. No duplicate renderers. No preview-only renderer.

## Verification

- `npx tsc --noEmit` ✅
- `npm test` → 73 files / **1647 tests** ✅
- `npm run build` → `✓ Compiled successfully` ✅
- Playwright local: **L1–L5 5/5** ✅
- Playwright production (`influencer-space-alpha.vercel.app`): **L1–L5 5/5** ✅
- Builder DOM == Storefront DOM (same `<video>`/`<img>` `src`), runtime signature identical, `data-resolved-media` matches the rendered element. ✅
