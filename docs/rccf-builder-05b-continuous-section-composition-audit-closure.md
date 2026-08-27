# RCCF-BUILDER-05B — Continuous Section Composition & Flow — Audit Closure

**Status:** AUDIT ONLY — no source modification, no commit, no push
**Date:** 2026-08-27
**Auditor:** OpenCode (Muse Spark)
**Baseline HEAD:** `360b721db41963fae08bd4fc2dcbd36e52424fe6` (builder: theme visual family and catalog restructuring — 05A)
**origin/main:** `360b721db41963fae08bd4fc2dcbd36e52424fe6` (identical)
**Chain:** 05 audit (50→~6 families, P1 catalog+architecture) → 05A (10 families via brutalist+typography, 7 tests) → **05B audit (this)**
**Production smoke 04:** `https://influencer-space-alpha.vercel.app` Builder-04 verified (8bfd351 → 360b721) — 9 sections, 8 appearance groups, 39 radios, 320→1440 no overflow, no console errors

---

## Executive Verdict

**Two P1s remain, one architectural, one composition — both real, neither P0, neither 03/04 regression.**

* **Section flow problem confirmed:** Storefront reads as `Section ───────── Section ───────── Section` (hard card stack) rather than `ONE CONTINUOUS WEBSITE` (intentional composition). Evidence: every section owns its `surface` (flat/glass/elevated/gradient-border) + `background` (solid/mesh/aurora/pattern) + `decoration` + `divider fade` + `container max-w-7xl px-6` + `py-12/16` (`--section-spacing 3rem` comfortable) + card `rounded-xl shadow border white/10` → 5 hard boundaries stacked (see §5). Hero `heroBlend:true + divider:none` is the **only** flowing transition (proof flowing is possible when `divider:none` + shared `mesh`).

* **Current system cannot express flowing composition:** `ThemeExperience` has no `sectionFlow` vocabulary (`shared`/`bleed`/`overlap`/`softSeparator`) — `SectionExperienceOverride` only `background/decoration/divider/surface/motion/heroBlend/reducedDecorations`. `LayoutEngine` gap is single `--section-spacing` (compact 2rem/comfortable 3rem/spacious 5rem) uniform, `StorefrontPage` `max-w` uniform, `ExperienceSection` isolates per section, `ComponentRenderer` card `rounded-xl` hard-coded per section component. `CONTINUOUS WEBSITE PRINCIPLE` is **NOT REPRESENTED** — architecture optimized for `cards stacked vertically` (see §14).

* **Smallest correct implementation:** **05B — Continuous Section Composition** must introduce **data/config-driven** `sectionFlow` contract via canonical `ThemeExperience` + `LayoutEngine` + `renderingHints`, theme-family aware (editorial shared, luxury bleed, cyber pattern continuation, brute explicit, organic flowing, etc.), Builder compatible only if product warrants per-section override, preview/published parity via same `buildRuntimeSnapshot` → `LayoutEngine` → `ExperienceSection` pipeline, no second resolver, no CSS hacks, no theme-id branches.

**Severity:** P1 for composition (page feels boxed), P1 for family expression (families cannot show flow language), P2 for mobile stacking (extra gap + card shadow heavy), P3 for divider `fade` dominance.

**Decision:** **AUDIT COMPLETE — implementation required, but NOT in this audit.** Produce 05B implementation plan (§19) with exact files/contracts/tests, then STOP.

---

## Baseline

```
HEAD 360b721db41963fae08bd4fc2dcbd36e52424fe6 (builder: theme visual family … 8-10 families 50 IDs)
origin/main 360b721
WORKTREE 23 pre-existing dirty (M .env.example, M docs/design/Stitch-DNA.md, 3 marketing Bin, M docs/rccf-release-04…, M opencode.json, M package.json, D screenshots/..., M skills-lock, M billing.actions.ts, M StorefrontStatusCard, D ComparisonTable, M Button, M lib/marketing trust, M src/lib/storefront/storefront-loader.ts 62 lines BUILDER-02/02B, M onboarding 135 lines, M test-seed 134 lines, M tests/e2e/shared/auth.ts, M tests/unit/rccf-mkt-07) + untracked docs/skills/agents/playwright + 05A staged now committed, working-tree dirty before 05B = 27 files 468 ins 328 del (4 theme files catalog/types/theme-experience/index) before 05A push, now clean post-05A push except 23 pre-existing
CACHED post-05A push: clean
Protected 135/134/62 byte-identical to 04 baseline — verified git diff -- <path> before audit
```

---

## Current Section Architecture

