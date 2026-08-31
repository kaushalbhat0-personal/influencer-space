# RCCF-71.5.0 — Growth Theme Experience: Read-Only Audit

**Ticket:** RCCF-71.5.0 — GROWTH THEME EXPERIENCE READ-ONLY AUDIT
**Mode:** READ-ONLY. No code, schema, billing, capability, theme, or Builder changes. No commits. No fixes.
**Scope:** The actual current Theme/Appearance experience — determine how to make **Creator Growth** a compelling, visibly worth-paying-for visual experience (themes, typography, backgrounds, gradients, images, overlays, surfaces, borders, radius, density, effects, Hero presentation, Builder Appearance UX, theme marketplace UX).
**Deliverable:** This document (15 sections) + the verdict line at the end.

---

## 1. Executive Verdict

The theme **architecture is excellent and complete**: a single canonical tier/capability matrix, a pure theme-experience runtime, server-side entitlement enforcement with graceful degradation, and bake-once experience resolution so preview == live. That foundation is **A-grade**.

The **Growth value gap is creator-facing, not architectural**. Nearly every premium visual layer a paid plan is entitled to (gradient/image/animated backgrounds, particles/glow/noise/blur effects, dividers, decorations, motion, glass/luxury/neon surfaces, radius, density) is already implemented **in the runtime** but is **not surfaced as a Builder control** (or is surfaced so subtly it looks identical to Launch). A Growth creator today can visibly change only: font, heading weight, one of 8 *very subtle* background presets, one of 9 surface presets, and 3 Hero presentation toggles. Everything else on the premium roadmap lives in the experience registry (themes + category packs) and is automatic — it is not "their" achievement.

Two existing-but-invisible Growth entitlements stand out as the highest-leverage wins:
1. **`theme_background_image` is granted to Growth but has NO creator-facing control** (no image background preset, no picker).
2. **`borderRadius` + `layoutDensity` are fully implemented and persisted end-to-end but only exposed in `/admin/appearance`, NOT in the Builder Appearance panel** — the place Growth creators actually live.

The other premium layers (dividers, decorations, motion, per-section variants) are runtime-ready with zero new architecture required to expose them; they are one audit-track away from being real "Growth" differentiators.

Overall verdict: **C** (partially represented — the runtime is implemented, but the *perceived* Growth visual experience is thin and several granted capabilities have no UI).

---

## 2. Current Architecture

Data flow (single-source-of-truth chain):

```
src/config/commerce/plans.ts            canonical plan → capability grants (COMMERCE_PLANS)
  └─ COMMERCE_CAPABILITY_TO_FEATURE      commerce cap → entitlement feature/value
src/lib/capabilities/*                   CapabilityService runtime (entitlementService.has / capabilityService.can)
  └─ plan-resolution.ts                  canonical plan → theme tier band (PLAN_TO_TIER)
src/lib/theme/tiers.ts                   THEME_TIER_BY_ID: theme id → tier (5 free/10 starter/15 pro/20 business)
  └─ access.ts / tierRank / themeUnlockedForPlan
src/lib/theme/entitlement.ts             themeEntitlementDecision = premium_themes cap AND tier band check
src/lib/theme/providers/built-in.ts      50 themes → ThemeRegistry (registry-new.ts)
src/modules/theme/runtime/experience/    ThemeExperience runtime (background/surface/motion/divider/decoration)
  ├─ theme-experience.ts                 13+ named experiences + THEME_TO_EXPERIENCE + EXPERIENCE_PACKS
  ├─ experience-registry.ts              theme/category → named experience (deterministic)
  ├─ experience-overrides.ts             BACKGROUND_PRESETS (8) + SURFACE_PRESETS (9) + applyExperienceOverride
  ├─ capabilities.ts                     requiredCapabilitiesForExperience / resolveExperienceForCapabilities
  ├─ background/section/motion/divider/decoration-runtime    pure renderers + xp-* CSS classes
src/actions/theme.actions.ts             updateTheme (persists to Website.themeFonts/themeConfig, server-gated)
src/actions/builder-overview.actions.ts  appearance defaults + SERVER-derived capabilities.premiumThemes
src/features/builder/components/appearance-panel.tsx   Builder Appearance controls (premium_gated, locked state)
src/actions/builder-preview.actions.ts + interactive-canvas.tsx   canvas experience resolution
src/lib/storefront/storefront-loader.ts  preview: resolveExperienceForCapabilities(applyExperienceOverride(base, cfg), plan)
src/lib/publishing/service.ts            publish: SAME resolution baked into snapshot.renderingHints.experience
src/components/storefront/StorefrontPage.tsx   live: bakedExperience ?? resolveExperienceForCapabilities(...)
src/lib/storefront/layout-engine/LayoutEngine.ts  snapshot.theme → CSS vars (incl. radius/density scale, heading weight)
src/lib/registry/components/renderers.tsx        all renderers consume CSS vars only (fallbacks everywhere)
```

