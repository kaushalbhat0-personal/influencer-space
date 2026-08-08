# Marketing Performance — RCCF-IMPLEMENTATION-73

## Implemented

| Item | Change |
| --- | --- |
| **framer-motion off the storefront** | The root `template.tsx` was a client `motion.div` wrapping every route (~40KB+ framer-motion on the public storefront). Replaced with a static wrapper — framer-motion no longer ships to `[domain]` or any marketing page. |
| **LCP** | Hero preview is now a real screenshot (`/marketing-assets/storefront/01-desktop.png`, eager) — no fake mockup, no broken asset. |
| **Reduced motion** | Removing the framer template also removes the JS animation that ignored `prefers-reduced-motion`. |

## Remaining (roadmap)

- **DB-blocked LCP:** home + pricing are `force-dynamic` and await
  `getPublicPricingData()` before first paint. Recommended: stream the pricing
  section behind a Suspense boundary + skeleton, keep runtime pricing (no ISR
  on the price itself).
- **No `loading.tsx`** for marketing routes — add skeletons.
- **No `next/dynamic` code-splitting** of heavy sections (AIDemo, Pricing,
  SectionTracker) — lazy-load below-the-fold sections.
- **Prefetching** — nav signup links could `prefetch`.
- Hero `#0a0a0a` vs `--surface-root` inconsistency in the comparison sticky
  column (design-system cleanup).

## Honesty note

The homepage remains `force-dynamic` intentionally so Super Admin pricing edits
reflect immediately (documented in `page.tsx:35-38`); the fallback registry
keeps it resilient. The performance fix is to stream, not to cache the price.