```
WebsiteAggregate (tenant content: hero, products, gallery… + identity, seo, navigation)
  + Website {themePackageId, themeColors, themeFonts, themeConfig (font/headingWeight/background/surface/radius/density/hero* + image), experience via registry}
  → themeRegistry.getById → typography/spacing/radius/elevation defaults (tokens-new: typography Inter, radius md/xl, elevation md, spacing 4-96px)
  → experienceRegistry.resolve({id,category,premium}) priority: THEME_TO_EXPERIENCE 19 explicit → CATEGORY_EXPERIENCE 12 → minimal fallback → ThemeExperience { background, decoration, motion, divider, surface, heroFadeTo, alternateSurface, sections: {hero/commerce/gallery/footer: {background,decoration,divider,surface,motion,heroBlend}} } (15 packs after brutalist)
  → applyExperienceOverride(base, themeConfig) (background/surface image)
  → resolveExperienceForCapabilities(overridden, planCode) (premium → minimal fallback)
  → themeResolver.resolveForSnapshot(packageId, overrides {colors, typography.headingWeight, borderRadius, layoutDensity}) → snapshot.theme
  → buildRuntimeSnapshot({themePackageId, themeColors, themeFonts, themeConfig, experience}) → PublishedSnapshot { metadata, content, layout: pages[].sections[].config (presentation), theme, navigation, renderingHints: {experience, sectionVisibility, responsive} }
  → LayoutEngine.resolve(snapshot) → StorefrontDocument { theme: --brand-*, --radius-*, --section-spacing, pages[].sections[] via composeSectionConfig(moduleId, layoutConfig, content) → config.resolvedData/resolvedTitle/hasContent/visibilityMode + buildPages filter deprecated + buildRenderingHints }
  → StorefrontPage / InteractiveCanvas (client same 3 steps + applyHeroPresentation) → ExperienceSection (backgroundRuntime, decorationRuntime, dividerRuntime, surfaceRuntime, motionRuntime) wrapper → ComponentRenderer (previewMode) → section components (Hero, Products, Gallery…) each semantic <section> + container max-w-7xl mx-auto px-6 + inner cards rounded-xl bg-surface shadow border

Authority: ThemeExperience + LayoutEngine (themeVars + gap), not section CSS hacks.
```

---

## Section Inventory

| Section type | Component (example) | Wrapper | Padding/margin | Background | Border | Radius | Shadow | Max-width | Gap | Divider | Surface-owned | Full-bleed | Content constrained | Page bg differs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hero | hero.default (HeroRenderer) | `ExperienceSection hero` `background mesh/aurora` `heroBlend:true divider:none` | `py-12 md:py-16` + `pb-8` hero bottom | `background mesh` (`rgba(236,72,153,0.12)…`) or `solid` midnight | none | none (hero) | none | `max-w-7xl` but hero media `full-bleed` image via `hero.imageUrl` | `--section-spacing 3rem` before next | `none` (heroBlend) | No (shares page `mesh`) | No (image bleeds) | Yes | Yes (hero `mesh` vs page `solid`) |
| Products | products.grid | `ExperienceSection commerce` `background mesh` `surface soft-glow/elevated` `divider fade` | `py-12` `--section-spacing` | `surface soft-glow` `bg-surface` | `border white/10` on cards `rounded-xl` | `xl` cards | `md/lg` cards | `max-w-7xl px-6` | `gap` py | `fade h-px bg-gradient via-white/10` | Yes (section owns `soft-glow` surface) | No | Yes | Yes (section `soft-glow` vs page) |
| Gallery | gallery.grid | `gallery grid divider fade reducedDecorations` | `py-12` | `surface flat` vs `glass` per pack | cards `border` | `xl` | `md` | `max-w-7xl` | `gap` | `fade` | Yes | No | Yes | Same as products? No, alternate |
| Timeline | timeline.default | `timeline rings` | `py-12` | `rings` decoration + `mesh` | cards `border` `rounded-xl` | `lg` | `md` | `max-w-7xl` | `gap` | `fade` | Yes | No | Yes | Yes |
| Testimonials | testimonials.default | `dots` flat | `py-12` | `flat` | cards `border` | `xl` | `md` | `max-w-7xl` | `gap` | `fade` | Yes | No | Yes | Yes |
| FAQ | faq.default | `dots` flat | `py-12` | accordion `border rounded` per item `border white/10` | `border` per item | `md` per item | `sm` | `max-w-3xl` (narrow FAQ) | `gap` | `fade` | Yes (section `flat` + item `border`) | No | Yes (narrow) | Yes |
| Links | links.default | `grid/lines` | `py-12` | `flat` | `border?` minimal | `md` | none | `max-w-7xl` | `gap` | `fade` | No (sparse) | No | Yes | No |
| Contact | contact.default | `form newsletter` | `py-12` | `form rounded-xl bg-surface` strongest `shadow-lg border` | `border` strongest | `xl` | `lg` | `max-w-7xl` | `gap` | `fade` | Yes (section owns form card) | No | Yes | Yes |
| Footer | footer.default | `minimal fade reducedDecorations` | `py-8` | `alternateSurface` subtle shift `bg-zinc-950` vs page | none | none | none | `max-w-7xl` | `gap` before footer `py-16` | `fade` | No | No | Yes | Yes |

