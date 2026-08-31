# RCCF-71.5.1 — Growth Visual Surfaces Closure

## 1. Executive Verdict

**Verdict: A, staged and uncommitted.** Creator Growth now has Builder controls for the existing global visual identity fields: radius and density, alongside the existing typography, background, surface, and Hero presentation controls. Background and surface choices now communicate their visual result through mini-swatches, and locked controls explain that Creator Grow is required.

No new persistence model, schema, capability authority, plan logic, Builder-only CSS, publishing path, or storefront path was introduced.

## 2. Context

The 71.5.0 audit found that `borderRadius` and `layoutDensity` already flowed through `updateTheme`, `Website.themeConfig`, snapshot resolution, and `LayoutEngine`, but were only exposed in Admin Appearance. The Builder also presented background and surface controls as plain text chips, which understated Growth value.

This ticket deliberately improves the **global Theme Experience first**. Background images, motion, dividers, decorations, per-section visual styling, custom CSS, and arbitrary element styling remain out of scope.

## 3. Architecture Invariant & Option Selection

Every change preserves this chain:

```text
Builder Appearance
  -> updateTheme
  -> Website.themeConfig
  -> existing snapshot/resolver fields
  -> Builder preview
  -> publish snapshot
  -> live storefront
```

The Builder continues to use the server-derived `premiumThemes` boolean for locked state. The server action remains the authority and now validates radius (`0..24`) and density (`compact | comfortable | spacious`) before persistence.

Rejected approaches:
- Builder-only CSS: rejected because it would break preview/publish/live parity.
- New schema or persistence fields: rejected because the existing `themeConfig` JSON already supports both values.
- Client plan comparisons: rejected because entitlement remains server-owned.
- Per-section controls: deferred; the product progression prioritizes an excellent global Theme Experience before advanced section-level styling.

## 4. Implementation Changes

| File | Change |
|---|---|
| `src/features/builder/components/appearance-panel.tsx` | Added `borderRadius` and `layoutDensity` to `AppearanceState`; added radius range control and density chips; added static background/surface mini-swatch registries; added Growth lock labels and updated upgrade copy. |
| `src/features/builder/components/website-panel.tsx` | Threads existing overview radius/density values into `AppearancePanel`. |
| `src/actions/theme.actions.ts` | Preserves existing action path and validates radius/density before writing to `Website.themeConfig`. |
| `tests/unit/rccf71-5-1-growth-visual-surfaces.test.ts` | Added 16 RCCF-71.5.1 guardrail tests covering persistence, defaults, gating, swatches, and parity. |
| `docs/rccf-71.5.1-growth-visual-surfaces-closure.md` | This closure record. |

The first three source files already contained unrelated prior-ticket work in the dirty worktree; that work was preserved and not reverted.

## 5. Behavior Before / After

Before:
- Builder Appearance exposed fonts, heading weight, background, surface, and Hero presentation.
- Radius and density existed in the canonical runtime but were not available in the Builder.
- Background and surface options were text-only chips.
- Launch locked copy did not name radius or density.

After:
- Growth creators can set radius from `0` to `24px` in Builder.
- Growth creators can choose compact, comfortable, or spacious density.
- Background and surface chips show visual mini-swatches, including gradient, mesh, aurora, glass, glow, luxury, and neon cues.
- Locked controls show `GROW` and the panel links to upgrade using the server-derived lock state.
- Existing controls and Hero content ownership are unchanged.

## 6. Growth vs Launch UX

Launch:
- `premiumThemes === false` from the server-derived Capability Runtime.
- Appearance controls are disabled.
- Upgrade banner and per-chip `GROW` labels explain the gate.
- Direct action invocation remains rejected by the existing `premium_themes` server gate.

Growth:
- `premiumThemes === true` from the server-derived Capability Runtime.
- Radius, density, typography, background, surface, and Hero presentation controls are enabled.
- Every change uses `updateTheme`, then emits `appearance:changed` so the Builder refetches the canonical preview.

## 7. Architecture Preservation

Preserved and untouched by this ticket:
- `plans.ts` and the canonical capability matrix.
- Capability authority and theme entitlement authority.
- Publishing service and storefront loader.
- `LayoutEngine` behavior and CSS-variable derivation.
- Hero content ownership and Hero presentation registry.
- Prisma schema, billing, signup, and authentication.
- Existing `applyExperienceOverride` and `resolveExperienceForCapabilities` chain.

The new controls do not write CSS to the document and do not create a parallel theme model.

## 8. Regression Coverage