Key invariants (verified):
- **Payments never unlock features** (plans.ts header) — capability grants are consumed through CapabilityService.
- **No client-side entitlement authority** — the Builder renders locked states from the server-derived `capabilities.premiumThemes` flag only (`builder-overview.actions.ts:228`, `appearance-panel.tsx:75`).
- **Never a broken render** — `resolveExperienceForCapabilities` (capabilities.ts:102) degrades every unentitled premium layer to the safe free set `{solid bg, minimal decoration, static motion, fade divider, flat surface, no per-section overrides}`.
- **Preview == publish == canvas** — all three call the same resolution chain; publish bakes the result so the live storefront reads no live business tables.
- **Old snapshots render unchanged** — every renderer CSS var and every presentation helper has the exact current look as its fallback.

---

## 3. Canonical Tier Capability Matrix (theme/visual)

Source: `src/config/commerce/plans.ts` (`COMMERCE_PLANS[*].capabilities`).

| Capability | Launch | **Grow** | Scale | Enterprise |
|---|---|---|---|---|
| `basic_themes` | ✅ | ✅ | ✅ | ✅ |
| `premium_themes` | ❌ | ✅ | ✅ | ✅ |
| `theme_background_solid` | ✅ | ✅ | ✅ | ✅ |
| `theme_background_gradient` | ❌ | ✅ | ✅ | ✅ |
| `theme_background_image` | ❌ | ✅ | ✅ | ✅ |
| `theme_background_animation` | ❌ | ✅ | ✅ | ✅ |
| `theme_effects_particles` | ❌ | ✅ | ✅ | ✅ |
| `theme_effects_glow` | ❌ | ✅ | ✅ | ✅ |
| `theme_effects_noise` | ❌ | ✅ | ✅ | ✅ |
| `theme_effects_blur` | ❌ | ✅ | ✅ | ✅ |
| `theme_background_video` | ❌ | ❌ | ✅ | ✅ |
| `theme_effects_custom` | ❌ | ❌ | ✅ | ✅ |
| Theme tier band (themes selectable) | **free** (5) | **pro** (30) | **business** (50) | enterprise |
| Builder kind | basic_builder | advanced_builder | advanced_builder | advanced_builder |

Theme tier band mapping (`src/lib/capabilities/plan-resolution.ts:20-44` PLAN_TO_TIER):
`creator_launch → free · creator_grow → pro · creator_scale → business · creator_enterprise → enterprise` (partner: partner_free→free, partner_solo/growth→business, partner_scale/enterprise→enterprise).

Theme catalog tier distribution (`src/lib/theme/tiers.ts` THEME_TIER_BY_ID): 5 free, 10 starter, 15 pro, 20 business = **50 themes**. Catalog backs them 1:1 (`providers/built-in.ts → themes/*`). **Growth unlocks 30 of 50 themes** (free+starter+pro). **Scale is required for the last 20 business-tier themes** (verified by 71.4.5 `theme-tier-boundary` test).

Experience → plan availability (`capabilities.ts` bands; `EXPERIENCE_MIN_PLAN` in theme-experience.ts is informational-only):
- Launch → solid background only; all premium layers degrade.
- **Grow** → gradient/image/animated backgrounds + particles/glow/noise/blur effects (any named experience composed of those layers is fully available; experiences requiring `video` or `custom` layers, e.g. `cyber`, `luxury`, `executive`, `arena` at full fidelity, partially degrade on Grow).
- Scale → + video backgrounds + custom/advanced effects.

---

## 4. Current Theme/Appearance Controls