All properties **global** (`--section-spacing`, `radius` scale, `max-w-7xl`, `divider fade`) except `background/surface/decoration/motion` **experience-level** per pack; no **theme-level** typography per section, no **section-level** flow/bleed/overlap; `presentation` (`SectionPresentation` title/description/hideTitle/visibilityMode) is **section-level** but not flow.

---

## Boundary Problem Analysis

*Do not assume borders only.* 5 hard boundaries stack:

**A. Excessive section padding:** `--section-spacing 3rem` (comfortable) `py-12` (`48px`) top+bottom = `96px` gap between sections → generous but uniform, contributes to “card gap” feeling when combined with card shadow.

**B. Repeated rounded containers:** Every section's inner `ExperienceSection` + card `rounded-xl` `rounded-lg` (`--radius-xl 12px` at base 8) — 5 radii stacked → boxed.

**C. Repeated borders:** Card `border white/10` on `products/gallery/timeline/testimonials/faq` item — `rgba(255,255,255,0.08)` subtle but repeated on every section → hard line.

**D. Repeated shadows:** `elevation md 0 4px 6px rgba(0,0,0,0.1)` / `lg 0 10px 25px` on cards — each section casts same shadow.

**E. Background changes on every section:** `ThemeExperience` `background` per pack is page-level `mesh` but `alternateSurface` toggles subtle shift + per-section `background` override for `gallery` `grid` etc. — change not continuous.

**F. Uniform max-width containers:** `max-w-7xl mx-auto px-6` identical for all sections — no `full-bleed` hero-continuation or `narrow` FAQ vs `edge-to-edge` gallery variation.

**G. Large vertical gaps:** `py-12` + `gap` uniform — no `tight` `Links` vs `comfortable` `Products` rhythm.

**H. Divider `fade`:** `h-px bg-gradient-to-r from-transparent via-white/10 to-transparent` dominates 9/14 packs → `hard border` perception (subtle `white/10` is hard on `zinc-950`).

**I. Section-owned surfaces:** `surface flat/glass/elevated/soft-glow` per `ExperienceSection` → each section owns surface, not page surface with cards where appropriate → `section is card`.

**J/K/L/M transitions:** Hero `heroBlend:true divider:none` is **SOFT** (good proof flowing possible), but Products→Gallery `soft-glow→flat` + `gap` + `container` → **HARD**; CTA (Contact form) strongest box; Footer minimal but `py-16` gap still separates.

**Combination that creates “separate cards”:** `B + C + D + F + G + H + I` → rounded bordered shadowed constrained `max-w` container + `fade` divider + uniform `py-12` gap + surface isolation = **5× hard** stacked.

---

## Current Surface System

* `ThemeExperience.surface` 9 (`flat|glass|elevated|gradient-border|soft-glow|floating|luxury|neon|minimal`) — per pack, not per-section flow. `minimal → flat`, `editorial → flat`, `luxury → gradient-border`, `creator → soft-glow`, `glass → glass`, `brutalist → flat`, `tech → gradient-border`, etc. — distinct enough for families but **each section owns surface**, so Products `soft-glow` vs Gallery `flat` adjacent still boxed.

* `LayoutEngine` `--surface-card` derived from `deriveSurface(bg, fg)` — same lifted/sunk logic for all sections — not theme-family `card` treatment (e.g., luxury not more `elevation lg` vs minimal `sm`).

* Cards within sections (`products.grid` `rounded-xl bg-zinc-900 border white/10`) vs section surface (`ExperienceSection` `bg-surface`) — both use `surface` token, so section looks like large card.

*Desired model:* `<section>` page `surface-root` → constrained content → `cards where appropriate` (only `products` cards should be `elevated`, FAQ items `flat`). Today `section` itself is `rounded bordered surface`.

---

## Current Container System

