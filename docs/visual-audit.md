# Visual Audit — RCCF-AUDIT-08

## Consistency

| Finding | Evidence | Severity |
| --- | --- | --- |
| **Root template ships framer-motion to every route incl. the storefront** | `src/app/template.tsx:1-18` — `<motion.div>` on all pages; the `[domain]` storefront gets ~40KB+ client JS and the framer runtime | High |
| `template.tsx` `exit` prop is dead (no `AnimatePresence`) | `template.tsx:10` | Low |
| **Three near-black values** | `Pricing/comparison.tsx:37,59` `#0a0a0a` vs `--surface-root` `#0A0A0B` vs `bg-zinc-950` `#09090b`; contact/terms/privacy/refund use `bg-black` | Medium |
| **Three primary-button styles** | `.btn-primary` (rounded-lg) vs `HeroInput.tsx:93` (rounded-xl px-6 py-3) vs `Pricing/index.tsx:171-177` (bg-white/10) | Medium |
| GlassCard/TiltCard primitives unused in marketing (two card systems) | zero imports in `src/components/marketing/**` | Low |
| Gradient direction varies | `Agency.tsx:18` `from-violet-400 to-indigo-400` reversed vs others | Low |
| Brand name hardcoded vs `messaging.ts` token | `MarketingNav.tsx:66` etc. | Low |
| Dark-mode only; no `color-scheme`/prefers-color-scheme | form controls/scrollbars may use light UA defaults | Low |

## What works

- Consistent section rhythm (`px-4 py-20 sm:px-8 sm:py-28`), consistent heading
  scale (`text-3xl sm:text-4xl` + indigo→violet gradient), coherent dark zinc
  theme, experience-driven section surfaces (`section-runtime.tsx`).

## Accessibility interplay

- `.btn-primary` white-on-violet ≈ 3.7:1 — **fails AA** for 14px text
  (`globals.css:262`).
- `text-zinc-600` captions ≈ 3:1 — fails AA for small text.
- `HeroInput.tsx:87` focus ring `ring-1 ring-indigo-500/20` overrides the global
  `focus-visible` ring — nearly invisible.
- `prefers-reduced-motion` CSS exists but **framer-motion JS animations are not
  disabled** (template, GlassCard, TiltCard, MetricGrid count-up).

## Recommendation (audit only)

- Scope the framer-motion template off the storefront (`[domain]` layout) and
  respect `prefers-reduced-motion` in JS animation.
- Unify the near-black surfaces + primary button on the design tokens.
- Raise `.btn-primary` contrast (e.g. indigo-600 end-stop) and use `text-zinc-400`
  for captions.
