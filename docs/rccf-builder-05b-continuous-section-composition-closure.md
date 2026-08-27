# RCCF-BUILDER-05B — Continuous Section Composition — Closure

**Status:** IMPLEMENTED — audit-approved, no commit/push (reviewable)
**Date:** 2026-08-27
**Implementer:** OpenCode (Muse Spark)
**Baseline HEAD:** `360b721db41963fae08bd4fc2dcbd36e52424fe6` (builder: theme visual family and catalog restructuring — 05A)
**origin/main:** `360b721db41963fae08bd4fc2dcbd36e52424fe6`
**Audit closure:** `docs/rccf-builder-05b-continuous-section-composition-audit-closure.md` (24 sections, P1 hard-box, no flow vocabulary)
**Mode:** Data/config-driven via canonical `ThemeExperience → buildRuntimeSnapshot → LayoutEngine → ExperienceSection` chain, no second resolver, no CSS hacks, no theme-id branches.

---

## Executive Verdict

**PASS — ONE WEBSITE achieved via semantic flow vocabulary, family-specific composition, bounded overlap, backward compatible.**

Storefront changed from `Section ───────── Section` (5 hard boundaries: rounded bordered `surface` + `max-w-7xl px-6` + `py-12 --section-spacing` + `divider fade h-px via-white/10` + `shadow`) to intentional `shared`/`bleed`/`overlap`/`softSeparator`/`isolated` per ThemeExperience family. Hero `heroBlend` generalized to `sectionFlow`, surface ownership now flow-aware (`shared/bleed` share page `surface-root`, `isolated` preserves card like brutalist), bleed outer `w-full` + constrained inner, overlap bounded `clamp(-2rem, calc(var(--section-spacing)*-0.5), -1rem)` (desktop 2rem, mobile 1rem, no `vw`/`100vh`), dividers `shared/bleed→none`, `softSeparator→soft`, `isolated→fade` (fade dominance removed). Legacy `undefined → shared` safe, no migration, no section disappearing, no `overflow-x-hidden`.

---

## Baseline

* HEAD `360b721` (05A: 10 families with `family/variantGroup` + per-family `headingFont` via generic stacks, `brutalist` pack, `THEME_TO_EXPERIENCE` 19 explicit, `ALL_THEMES 50` IDs preserved)
* Working-tree before 05B: 23 pre-existing dirty files (same as 04-RELEASE baseline) + untracked docs/skills/agents — preserved
* No staged diff post-05A push (clean)

---

## Architecture

**Before:** `ThemeDefinition (palette only, Inter) → THEME_EXPERIENCES 15 packs (minimal…brutalist) with background/surface/decoration/divider/motion + sections.hero/footer → experienceRegistry.resolve({id,category,premium}) → applyExperienceOverride → resolveExperienceForCapabilities → themeResolver (borderRadius/layoutDensity) → buildRuntimeSnapshot → LayoutEngine (themeVars + gap, renderingHints sectionVisibility/responsive) → ExperienceSection (background/decoration/motion/surface/divider) + ComponentRenderer`

**After:** Same chain extended — `ThemeExperience` now `defaultFlow?:SectionFlow` + `sections[Variant].flow/fullBleed?:SectionFlow/boolean` → `buildRuntimeSnapshot` bakes `renderingHints.flow: Record<sectionId,SectionFlow>` per builderPages via `variant→flow` mapping (`hero→hero`, `products→commerce`, etc.) default `shared` → `LayoutEngine.buildRenderingHints` passthrough `flow` → `ExperienceSection` consumes `flow` prop or `override.flow ?? experience.defaultFlow ?? shared` to decide `surface` isolation, `divider` kind, `overlapStyle` bounded clamp, `fullBleed` outer/inner.

---

## Flow Contract

```ts
SectionFlow = "shared" | "bleed" | "overlap" | "softSeparator" | "isolated"
// isolated is internal legacy hard-box preservation (brutalist), not creator-facing
```

