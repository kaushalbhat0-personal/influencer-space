# Theme Visual Audit — RCCF-LAUNCH-TRACK-07

**Track:** RCCF-LAUNCH-TRACK-07
**Status:** Implemented
**Scope:** Post-TRACK-06 verification of theme visual fidelity (backgrounds,
decorations, buttons, preview parity, capability gating, apply lifecycle,
marketplace integrity, commerce inertness, catalog, visual quality).

## RC status

Only RC numbers that exist in the codebase are used. There are no
RC4/RC6–RC9/RC10 markers in the implementation — those slots were never
numbered, so remaining work is tracked by priority (P1–P10) below.

| RC | What | Where | Status |
| --- | --- | --- | --- |
| RC1 | Orb gradients self-contained: each orb `<svg>` carries its own `<defs>` + unique gradient id; identical defs never collide across instances | `experience-assets.ts` (`orb` asset) | Complete |
| RC2 | Wave / grid / diagonal assets added to the asset map; every `DecorativeAsset` renders self-contained defs | `experience-assets.ts` (`BACKGROUND_ASSETS`) | Complete |
| RC3 | `pattern` background kind no longer falls through to mesh — explicit `kind === "pattern"` branch renders the pattern SVG | `background-runtime.tsx` | Complete |
| RC5 | Canonical button tokens emitted by the resolver and exposed as CSS vars: `--button-primary-*`, `--button-secondary-*`, ghost, danger | `LayoutEngine.ts` | Complete |
| RC10a | Background fallback tints derive from `--brand-primary` (`color-mix` at 8%) instead of a fixed indigo | `background-runtime.tsx` | Complete |

## Priority findings

| # | Priority item | Verdict | Notes |
| --- | --- | --- | --- |
| P1 | Background fidelity — all `ExperienceBackgroundKind` values render correctly | PASS | `solid/gradient/mesh/radial/pattern/multi-radial/aurora/none` all have explicit branches; `none`/`solid` render `Layers` only (surface shows through) |
| P2 | Decoration layering — decorations behind content, `pointer-events-none`, low opacity | PASS | `section-runtime.tsx`: decorations (z-auto) render before content wrapper (`relative z-10`); wrapper is `pointer-events-none absolute inset-0 overflow-hidden opacity-[0.05]` |
| P3 | Button tokens across every storefront surface | PASS | hero CTA, hero secondary, contact submit, newsletter subscribe, pricing buttons, product grid, Discord CTA, Buy Now all consume `--button-*` tokens; remaining `--brand-*` uses are badges/labels, not buttons |
| P4 | Preview parity — builder preview === published storefront path | PASS | both resolve via `resolveExperienceForCapabilities` + `ExperienceSection` + `LayoutEngine`; marketplace palette cards are documented lightweight previews |
| P5 | Scale/grow capability gating — canonical plan code drives entitlement | PASS | `themeUnlockedForPlan` → `planTierFor` (canonical codes); `previewPlanCode` from `getLivePreviewData`; publish validates via capability engine (non-blocking) |
| P6 | Apply lifecycle — applied theme must survive refresh; stale `?theme=` preview must not resurrect | FIXED | `workspace.tsx` now strips `?theme=` from the URL after apply (`history.replaceState`) |
| P7 | Marketplace integrity — browse-only, no mutation | PASS | only navigation to `/builder?theme=<id>`; no `applyThemePackage` |
| P8 | Builder commerce inert — Buy Now can never create an order from the canvas | PASS | `previewMode` guard returns before `createCheckout`; no `razorpay`/`createCheckout` in `features/builder` |
| P9 | Catalog audit — palette-swap clusters + duplicate names documented | PASS | `docs/theme-catalog.md`; merge deferred (preserve IDs, no migration risk) |
| P10 | Visual quality — image/video backgrounds are out of the theme layer | PASS (documented) | `ExperienceBackgroundKind` has no `image`/`video`; hero media is creator content (`HeroMedia`/`HeroBanner`); capability caps `theme_background_image/video` are not consumed by the experience runtime — documented, not implemented |

## Key files

- `src/modules/theme/runtime/experience/background-runtime.tsx` — RC3 + RC10a.
- `src/modules/theme/runtime/experience/experience-assets.ts` — RC1/RC2.
- `src/modules/theme/runtime/experience/section-runtime.tsx` — layering (P2).
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — RC5 button tokens.
- `src/features/builder/components/workspace.tsx` — P6 URL cleanup.
- `src/features/builder/canvas/interactive-canvas.tsx` — P4/P8 preview path.
- `src/app/[domain]/_components/buy-now-button.tsx` — P8 preview guard.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues (pre-existing warnings only).
- `npm run build` — succeeds.
- `npx vitest run` — 2104/2104 pass.