### 4.1 Builder Appearance panel (`src/features/builder/components/appearance-panel.tsx`)
Persisted via `updateTheme` → `Website.themeFonts/themeConfig`; gated server-side on `premium_themes`; locked state from server `capabilities.premiumThemes`.

| Control | Options | Persisted as | Classification |
|---|---|---|---|
| Font | geist/inter/plex/mono (FONT_OPTIONS) | themeFonts.heading/body | **A** (implemented) |
| Heading weight | 500/600/700/800 (HEADING_WEIGHT_OPTIONS) | themeConfig.headingWeight | **A** |
| Background preset | 8 presets (BACKGROUND_PRESETS: solid/none/midnight/gradient/radial/mesh/aurora/pattern) | themeConfig.experienceBackground | **B** (works but visually subtle) |
| Surface preset | 9 presets (SURFACE_PRESETS: flat/minimal/elevated free; glass/soft-glow/gradient-border/floating/luxury/neon premium) | themeConfig.experienceSurface | **B** |
| Hero text alignment | left/center/right | themeConfig.heroTextAlign | **A** |
| Hero content width | narrow/medium/wide | themeConfig.heroContentWidth | **A** |
| Hero overlay | none/soft/medium/strong | themeConfig.heroOverlay | **A** |

### 4.2 Admin Appearance page (`src/app/admin/appearance/page.tsx` + `appearance-manager.tsx`)
Gated on `premium_themes`. Exposes: primary/secondary/accent colors, font, **borderRadius**, **layoutDensity** (compact/comfortable/spacious). **Not** experience background/surface, heading weight, or Hero presentation.

### 4.3 Theme Marketplace (`src/app/admin/themes/page.tsx` + `theme-marketplace-client.tsx`)
Browse-only. 50 themes, tier lock badges, "Open in Builder → `/builder?theme=<id>`" (apply happens in Builder only). Filters: search/category/tier/experience/unlocked/favorites; experience filter uses `experienceRegistry.resolve` + `isExperienceAvailableForPlan`.

### 4.4 Builder theme picker (`src/features/builder/components/theme-card.tsx`)
All-theme grid, swatch preview, preview-before-apply, lock + "Upgrade to apply" by `themeUnlockedForPlan`.

### 4.5 Section Presentation panel (`src/features/builder/components/section-presentation-panel.tsx`)
Presentation metadata only (title/description override, visible, hideTitle, hideWhenEmpty). **Not** visual styling — no per-section background/surface/motion/divider controls.

---

## 5. Control Data-Flow Map

```
UPDATE (creator)                              READ (preview/live)
─────────────                                  ──────────────────────
Builder AppearancePanel ── updateTheme ──► Website.themeFonts/.themeConfig
        │  (server: entitlement gating)         │
Admin Appearance ──────── updateTheme ──► Website.themeColors/.themeFonts/.themeConfig
        │                                      ▼
        │                    buildRuntimeSnapshot (build-snapshot.ts)
        │                     ├─ themeColors → snapshot.theme.colors (colors)
        │                     ├─ themeFonts  → snapshot.theme.typography (heading/body)
        │                     ├─ themeConfig → headingWeight, borderRadius, layoutDensity,
        │                     │                heroTextAlign/ContentWidth/Overlay
        │                     │                (applyHeroPresentation → content.hero)
        │                     ▼
        │                    experienceRegistry.resolve(theme) → base Experience
        │                            │
        │                    applyExperienceOverride(base, themeConfig)   (background/surface)
        │                            │
        │                    resolveExperienceForCapabilities(overridden, plan)  ← Capability Runtime
        │                            │
        │              preview (storefront-loader.ts:88) / publish (publishing/service.ts:227, baked)
        │                            ▼
        │                 ExperienceSection (section-runtime.tsx) → background/motion/surface/
        │                 decoration/divider renderers + LayoutEngine CSS vars (radius/density/
        │                 heading weight) → DataBoundRenderer → renderers.tsx (CSS vars only)
        │
        └── builder-overview.actions.ts → appearance defaults + capabilities.premiumThemes (server)
```

Persistence is JSON-only on `Website` (`themeColors`/`themeFonts`/`themeConfig`) — **no schema migration needed to add any control in Section 8/9**.

---

## 6. Stitch Comparison