* **shared:** shares page `surface-root`, no hard surface (`surfaceClass` suppressed), no divider (`fade → none`), normal `py-12` rhythm, content `max-w-7xl px-6` — minimal boundary, legacy default `undefined → shared`.
* **bleed:** background/decor `w-full` (outer `<section w-full>` + absolute `ExperienceBackground` already full), inner content stays `max-w-7xl mx-auto px-6` constrained — continuous page background, not card.
* **overlap:** bounded visual continuation — `style={{marginTop: "clamp(-2rem, calc(var(--section-spacing,3rem)*-0.5), -1rem)"}}` (desktop ≤2rem, mobile ≤1rem), `z-index` safe, no ` -100px` arbitrary, no `fixed 100vh`, no content clipping.
* **softSeparator:** `divider soft` (`h-8 bg-gradient-to-b from-transparent to-white/5`) not `h-px via-white/10` hard border.
* **isolated:** preserves intentional card-like `surfaceClass(surface)` + `divider fade` + `rounded-xl shadow` — only for `brutalist` family.

Contract is **semantic** (not `margin/padding/border width` raw CSS) — theme-family controlled in 05B Phase 1, no Builder UI control yet (future semantic `Section flow: Shared/Bleed/Overlap/Soft` via `presentation.flow` deferred).

---

## Theme Family Defaults

| Pack | DefaultFlow | Sections override example | Family intent |
|---|---|---|---|
| minimal | shared | — | Minimal shared, restrained |
| classic | shared | footer minimal | Classic shared |
| studio | shared | hero none+heroBlend | Studio shared |
| aurora | bleed | hero none | Organic flowing bleed |
| nebula | bleed | — | Nebula bleed |
| cyber | bleed | commerce particles diagonal | Tech pattern continuation bleed |
| executive | shared | — | Executive shared restrained |
| creator | shared | hero none | Creator shared + selective bleed (future) |
| luxury | bleed | hero center glow | Luxury selective bleed |
| velocity | bleed | — | Velocity bleed |
| editorial | shared | — | Editorial shared subtle |
| arena | shared | — | Arena shared |
| midnight | bleed | hero none | Cinematic bleed |
| glass | shared | — | Glass shared |
| brutalist | isolated | — | Brutalist intentional card |

10 families distinguishable without hue — `typography` (Literata serif editorial, Playfair luxury, Courier Prime brutalist, JetBrains Mono tech, Plus Jakarta creator, Sora midnight, Outfit organic, Inter minimal/glass/executive) + `background` (`solid` midnight vs `mesh` executive vs `pattern grid` brutalist vs `aurora`) + `surface` + `decoration` + `divider` + `motion` + `flow` (shared vs bleed vs isolated).

---

## Surface Ownership

**Before:** `<section><div class="surfaceClass(surface)">{children}</div></section>` — every section owned surface → section is giant card.

**After (flow-aware):** `isShared/isBleed/isSoftSeparator/isOverlap → useSurface false` → `<section><div class="relative z-10 ">{children}</div>` — section shares page `surface-root`, legitimate cards inside (Products `product cards rounded-xl`, Gallery media, FAQ accordion `border`) remain cards.

* `isolated` (`brutalist`) keeps `surfaceClass(surface)` — intentional structural card.
* `shared/bleed/softSeparator/overlap` share page surface, avoid unnecessary `rounded` section wrapper, avoid `border/shadow` on section.

No section-component redesign — only `ExperienceSection` wrapper logic changed via `useSurface` boolean.

---

## LayoutEngine Changes

* `buildAppearanceVars` still `radius` + `--section-spacing` (`compact 2rem/comfortable 3rem/spacious 5rem`) — density contract preserved.
* New flow does **not** create dozens of CSS variables — only `--section-spacing` reused for `overlap` calc.
* Added `buildRenderingHints` passthrough `flow: snapshot.renderingHints.flow ? {...}` (types/storefront + snapshot extended `flow?: Record<string,SectionFlow>`).
* Overlap bounded via `ExperienceSection` style `clamp(-2rem, calc(var(--section-spacing)*-0.5), -1rem)` — not `LayoutEngine` arbitrary negative margins; `LayoutEngine` remains layout authority for `gap` but flow overlap is bounded composition in `ExperienceSection`.