`tests/unit/rccf71-5-1-growth-visual-surfaces.test.ts`: **16 tests passed** in the focused run.

Covered:
- Radius persistence into snapshot theme.
- Density persistence into snapshot theme.
- Radius/density resolution through existing LayoutEngine variables.
- Old snapshot defaults (`8px`, `3rem`) preserved.
- Server `premium_themes` gate precedes writes.
- Server-side radius/density validation.
- Launch lock behavior from `premiumThemes` with no client plan logic.
- Growth enabled behavior from the same server-derived flag.
- Background and surface swatch registries.
- Understandable Growth upgrade presentation.
- Existing controls preserved.
- Builder overview → AppearancePanel radius/density wiring.
- Builder preview receives the same `themeConfig` and experience resolver.
- Preview/publish/live shared chain.
- No Builder-only CSS or second theme authority.
- Existing Launch degradation and Growth premium experience behavior.

## 9. Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx vitest run tests/unit/rccf71-5-1-growth-visual-surfaces.test.ts` | PASS — 16/16 |
| `npx vitest run` | 3513/3514 tests passed; one pre-existing RCCF-68 jsdom navigation timeout in `tests/unit/rccf68-retry-catalog-timeout.test.ts` |
| `npm run build` | PASS — production build completed successfully |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx eslint` on touched files | PASS — no errors reported |
| `git diff --check` | PASS — only pre-existing CRLF normalization warnings |

The full-suite failure is unrelated to RCCF-71.5.1 and is the same known RCCF-68 flake documented in the prior closure context.

## 10. Diff Discipline

In-scope effective changes:
- Builder Appearance state and controls.
- Builder WebsitePanel field wiring.
- Existing `updateTheme` radius/density validation.
- RCCF-71.5.1 tests.
- This closure document.

Frozen and untouched for this ticket:
- Plans, capabilities, entitlements, publishing, storefront loader, LayoutEngine, schema, billing, signup, authentication, Hero ownership.
- Background image, motion, divider, decoration, per-section styling, custom CSS, arbitrary element styling.

The repository was already dirty before this ticket. No unrelated dirty worktree files were reverted or modified intentionally. No commit was created.

## 11. Risks & Edge Cases

- Radius input is constrained server-side to `0..24`; invalid values are ignored rather than persisted.
- Density input is constrained server-side to the three existing LayoutEngine values.
- Old snapshots without either field retain the existing defaults.
- Mini-swatches are presentation-only and do not determine entitlement or rendering.
- The entire panel remains gated by the existing `premium_themes` capability; the client does not infer plan identity.
- The known RCCF-68 full-suite timeout remains a residual verification risk unrelated to this change.

## 12. Remaining 71.5 Findings

Deferred by product direction:
- Background image control.
- Motion controls.
- Divider controls.
- Decoration controls.
- Per-section visual styling.
- Custom CSS and arbitrary element styling.

The next visual progression should continue strengthening the **global** Theme Experience before introducing section-level controls. Scale remains the clear home for video backgrounds and advanced/custom effects.

## 13. Manual Visual QA Checklist

- [ ] Growth account sees enabled radius range and density chips in Builder Appearance.
- [ ] Launch account sees disabled controls, `GROW` labels, and the upgrade link.
- [ ] Radius changes visibly affect cards/buttons in Builder preview and after publish.
- [ ] Compact, comfortable, and spacious density visibly change section spacing in Builder preview and live storefront.
- [ ] Background swatches visibly distinguish solid, gradient, radial, mesh, aurora, and pattern.
- [ ] Surface swatches visibly distinguish flat, glass, soft-glow, gradient-border, floating, luxury, and neon.
- [ ] Existing font, heading weight, Hero alignment, Hero width, Hero overlay, background, and surface controls still work.
- [ ] Builder preview, preview route, published snapshot, and live storefront show the same selected global appearance.
- [ ] Launch remains on the safe capability-resolved visual experience.
- [ ] No per-section controls or out-of-scope visual controls appear.

## 14. Recommendation

**Proceed to manual visual QA.** RCCF-71.5.1 delivers the highest-value global surfaces without changing the canonical runtime. Do not begin per-section visual styling immediately; first validate that the global Growth identity is visually strong and clearly differentiated from Launch.

## 15. Next Ticket Direction

The next Growth visual ticket should remain global and experience-focused. If manual QA confirms the swatches and radius/density controls are useful, the next candidate is a carefully scoped global premium layer that still follows the same `themeConfig → applyExperienceOverride → resolveExperienceForCapabilities` chain. Per-section styling should remain deferred until the global experience is demonstrably excellent.