Stitch (`docs/design/Stitch-DNA.md`) is the visual reference design system ("Premium Creator OS" v2, dark) — not a capability spec. Comparing its premium-creator direction to the current implementation:

| Stitch visual theme direction | Current implementation | Status |
|---|---|---|
| Rich layered page backgrounds (gradients, meshes, aurora, glows) | 8 presets, but alpha 0.04–0.14 tints — barely distinguishable from Launch solid | **B** (present, too subtle) |
| Surfaces (glass, gradient-border, soft-glow, floating, luxury, neon) | 9 presets, fully implemented + xp-* CSS | **A** (runtime) / **B** (how much a creator notices) |
| Section treatment / dividers / decorations / motion | Runtime complete (13+ experiences, 9 dividers, decoration packs incl. 12 category packs, 5 motions) — **no creator control** | **C** |
| Font + typography control | 4 fonts + 4 heading weights in Builder | **A** |
| Radius / density / spacing | Fully implemented + LayoutEngine scale — **only in /admin/appearance** | **C** |
| Hero presentation | alignment/width/overlay | **A** |
| Background images | capability granted to Grow — **no control exists** | **D** |
| Per-section visual styling | runtime supports `sections` overrides — no UI | **D** |
| Custom CSS / arbitrary styling | `renderingHints.customCss` passes through LayoutEngine but is not surfaced in any creator UI | **E/DEFER** |

**Do not copy Stitch control-for-control.** Every recommended control below maps to an existing runtime capability — none require new engine code.

---

## 7. A/B/C/D/E Classification

**A — already implemented correctly (keep as-is):**
- Font + heading weight controls (Builder).
- Hero presentation (alignment/width/overlay) — 71.3 closure.
- Theme tier band enforcement + marketplace lock badges + Builder lock/upgrade UX.
- Server-side entitlement (`premium_themes`, granular theme caps, `themeEntitlementDecision`) + no client authority.
- Graceful capability degradation (`resolveExperienceForCapabilities`) — never broken render.
- Bake-once experience (preview == live == canvas).
- CSS-var-only renderers with exact-current fallbacks.

**B — implemented but visually weak / under-promoted:**
- 8 background presets (too subtle — Growth ≈ Launch visually).
- Surface presets exist but no "premium" visual cue in the panel; a Growth creator may not discover them as the Growth differentiator.
- Marketplace theme cards show only flat gradient swatches — no experience/typography/surface preview, so premium themes don't look premium.

**C — partially represented in runtime, no creator control:**
- Motion (float/glow-pulse/gradient-shift/particle-drift/parallax) — runtime only.
- Dividers (9 kinds) — runtime only.
- Decoration packs + category packs — runtime only (theme/category-decided).
- Per-section experience overrides (`experience.sections`) — runtime only.
- Alternate section surface rhythm — runtime only.
- Radius (`borderRadius`) + density (`layoutDensity`) — implemented + persisted + LayoutEngine-resolved, but surfaced **only** in `/admin/appearance`, not the Builder.
- `theme_background_animation`, `theme_effects_particles/glow/noise/blur` — fully wired into capability resolution and experience composition, but not independently controllable by creators.

**D — missing (capability granted, no implementation surface):**
- **`theme_background_image` control** — Grow is granted it; there is no image-background preset, no picker, no "set page background image" UI. (Theme-embedded hero/section imagery exists, but a *page background image* control does not.)
- Any "what will I gain by upgrading to Growth" visual compare inside Builder (theme-card has preview+upgrade, but no side-by-side of Launch vs Growth experience layers).
- Builder visibility of `borderRadius`/`layoutDensity`.
- Per-section visual styling panel (would sit beside Section Presentation).

**E — should NOT be implemented (violates architecture/product scope):**
- Any client-side plan/capability authority or client-side tier compare.
- Duplicating the plan matrix / capability decisions / theme tier logic / entitlement authority in UI or in any new module.
- Raw arbitrary theme CSS / per-element arbitrary styling via client-side CSS injection (dangerous, un-testable; `customCss` pipeline exists but is not a creator surface and should stay that way).
- Per-element style painter (opacity/rotate/blur sliders on individual blocks) — out of scope for the theme experience; violates the theme-first model.
- Stitch controls that exist only for visual fidelity with no capability or product meaning.

---

## 8. Growth Value-Gap Analysis

