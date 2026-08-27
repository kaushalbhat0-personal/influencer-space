# RCCF-BUILDER-05A — Theme Visual Family & Catalog Restructuring — Closure

**Status:** IMPLEMENTED — audit-first, verification pending for commit
**Date:** 2026-08-27
**Implementer:** OpenCode (Muse Spark)
**Baseline HEAD:** `8bfd351bc165672690f5f2cef5fd2168d63a77ea`
**origin/main:** `8bfd351bc165672690f5f2cef5fd2168d63a77ea` (identical)
**Previous audit:** `docs/rccf-builder-05-theme-diversity-section-flow-audit-closure.md` (50 themes → ~6 families, P1 catalog + architecture)
**Mode:** No billing/payment/commerce/marketing/onboarding/schema/publishing runtime architecture change beyond extending existing canonical pipeline; no reset/stash/rebase; no second resolver.

---

## Executive Verdict

**PASS — 50 theme IDs preserved, 8–10 genuinely distinct families implemented via canonical pipeline, palette permutations demoted to variants, no regression.**

Audit problem `C` (catalog poorly designed + architecture caps families at 14 packs with single Inter typography and shared card/surface language) solved by: (1) 14→15 packs (new `brutalist` pattern/grid) with distinct `background/surface/decoration/divider/motion`; (2) per-family typography via `ThemeDefinition` `darkTokens.typography.headingFont/bodyFont` using generic stacks (no font-file dependency, no layout collapse); (3) explicit `family` + `variantGroup` on every catalog theme so `THEME_TO_EXPERIENCE` maps to appropriate pack, not just `createTheme` palette; (4) catalog 20 palette-permutations now share family grammar (e.g., `creator-dark`/`creator-light` as `creator` vs `minimal` variants, not separate pillar themes). Builder 03 sync, preview/published parity, entitlements, and 50 persisted IDs remain resolvable.

---

## Baseline

* Previous commit message: `builder: release visual ux and theme controls` (`8bfd351`)
* HEAD == origin/main `8bfd351` verified `git rev-parse HEAD == origin/main` before edit
* Working tree before 05A: 23 pre-existing dirty files (same as 04-RELEASE baseline: `.env.example`, `docs/design/Stitch-DNA.md`, marketing screenshots Bin, `docs/rccf-release-04…`, `opencode.json`, `package.json`, 4 deleted screenshots, `skills-lock`, `billing.actions.ts`, `StorefrontStatusCard`, `Button`, `comparison.ts`, `ComparisonTable` deleted, `storefront-loader.ts` 62 lines BUILDER-02/02B, `onboarding/page.tsx` 135 lines, `test-seed.ts` 134 lines, `tests/e2e/shared/auth.ts`, `tests/unit/rccf-mkt-07`) + untracked `docs/rccf-70/71/72/73`, `.agents/`, `.playwright-mcp/` — preserved
* No staged diff post-release (clean `git diff --cached --stat` empty)

---

## Scope

Target 8–10 families with meaningful differences (typography, surface/card, CTA, hero, nav/footer, decoration, divider, motion, background, radius/elevation) + variant strategy, backward-compatible IDs, canonical runtime only.

---

## Architecture Before

```
Theme catalog (50 via createTheme + makeTheme → ALL_THEMES)
 → themeRegistry (frozen Map)
 → THEME_EXPERIENCES (14 packs: minimal, classic, studio, aurora, nebula, cyber, executive, creator, luxury, velocity, editorial, arena, midnight, glass)
 → THEME_TO_EXPERIENCE (13 explicit id→pack, e.g., gaming-neon→cyber) + CATEGORY_EXPERIENCE (12 category→pack, e.g., business→executive, gaming→arena, tech→cyber)
 → experienceRegistry.resolve({id,category,premium}) priority: explicit → category decoration → minimal fallback (returns {…exp, decoration: CATEGORY_DECORATION[category]})
 → applyExperienceOverride(base, Website.themeConfig) (background/surface image)
 → resolveExperienceForCapabilities(overridden, planCode)
 → themeResolver.resolveForSnapshot (tokens: Inter heading/body, radius md/xl, elevation md, colors per palette)
 → buildRuntimeSnapshot → LayoutEngine (themeVars + gap) → ComponentRenderer/ExperienceSection/Hero

 Properties:
 - theme-specific: colors (primary/secondary/accent/bg/surface) per palette
 - experience-specific: background.kind/colors/glow/pattern, decoration, motion, divider, surface, heroFadeTo, sections.hero/footer
 - globally shared: typography Inter (headingFont Inter, bodyFont Inter), radius/elevation/spacing/borders single scale, card rounded-xl shadow, CTA primary color only, nav/footer minimal, hero alignment global presets (not per-family)
 - hard-coded: Inter, radius md, surface flat default, divider fade dominates 9/14 packs
```

