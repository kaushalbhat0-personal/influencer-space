# Implementation Report — RCCF-LAUNCH-TRACK-05

**Theme Runtime Completion & Runtime-Driven Plan UI**

## What was delivered

| Phase | Deliverable | Where |
| --- | --- | --- |
| 0/1 | Full pipeline audit (Marketplace→Registry→Runtime→Builder→Canvas→LayoutEngine→Storefront) + token inventory; documented ignored tokens | this report + `theme-token-system.md` |
| 2 | Theme Runtime completes the token set: success/warning/danger, surface/surfaceSecondary, border, focus, textSecondary, mono/display emitted | `resolver-new.ts`, `snapshot.ts`, `LayoutEngine.ts` |
| 3 | Button Runtime: `.btn-primary/.btn-secondary/.btn-ghost/.admin-input` consume theme tokens; buy-now + hero/pricing/product-grid buttons converted | `globals.css`, `buy-now-button.tsx`, `renderers.tsx`, `ProductGrid.tsx` |
| 4 | Background Runtime: Builder preview now renders `ExperienceSection` backgrounds/effects (capability-filtered by plan) — identical to storefront | `interactive-canvas.tsx`, `builder-preview.actions.ts` |
| 5 | Component Runtime: storefront nav + commerce accents consume `--brand-*`/`--surface-*`/`--border`/`--text-*` | `StorefrontNav.tsx`, `renderers.tsx` |
| 6 | Marketplace/Builder/Storefront parity: builder now renders the real experience; marketplace already shows the theme palette | `interactive-canvas.tsx` |
| 7 | Theme assets audit: palette/preview come from token definitions (no missing renderer) | documented |
| 8/9 | Runtime plan migration: Tenant Ledger uses canonical runtime plans + `planCode`; dead legacy subscriptions table removed | `tenant-ledger.tsx`, `super-admin.service.ts` |
| 10/11 | Builder theme apply + preview == storefront (no refresh; same resolver/experience) | `interactive-canvas.tsx` |
| 12 | Regression: free→solid, grow/scale→premium visuals (capability matrix unchanged); existing creators unaffected | tests |
| Docs | `theme-runtime-completion.md`, `theme-token-system.md`, `runtime-plan-migration.md`, this report | — |

## Files changed

- `src/lib/theme/resolver-new.ts` — full token extraction + overrides.
- `src/types/snapshot.ts` — `ThemeSnapshot` extended (additive).
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — emits complete token set.
- `src/actions/builder-preview.actions.ts` — returns `planCode`.
- `src/features/builder/canvas/interactive-canvas.tsx` — ExperienceSection + capability-filtered experience + token pass-through.
- `src/app/globals.css` — Button Runtime (theme-token buttons/inputs).
- `src/app/[domain]/_components/buy-now-button.tsx` — theme-token CTA.
- `src/lib/registry/components/renderers.tsx` — brand-token accents (timeline/courses/services/pricing/Discord/hero secondary).
- `src/components/storefront/ProductGrid.tsx`, `StorefrontNav.tsx` — theme tokens.
- `src/services/super-admin.service.ts` — `subscription.planCode`.
- `src/app/super-admin/_components/tenant-ledger.tsx` — canonical plans.
- Removed: `src/app/super-admin/subscriptions/_components/subscriptions-table.tsx` (dead legacy).
- Tests: `src/lib/storefront/layout-engine/__tests__/theme-tokens.test.ts` (5).

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues.
- `npm run build` — succeeds.
- `npx vitest run` — **2099/2099** pass (5 new theme-token tests).

## Regression safety

- Theme token emission is **additive** — old snapshots fall back to derived
  colors (identical rendering).
- Capability Runtime untouched: Launch stays solid-only, Grow/Scale keep premium
  visuals — enforced in both Builder preview and storefront.
- Only the Builder preview data flow + super-admin ledger changed; storefront,
  publishing, aggregate, and all runtimes are unchanged.
