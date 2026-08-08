# Theme Runtime Completion

**Track:** RCCF-LAUNCH-TRACK-05
**Status:** Implemented

## What was completed

The Theme Runtime is now the single authority for the visual layer, and the
Builder preview renders the **same** experience (backgrounds, effects, dividers)
as the published storefront.

### Builder preview == Storefront (Problems 1 & 2)

Previously the Builder canvas rendered sections as bare blocks — no
`ExperienceSection`, so gradients/backgrounds/effects never appeared (premium
themes looked solid). Now:

- `getLivePreviewData` also returns the tenant's `planCode`.
- `InteractiveCanvas` resolves the theme experience through
  `resolveExperienceForCapabilities(experienceRegistry.resolve({...}), planCode)`
  — **exactly** the storefront path.
- Every section renders inside `<ExperienceSection variant={hero|footer|default}
  divider="bottom">`, mirroring `src/app/[domain]/page.tsx`.

So the marketplace promise (rich backgrounds) now matches the Builder preview,
and the Builder preview matches the live storefront. Free creators still get
solid-only in both (Capability Runtime enforcement is unchanged).

### Theme token completion (Problem: authored tokens never consumed)

The full `ThemeDesignTokens` set was authored but collapsed to 6 colors at the
resolver. Now:

- `ResolvedSnapshotTheme` + `ThemeSnapshot` carry the complete token set:
  `success, warning, danger, surface, surfaceSecondary, border, focus,
  textSecondary` + typography `mono, display` (all optional/additive — old
  snapshots fall back gracefully).
- `ThemeResolver` extracts them from `variant.tokens` (defaults from
  `tokens-new.ts`).
- `LayoutEngine.buildTheme` emits them as CSS variables:
  `--color-success/warning/danger`, `--surface-secondary`, `--border` (token),
  `--text-secondary` (token), `--color-focus`, `--brand-font-heading/body/mono/display`.

### Button Runtime (Problem 3)

`.btn-primary`, `.btn-secondary`, `.btn-ghost` and `.admin-input` now consume
theme tokens (`--brand-primary`, `--on-primary`, `--border`, `--text-primary`,
`--surface-base`, `--color-focus`) with the previous indigo/white colors as
fallbacks — no hardcoded indigo buttons. The storefront buy-now button, pricing
"Popular" treatment, product-grid buy-now, Discord card, and hero secondary
buttons were converted from hardcoded `indigo`/`s8ul-cyan`/`white` to theme
tokens. `StorefrontNav` now uses `--surface-root`/`--border`/`--brand-primary`.

## Verification

- `tsc`, `lint`, `next build` clean; **2099/2099** vitest tests pass
  (5 new theme-token tests).
- The storefront, publishing, aggregate, capabilities and all runtimes are
  unchanged; the Builder consumes the same resolver + experience path.