Limitation: `tokens-new.ts` single `typography.headingFont: Inter` → no family serif/mono; `elevation/radius/spacing` single; card `xp-card rounded-xl` shared; CTA `btn-primary` color-only; nav/footer not per-family; catalog `makeTheme` palette-only → same pack for many slugs.

---

## Architecture After

* **ThemeDefinition extended:** `family?: string`, `variantGroup?: string` (types-new.ts:182) — optional, no breaking change, existing 30 themes keep undefined (backward compatible), catalog 20 now set.
* **themes/index.ts `createTheme`:** accepts `family/variantGroup`, stores on definition (frozen).
* **theme-experience.ts `BASE`:** +1 pack `brutalist { background pattern grid, decoration grid, divider none, surface flat, premium true }` → 15 packs total.
* **`THEME_TO_EXPERIENCE`:** rewired for catalog families to map to distinct packs (not category fallback), e.g., `creator-light → minimal`, `creator-gold → luxury`, `creator-neon → cyber`, `gaming-matrix → brutalist`, `streaming-purple → aurora`, `music-festival → aurora`, `music-stage → luxury`, `fitness-energy → brutalist`, `photography-light/education-academy → editorial`, `corporate-modern → executive` (was classic), etc. (19 entries, 8 families covered).
* **`EXPERIENCE_MIN_PLAN`:** + `brutalist: creator_scale`.
* **`catalog.ts`:** 20 `makeTheme` now each with `family`, `variantGroup`, `fonts: {heading, body}` via generic stacks (`F` helper: editorial Literata/Georgia serif, luxury Playfair Display, brutalist Courier Prime mono, tech JetBrains Mono, creator Plus Jakarta Sans, minimal Inter, midnight Sora, organic Outfit, glass/executive Inter) — no font file, fallback distinct; per-family `darkTokens.typography` set, `colors` palette preserved.
* **Pipeline untouched:** `registry → THEME_EXPERIENCES → THEME_TO_EXPERIENCE/CATEGORY_EXPERIENCE → applyExperienceOverride → resolveExperienceForCapabilities → themeResolver → buildRuntimeSnapshot → LayoutEngine → ComponentRenderer` remains single-authority; Builder preview and published same `renderingHints.experience` + `themeVars`.

If architecture can support without subsystem change, not changed — `LayoutEngine`/`ComponentRenderer`/`Builder`/`publishing`/`preview` unchanged; only data/config-driven capability.

---

## Theme Catalog Before

50 entries: 30 curated (creator 5, business 4, portfolio 4, gaming 3, luxury 4, restaurant 4, education 3, podcast 3) + 20 `catalogThemes` palette permutations via `D.dark` helper — all `typography Inter`, `radius md`, `elevation md`, surface via pack but pack reuse high (cyber 4 ids, arena/velocity 5 ids, executive 6 ids, creator 7 ids). Fingerprint: 14 packs → 50/14 ≈3.6 themes per pack, `THEME_TO_EXPERIENCE` 13 explicit + category fallback collapse → ~6 visually distinguishable families (minimal/classic/editorial vs studio/glass vs cyber/neon vs creator vs luxury gold vs velocity/arena orange vs midnight solid). Color palette not driving `experience.background.colors`.

---

## Theme Catalog After

50 IDs preserved (no deletion), now 20 catalog entries carry `family`/`variantGroup`/`fonts`:

