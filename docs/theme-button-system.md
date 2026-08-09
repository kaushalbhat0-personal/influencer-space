# Theme Button System — RCCF-LAUNCH-TRACK-07

**Status:** Implemented

## Canonical button tokens (RC5)

The resolver emits a full set of button tokens, and `LayoutEngine` exposes them
as CSS variables so storefront components never hardcode brand colors.

| Token | Purpose |
| --- | --- |
| `--button-primary-bg` / `--button-primary-fg` / `--button-primary-hover` | Primary action (CTA) |
| `--button-secondary-border` / `--button-secondary-fg` / `--button-secondary-hover` | Secondary/outline action |
| `--button-ghost-*` | Quiet/tertiary action |
| `--button-danger-*` | Destructive action |

**Source:** `src/lib/storefront/layout-engine/LayoutEngine.ts`

## What consumes the tokens

| Surface | Component | Token |
| --- | --- | --- |
| Hero CTA | `renderers.tsx` (hero) | `--button-primary-*` |
| Hero secondary | `renderers.tsx` (hero) | `--button-secondary-*` |
| Contact submit | `renderers.tsx` (contact) | `--button-primary-*` |
| Newsletter subscribe | `renderers.tsx` (newsletter) | `--button-primary-*` |
| Pricing buttons | `renderers.tsx` (pricing) | primary for popular, secondary otherwise |
| Product grid | `ProductGrid.tsx` | `--button-primary-*` / `--button-secondary-*` |
| Discord CTA | `renderers.tsx` (social) | `--button-primary-*` |
| Buy Now | `buy-now-button.tsx` | `--button-primary-*` |

Remaining `--brand-*` uses are **badges and labels**, not buttons (e.g. the
"Popular" pricing badge on `--brand-secondary`; category labels, timeline
years). This is intentional — badges are status markers, not interactive
controls, and the surface tokens would lose their meaning if repurposed.

## Builder commerce is inert (P8)

- `BuyNowButton` accepts `previewMode`; when true the click handler returns
  before `createCheckout` — no Prisma rows, no Razorpay checkout script load.
- The preview button renders "Checkout available on your live website" and is
  `disabled`.
- `previewMode` is threaded `InteractiveCanvas → ComponentRenderer →
  ProductsRenderer → BuyNowButton` (default `false`, so the storefront is
  unchanged).
- There is no `createCheckout`/`razorpay` usage anywhere under
  `src/features/builder`.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues.
- `npm run build` — succeeds.
- `npx vitest run` — 2104/2104 pass.
