# Implementation Report — RCCF-LAUNCH-TRACK-07

**Theme Visual Audit & Remaining RC Completion**

## What was delivered

| Item | Deliverable | Where |
| --- | --- | --- |
| Audit | P1–P10 verification of backgrounds, decoration layering, button tokens, preview parity, capability gating, apply lifecycle, marketplace integrity, commerce inertness, catalog, visual quality | `docs/theme-visual-audit.md` |
| RC status | Verified RC1/RC2 (orb defs + wave/grid/diagonal), RC3 (pattern branch), RC5 (button tokens), RC10a (theme-aware fallback) all complete in code | `docs/theme-visual-audit.md` |
| P6 fix | Strip `?theme=` from the URL after apply so a refresh cannot resurrect a stale preview over the applied theme | `workspace.tsx` (`handleApplyTheme`) |
| Docs | `theme-visual-audit.md`, `theme-visual-resolution.md`, `theme-button-system.md`, `theme-background-effects.md`, this report | `docs/` |

## What was verified already correct (no change needed)

- **P1** all 8 background kinds render via explicit branches; `pattern` no longer falls through to mesh (RC3).
- **P2** decorations are `pointer-events-none absolute inset-0 opacity-[0.05]` behind the `relative z-10` content wrapper.
- **P3** all storefront buttons consume `--button-*` tokens; `--brand-*` remains only on badges/labels.
- **P4** builder preview and storefront share `resolveExperienceForCapabilities` + `ExperienceSection` + `LayoutEngine`.
- **P5** canonical plan code (`subscription.code`) drives entitlement; publish validates capabilities non-blocking.
- **P7** marketplace is browse-only → `/builder?theme=<id>`; no mutation.
- **P8** Buy Now in builder is inert (`previewMode` guard before `createCheckout`); no razorpay/checkout in `features/builder`.
- **P9** catalog clusters documented in `theme-catalog.md`; merge deferred.
- **P10** image/video backgrounds are out of the theme layer — hero media is creator content; capability caps reserved, documented not implemented.

## Key fix

1. **P6 (stale preview resurrection)** — after `handleApplyTheme` succeeds, the
   `theme` query param is deleted via `history.replaceState`, so a page refresh
   keeps the applied theme and can't resurrect the Marketplace-originated
   preview.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues (pre-existing warnings only).
- `npm run build` — succeeds.
- `npx vitest run` — **2104/2104** pass.

## Regression safety

- No redesign of Builder/Theme/Experience/Capability/Publish runtimes.
- The only runtime change is the P6 URL cleanup (guarded, best-effort).
- Storefront unchanged; `previewMode` defaults false.

## Note

Per instructions, **no commit was made** — the working tree (TRACK-06 +
TRACK-07 changes) is left uncommitted for review.