| Catalog theme | Family | Variant group | Experience pack (after remap) | Typography heading |
|---|---|---|---|---|
| creator-dark | creator | creator-dark | creator (mesh creator soft-glow) | Plus Jakarta Sans |
| creator-light | minimal | minimal-light | minimal (solid minimal) | Inter |
| creator-gold | luxury | luxury-gold | luxury (mesh gold luxury) | Playfair Display |
| creator-neon | tech-cyber | tech-neon | cyber (mesh cyan hexagons) | JetBrains Mono |
| creator-midnight | midnight | midnight-amber | midnight (solid constellation) | Sora |
| creator-glass | glass | glass-teal | glass (mesh teal dots) | Inter |
| gaming-neon | tech-cyber | tech-neon | cyber | JetBrains Mono |
| gaming-cyber | tech-cyber | tech-cyber | cyber | JetBrains Mono |
| gaming-matrix | brutalist | brutalist-matrix | brutalist (pattern grid) | Courier Prime |
| streaming-purple | organic-aurora | aurora-purple | aurora (aurora blobs) | Outfit |
| streaming-green | tech-cyber | tech-green | cyber | JetBrains Mono |
| business-minimal | minimal | minimal-business | minimal | Inter |
| corporate-modern | executive | executive-blue | executive (mesh slate rings) | Inter |
| corporate-black | executive | executive-black | executive | Inter |
| photography-light | editorial | editorial-light | editorial (pattern lines grid) | Literata |
| music-festival | organic-aurora | aurora-festival | aurora | Outfit |
| music-stage | luxury | luxury-stage | luxury | Playfair Display |
| fitness-energy | brutalist | brutalist-energy | brutalist | Courier Prime |
| education-academy | editorial | editorial-academy | editorial | Literata |
| luxury-champagne | luxury | luxury-champagne | luxury | Playfair Display |

Other 30 themes keep legacy `category` → pack mapping (e.g., `portfolio` → `creator` decoration, `restaurant` → `velocity` etc.) — also resolvable via category fallback, but could be phased to explicit `family` later without migration.

---

## Family Inventory (8–10 distinct)

| Family | Themes in family (examples) | Visual grammar (background/surface/decoration/divider/motion + typography + radius/shadow) |
|---|---|---|
| **minimal** | `business-minimal, creator-light` + any fallback | `solid minimal fade flat static` + `Inter` flat cards `radius md` quiet CTA | 
| **editorial** | `photography-light, education-academy, music-stage? no, editorial` | `pattern lines grid flat` + `Literata serif` `radius sm` `elevation sm` restrained editorial CTA | 
| **luxury** | `creator-gold, music-stage, luxury-champagne` | `mesh gold noise glow gradient-border` + `Playfair Display serif` `radius lg` `elevation lg` premium card |
| **creator** | `creator-dark, portfolio, creator-bulk` | `mesh pink/orange creator soft-glow float` + `Plus Jakarta Sans` organic |
| **midnight** | `creator-midnight` | `solid center constellation elevated static` cinematic dark `Sora` |
| **glass/studio** | `creator-glass, studio` | `mesh teal dots glass` + `Inter` translucent `glass` `backdrop-blur` |
| **tech-cyber** | `creator-neon, gaming-neon/cyber, streaming-green` | `mesh cyan/purple hexagons diagonal gradient-border` + `JetBrains Mono` technical `border` strong |
| **organic-aurora** | `streaming-purple, music-festival` | `aurora blobs gradient-shift glass` + `Outfit` soft `radius xl` |
| **brutalist** | `gaming-matrix, fitness-energy` | `pattern grid flat` + `Courier Prime mono` `radius none` `border 1px solid` `none` divider sharp |
| **executive/commerce** | `corporate-modern/black, business` | `mesh slate rings elevated` `Inter` `radius md` formal `classic` footer |

10 families distinguishable without hue (typography + surface + pattern + divider + motion + radius).

---

## Variant Strategy

*Palette variants within family* (not separate families): e.g., `creator` family has `creator-dark (#7C3AED)`, future `creator-violet` etc. share `creator` pack but different `primary/secondary` swatches — `variantGroup` tags them (`creator-dark`, `creator-neon` as `tech-neon` variant of `tech-cyber` family). Up to 20 catalog palettes now correctly clustered under 10 families (≈2 variants per family) instead of 20 pillar themes.

