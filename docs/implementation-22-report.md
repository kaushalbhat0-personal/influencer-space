# IMPLEMENTATION-22 — Hero Media Root Cause Investigation (Production Truth)

**Date:** 2026-08-02 · **Verdict:** ONE proven root cause, fixed, verified in the browser.

## The investigation (real production account `testcreator1@gmail.com`, tenant `eee52d43-…`)

### STEP 1 — Database (hero_data + Asset rows)

| field | value | status |
|---|---|---|
| `videoAssetId` | `31361d20-c076-…` | ✅ asset row exists, `ACTIVE`, `READY`, `video/mp4` |
| `posterAssetId` | `c9cce7c3-b7dd-…` | ✅ asset row exists, `ACTIVE`, `READY`, `image/jpeg` |
| `backgroundAssetId` | — | none (not set) |
| `videoUrl` | `…/hero/91a9aeb2-….mp4` | ✅ |
| `posterUrl` | `…/profile/610db629-….jpg` | ✅ |

Database is healthy. Persistence works.

### STEP 2 — Storage (HTTP)

| URL | status | content-type | cache-control |
|---|---|---|---|
| videoUrl | **206** | `video/mp4` | no-cache |
| posterUrl | **206** | `image/jpeg` | max-age=3600 |

No redirects, no 4xx. Storage serves both media correctly.

### STEP 3 — Aggregate (reaching Builder)

The aggregate produced the real values (runtime trace + DOM attrs):
`resolvedMedia:"video"` `rendererDecision:"render <video> with poster"`
`mediaUrl:"…/91a9aeb2-….mp4"` `mediaPoster:"…/610db629-….jpg"`

Aggregate is correct.

### STEP 4/5/6 — Builder + Storefront DOM (browser truth)

**Before the fix** the media element was present AND playing, but invisible:

```
<video currentSrc=…/91a9aeb2-….mp4  readyState=4  networkState=1  paused=false
       display=block  visibility=visible  opacity=1
       rect={ w:1280, h:0 }        ← HEIGHT 0  (storefront)
       rect={ w:642,  h:0 }        ← HEIGHT 0  (builder)
```

**After the fix:**

```
PRODUCTION STOREFRONT: <video> rect={ w:1280, h:640 }  visible=true
PRODUCTION BUILDER:   <video> rect={ w:642,  h:321 }  visible=true
```

### STEP 7 — CSS investigation (the exact failure)

The media block carried `class="relative aspect-[16/10] w-full sm:aspect-[16/8]"`
but computed `aspect-ratio: auto` and `height: 0`.

**Why:** `tailwind.config.ts` `content` globs scanned only
`./src/pages`, `./src/components`, `./src/app` — **`./src/lib` was missing**.
`aspect-[16/10]` / `sm:aspect-[16/8]` (and `-mt-[35%]`) are used ONLY in
`src/lib/registry/components/renderers.tsx`, so Tailwind **purged** them from
the compiled CSS. With `aspect-ratio` absent, the block's height (whose only
child is an absolutely-positioned `<video>`) collapsed to 0 → the media was
rendered in the DOM, loaded, and playing — but **height 0 = invisible** on
Builder and Storefront.

Evidence: compiled CSS contained `aspect-\[16\/9\]` (used in a scanned dir) but
**not** `16/10`; `-mt-[35%]` absent too.

## STEP 8 — Runtime comparison table (actual values)

| Stage | Value (video) | Value (poster) |
|---|---|---|
| DATABASE hero_data | `videoAssetId=31361d20…` URL `…/91a9aeb2.mp4` | `posterAssetId=c9cce7c3…` URL `…/610db629.jpg` |
| STORAGE HTTP | `206 video/mp4` | `206 image/jpeg` |
| AGGREGATE | `resolvedMedia="video"` `mediaUrl=…91a9aeb2.mp4` | `resolvedMedia="image"` `mediaUrl=…610db629.jpg` |
| BUILDER PROPS | `resolvedMedia:"video"` `mediaUrl:…91a9aeb2.mp4` | `resolvedMedia:"image"` |
| HERORENDERER | `<video src=…91a9aeb2.mp4>` | `<img src=…610db629.jpg>` |
| DOM (pre-fix) | `<video>` present, `rect h=0` | `<img>` present, block h=0 |
| DOM (post-fix) | `<video>` **h=640 visible** | `<img>` **visible** |
| NETWORK | 206, no failures | 206, no failures |
| VISIBLE? | **pre-fix NO → post-fix YES** | **pre-fix NO → post-fix YES** |

## STEP 9 — ROOT CAUSE (one)

> **`./src/lib` was missing from the Tailwind `content` globs in
> `tailwind.config.ts`. Tailwind therefore purged `aspect-[16/10]` /
> `sm:aspect-[16/8]` (and `-mt-[35%]`) — classes used only in
> `src/lib/registry/components/renderers.tsx`. The hero media block computed
> `aspect-ratio: auto` → `height: 0` → the video/poster was rendered in the DOM
> but invisible in both Builder and Storefront.**

### The fix (one line, no runtime/aggregate/renderer changes)

```diff
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
+   "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
```

## Acceptance criteria — all met

- ✅ Hero video VISIBLY rendered in Builder (rect 642×321) and Storefront (1280×640)
- ✅ Hero poster VISIBLY rendered in Builder and Storefront (L2 visibility guard)
- ✅ Hero poster fallback works (L3)
- ✅ Playwright screenshots: `prod-hero-video.png`, `prod-builder-hero.png`,
  `l1-builder-video.png`, `l1-storefront-video.png`, `l2-builder-poster.png`, `l2-storefront-poster.png`
- ✅ Network requests succeed (`206 video/mp4`, `206 image/jpeg`)
- ✅ Runtime trace matches DOM (`data-resolved-media` == rendered element, signature parity)
- ✅ Root cause documented above

## Verification

- `npx tsc --noEmit` ✅ · `npm test` 1647 ✅ · `npm run build` ✅
- Playwright local **L1–L5 5/5** ✅ (with visibility guards)
- Playwright production **L1–L5 5/5** ✅ (with visibility guards)
- Production DOM probes: storefront video `h=640 visible`, builder video `h=321 visible`