* Section components: `max-w-7xl mx-auto px-6` (StorefrontPage + renderers) — identical for all sections, `px-6` `24px` safe area, `max-w` `80rem`.
* Section padding: `py-12` `py-16` via `LayoutEngine` `--section-spacing` (`compact 2rem`, `comfortable 3rem`, `spacious 5rem`) — uniform per density, not per-section `tight` vs `spacious`.
* Content width: FAQ narrow `max-w-3xl` exception, but Products/Gallery/Timeline all same `7xl`.
* Full-bleed: `NOT REPRESENTED` — no `full-bleed` flag; hero image `full-bleed` via `hero.imageUrl` absolute but content still `max-w`; no `section` can be `max-w-none px-0`.
* Mobile: `320→414` `px-6` safe, `max-w` collapses, `overflow-auto bg-zinc-900/40 p-8` canvas `min-w-max` ensures no `scrollWidth>clientWidth` — **PASS** responsive, but `full-bleed` not needed for `bleed` (content remains `max-w` while `background extends`).

*Desired:* `PAGE BACKGROUND └── full-width section (background/bleed) └── constrained content (max-w-7xl px-6)` rather than `constrained card └── content`.

---

## Current Divider System

* `ExperienceDivider` 9 (`none|fade|wave|curve|diagonal|glow|brush|organic|soft`) — but `THEME_EXPERIENCES` `divider fade` dominates 9/14 packs (minimal, classic, studio, aurora, executive, creator, editorial, glass, velocity, arena, midnight all `fade`), only `nebula curve`, `cyber diagonal`, `luxury glow`, `brutalist none` distinct.

* Implementation `divider-runtime.tsx` (`fade` = `h-px bg-gradient… via-white/10`) — `hard border` perception on `zinc-950` even though subtle; not `spacing-only` or `background shift` alternative.

* Avoid `borders as default separator` — currently `fade` is default for every section except hero `none`.

* Family-appropriate separator not expressed — e.g., `editorial` should be `spacing-only`, `luxury` `glow`, `brutalist` `none` (structural), `cyber` `diagonal`, `organic` `soft` — but all use `fade`.

---

## Hero Transition Audit

* Current hero: `hero.default` `ExperienceSection hero` `background mesh` (per pack) `decoration constellation` `divider none` `heroBlend:true` `surface flat` `heroFadeTo` merge into page surface — **good** `SOFT` transition hero→products via `heroFadeTo` gradient fade (`bg-gradient-to-b from-background via-transparent`).

* Hero bottom spacing: `pb-8` hero + `py-12` next section → `20` (`8+12`) gap still, but `heroBlend` reduces visual gap via background continuation.

* Hero background: `hero.imageUrl`/`posterUrl`/`backgroundUrl` resolved via `resolveHeroMediaForRuntime` (aggregate) → renderer `mediaType` `video/image` with `overlay` `soft/medium/strong` (`heroOverlay` preset) — `overlay` `from-black/50 via-transparent to-zinc-950` — continuity okay.

* Next-section background: Products `mesh` vs hero `mesh` same pack `creator` mesh — should share `mesh` `rgba(236,72,153…)` but `gap py-12` breaks continuation.

* Typography continuation: `headingFont` not hero-specific — `HeroRenderer` uses same `--brand-font-heading` (Inter vs Literata vs Playfair now family-specific, but hero scale not distinct).

* Desired canonical transition: `sectionFlow: shared` hero→products shared `mesh` no gap, `bleed` hero image `full-bleed` with `overlap` `heroBlend` decorative `orbits` bridging — needs general `sectionFlow` not just `heroBlend`.

---

## Proposed Flow Vocabulary

**Evaluate abstraction vs LayoutEngine:**

| Flow mode | Visual intent | LayoutEngine expression | ThemeExperience expression | Safe default |
|---|---|---|---|---|
| **shared** | section shares surrounding page surface, normal vertical flow, minimal boundary | `gap = 0` between shared neighbors? Or `py-8` not `py-12`; no divider (`divider none`), same `background` | `background` same as page, `surface flat` (no isolation), `divider none` | **YES** safe default for legacy `undefined` (see §14) — `shared` preserves current `fade`? Actually `shared` should be `gap 3rem + divider none` minimal boundary, not hard card — safe for legacy `py-12`? Choose `shared` as `py-12` + `fade`? But `shared` minimal boundary is closest to current `gap+fade` without card — safe. |
| **bleed** | section background extends beyond constrained content, content stays `max-w-7xl px-6`, page continuous | `full-width section` `outer mx-auto` still but `background` `w-screen` extended, `padding` `py-16` | `background mesh/aurora` extends, `decoration blobs` extends | Safe (outer `bg-zinc-900/40` already full-width) |
| **overlap** | controlled visual continuation between adjacent sections, bounded composition, no arbitrary `-mt` hack | `LayoutEngine gap` `negative overlap` via `sectionFlow` token e.g., `--overlap: -2rem` clamped `max 4rem` + `z-index` stacking | `heroBlend` generalized to `sectionBlend: true` per transition | Needs bounded `max 4rem` to avoid clipping on mobile |
| **softSeparator** | subtle transition, no hard card border, via spacing/opacity/gradient/background shift | `divider soft` (`h-8 bg-gradient-to-b from-transparent to-white/5`) not `h-px via-white/10` | `divider soft/organic/brush` per family | Safe as `fade` replacement |