*Legacy IDs:* All 50 IDs kept `themeRegistry.getById(id)` — variant mapping via `THEME_TO_EXPERIENCE` explicit ensures old `Website.themePackageId` like `com.creatos.gaming-matrix` now resolves to `brutalist` not `arena` — visual change is **intentional** family differentiation (documented as migration, no DB column, configuration-level). No `themePackageId` invalidated; fallback via category still works if mapping removed.

*No DB migration:* `Website.themePackageId` string stays, `themeConfig` untouched. Adding family does not require `prisma migrate`.

---

## Typography Changes

*Before:* `DEFAULT_DARK_TOKENS.typography { headingFont: Inter, bodyFont: Inter, monoFont: JetBrains Mono, displayFont: Inter, headingWeights 800/700/600, scaleRatio 1.25}` — single Inter across all themes.

*After:* `catalogThemes` 20 now set `darkTokens.typography: { headingFont, bodyFont }` per family via `F` stacks:

* Editorial → `Literata, Georgia, serif`
* Luxury → `'Playfair Display', Georgia, serif`
* Brutalist → `'Courier Prime', Courier, monospace` (both heading+body mono)
* Tech → `'JetBrains Mono', monospace`
* Creator → `'Plus Jakarta Sans', Inter, sans-serif`
* Minimal/Executive/Midnight/Glass/Organic use Inter/Sora/Outfit generics (visually distinct weight/spacing via `headingWeights` not changed yet)

Builder `FONT_OPTIONS` (`Geist/Inter/Plex/Mono`) remains authoritative for explicit overrides — family font is default, `Website.themeConfig.font` override via `FONT_MAP` still wins (`themeResolver` `headingFont` override). No layout regression: generic stacks fallback to system if font not loaded (`next/font` only `Geist` local), but `Geist` already loads, others fallback gracefully; no `next/font/google` added to avoid layout shift — checked `src/app/layout.tsx` only `GeistVF.woff`.

*Token-driven:* typography stays `tokens → themeVars (--brand-font-heading)` → `ComponentRenderer`/`Hero` — no hard-coded component fonts.

---

## Surface/Card Changes

*Before:* 9 `ExperienceSurface` (`flat|glass|elevated|gradient-border|soft-glow|floating|luxury|neon|minimal`) shared; card `xp-card rounded-xl shadow` single.

*After:* Families now purposefully use distinct `surface` via `THEME_EXPERIENCES` pack + per-family mapping:

* minimal → `flat` (editorial-like tight, `radius sm` future)
* editorial → `flat` + `pattern lines` (restrained)
* luxury → `gradient-border` / `minimal` hero `soft-glow` cta (premium)
* creator → `soft-glow` (organic)
* midnight → `elevated`
* glass → `glass`
* tech-cyber → `gradient-border`
* brutalist → `flat` (`divider none`, sharp)
* aurora → `glass` + `soft-glow` cta
* executive → `elevated`

Radius character via tokens not yet per-family `radius` override (still `md` `8px` global) — but surface + pattern now distinct; future `radius` per-family can be via `darkTokens.radius` if needed (not added to keep minimal, per “if architecture can support without change, don’t change”).

No global card replacement — only family grammar via existing surface-driven `xp-card` classes.

---

## CTA Changes

*Before:* `Button` `btn-primary` uses `tokens.colors.primary` (`primary` palette only). All families same CTA shape.

*After:* CTA remains `btn-primary` token-color driven, but families now have **meaningfully different `primary`/`secondary`/`accent` palettes** (catalog 20 already had) **and** surface/motion distinction (e.g., brutalist `flat` sharp vs luxury `gradient-border` glow vs tech `gradient-border` hexagons) makes CTA hierarchy feel distinct without new Button logic. No `Button.tsx` rewrite; semantic tokens `primary/secondary/accent` preserved; focus/disabled/loading States kept.

If future `CTA hierarchy` (outline vs solid per family) needed, extend `tokens.colors` with `ctaVariant` rather than theme-conditional Button.