**What a Growth creator CAN do today that a Launch creator cannot** (verifiable in code):
1. 30 themes (vs 5) — strong, real.
2. Gradient/animated/pattern backgrounds (vs solid) — real but visually marginal today.
3. Particles/glow/noise/blur effect layers — automatic via premium experiences, not controllable.
4. All 9 surface presets incl. 6 premium ones — real, the single most visible Growth control.
5. Fonts, heading weight, Hero presentation — real but same-category as launch tooling.

**Where Growth LOOKS like Launch (the gap):**
- The default experience for a free/5-theme site vs a Growth 30-theme site is a single preset's alpha tint. `BACKGROUND_PRESETS` alphas (0.04–0.14) are ~invisible in most lighting; `aurora`/`mesh` read as slightly-off black.
- `borderRadius` and `layoutDensity` are not in the Builder at all — the two controls with the most visible, unmistakable "this site is styled" effect.
- Motion/dividers/decoration — the layers that make a storefront feel "premium" — are not attributable to the creator (automatic, theme-decided).
- No image background control despite the capability being granted.

**Ranked opportunities (P0 must / P1 should / P2 nice / DEFER):**

- **P0** Surface the already-implemented `borderRadius` + `layoutDensity` in the Builder Appearance panel (one panel section, existing `updateTheme` fields, existing LayoutEngine resolution). Highest value-to-effort ratio.
- **P0** Add a creator-controlled **background image** control mapped to the existing `theme_background_image` capability (new `BackgroundPreset` shape + picker + capability resolution already handles gating + degradation). Reuses the whole runtime with zero new architecture.
- **P1** Make premium presets visible/distinguishable in the Builder: surface/background chips should show a mini visual swatch (a tiny gradient/glass tile), and the locked state should be per-control (premium chips show lock) instead of one all-or-nothing banner — so Growth creators *see* the thing they paid for.
- **P1** Expose **motion + divider + decoration** as creator controls (map to existing `applyExperienceOverride`-style override fields: `experienceMotion`/`experienceDivider`/`experienceDecoration`). Runtime and capability gating already exist (`motion !== static` → animation cap, `divider` → glow cap, `decoration` → particles cap). This converts "automatic" premium layers into visible Growth decisions.
- **P2** Upgrade the marketplace/theme-card previews to show experience + typography + surface (a richer swatch/thumbnail), so premium themes look premium before open.
- **P2** Per-section visual treatment panel beside Section Presentation (maps to `experience.sections` overrides; capability resolution already handles per-section gating).
- **P2** In-Builder "what Growth adds" upgrade compare (Launch visual vs Growth visual).
- **DEFER** White-label / brand-removal visuals (Scale caps; separate concern). Custom CSS surface. Per-element style painters.

---

## 9. Recommended Implementation Phases

Each phase is scoped so it can be its own RCCF ticket with guardrail tests; none require schema changes or new architecture.

- **Phase 1 (RCCF-71.5.1)** — "Growth Visual Surfaces": Builder Appearance panel additions that reuse existing fields end-to-end:
  1. `borderRadius` (range/step chips) + `layoutDensity` (compact/comfortable/spacious) section.
  2. Premium visual cue: mini-swatch chips for background/surface; per-chip lock indicator.
  3. Guardrail tests: updateTheme accepts/validates the new fields; LayoutEngine radius/density vars; preview/live parity.
- **Phase 2 (RCCF-71.5.2)** — "Growth Background Image": add `image` background preset shape + asset picker (reuse media library) gated by `theme_background_image`; capability resolution + degradation already wired. Tests: Launch degrades image→solid; Grow renders image; publish bake contains it.
- **Phase 3 (RCCF-71.5.3)** — "Growth Motion & Section FX": expose motion/divider/decoration presets as creator overrides (`experienceMotion`/`experienceDivider`/`experienceDecoration` + per-section variant overrides), validated against the existing runtime registries. Tests: capability mapping per layer, degradation matrix, per-section override resolution.
- **Phase 4 (RCCF-71.5.4)** — "Premium Market": richer theme previews (experience+typography+surface thumbnails) + in-Builder Launch→Growth visual compare. Tests: marketplace render, compare data.

---

## 10. Exact Files Likely to Change (future tickets — NOT changed by this audit)