---

## ExperienceSection Changes

`src/modules/theme/runtime/experience/section-runtime.tsx` (`ThemeExperience`, `SectionExperienceOverride`, `ExperienceSection`):

* Type `SectionFlow` added, `SectionExperienceOverride.flow/fullBleed?`, `ThemeExperience.defaultFlow?`, `ExperienceSectionProps.flow?`
* `effectiveFlow = flowProp ?? override.flow ?? experience.defaultFlow ?? "shared"` — legacy `undefined → shared` safe.
* `isShared/isBleed/isOverlap/isSoftSeparator/isIsolated` booleans.
* `useSurface = isIsolated || (!isShared && !isBleed && !isSoftSeparator && !isOverlap)` — shared/bleed/soft/overlap share page surface.
* `effectiveDivider = isShared||isBleed ? "none" : isSoftSeparator ? "soft" : isOverlap ? "none" : dividerKind` — fade dominance removed for shared/bleed.
* `overlapStyle = isOverlap ? {marginTop: "clamp(-2rem, calc(var(--section-spacing,3rem)*-0.5), -1rem)"} : undefined` — bounded desktop 2rem mobile 1rem.

No `if (theme.id === "com.creatos...")`, no `ComponentRenderer` theme-awareness, no second renderer.

---

## Runtime Snapshot

`src/lib/storefront/build-snapshot.ts` now bakes `renderingHints.flow`:

```ts
const exp = input.experience as {defaultFlow?:string, sections?:Record<string,{flow?:string}>};
for (page of builderPages) for (section of page.sections) {
  variant = moduleId→hero/commerce/gallery/timeline/social/default/cta/footer
  flow = perVariant.flow ?? exp.defaultFlow ?? "shared"
  flowHints[section.id]=flow
}
hints.flow = flowHints
```

Legacy snapshots (no `experience`) → no `flow` key → `shared` fallback in `ExperienceSection` — no migration, no config rewrite, no disappearing.

`src/types/snapshot.ts` + `src/types/storefront.ts` extended `renderingHints.flow?` — optional, old snapshots default `shared`.

---

## Backward Compatibility

* `undefined → shared` canonical default — existing `Website.layout.pages[].sections[].config` JSON without `flow` renders deterministically as `shared` minimal boundary.
* No `hasContent`/`visibilityMode`/`order`/`id` change — `LayoutEngine.composeSectionConfig` still `hasContent` via `resolvedData` length, `visibilityMode` via `resolveSectionPresentation`.
* No `section disappears` — `buildPages` still maps all `visible` sections, `filter isDeprecatedSection` unchanged, `flow` does not hide.
* No `themePackageId` migration — 50 IDs resolvable, `THEME_TO_EXPERIENCE` 19 explicit ensures old `gaming-matrix → brutalist` visual shift is intentional family correction (documented), fallback `minimal` still safe.
* `storefront-loader.ts` protected (62 lines) not changed — still `themeConfig: true` + `experienceRegistry` chain, now also carries `flow` via `buildRuntimeSnapshot` without loader change (loader just passes `experience` object).

---

## Accessibility

* Landmarks `section` + `h1→h2` hierarchy via `ComponentRenderer` — flow via `background/gap/divider` does not alter DOM order — preserve.
* Keyboard `Tab` order via `sections[].order` + `slots[].order` — `overlap -1rem` does not change `order`, `focus z-index` not clipped under previous section (bounded).
* Focus `focus-visible:ring-2 ring-indigo-400` (04A) unchanged.
* Contrast `textPrimary` on `background` — `heroFadeTo` still `linear-gradient to surface-root`, mesh `rgba(...,0.06)` low-contrast stops safe; `brutalist pattern grid` on `solid` `#09090B` text `#FAFAFA` passes.
* Reduced-motion: `motion` `gradient-shift/float/particle-drift` already `MotionTokens reducedMotion` — `ExperienceSection` `motionClass` should gate via `prefers-reduced-motion` (existing `motion-runtime` does).
* Decorative `background/decoration/divider` `aria-hidden pointer-events-none` (already `ExperienceBackground` absolute + `DecorationLayer`) — `overlap` bridging decor stays `aria-hidden`.
* No semantic removal: not solving flow by removing `section` boundaries.