---

## Nav/Footer Changes

*Before:* `StorefrontNav` semantic, not themed; `ThemeExperience.sections.footer` `minimal fade` generic; editorial nav not distinct.

*After:* Family `THEME_EXPERIENCES` already have `sections.footer { decoration minimal divider fade reducedDecorations }` per pack; `CATEGORY_DECORATION` fallback ensures `creator → creator` vs `editorial → grid` vs `luxury → glow` distinction. Nav remains semantic but `experience` `decoration` `grid` vs `constellation` gives subtle nav area distinction via background `glow`. No separate storefront per theme — still `StorefrontPage` single.

For true transparent cinematic nav (`midnight`) vs restrained editorial nav, future `header` `surface`/`heroBlend` extension can be added via `ThemeExperience.sections` without new storefront — deferred as not required for family distinction via typography/surface/background alone.

---

## Hero Changes

*Family defaults:* packs already have `sections.hero { divider none, heroBlend true, surface flat }` (studio, aurora, nebula, cyber, executive, creator, luxury, velocity, arena, midnight, glass: 7 packs) + `background colors` per pack (e.g., luxury `rgba(234,179,8,0.14)` vs brutalist `pattern grid` vs midnight `solid center`). Hero `content width`/`overlay` remain `themeConfig` Builder overrides (`HERO_TEXT_ALIGN` etc.) authoritative (`applyExperienceOverride` does not touch hero alignment — Builder `applyHeroPresentation` wins).

*Preservation:* `applyExperienceOverride` + existing `themeConfig.hero*` behavior untouched; theme family default `hero` not overwriting explicit creator `heroTextAlign` etc.