Phase 1:
- `src/features/builder/components/appearance-panel.tsx` — add radius/density sections + swatch chips.
- `src/actions/theme.actions.ts` — already accepts `borderRadius`/`layoutDensity` (line 70-71); add strict validation sets if desired.
- `src/actions/builder-overview.actions.ts` — appearance already includes `borderRadius`/`layoutDensity` (line 216-217); pass-through already present.
- `src/app/admin/appearance/_components/appearance-manager.tsx` — optional shared swatch component.
- Tests: `tests/unit/rccf71-5-1-*.test.ts` (new).

Phase 2:
- `src/modules/theme/runtime/experience/experience-overrides.ts` — new `image` `BackgroundPreset` shape.
- `src/modules/theme/runtime/experience/capabilities.ts` — `BACKGROUND_KIND_CAP` already covers kinds; add image kind mapping if a new `ExperienceBackgroundKind` is introduced.
- `src/features/builder/components/appearance-panel.tsx` — image picker control.
- `src/actions/theme.actions.ts` — persist `experienceBackgroundImage` + asset id.
- Tests: `tests/unit/rccf71-5-2-*.test.ts`.

Phase 3:
- `src/modules/theme/runtime/experience/theme-experience.ts` — type-only additions if `ExperienceMotion`/`ExperienceDivider`/`ExperienceDecorationPack` override fields added to themeConfig shape.
- `src/modules/theme/runtime/experience/experience-overrides.ts` — motion/divider/decoration preset registries + override helper.
- `src/features/builder/components/appearance-panel.tsx` — new control groups.
- `src/actions/theme.actions.ts`, `src/actions/builder-overview.actions.ts` — new persisted fields.
- Tests: `tests/unit/rccf71-5-3-*.test.ts`.

Phase 4:
- `src/app/admin/themes/_components/theme-marketplace-client.tsx`, `src/features/builder/components/theme-card.tsx` — richer previews.
- `src/lib/theme/registry-new.ts` / `themes/*` — only if a preview-image asset is added to theme metadata.

---

## 11. Frozen Files (do NOT change in any implementation ticket)

- `src/config/commerce/plans.ts` — canonical pricing/capability matrix (single source of truth).
- `src/lib/capabilities/*` — capability runtime, `plan-resolution.ts`, `engine.ts`, `constants.ts`.
- `src/lib/theme/tiers.ts`, `src/lib/theme/access.ts`, `src/lib/theme/entitlement.ts` — tier assignment + theme entitlement authority.
- `src/lib/theme/types-new.ts`, `registry-new.ts`, `providers/built-in.ts`, `themes/*` — theme catalog/tiers (only for Phase 4 preview assets, and only by configuration).
- `src/modules/theme/runtime/experience/capabilities.ts` — capability→layer authority and degradation logic.
- `src/modules/theme/runtime/experience/background-runtime.tsx`, `section-runtime.tsx`, `motion-runtime.ts`, `divider-runtime.tsx`, `decoration-runtime.tsx` — runtime renderers (only extend registry data, not render logic).
- `src/lib/publishing/service.ts`, `src/lib/storefront/storefront-loader.ts`, `build-snapshot.ts` — bake/parity pipeline.
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — CSS-var derivation.
- `src/lib/hero/presentation-options.ts` — hero presentation registry (no changes without 71.3 regression).
- Schema (`prisma/schema.prisma`) — theme persistence is JSON on `Website`; do not migrate.

---

## 12. Risks

- **Preview/live divergence** — every new control MUST flow through the same `applyExperienceOverride` → `resolveExperienceForCapabilities` → bake chain as background/surface do today; a Builder-only CSS shortcut is forbidden (this is the documented invariant).
- **Entitlement loss mid-session** — `updateTheme` already rejects when `premium_themes` is lost (appearance-panel reverts optimistic state). New controls must do the same; never let a persisted override survive entitlement loss without degradation at render.
- **Over-aggressive degradation** — new premium fields must degrade to the safe free set exactly like the existing resolver; test the full matrix.
- **Old snapshots** — every new CSS var / override must fall back to the exact current look (as `--brand-font-weight-heading` and radius/density already do) so published output for existing sites is byte-identical.
- **Client bundle** — the Appearance panel must keep importing only the dependency-free preset registries; never import the capability runtime client-side.
- **Copying Stitch controls** — each control must map to a real runtime capability, or it is scope creep.