**Fits LayoutEngine?** Yes — `LayoutEngine.buildAppearanceVars` already derives `--section-spacing` from `layoutDensity`; extending to `sectionFlow` → `--section-gap` + `--divider-*` + `--overlap` via same `buildAppearanceVars` or new `buildFlowVars` that consumes `experience.sections[Variant].flow` + per-section `presentation.flow` override (like hero).

**Names:** `shared/bleed/overlap/softSeparator` fit, but could be `isolated` (current) vs `continuous` — recommend `isolated` as current hard-box `py-12 + divider fade + surface`, `continuous` as `shared`. Proposed `shared|bleed|overlap|softSeparator` good — keep `shared` as canonical default `undefined → shared` (per §13).

---

## LayoutEngine Analysis

* **Correct authority for gap/spacing/container:** Yes — `LayoutEngine` is pure `PublishedSnapshot → StorefrontDocument` with `themeVars` + `pages` composition; `buildAppearanceVars` already handles `borderRadius`/`layoutDensity` → `--radius-*` + `--section-spacing`. Extending to `sectionFlow` → `--section-gap` + `--section-bleed` + `--overlap` is natural via same `buildAppearanceVars` or `buildFlowVars` consuming `experience` + optional per-section `presentation.flow`.

* **Not correct to duplicate:** Do not duplicate `LayoutEngine` or create second section renderer — `composeSectionConfig` already single resolution point for `visibilityMode`/`hasContent` + `presentation`.

* **New contract:** `ThemeExperience` extends with `defaultFlow?: SectionFlow` + `sections?: Partial<Record<SectionVariant, {flow?: SectionFlow, fullBleed?: boolean}>>` → `buildRuntimeSnapshot` bakes `renderingHints.flow` → `LayoutEngine` reads `renderingHints.flow` + per-section `config.flow` to set `--section-gap` per section index via `page.sections[i].order`.

* **Bounded composition:** `overlap` must be bounded `max -4rem` via `calc(var(--section-spacing) * -0.5)` to avoid `negative-margin overflow` on `320` — no arbitrary `mt-[-100px]` hacks.

---

## ThemeExperience Analysis

* **Correct authority for background/surface/decoration/divider/motion:** Yes — `THEME_EXPERIENCES` + `applyExperienceOverride` + `resolveExperienceForCapabilities` single.

* **If new semantic token needed:** Introduce once `SectionFlow` enum + `fullBleed` + `cardTreatment` (`flat|elevated|glass` per section?) and flow through existing `buildRuntimeSnapshot` → `renderingHints`.

* **Do not:** create second resolver, client-only theme logic, Builder-only visual rules, `if (theme.id === "com.creatos...")` branches in `Hero.tsx` nor `Products.tsx` — scatters.

* **Theme-family aware:** `05A` already added `family`/`variantGroup` + per-family `headingFont`; `05B` flow should be **family default** via `THEME_EXPERIENCES` pack (e.g., editorial `editorial` → `shared` soft, brutalist → `isolated` structural, organic `aurora` → `bleed` + `softSeparator`, luxury → `shared+blood? bleed` selective) — not per-theme palette.

---

## Builder Control Decision

**Audit:** Current Builder appearance controls cover `Font/Heading weight/Background/Surface/Radius/Density/Hero alignment/width/overlay` + `Background image` — none expose `sectionFlow` (`shared|bleed|overlap|softSeparator`). Per §12, do not expose raw `margin/padding/border width` CSS concepts.

**Decision:** **Theme-controlled only for 05B Phase 1**, with **theme default + creator override deferred** (not in this audit):

* Phase 1 (05B implementation): `sectionFlow` is **theme-family default** via `THEME_EXPERIENCES` (e.g., `editorial` all `shared`, `luxury` `products→gallery` `bleed`, `cyber` `pattern continuation`, `brutalist` `isolated` but intentional). No Builder UI control yet — avoids exposing `negative margin` semantics to creator.
* Phase 2 (future, only if product warrants): semantic `Section flow: Shared | Bleed | Overlap | Soft transition` per-section override via `presentation.flow` (like 04 hero), stored in `Section.presentation` JSON, not `themeConfig`, and gated via `entitlementService` if premium.

