# Mobile Audit — RCCF-AUDIT-08

## What works

- Hero preview hidden below `lg` (`Hero.tsx:71`) — clean first viewport.
- Pricing grid collapses to single column; tabs + billing toggle fit.
- Comparison + trust tables wrapped in `overflow-x-auto` (no page overflow).
- Footer stacks; AIDemo CTA `break-words`.
- Responsive variants for BeforeAfter, HowItWorks, AgencyFeatures (desktop
  timeline/grid → mobile vertical/accordion).

## Issues

| Severity | Finding | Evidence | Fix | Complexity |
| --- | --- | --- | --- | --- |
| High | **Touch targets below 44px** | Nav hamburger + close `p-2` + `h-5 w-5` ≈ 36px; Testimonial prev/next `h-9 w-9` = 36px, dots `h-2 w-2`; Pricing toggle `h-6 w-11` | Bump to ≥44px (storefront already models `min-w-[48px] min-h-[44px]`) | Low |
| Medium | **Mobile nav drawer lacks focus trap / `aria-expanded` / focus restore** | `MarketingNav.tsx:106-203` | Add `aria-expanded`, trap focus, restore on close | Medium |
| Medium | **No `loading.tsx` / skeleton on any marketing route**; home blocks LCP on a DB pricing query | no `loading.tsx`; `page.tsx:38` force-dynamic + `getPublicPricingData()` | Streaming/skeleton for pricing + nav | Medium |
| Medium | Root framer-motion template animates every mobile route change | `template.tsx` | Scope off / respect reduced motion | Low |
| Low | Hero mobile is copy-only (no product visual below lg) | `Hero.tsx:71` | Compact visual after the input (roadmap) | Medium |
| Low | Raw `<img>` showcase screenshots are broken on all breakpoints | `StorefrontShowcase.tsx:25,37` | Fix asset paths | Low |

## Verdict

Responsive layout is solid (no overflow, good breakpoints). The mobile gaps are
touch-target size, drawer accessibility, and perceived performance (no
skeletons + DB-blocked LCP). These are launch-blocking-quality issues for mobile
conversion.
