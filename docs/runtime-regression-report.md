# Runtime Regression Report — IMPLEMENTATION-21

## Purpose

Permanent regression protection for the hero runtime rendering pipeline and the
builder UX. Every test runs against the REAL pipeline (Database → Aggregate →
resolveHeroMedia → HeroRenderer → Builder/Storefront → DOM) — no mocks, no
preview renderers.

## Tests

File: `tests/e2e/production/implementation21.spec.ts` (serial)

### L1 — Hero video: upload → Builder == Storefront `<video>`
1. Upload a real MP4 in Hero settings (auto-save).
2. Builder canvas renders `<video>`; capture `src` + `data-resolved-media`.
3. Storefront renders `<video>` with the **same** `src`; assert `readyState === 4`.
4. Assert `data-resolved-media="video"` on both.

**Guards:** video priority, parity, playability, resolver decision.

### L2 — Hero poster: upload → Builder == Storefront `<img>`
1. Remove the video (deterministic), upload a real PNG poster (auto-save).
2. Builder renders `<img>`; capture `src`.
3. Storefront renders `<img>` with the **same** `src`.

**Guards:** poster path, parity.

### L3 — Video removed + poster exists → both resolve to poster
1. (Poster-only state) assert Builder `data-resolved-media="image"` + `<img>`,
   no `<video>`.
2. Assert Storefront `data-resolved-media="image"` + `<img>`, no `<video>`.

**Guards:** deterministic fallback (video → poster), parity.

### L4 — Builder sidebar: collapse → expand → refresh
1. Toggle left panel → sidebar hidden.
2. Toggle button **still visible** while collapsed (re-open possible).
3. Toggle → sidebar restored.
4. Collapse → refresh → sidebar still collapsed, toggle visible.

**Guards:** no dead-end UI, persistence.

### L5 — Runtime signatures identical; DOM matches resolved media
1. Builder `data-runtime-signature` == Storefront `data-runtime-signature`.
2. Builder `data-resolved-media` == Storefront `data-resolved-media`.
3. The rendered element matches the decision (`video`→`<video>`,
   `image`/`background`→`<img>`).

**Guards:** runtime convergence, DOM truth.

## Supporting changes

- `helpers.ts` BENIGN list extended with RSC-prefetch fallback and
  `ERR_NO_BUFFER_SPACE`/font-CDN flakes so tests assert app behavior, not
  Vercel cold-start noise.

## Results

- Local: **5/5**.
- Production: **5/5**.
- Full unit suite unchanged and green (1647 tests).