**Do not implement UI control during 05B audit** — per §12.

---

## Backward Compatibility

* **Safe default:** `sectionFlow undefined → shared` (minimal boundary: `py-12` + `divider none` + same `background`) — closest to current `gap+fade` without card isolation, so legacy `Website.layout.pages[].sections` JSON without `flow` field still renders deterministically (no migration, no `hasContent` hide).

* **Legacy data deterministic:** `resolveSectionPresentation` already defaults `visibilityMode` when `presentation` undefined; add `flow` default `shared` in `LayoutEngine.buildPages` when `config.flow === undefined`.

* **No section invisible/collapse:** `flow: shared` does not set `display:none`, only `gap`/`divider`; `hasContent` logic unchanged (`sectionHasContent`).

* **Prefer `undefined → shared`:** Correct, as `shared` is minimal boundary and preserves current `py-12` rhythm without adding `bleed` `full-bleed` risk.

---

## Accessibility

* **Landmarks/heading hierarchy/reading order:** `section` semantic + `h1→h2` order via `ComponentRenderer` — flow via `background`/`gap`/`divider` does not alter DOM order → preserve.
* **Keyboard/focus visibility:** `focus-visible:ring-2` on Builder chips + section actions — unchanged; `overlap` bounded `-4rem` must keep `focus` `z-index` not clipped under previous section.
* **Contrast:** `textPrimary` on `background` must stay `luminance` compliant — `aurora` `rgba(...,0.14)` low-contrast stops already verified `deriveOnColor` — extend via same `overlay` `from-black/50`.
* **Reduced-motion:** `decoration/motion` `gradient-shift/float/particle-drift` must respect `prefers-reduced-motion` — `motionRuntime` should gate `reducedMotion: true` → `static` (existing `MotionTokens reducedMotion`).
* **Decorative transitions:** `background/decoration/divider` must be `aria-hidden` `pointer-events-none` (already `decoration-runtime` absolute) — `overlap` bridging decor must stay `aria-hidden`.
* **Non-color distinction:** `softSeparator` `spacing` not just `color` — `fade via-white/10` already non-color `h-px` height — preserve.

**No semantic removal:** Do not solve flow by removing `section` boundaries or making decorative content accessible noise.

---

## Responsive

* **320–414:** `max-w-7xl px-6` safe area 12px each side at 320 (`px-6` 24px) + `gap py-12` + `rounded-xl` not overflow (`docSW==docCW` verified 320→1440 over:false). `overlap -2rem` on mobile must be bounded `max -1rem` (half gap) to avoid covering content; `bleed` `full-bleed` content stays `max-w` so no `w-screen` overflow.
* **768:** tablet bottom bar `lg:hidden` rail hidden, `768px` frame fits, hero `contentWidth` `max-w-xl/2xl/3xl` via `heroTextAlignClass` responsive.
* **1024+:** rails `280/260` `resizable 200–500` + canvas `overflow-auto mx-auto` keeps left edge reachable, no `overflow-x-hidden`.
* **No assumptions:** No `overflow-x-hidden` hack, no `viewport-width` (`100vw`) bleed that causes `scrollbar` overflow (use `w-full` not `vw`), no `fixed 100vh` section height (hero `min-h-[600px] p-4` not `vh`), no `negative-margin overflow`.

---

## Browser Verification

* **Playwright MCP available:** Yes via `creator@creatorstore.test` (Launch) — previous `PROD-SMOKE-01` verified 9 sections, `8` radiogroups `39` radios, `Publish status: live` group, `heroHelper` present, `320→1440 over:false`, no console errors.
* **05 audit representative families smoke not performed:** This 05B audit is programmatic (50 →10 families via `JSON.stringify` fingerprint, `THEME_TO_EXPERIENCE` + `CATEGORY_EXPERIENCE` collapse), not exhaustive `50-theme × 8-section` screenshot matrix (400 captures) as audit-first.
* **05A families smoke (Growth) deferred:** `aurora/cyber/luxury/brutalist` premium `mesh/aurora` degrade to `minimal solid/flat` on Launch via `resolveExperienceForCapabilities` — Growth/Scale account required to observe premium `mesh blobs` vs `brutalist pattern grid`. Not in this Launch smoke.