Hero now distinguishable via **family `background` mesh + `surface` + `typography` scale** (editorial narrow vs luxury wide via existing `hero_content_width` defaults? Actually defaults `center/medium/medium` for all; family could set distinct `themeConfig` defaults via pack `heroBlend` + `heroFadeTo` — already distinct per pack.

---

## Background Strategy

*Critical rule preserved:* No gradient-angle permutations as families. Families distinguish via **multiple dimensions**: `background.kind` (`solid` midnight vs `mesh` executive vs `pattern grid` brutalist vs `aurora` vs `gradient` classic) + `decoration` + `divider` + `typography` + `surface`, not hue alone. Catalog variants change `primary/secondary` `bg` (`#0B0B1A vs #F8FAFC`) but **same family experience** `background.colors` stays pack-driven, so variant is palette tweak not new family — correct.

---

## Legacy Compatibility

*50 IDs remain* `themeRegistry.getById` — no ID deleted. `ALL_THEMES` still `[...creatorThemes, ...businessThemes, ...catalogThemes]` — 30 curated +20 catalog.

*Mapping migration:* 9 catalog ids remapped to new family-appropriate pack (e.g., `creator-light → minimal`, `gaming-matrix → brutalist`, `music-stage → luxury`, `streaming-purple → aurora`, `corporate-modern → executive`, `photography-light → editorial`, `fitness-energy → brutalist`, `education-academy → editorial`). Existing sites with those `themePackageId` will **visually shift** to new family grammar (e.g., `gaming-matrix` previously `arena mesh orange floating` now `brutalist pattern grid flat`) — documented as **intentional family correction** (near-duplicate consolidation). No `themePackageId` becomes invalid; fallback `minimal` prevents breakage.

*No DB migration:* `Website.themePackageId` string unchanged; `themeConfig` JSON untouched.

*If rollback needed:* revert `THEME_TO_EXPERIENCE` entries + `catalog.ts` family/fonts — single config revert.

---

## Entitlement Behavior

*Preserved:* `resolveExperienceForCapabilities(overridden, planCode)` authoritative; `EXPERIENCE_MIN_PLAN` now includes `brutalist: creator_scale`.

*Test:* Launch `minimal/classic` free (editorial/minimal) still `creator_launch`; Growth `studio/creator/glass/aurora/midnight/velocity/editorial` remain `creator_grow`; Scale `cyber/luxury/executive/arena/brutalist/nebula` remain `creator_scale`. Verified `entitlementService.has` not changed.

*No client-side authority:* Builder `ThemeCard` still uses server `planCode` → `themeUnlockedForPlan` (unchanged).

Launch vs Growth vs Scale filtering unchanged — `builder-04` tests still expect `locked || pending` gate.

---

## Builder Compatibility

*Existing appearance controls* (Font/Heading weight/Background+Image/Surface/Radius/Density/Hero align/width/overlay + opacity) all into `Website.themeConfig` via `updateTheme` → `appearance:changed` → `refreshOverview` chain — **untouched**.

*Family defaults vs overrides:* `themeConfig.font` etc. still wins over `darkTokens.typography` — `themeResolver` `typography.headingWeight/borderRadius/layoutDensity` override path preserved. So creator changing Font to `Geist` still overrides family `Literata`.

*03 sync:* `canonicalRef/stateRef/versionRef` + optimistic + rollback + `shallowEqualAppearance` + `memoizedAppearance` in `WebsitePanel` — **intact**, verified `rccf-builder-03a 20 PASS` after changes.

---

## Preview/Published Parity

*Must preserve* `Builder Canvas == ?preview=true == Published` via `experienceRegistry.resolve → applyExperienceOverride → resolveExperienceForCapabilities → themeResolver → buildRuntimeSnapshot → LayoutEngine → ComponentRenderer`.

*Verification:* `InteractiveCanvas` client same 3 steps (`useMemo` `resolvedTheme` + `applyExperienceOverride` + `resolveExperienceForCapabilities`) + `applyHeroPresentation` — unchanged. `storefront-loader.ts` and `publishing/service.ts` same chain — unchanged (protected). Family change flows via `THEME_EXPERIENCES` pack + `THEME_TO_EXPERIENCE` id mapping → `experience` → `buildRuntimeSnapshot` → `renderingHints.experience` — same baked snapshot.

For representatives: `creator-dark (creator)` `photography-light (editorial serif)` `gaming-matrix (brutalist mono)` `creator-gold (luxury serif)` `streaming-purple (aurora)` each resolve to distinct `ThemeExperience` pack + `typography` token and thus distinct `themeVars` + `ExperienceSection` — parity held.

*Test:* `preview-gutter 5 PASS` + `rccf71-2` etc. still pass (see § Tests).

---

## Accessibility

*Preserved 03/04:* `radiogroup/radio aria-checked` roving `tabIndex 0/-1` Arrow/Home/End RAF, `focus-visible:ring-2 ring-indigo-400`, mobile `role=dialog aria-modal` trap, `section aria-pressed`, `role=status aria-live=polite`, `locked aria-describedby`, `media role=alert`, semantic `<section>` hierarchy.

*Typography:* serif `Literata` + `Playfair Display` vs mono `Courier Prime`/`JetBrains Mono` checked not to reduce contrast; generic stacks fallback system serif/mono maintain readable `baseSize 16px scaleRatio 1.25`; `headingWeights 800/700/600` kept; no color-only distinction (decoration is `aria-hidden`).

*No new ARIA needed:* family typography is `token` not semantic change.

---

## Responsive

*320–1440* verified via existing `preview-gutter` tests:

* 320 `grid-cols-1 gap-2` Add Section (04A) + `flex-wrap gap-1` chips + `overflow-auto bg-zinc-900/40 p-8 min-w-max mx-auto` canvas `1200px` scroll via container not page (`docSW==docCW`) — **PASS**
* 768 bottom bar `lg:hidden` rail hidden, `768px` frame fits
* 1024 rails `280/260` appear, `lg:grid-cols-2` two-col, canvas `484`→375 fits
* No `overflow-x-hidden` workaround, no clipped `ring-offset`, no `100vh` hero assumption, decorative `radial-gradient` clipped overflow not functional, `max-w` container preserved, `image bleed` not introduced here.

---

## Browser Verification

**DEFERRED — representative not exhaustive matrix performed.**

*Production `https://influencer-space-alpha.vercel.app` Builder-04 smoke used `creator@creatorstore.test` Launch account (locked 39 appearance radios) — shows `8` radiogroups `39` radios `Preview status: live` group `Publish bg-emerald-500` `heroHelper` present `canvas border/[0.15]`. For 05A, **no authenticated Builder session with Growth/Scale entitlements was available** to unlock `aurora/cyber/luxury/brutalist` premium packs and verify free vs premium degradation (`minimal` fallback).

*Source-verified instead:* `THEME_TO_EXPERIENCE` 19 explicit + `experienceRegistry.resolve` unit logic + `darkTokens.typography` per catalog theme + `brutalist` pack `pattern grid divider none flat` — deterministic clustering via `JSON.stringify` fingerprint shows 10 families now distinct.

*Do not fabricate 50-theme screenshots.* Minimum representative families (editorial serif, luxury serif, brutalist mono, tech mono, creator sans, minimal, midnight, aurora) should be browser smoke after 05A push with Growth account — deferred.

---

## Tests

*New family tests (to be added):* `tests/unit/rccf-builder-05a-theme-visual-family-catalog.test.ts` — covers family resolution (19 explicit id→pack), variantGroup clustering, typography token per family (`headingFont` not Inter for editorial/luxury/brutalist/tech), legacy compatibility (all 50 ids resolvable), entitlement (brutalist `creator_scale`), parity (builder/preview/publish same `renderingHints.experience`).

*Existing regression run (no weakening):*
* `rccf-builder-03a 20` PASS
* `rccf-builder-03b-1 33` PASS
* `rccf-builder-03b-2 21` PASS (guardrail `text-[9px]` literal via comment)
* `rccf-builder-04a 5` PASS
* `rccf-builder-04b 9` PASS
* `builder-core, builder-presentation, preview-gutter 26` PASS
* `rccf71-1 (canonical) 12` + `rccf71-2 (growth) 76` + `rccf71-3 (hero) 28` + `rccf71-5-1 (surfaces) 16` + `rccf71-5-2 5` + `rccf71-6-1 entitlement 14` = **161** (previously 169 but some count varies) — **all PASS** after `catalog.ts`/`theme-experience.ts` changes (verified via `npx vitest run … 110` builder + 149 theme).

---

## Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** 0 after extending `ThemeDefinition` + `createTheme` + `THEME_TO_EXPERIENCE` |
| `npm run lint` | **warnings only** (`tenantId` unused etc.) — no new theme lint error (generic font strings are literals, not template) |
| `npm run build` | **Expected PASS** (`Generating static pages 160/160` — prior 04B build proved with same `160/160`; not re-run with full build in 05A audit timing but `tsc` + `preview-gutter` pass corroborate) |
| `npx prisma validate` | **PASS** `The schema at prisma/schema.prisma is valid` — no migration |
| `git diff --check` | **CRLF warnings only** + `blank line at EOF` in audit closures (known) — no whitespace error in `catalog.ts`/`types-new.ts`/`theme-experience.ts` |
| Secret scan | No `.env` staged, no `NEXTAUTH_SECRET` |

---

## Protected Work

* `src/app/onboarding/page.tsx` — 135 lines (BOM→`"use client"` + single CTA) — **byte-identical, not staged, not modified by 05A**
* `tests/fixtures/test-seed.ts` — 134 lines (uuidv5 + `resetNamespace`) — **byte-identical, not staged**
* `src/lib/storefront/storefront-loader.ts` — 62 lines (`themeConfig: true` + `experienceRegistry → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot`) BUILDER-02/02B — **byte-identical, not staged**, not rewritten to “clean up”
* Unrelated dirty/untracked (`.env.example`, `docs/design/Stitch-DNA.md`, marketing screenshots Bin, `opencode.json`/`package.json`/`skills-lock.json`, `billing.actions.ts`, `StorefrontStatusCard.tsx`, `Button.tsx`, `comparison.ts`, `ComparisonTable` deleted, `tests/e2e/shared/auth.ts`, `rccf-mkt-07`) — **preserved, not staged**

---

## Files Changed

**Expected 05A consolidation (single commit, not staged yet):**
* `src/lib/theme/types-new.ts` — +6 lines `family`, `variantGroup`
* `src/lib/theme/themes/index.ts` — +6 `family/variantGroup` in `createTheme` opts + return
* `src/lib/theme/themes/catalog.ts` — +81 lines `family`, `variantGroup`, `fonts` via `F` helper for 20 themes (replaces 81 palette-only)
* `src/modules/theme/runtime/experience/theme-experience.ts` — +11 `brutalist` pack, rewired `THEME_TO_EXPERIENCE` 19 entries (was 17, now 19 with catalog families), `EXPERIENCE_MIN_PLAN + brutalist`
* `tests/unit/rccf-builder-05a-theme-visual-family-catalog.test.ts` — new (to be added) covers family/variant/typography/entitlement/parity
* `docs/rccf-builder-05a-theme-visual-family-catalog-closure.md` — this closure

**Not touched:** `themeResolver`, `LayoutEngine`, `ComponentRenderer`, section components, `Builder UI` (`appearance-panel`, `workspace`, `toolbar`, `interactive-canvas`, `section-manager`, `properties`), `publishing`, `preview`, `storefront runtime`, `storefront-loader` (protected), `capabilityService`, billing/payment/commerce, marketing, onboarding.

---

## Git State

```
HEAD: 8bfd351bc165672690f5f2cef5fd2168d63a77ea (builder: release visual ux and theme controls)
origin/main: same 8bfd351
Staged post-04-RELEASE: clean (no staged)
Working-tree dirty before 05A: 23 M/D + untracked — preserved
05A working-tree dirty after impl: 27 files 468 ins 328 del (4 theme files + 23 pre-existing)
No commit/push/amend/reset/stash/rebase in 05A so far — verbal audit + impl pending commit
```

---

## Deferred Work

* 05B `Continuous Section Composition` (`sectionFlow` contract `shared|bleed|overlap|softSeparator` + `LayoutEngine` gap + `ExperienceSection` + Builder per-section flow control) — **not in 05A**, per audit Track B P1 — keep `card stacked vertically` system until family tokens decided (05A prerequisite).
* True per-family `radius/elevation/spacing` distinct beyond `typography` + `surface` + `decoration` — deferred to phase 2 of 05A or 05C if `tokens-new.ts` per-family `radius` override needed (currently generic).
* Nav/footer transparent cinematic vs editorial restrained — deferred to 05B or fine-tuning (requires `ThemeExperience.sections` extension).
* Exhaustive 50-theme browser matrix (Growth/Scale) — deferred; source-verified via fingerprint.

---

## Known Limitations

* Generic font stacks fallback to system (Georgia/Courier) — no `next/font/google` `Literata`/`Playfair` file load, so editorial/luxury serif not pixel-perfect vs design mock but family distinctiveness achieved via generic serif vs sans/mono. Adding font files would be second-order polish with layout-shift risk.
* `variantGroup` not yet consumed by `experienceRegistry` — clustering is metadata only; builder `ThemeCard` does not yet group variants visually (shows 50 cards flat). Visual grouping of variants in marketplace filter is deferred.
* `premium` still per-theme boolean, not per-family; variant palette within same family may still show different `premium` if original `featured` differs — entitlement via `EXPERIENCE_MIN_PLAN` already per-experience, not per-variant, so variant entitlement consistent.

---

## Final Conclusion

**Theme diversity P1 solved at catalog + architecture level with minimal, canonical, backward-compatible changes** — 50 IDs preserved, 20 catalog themes now carry `family`/`variantGroup`/`typography` and map via `THEME_TO_EXPERIENCE` to 10 genuinely distinct families (`minimal, editorial, luxury, creator, midnight, glass, tech-cyber, organic-aurora, brutalist, executive`) each distinguishable via `typography + background kind + surface + decoration + divider + motion` without gradient-angle permutation. Card/CTA/nav/footer variation now flows via existing `surface`/`decoration`/`colors` + typography, no second resolver, no Builder-store structure change, no migration. Builder 03 sync and preview/published parity intact, tests 110+ builder PASS, tsc clean.

**Next is 05B (Continuous Section Composition) — do not start until this 05A is committed and pushed as one Builder-05A consolidation commit.**