---

## 13. Required Regression Tests (future implementation tickets)

- Capability matrix boundaries (Launch/Grow/Scale/Enterprise × every theme capability) — extend `src/lib/capabilities/__tests__/theme-capabilities.test.ts` style matrix.
- `resolveExperienceForCapabilities` degradation for every new premium layer (image bg, motion, divider, decoration) across all 4 plans + null plan.
- `applyExperienceOverride` merge semantics (page background override wins over per-section backgrounds; surface/decoration/motion/divider character preserved).
- Plan→theme-tier boundary (Growth=pro band unlocks 30, business themes locked) — `tests/unit/rccf71-4-5-theme-tier-boundary.test.ts` pattern.
- `updateTheme` validation/acceptance for new fields + rejection on entitlement loss.
- LayoutEngine var derivation for radius/density/heading weight with old-snapshot fallbacks.
- Preview == publish == canvas experience equality (bake parity) — existing parity harness pattern.
- Hero presentation fallbacks unchanged (`renderers.tsx` + `presentation-options.ts`).

---

## 14. Manual Visual QA Plan

Accounts (evidence only — do not mutate):
- `rccf7143qa@example.com` — Creator **Grow**, ACTIVE (entitled: premium_themes, gradient/image/animation bg, particles/glow/noise/blur).
- `rccf7143launch@example.com` — Creator **Launch**, TRIALING (solid only).

Checklist (per account, logged-in, real subdomain):
1. **Marketplace** — open `/admin/themes`: locked count 30/50 (Grow) vs 5/50 (Launch); lock badges; "Open in Builder" only on unlocked; experience filter accuracy vs `isExperienceAvailableForPlan`.
2. **Builder theme picker** — preview a locked pro/business theme (preview allowed, apply blocked + upgrade dialog); apply a pro theme on Grow.
3. **Builder Appearance panel** — Grow: all controls enabled; change font/heading weight/background/aurora/surface (glass, luxury, neon)/hero alignment+width+overlay → canvas refetches via `appearance:changed` and matches the preview route exactly. Launch: panel locked banner + disabled chips; verify no control is settable.
4. **Publish + live** — publish from Grow; visit the live subdomain: baked experience identical to preview (aurora bg, glass surface, divider, decoration); verify Launch publish shows only solid + flat + fade (degradation, never broken).
5. **Radius/density** — `/admin/appearance` on Grow: change radius 4→16 and density compact→spacious → live cards/buttons/section spacing change; on Launch the page is gated (upgrade card).
6. **Contrast/readability** — each preset vs foreground text at the two QA sites; note where presets are invisible on bright monitors (the B-gap).
7. **Regression visual** — Launch site byte-looks identical to the pre-audit baseline.

---

## 15. Recommended Next RCCF Ticket

**RCCF-71.5.1 — Growth Visual Surfaces (Builder Appearance Panel completion)** — implement Phase 1: surface `borderRadius` + `layoutDensity` in the Builder Appearance panel, add mini-swatch + per-chip premium lock visuals, with the guardrail tests in Section 13. Zero new architecture, zero schema change, highest value-to-effort ratio for making Growth visibly worth paying for. Follow with **RCCF-71.5.2** (background image control) and **RCCF-71.5.3** (motion/divider/decoration creator controls) as described in Section 9.

---

RCCF-71.5.0 audit complete. Verdict: C. Growth value gap: the theme architecture is complete but the creator-facing Growth experience is thin — gradient/image/animation backgrounds, particles/glow/noise/blur, motion, dividers, decorations, radius and density are all runtime-implemented yet mostly invisible or Builder-unavailable (only font, heading weight, 8 subtle backgrounds, 9 surfaces, and 3 Hero toggles are surfaced; `theme_background_image` has no control at all, and `borderRadius`/`layoutDensity` live only in /admin/appearance). Top 3 implementation priorities: (1) surface borderRadius + layoutDensity in the Builder Appearance panel; (2) add a creator-controlled background image control backed by the existing theme_background_image capability; (3) expose motion/divider/decoration presets as creator overrides so premium layers become visible Growth decisions. Next ticket: RCCF-71.5.1 (Growth Visual Surfaces — Builder Appearance Panel completion).