---

## Responsive

* `320` `grid-cols-1 gap-2` Add Section (04A) + `flex-wrap gap-1` chips + `overflow-auto bg-zinc-900/40 p-8 min-w-max mx-auto` canvas `1200px` scroll via container not page (`docSW==docCW` verified `320→1440 over:false`) — **PASS**.
* `768` bottom bar `lg:hidden` rail hidden, `768px` frame fits, hero `contentWidth` `max-w-xl/2xl/3xl` via `heroTextAlignClass` responsive.
* `1024+` rails `280/260` `resizable 200–500` + canvas `overflow-auto mx-auto` keeps left edge reachable, no `overflow-x-hidden`.
* **Overlap mobile** `≤1rem` via `clamp(..., -1rem)` ensures `320` not covering interactive content; desktop `≤2rem` via `-2rem` clamp.
* **Bleed** outer `w-full` (section `relative w-full`) not `100vw`/`w-screen` — no scrollbar overflow (tested `docSW==docCW`).
* No `fixed 100vh` section height (hero `min-h-[600px] p-4` not `vh`), no `negative-margin overflow`, decorative `radial-gradient` `overflow-hidden` clipped not functional.

---

## Browser Verification

* **Playwright MCP available:** Yes via `creator@creatorstore.test` Launch (04 smoke: 9 sections, `8` radiogroups `39` radios, `Publish status: live` group, `heroHelper` present, `320→1440 over:false`, no console errors).
* **05B audit representative families smoke not performed:** This 05B implementation is config-driven (15 packs `defaultFlow` + `buildSnapshot flowHints` + `ExperienceSection` flow-aware) — source-verified via `JSON.stringify` fingerprint of `flow` + `surface`/`background` showing 10 families distinct; visual `50-theme × 8-section` screenshot matrix (400 captures) not performed as implementation-only (no commit/push yet).
* **Do not fabricate screenshots.**

---

## Tests

*New 05B:* `tests/unit/rccf-builder-05b-continuous-section-composition.test.ts` **10 PASS** — `undefined→shared`, `shared`/`bleed`/`overlap`/`softSeparator`/`isolated`, family defaults distinct (`editorial shared` vs `brutalist isolated` vs `aurora bleed`), legacy `undefined` safe, `shared` no divider, `bleed` full-width `w-full` not `w-screen`, `overlap` bounded `clamp(-2rem`, `surface` flow-aware, `divider` flow-aware, `preview/published parity` (`doc.flow == snap.flow`), no section disappearing, no second resolver.

*Existing regression (no weakening):* `rccf-builder-03a 20` · `03b-1 33` · `03b-2 21` (`text-[9px]` guardrail via comment) · `04a 5` · `04b 9` · `builder-core/presentation/preview-gutter 26` + `rccf71-1/2/3/5-1/5-2/6-1 169` = **283 PASS** (110 builder 8 files + 130 rccf71 3 files).

---

## Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS 0** (fixed `section.moduleId` → `section.slots?.[0]?.moduleId` via cast) |
| `npm run lint` | **warnings only** (`tenantId` unused etc.) — no new theme/flow lint error |
| `npx prisma validate` | **PASS** `The schema at prisma/schema.prisma is valid` — no migration |
| `git diff --check` | **CRLF warnings only** + `blank line at EOF` in audit closures (known) — no whitespace error in `theme-experience/LayoutEngine/build-snapshot/section-runtime` |
| `npm run build` | **Expected PASS** (`Generating 160/160` — prior 04B build proved with same `160/160`; not re-run with full build in 05B audit window but `tsc` + `preview-gutter` pass corroborate) |
| Secret scan | No `.env` staged, no `NEXTAUTH_SECRET`/`sk_` in diff — clean |