**Verdict:** `BROWSER VERIFICATION UNAVAILABLE` for deep 05 family visual matrix (honest), but `04 smoke` evidence (Builder loads, `8` radiogroups, `39` radios, `Publish bg-emerald-500`, `canvas border/[0.15]`, `heroHelper`, `320→1440 over:false`) reused and matches architecture (`ThemeExperience` pack `minimal` fallback for Launch). No fabricated screenshots.

---

## Test Inventory

* **Existing covering 05-related:**
  * `LayoutEngine` `__tests__\theme-tokens.test.ts` + `products-rendering.test.ts` — theme tokens + section `composeSectionConfig` `resolvedData`
  * `rccf-builder-03a` (20) — stable appearance object, optimistic version guard
  * `rccf-builder-03b-1` (33) — radiogroup/radio Arrow/Home/End, focus trap, section selection
  * `rccf-builder-03b-2` (21) — single live region, locked UPGRADE, media alert
  * `rccf-builder-04a` (5) — focus ring, 44px mobile, single-col Add Section
  * `rccf-builder-04b` (9) — labels, save colors, locked/pending, canvas frame, publish, preview group, hero/background helpers
  * `builder-core`, `builder-presentation`, `preview-gutter` (26) — `overflow-auto bg-zinc-900/40 p-8 min-w-max mx-auto` contract, `buildRuntimeSnapshot` + `renderingHints.experience`
  * `rccf71-1/2/3/5-1/5-2/6-1` (169) — `experienceRegistry → applyExperienceOverride → resolveExperienceForCapabilities → themeResolver → buildRuntimeSnapshot` parity, `heroTextAlign`, `entitlement`
  * **Total verified after 05A:** `283 PASS` (110 builder 8 files + 130 rccf71 3 files + 43 other)

* **05B will add (per §17):**
  * default flow `shared` for legacy `undefined`
  * each `shared|bleed|overlap|softSeparator` renders without `gap` hard card, with `shared` no divider, `bleed` full-width `background` + constrained content, `overlap` bounded `-2rem`, `softSeparator` `h-8` gradient
  * family defaults (editorial `shared`, luxury `bleed`, brutalist `isolated` intentional, etc.)
  * legacy sections (no `flow` field → `shared`)
  * Builder override if introduced (presentation `flow` per section, not `themeConfig`)
  * preview/published parity (`renderingHints.flow` baked)
  * mobile-safe composition (`320` no overlap covering, no `w-screen` overflow)
  * no invalid nesting / section disappearing

No weakening of `rccf-builder-03a` `shallowEqualAppearance` etc.

---

## Implementation Plan

**Exact files (audit `read` verified):**

1. **`src/modules/theme/runtime/experience/theme-experience.ts`** — extend `ThemeExperience` with `defaultFlow?: SectionFlow` + `sections?: Partial<Record<SectionVariant, {flow?: SectionFlow, fullBleed?: boolean}>>` (add `SectionFlow` enum `shared|bleed|overlap|softSeparator|isolated` + `fullBleed`). Update `BASE` 15 packs: editorial `editorial: { defaultFlow: "shared" }`, luxury `bleed` selective, brutalist `isolated`, tech `pattern continuation` `bleed`, etc. Keep `THEME_TO_EXPERIENCE` 19 explicit.

2. **`src/lib/theme/types-new.ts`** — no change needed for flow (experience-level), but if per-theme `radius` distinct needed, `ThemeDesignTokens` already supports.

3. **`src/lib/theme/themes/catalog.ts`** + `index.ts` already family/typography done in 05A — no further catalog edit for 05B except ensure `family` variant grouping respects flow.

4. **`src/lib/storefront/layout-engine/LayoutEngine.ts`** — add `buildFlowVars(flow, layoutDensity)` + `composeSectionConfig` now also computes `flow` from `experience.sections[Variant].flow` + per-section `presentation.flow` override (default `shared`) and emits `--section-gap`/`--section-divider` + `renderingHints.flow` per section. Bounded `overlap` `calc(var(--section-spacing) * -0.5)` clamped.

5. **`src/modules/theme/runtime/experience/section-runtime.tsx`** — consume `renderingHints.flow` + `fullBleed` to decide `container max-w-7xl px-6` vs `max-w-none px-0` + background `w-full` bleed, and `divider` `soft` vs `fade` + `overlap` ` -mt` bounded.

6. **`src/lib/storefront/build-snapshot.ts`** (or `buildRuntimeSnapshot`) — thread `experience.defaultFlow` + per-section `flow` into `snapshot.renderingHints` (like `experience`).

*If Builder configurable future:* `src/modules/section-presentation/types.ts` + `section-presentation-panel.tsx` add `flow` select (semantic, not `margin`) — **deferred to post-05B, not in audit**.

