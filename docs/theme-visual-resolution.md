# Theme Visual Resolution — RCCF-LAUNCH-TRACK-07

**Status:** Implemented

Fix log for the visual-fidelity items found during the TRACK-07 audit
(`docs/theme-visual-audit.md`).

## Resolved this track

### P6 — stale `?theme=` preview resurrects on refresh

**Symptom:** Opening the builder via the Marketplace (`/builder?theme=<id>`)
sets `previewThemeId`. Applying a different theme cleared the state but left
the URL query intact; a refresh re-ran the mount effect
(`workspace.tsx` `if (themeParam) setPreviewThemeId(...)`) and resurrected the
old preview over the applied theme.

**Fix:** `handleApplyTheme` now strips the `theme` param from the URL after a
successful apply (`history.replaceState`). The canvas still renders
`previewThemeId ?? currentThemeId`, so a fresh refresh keeps the applied theme
(and any intentional preview flows from the picker still work).

**File:** `src/features/builder/components/workspace.tsx`

## Verified already correct (no change needed)

- **RC1/RC2 — orb/wave/grid/diagonal rendering:** each decoration element is
  self-contained (`<defs>` + unique id per instance), so the `fill` reference
  always resolves. Confirmed the previous shared-id bug is gone.
- **RC3 — pattern background:** explicit `kind === "pattern"` branch in
  `background-runtime.tsx`; no longer falls through to mesh.
- **RC5 — button tokens:** hero CTA, hero secondary, contact submit, newsletter
  subscribe, pricing buttons, product grid, Discord CTA and Buy Now all consume
  `--button-*` vars. Remaining `--brand-*` uses are badges/labels, not buttons.
- **RC10a — theme-aware fallback tint:** backgrounds degrade to
  `color-mix(in srgb, var(--brand-primary) 8%, transparent)` instead of fixed
  indigo.
- **P1/P2/P4/P5/P7/P8/P9** verified as already correct — see the audit table.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues.
- `npm run build` — succeeds.
- `npx vitest run` — 2104/2104 pass.