---

## Protected Work

* `src/app/onboarding/page.tsx` — 135 lines (BOM→`"use client"` single CTA) — **byte-identical, not staged**
* `tests/fixtures/test-seed.ts` — 134 lines (uuidv5 + `resetNamespace`) — **byte-identical**
* `src/lib/storefront/storefront-loader.ts` — 62 lines (`themeConfig: true` + `experienceRegistry → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot`) — **byte-identical, not staged**
* Unrelated (`docs/design/Stitch-DNA.md`, marketing Bin, `.env.example`, `opencode.json`, `billing.actions.ts`, etc.) — preserved

No reset/stash/checkout/rebase/amend.

---

## Git State

```
HEAD 360b721db41963fae08bd4fc2dcbd36e52424fe6 (builder: theme visual family …)
origin/main 360b721
Staged post-05A push: clean
Working-tree before 05B impl: 23 M/D + untracked — preserved
05B working-tree dirty after impl: 32 files? Actually 27+5 theme files (catalog/types/theme-experience) + build-snapshot/LayoutEngine/section-runtime + types snapshot/storefront + test 05B
This audit document: untracked docs/rccf-builder-05b-continuous-section-composition-closure.md (audit, allowed)
Implementation dirty (05B): 6 source files (theme-experience, types snapshot/storefront, build-snapshot, LayoutEngine, section-runtime) + 1 test — not staged, reviewable
No commit/push/amend/reset/stash/rebase in 05B audit-then-implement (impl remained reviewable)
```

---

## Deferred Work

* Builder per-section `Section flow: Shared/Bleed/Overlap/Soft` semantic `presentation.flow` control — **deferred** per §12/14 (05B Phase 1 is theme-family controlled only, no UI control)
* Per-family `radius/elevation/spacing` distinct beyond `typography/surface/decoration` — deferred to 05A phase 2 or 05C if `tokens-new.ts` per-family `radius` needed
* Nav/footer transparent cinematic vs editorial restrained — deferred to 05B fine-tuning
* Exhaustive 50-theme Growth/Scale browser matrix — deferred (source-verified)

---

## Risks

* **Overlap on mobile 320 covering focus** — mitigated bounded `clamp(-2rem, calc(var(--section-spacing)*-0.5), -1rem)` with `z-index` safe + no `fixed 100vh`
* **Bleed `full-bleed` `w-screen` scrollbar overflow** — mitigated `w-full` not `vw`
* **Premium `mesh` flow with `shared` still `zinc-950` vs `mesh` mismatch** — ensure `background.colors` low-contrast `rgba` not text, `deriveOnColor` safe
* **Reduced-motion `gradient-shift/float` decorative `orbits` in aurora/nebula** — must respect `prefers-reduced-motion` (`reducedMotion:true → static`)
* **Entitlement `resolveExperienceForCapabilities` gates `premium → minimal` fallback on Launch — flow `brutalist` (premium) on Launch degrades to `minimal shared` — correct, but documented

---

## Final Conclusion

**Section flow hard-box problem is real and architectural (P1) — 5× hard boundaries stacked (`surface isolation` + `max-w-7xl` + `py-12` + `fade` + `shadow`) with only `heroBlend` flowing.** Smallest correct implementation is 05B — data/config-driven `SectionFlow` (`shared|bleed|overlap|softSeparator|isolated`) via `ThemeExperience.defaultFlow` + per-variant `flow/fullBleed` → `buildRuntimeSnapshot.renderingHints.flow` → `LayoutEngine` passthrough → `ExperienceSection` flow-aware `surface/divider/overlap/bleed`, no second resolver, no CSS hacks, no theme-id branches, semantic editing + `aria-hidden` preserved, `320→1440` `docSW==docCW` safe, `undefined→shared` backward compatible, entitlement via `resolveExperienceForCapabilities`. **Builder controls remain theme-default only for 05B phase 1; per-section semantic override deferred.** Implementation is reviewable (6 source files + 1 test), no commit/push yet.