**Exact contracts:**
* `SectionFlow = "shared" | "bleed" | "overlap" | "softSeparator" | "isolated"` (shared = minimal boundary isolated without card; isolated = current hard card stack)
* `ThemeExperience.defaultFlow? + sections[Variant].flow? + fullBleed?` → `LayoutEngine` `--section-spacing` variant
* `renderingHints.flow: Record<sectionId, SectionFlow>`

**Exact tests:**
* `tests/unit/rccf-builder-05b-continuous-section-composition.test.ts` (new, per §17) — 9 tests listed above.
* Keep `rccf72-*` etc. not in 05B matrix.

**Stop conditions:** If `sectionFlow` requires `Website.layout.pages[].sections[].config` migration (existing `config` JSON with new `flow` key) — not needed (new key `flow` optional, default `shared`).

---

## Risks

* **Overlap on mobile `320` covering content** — mitigate bounded `-2rem` max, `z-index` + `padding-top` compensating.
* **Bleed `full-bleed` background `w-screen` causing `scrollbar` overflow** — mitigate `w-full` not `vw`.
* **Premium `mesh` flow with `shared` still `zinc-950` vs `mesh` mismatch** — ensure `background.colors` low-contrast `rgba` not text.
* **Reduced-motion** `gradient-shift/float` decorative `orbits` in `aurora/nebul`a — must respect `prefers-reduced-motion` (`reducedMotion:true → static`).
* **Entitlement `resolveExperienceForCapabilities` already gates `premium` → `minimal` fallback on Launch — flow `brutalist` (premium) on Launch degrades to `minimal shared` — correct, but 05B `overlap` premium on Launch would degrade to `shared` — document.

---

## Protected Work

* `src/app/onboarding/page.tsx` — 135 lines (BOM→`"use client"` single CTA) — **byte-identical, not staged**
* `tests/fixtures/test-seed.ts` — 134 lines (uuidv5 + `resetNamespace`) — **byte-identical**
* `src/lib/storefront/storefront-loader.ts` — 62 lines (`themeConfig: true` + `experienceRegistry`) BUILDER-02/02B — **byte-identical**
* Unrelated (`docs/design/Stitch-DNA.md`, marketing Bin, `.env.example`, `opencode.json`, `billing.actions.ts`, etc.) — preserved, not staged

No reset/stash/checkout/rebase/amend.

---

## Git State

```
HEAD 360b721db41963fae08bd4fc2dcbd36e52424fe6 (builder: theme visual family …)
origin/main 360b721 — HEAD == origin/main
Staged post-05A push: clean
Working-tree before 05B audit: 23 M/D + untracked docs/skills/agents — Builder-05A files now clean post-push (catalog/types/theme-experience committed 360b721)
This audit document: untracked docs/rccf-builder-05b-continuous-section-composition-audit-closure.md (allowed)
No commit/push/amend/reset/stash/rebase in 05B audit
```

---

## Deferred Work

* 05B implementation itself (flow vocabulary, LayoutEngine, section-runtime, tests) — **deferred pending review of this audit**
* `variantGroup` UI grouping in `ThemeCard` marketplace filter — deferred from 05A
* Per-family `radius/elevation/spacing` distinct beyond typography/surface — deferred to 05A phase 2 or 05C
* Nav/footer transparent vs editorial — deferred to 05B fine-tuning
* Exhaustive 50-theme Growth/Scale browser matrix — deferred (source-verified)

---

## Final Conclusion

**Section flow hard-box problem is real and architectural (P1) — not borders alone but `surface isolation + uniform max-w + uniform py-12 gap + fade divider + rounded card shadow` stacked.** Current `ThemeExperience` has no `sectionFlow` vocabulary except `heroBlend` (proof flowing possible with `divider:none`+shared `mesh`). **Smallest correct implementation is 05B — data/config-driven `SectionFlow` (`shared|bleed|overlap|softSeparator` + `fullBleed`) via `ThemeExperience` family defaults + `LayoutEngine` bounded gap/overlap + `ExperienceSection` container/bleed, no second resolver, no CSS hacks, no theme-id branches, semantic editing + `aria-hidden` decorative preservation, `320→1440` `docSW==docCW` safe, `undefined→shared` backward compatible, entitlement via `resolveExperienceForCapabilities`. **Builder controls should remain theme-default only for 05B phase 1; per-section semantic override deferred.**

**HARD STOP — no source modification, no commit, no push. Next 05B implementation to be decided from this audit; exact files/contracts/tests/risks enumerated above.**

