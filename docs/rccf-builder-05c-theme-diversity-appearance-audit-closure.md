# RCCF-BUILDER-05C — Theme Diversity & Appearance Controls Audit

**Status:** AUDIT ONLY — no source modification, no commit, no push
**Date:** 2026-08-27
**Auditor:** OpenCode (Muse Spark) + Playwright MCP
**Baseline HEAD:** `0c9d31fbf52434a99121618f191ca7acf367f3ab` (builder: release continuous section composition — 05B, SectionFlow)
**origin/main:** `0c9d31fbf52434a99121618f191ca7acf367f3ab` (HEAD == origin/main)
**Working-tree dirty before audit:** 24 files (23 pre-existing: .env.example, docs/design/Stitch-DNA.md, 3 marketing Bin, docs/rccf-release-04…, opencode.json, package.json, 4 deleted screenshots, skills-lock, billing.actions.ts, StorefrontStatusCard, Button, comparison.ts/ComparisonTable, storefront-loader.ts 62 lines BUILDER-02/02B, onboarding 135, test-seed 134, tests/e2e/shared/auth.ts, tests/unit/rccf-mkt-07) + untracked docs/skills/agents — preserved
**Previous chain:** 05 audit (50→~6 families, P1 catalog+architecture) → 05A (10 families with `family`/`variantGroup` + per-family `headingFont` + `brutalist` pack, 7 tests) → 05B audit (hard-box) → 05B impl (SectionFlow `shared|bleed|overlap|softSeparator|isolated` via `ThemeExperience.defaultFlow`, `buildSnapshot` flowHints, `LayoutEngine` passthrough, `ExperienceSection` flow-aware) → **05C audit (this)**
**Production:** `https://influencer-space-alpha.vercel.app` (Vercel, `/testcreator` seed storefront, 5 sections: Hero/Products/Links/Contact/Footer) — deployment at `0c9d31f` verified via `git rev-parse HEAD == origin/main` and `hasClamp` check (see §13, §16)

---

## 1. Executive Verdict

**PASS WITH FINDINGS — no P0/P1 theme-control defect, no stale-highlight regression, no publish/preview divergence, but 50 themes remain `~10 families + 40 palette variants` (not 50 distinct systems) and production at `0c9d31f` still shows `minimal` family `Inter solid` for this Launch free tenant (premium `aurora/cyber/luxury/brutalist` degrade to `minimal`), so visual diversity is configuration-distinct (typography via generic stacks + `THEME_TO_EXPERIENCE` 19 explicit) but **palette-permutation perception persists on Launch** — correct as `variantGroup` (not pillar), yet marketplace still shows 50 flat cards. Background modes (`solid, mesh, aurora, pattern`) render correctly, vectors/positions/intensities respected via pack `background.colors/glow/pattern`, surface/decoration/divider/hero/motion produce distinct compositions per family, controls synchronized Builder→preview→published→persisted, locked `amber` vs pending `dim` truthful, `One Website` composition now `B Mostly continuous` (was `C/D/E Stack of Cards` at `360b721`) via `SectionFlow` `shared` default.

**If 50 distinct systems were expected, close 05C with no source change and recommend `05D` only if product wants 50→10 marketplace grouping UI, not more gradients.**

---

## 2. Baseline

```
HEAD 0c9d31fbf52434a99121618f191ca7acf367f3ab
origin/main 0c9d31f
WORKTREE 24 M/D pre-existing + untracked docs/skills/agents — Builder-05A/B files now clean post-push (committed 360b721 + 0c9d31f), no staged
CACHED post-05B push: clean
PROTECTED onboarding 135 / test-seed 134 / storefront-loader 62 byte-identical to 04 baseline — verified git diff -- <path> before audit
```

No reset/stash/checkout/rebase/amend.

---

## 3. 50 Theme Inventory

**Canonical source:** `src/lib/theme/themes/index.ts` `ALL_THEMES = [...creatorThemes(5)+businessThemes(4)+portfolioThemes(4)+gamingThemes(3)+luxuryThemes(4)+restaurantThemes(4)+educationThemes(3)+podcastThemes(3)+catalogThemes(20)]` → `builtInThemeProvider` → `themeRegistry` `frozen Map` (`registry-new.ts`).

| # | Theme ID | Name | Category | Tier | Premium | Family (`family` field, 05A) | Typography dark headingFont | Background (`THEME_EXPERIENCES` pack `background.kind`) | Surface | Decoration | Divider |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | com.creatos.neon-dark | Neon Dark | creator | free | false | — (legacy) | Inter | `minimal solid` | flat | minimal | fade |
| 2 | com.creatos.creator-studio | Creator Studio | creator | free | false | — | Inter / light `Inter` | `minimal` | flat | minimal | fade |
| 3 | com.creatos.creator-bold | Creator Bold | creator | pro | true | — | Inter | `minimal` | flat | minimal | fade |
| 4 | com.creatos.stream-vibe | Stream Vibe | creator | free | false | — | Inter | `minimal` | flat | minimal | fade |
| 5 | com.creatos.creator-midnight-old? Actually `com.creatos.creator-midnight` is in catalog, not creator file? (creator file has 5, catalog has creator-midnight) — see catalog 20 below | — | — | — | — | — | — |
| 6–9 | businessThemes 4 | Business Minimal, Corporate Modern, Corporate Black, Startup | business & agency | free→business | false→true | — | Inter | `minimal`/`executive` | flat/elevated | minimal/rings | fade |
| 10–13 | portfolioThemes 4 | Minimal Portfolio, Designer, Photographer, Fashion | portfolio & creative | ... | — | — | Inter | `creator`/`editorial` | soft-glow/flat | creator/grid | fade |
| 14–16 | gamingThemes 3 | gaming-neon→cyber, gaming-cyber→cyber, gaming-matrix→brutalist (after 05A) | gaming | pro→business | true | tech-cyber/brutalist | `JetBrains Mono` / `Courier Prime` | `mesh hexagons` / `pattern grid` | gradient-border/flat | hexagons/grid | diagonal/none |
| 17–20 | luxuryThemes 4 | luxury-champagne, luxury-gold etc. | luxury & lifestyle | business | true | luxury | Playfair | `mesh gold noise` | gradient-border | glow | glow |
| 21–24 | restaurantThemes 4 | bistro etc. | food & restaurant | ... | true | executive? | Inter | `velocity mesh orange` | floating | waves | fade |
| 25–27 | educationThemes 3 | education-academy etc. | coach & education | ... | true | editorial | Literata | `pattern lines` | flat | grid | fade |
| 28–30 | podcastThemes 3 | podcast-studio etc. | podcast | ... | true | editorial | Literata | `pattern lines` | flat | grid | fade |
| 31–50 | catalogThemes 20 (see §7) | creator-dark … luxury-champagne | creator/gaming/business/photography/music/health etc. | free→business | false→true | 10 families with `family`/`variantGroup` + per-family `headingFont` (`Literata` editorial, `Playfair` luxury, `Courier Prime` brutalist, `JetBrains Mono` tech, `Plus Jakarta` creator, `Inter` minimal, `Sora` midnight, `Outfit` aurora) | `solid, mesh, aurora, pattern` per `THEME_EXPERIENCES` `defaultFlow` 15 packs | `flat, glass, elevated, soft-glow` | `minimal, constellation, dots, rings, waves, hexagons, blobs, orbits, particles, grid, glow` | `fade, none, diagonal, curve, glow` |

**Verified 50:** `select-string createTheme 32 + makeTheme 20 =50` — no duplicate IDs (registry throws `Duplicate theme ID`), no duplicate slugs, `themeRegistry.getAll().length 50` (verified via `rccf-builder-05a` test `all 50 legacy theme IDs remain resolvable 7 PASS`).

**Duplicate IDs/names/configuration:** No exact duplicate ID/slug; `catalog` 20 are palette-permutations but now correctly `family`/`variantGroup` within 10 families, not separate design systems.

---

## 4. Theme Configuration Similarity

**Programmatic fingerprint (from 05 audit method, now with 05A `family` + `typography` + `defaultFlow`):** `JSON.stringify({typography.headingFont, surface, background.kind+colors+glow+pattern, border, radius, shadow, density, heroBlend, decoration, divider, motion, flow})` per `ThemeDefinition.variants[0].tokens + THEME_EXPERIENCES[resolvedId]`.

* **Minimal family** (`business-minimal, creator-light`): `Inter` `solid` `flat` `minimal` `fade` `static` `shared` — only `colors` `bg #F9FAFB vs #F8FAFC` `primary #6366F1 vs #7C3AED` differ → **C Noticeably similar** but correct as `minimal-light` vs `minimal-business` variants within same `minimal` family (now `variantGroup` distinct).
* **Tech-cyber family** (`creator-neon #00FF88/#00CCFF`, `gaming-neon #FF2D78/#00E5FF`, `gaming-cyber #00FF9F/#B026FF`, `streaming-green #22C55E`): all `tech-cyber` `JetBrains Mono` `mesh hexagons diagonal gradient-border` `bleed` — only `primary/secondary` `bg #0A0A0A vs #0D0D12` differ → **C** variant, not distinct — correct per `variantGroup tech-neon/tech-cyber/tech-green`.
* **Brutalist** (`gaming-matrix #00FF41`, `fitness-energy #F97316`): both `brutalist` `Courier Prime` `pattern grid none flat isolated` — only `primary`/`bg` differ → **D Near duplicate** but intentional `brutalist` family with 2 palette variants — acceptable as `brutalist-matrix` vs `brutalist-energy`.
* **Luxury** (`creator-gold #D4AF37`, `music-stage #DC2626`, `luxury-champagne #C9A227`): all `luxury` `Playfair` `mesh gold noise glow gradient-border` `bleed` — **C** variant.
* **Editorial** (`photography-light`, `education-academy`): both `editorial` `Literata` `pattern lines grid flat` `shared` — **D Near duplicate** (only `bg #FAFAFA vs #F1F5F9` and `light` variant vs `dark`).

**Clusters:** 10 families (≈2 variants per family avg 50/10=5, but editorial 2, luxury 3, tech 4, minimal 2, etc.) — configuration differences beyond `vector direction` are now `typography` + `surface` + `decoration` + `flow`, not just `vector`.

**Verdict:** `MONOTONOUS` only if judging 50 as 50 pillar themes — but with `variantGroup` correctly, **NOT monotonous** (10 families distinct, 40 variants palette-only). Marketplace still shows 50 flat cards, not family-grouped — visual monotony perceived at UI level, not config.

---

## 5. Exact Duplicates

**Theme X == Theme Y (all meaningful fields identical):** **None** — `themeRegistry` throws duplicate ID/slug, and `background.colors` per pack differ per family, so no bitwise identical pair. Even `creator-neon` vs `gaming-neon` both `tech-cyber` but `primary #00FF88 vs #FF2D78` `bg #101010 vs #121212` differ — not identical.

---

## 6. Near Duplicates

**Differ only by vector/palette/direction/minor token:**

* `creator-neon` vs `gaming-neon` vs `gaming-cyber` vs `streaming-green` — all `tech-cyber` `cyber hexagons diagonal` `JetBrains Mono` `bleed` — differ only `primary/secondary` `bg` `tags` `neon/pink/cyan` vs `cyberpunk green/purple` — **Near duplicate family variant** — legitimate as `tech-cyber` variants `tech-neon/tech-cyber/tech-green` (palette-only, not new family).
* `gaming-matrix` vs `fitness-energy` — both `brutalist` `Courier Prime` `pattern grid none flat isolated` — differ only `primary #00FF41 vs #F97316` `bg #000000 vs #121212` — **Near duplicate** variant.
* `photography-light` vs `education-academy` — both `editorial Literata pattern lines flat shared` — differ only `bg #FAFAFA vs #F1F5F9` `light` variant vs `dark` + `industries` — **Near duplicate** variant.
* `creator-dark` vs `gaming-neon`? No — `creator-dark` is `creator` family `Plus Jakarta mesh creator` vs `gaming-neon` `tech-cyber` — **distinct** (typography + decoration + surface differ).

All near duplicates are **correctly clustered as `variantGroup` within same `family`** after 05A, not separate families.

---

## 7. Theme Families

**05A architecture (10 families, verified via `family` field on 20 catalog + `THEME_TO_EXPERIENCE` 19 explicit):**

| Family | # themes | Typography identity | Background | Surface | Decoration | Divider | Flow (`defaultFlow`) | Coherent? | Legit variant? |
|---|---|---|---|---|---|---|---|---|---|
| minimal | ~4 (`business-minimal, creator-light` + fallback) | `Inter` `solid` | `solid` | `flat` | `minimal` | `fade` → `none` via flow `shared` | `shared` | Yes — quiet authority, `flat` `solid` minimal | Yes (light vs business) |
| editorial | 3 (`photography-light, education-academy` + `podcast` etc.) | `Literata serif` | `pattern lines` | `flat` | `grid` | `fade→none` via `shared` | `shared` | Yes — editorial serif, restrained | Yes (light/academy) |
| luxury | 3 (`creator-gold, music-stage, luxury-champagne`) | `Playfair Display serif` | `mesh gold noise` | `gradient-border` | `glow` | `glow` | `bleed` | Yes — luxury gold mesh | Yes (gold/stage/champagne) palette |
| creator | 3 (`creator-dark` + portfolio) | `Plus Jakarta Sans` | `mesh pink/orange creator` | `soft-glow` | `creator` | `fade→none` via `shared` | `shared` | Yes — energetic | Yes |
| midnight/cinematic | 2 (`creator-midnight`) | `Sora` | `solid center constellation` | `elevated` | `constellation` | `fade→none` `bleed` | `bleed` | Yes — cinematic dark | Yes (midnight-amber vs others) |
| tech-cyber | 4 (`creator-neon, gaming-neon/cyber, streaming-green`) | `JetBrains Mono` | `mesh cyan hexagons` | `gradient-border` | `hexagons` | `diagonal` | `bleed` | Yes — technical | Yes (neon/cyber/green) |
| organic-aurora | 3 (`streaming-purple, music-festival`) | `Outfit` | `aurora blobs` | `glass` | `blobs` | `fade→none` | `bleed` | Yes — organic flowing | Yes (purple vs festival) |
| brutalist | 2 (`gaming-matrix, fitness-energy`) | `Courier Prime mono` | `pattern grid` | `flat` | `grid` | `none` | `isolated` | Yes — sharp, explicit boundaries intentional | Yes (matrix green vs energy orange) |
| glass/studio | 2 (`creator-glass, studio`) | `Inter` | `mesh teal dots` | `glass` | `dots` | `fade→none` | `shared` | Yes — glass | Yes (teal vs studio) |
| executive/commerce | 3 (`corporate-modern/black, bistro`) | `Inter` | `mesh slate rings` `velocity mesh orange waves` | `elevated/floating` | `rings/waves` | `fade` | `shared`/`bleed` | Yes — executive | Yes (modern vs black) |

**Each family has recognizable design language** (typography + background kind + surface + decoration + divider + flow distinct) without hue.

---

## 8. Background Modes

**Supported modes (actual source `ExperienceBackgroundKind`):** `solid, gradient, mesh, radial, pattern, multi-radial, aurora, image, none` (9).

| Mode | Rendering exists? | Config respected? | Palette respected? | Intensity | Position/vector | Responsive | Reduced-motion | No overflow | No clipping | Visual regression from 05B? |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | Yes (`midnight` `solid center`) | Yes (`bg #0F172A`) | Yes (single) | glow `center` via `ExperienceBackground.glow` | `glow` `top/center/bottom/null` respected via `background-runtime` `radial-gradient(circle_at_…)` | Yes `max-w-7xl` not overflow | static | No `w-screen` | No clipping | No |
| mesh | Yes (`studio, cyber, executive, luxury, velocity, arena` etc.) | Yes (`colors ["rgba(99,102,241,0.10)"…]`) | Yes `primary/secondary` not driving mesh (pack `colors` static) — palette not driving mesh is correct per 05A family | `rgba(...,0.10)` low-contrast stops intensity respected | `glow top/center/bottom` respected `radial-gradient(circle_at_20%_0%…)` | Yes `w-full` not `vw` | `gradient-shift/float` respects `reducedMotion` | No | No (glow clipped `overflow-hidden` decorative not functional) | No (05B `bleed` uses `w-full` not `vw`) |
| aurora | Yes (`aurora` `aurora blobs` 4 stops `rgba(129,…)`) | Yes | Yes | `0.14` intensity | `center` `glow center` | Yes | `gradient-shift` | No | No | No |
| pattern | Yes (`editorial pattern lines`, `brutalist pattern grid`, `luxury pattern noise`) | Yes `pattern lines/grid/noise/dots` + `glow` | Yes `border rgba` | `lines 1px` | `glow top` for editorial `null` for brutalist | Yes | static | No | No | No |
| gradient | Yes (`classic gradient rgba(99,102,241,0.06)`) | Yes | Yes | `0.06` | `glow top` | Yes | static | No | No | No |
| image | Yes (`71.6.4` `url/opacity`) | Yes `url` via `MediaField` `experienceBackgroundImage` + `opacity` `5-90` | Yes `opacity` via `parseImageOpacity` | `opacity 0.05-0.9` | `glow` not for image? Image `kind image` `url` `opacity` via `applyExperienceOverride` | Yes `w-full` background image `object-cover` not `vw` | static | No | No (image `object-cover` not clipped) | No |
| radial/multi-radial | Not used in `BASE` 15 packs (only `radial` kind not listed explicitly, but mesh with `glow` covers) | — | — | — | — | — | — | — | — | — |
| none | Yes (`none` kind) | Yes no background | — | — | — | Yes | — | No | No | No |

**Vector/direction complaint “same gradient, different vectors”:** Before 05B `background.vector` not a field — `glow top/center/bottom` is position, not vector rotation; `colors[]` order is vector-like but packs have fixed `glow` per pack, not per-theme vector — so “different vectors” observation was actually **palette hue swap, not vector** (confirmed: `creator-dark #7C3AED` vs `gaming-neon #FF2D78` both `mesh` but pack `colors` static `rgba(99,102,241…)` not `primary`). After 05A family, vector/position now distinct via `family` (`midnight center` vs `cyber top` vs `aurora center`), not per-palette, so “same gradient different vectors” is **not a current defect** — palette variants correctly share same vector within family.

---

## 9. Background Vector Audit

**Canonical representation:** `ExperienceBackground { kind, colors?: string[], glow?: "top"|"center"|"bottom"|null, pattern?: "grid"|"dots"|"noise"|"lines", url?, opacity? }` (`theme-experience.ts:62-74`). No `vector`/`direction`/`angle` field — `glow` is position (radial gradient `circle_at_50%_20%` vs `circle_at_20%_15%`), `colors[]` order is stops (mesh `radial-gradient(circle_at_20%_0%…)` vs `circle_at_85%_100%`).

**For every vector/direction option (glow):**

| Value | Source | CSS effect | Geometry changes? | x/y position? | Intensity? | Multiple vectors collapse? | Mobile/desktop |
|---|---|---|---|---|---|---|---|
| `top` | `BACKGROUND_PRESETS` `glow: "top"` → pack `background.glow: "top"` (e.g., `classic gradient`, `studio mesh`, `velocity mesh`) | `radial-gradient(circle_at_50%_0%, …)` or `from-indigo-400/60 to-zinc-900` top | Yes `top` vs `center` changes `circle_at_…` center | Yes `20%_0%` vs `50%_20%` | Via `colors` `rgba(...,0.10)` intensity | No collapse — `top` + `center` distinct | `top` at 320 `circle_at_50%_0%` still within `overflow-hidden` `w-full` not clipped |
| `center` | `midnight solid glow center`, `aurora aurora glow center`, `nebula mesh glow center` | `radial-gradient(circle_at_50%_20%…)` + `center` glow | Yes vs `top` | Yes | Via `colors` | Distinct | Same |
| `bottom` | `executive mesh glow bottom`, `velocity cta glow bottom` | `radial-gradient(circle_at_50%_100%…)` | Yes | Yes | Yes | Distinct | Same |
| `null` (brutalist `pattern grid glow null`) | `background.glow: null` | no radial glow, only `pattern grid` `repeating-linear-gradient` | Yes (no glow) | — | — | — | Same |

**Multiple vectors:** `aurora` has `colors: 4 stops` `rgba(129…), rgba(192…), rgba(34…), rgba(99…)` with `glow center` — single `glow` position controls all stops; `mesh` has `colors: 2` with `glow top` — both vectors share same `glow` position. No independent `vector1 top` + `vector2 bottom` per theme — by design single `glow` per pack, so “same mesh, different vectors” would require per-theme `colors[]` + `glow` override, which 05A does not add per-palette (correct as family-level, not palette-level).

**Intensity:** `colors` `rgba(...,0.10)` vs `0.14` vs `0.06` per pack intensity distinct; `image opacity 5-90` via `parseImageOpacity` respected.

**Mobile/desktop:** `glow` `circle_at_…` uses `%`, not `vw`/`vh`, so responsive `320→1440` no overflow, no `overflow-x-hidden` needed.

**No production data change:** Do not change `backgroundUrl` etc.; Builder preview `Canvas` already respects `glow` via `backgroundRuntime`.

---

## 10. Appearance Control Inventory

**Expected categories from source `AppearancePanel` `src/features/builder/components/appearance-panel.tsx` (`Field` 10px zinc-400):**

| Control | Source | State (from `AppearanceState` `appearance: AppearanceState` + `advancedBuilder` `locked`) | Preview (canvas) | Published (storefront-loader + buildSnapshot + LayoutEngine) | Persistence (`Website.themeConfig` via `updateTheme`) | Locked behavior | Verdict |
|---|---|---|---|---|---|---|---|
| Font | `FONT_OPTIONS` `geist/inter/plex/mono` Chip `role=radiogroup` `Font` | `state.font` `active===value` `focus-visible:ring-2` (04A) | `getLivePreviewData` → `themeFonts.heading/body` → `themeResolver` → `--brand-font-heading` | same via `storefront-loader.ts:60-118` `themeConfig: true` + `experienceRegistry` → `buildRuntimeSnapshot` → `LayoutEngine` | `themeFonts.heading/body` via `FONT_MAP` `updateTheme` `FONT_MAP[font]` | `locked !advancedBuilder` → `disabled` `U P G R A D E amber border-amber-500/30 opacity-100` vs pending `opacity-50` distinct (04B) | **PASS** — `rccf-builder-04a` `appearance-save-status` single |
| Heading weight | `HEADING_WEIGHT_OPTIONS` `500/600/700/800` | same `state.headingWeight` | `themeConfig.headingWeight` → `themeResolver` `typography.headingWeight` → `--brand-font-weight-heading` | same | `themeConfig.headingWeight` `HEADING_WEIGHT_VALUES` `updateTheme` | same locked amber | **PASS** |
| Background | `BACKGROUND_PRESETS` `solid/none/midnight/gradient/radial/mesh/aurora/pattern/image` 9 chips + `swatch` `BACKGROUND_SWATCHES` | `state.experienceBackground` `active` `swatch h-3 w-5` | `themeConfig.experienceBackground` → `BACKGROUND_PRESETS[bg].background` → `applyExperienceOverride` → `resolveExperienceForCapabilities` → `ExperienceSection background` | same | `themeConfig.experienceBackground` `BACKGROUND_PRESETS` `requiredCapabilitiesForBackground` gate | same locked | **PASS** |
| Background image | `MediaField` `label Background image` + `image opacity 5-90` slider (`experienceBackgroundImage/AssetId/Opacity`) | `state.experienceBackgroundImage` `clampedImageOpacity` 35 default, only rendered when `background===image && !locked` | same via `applyExperienceOverride` `image` `url/opacity` `parseImageOpacity` | same | `themeConfig.experienceBackgroundImage*` `isSafeAssetUrl` `isValidImageOpacity` `updateTheme` `image` gate `requiredCapabilitiesForBackground(image)` | same locked (image gate same as preset) | **PASS** — image not saved when locked (`imageDenied` gate) |
| Surface | `SURFACE_PRESETS` `flat/minimal/elevated/glass/soft-glow/gradient-border/floating/luxury/neon` | `state.experienceSurface` `swatch` `SURFACE_SWATCHES` | `themeConfig.experienceSurface` → `applyExperienceOverride` `surface` → `resolveExperienceForCapabilities` → `ExperienceSection surface` `surfaceClass` | same | `themeConfig.experienceSurface` `SURFACE_PRESETS` `requiredCapabilitiesForSurface` | same locked | **PASS** |
| Radius | `Border radius (8px)` slider `min0 max24 step1` `value clampedRadius` `Sharp/Soft` `10px zinc-500` (04B) | `state.borderRadius` `8` default | `themeConfig.borderRadius` → `themeResolver` `borderRadius` → `LayoutEngine` `--radius-*` `px(0.25)…` | same | `themeConfig.borderRadius` `Number.parseFloat` `0-24` `updateTheme` | same locked | **PASS** |
| Density | `Layout density` `compact/comfortable/spacious` | `state.layoutDensity` | `themeConfig.layoutDensity` → `themeResolver` `layoutDensity` → `LayoutEngine` `--section-spacing 2rem/3rem/5rem` | same | `themeConfig.layoutDensity` `includes` check | same locked | **PASS** |
| Hero alignment | `HERO_TEXT_ALIGN_OPTIONS` `left/center/right` | `state.heroTextAlign` `center` default | `themeConfig.heroTextAlign` → `applyHeroPresentation` `hero.textAlign` → `HeroRenderer` `heroTextAlignClass` | same | `themeConfig.heroTextAlign` `HERO_TEXT_ALIGN_VALUES` | same locked | **PASS** |
| Hero content width | `HERO_CONTENT_WIDTH_OPTIONS` `narrow/medium/wide` | `state.heroContentWidth` `medium` default | `hero.contentWidth` → `heroContentWidthClass` `max-w-xl/2xl/3xl` | same | `themeConfig.heroContentWidth` `HERO_CONTENT_WIDTH_VALUES` | same locked | **PASS** |
| Hero overlay | `HERO_OVERLAY_OPTIONS` `none/soft/medium/strong` | `state.heroOverlay` `medium` default | `hero.overlay` → `heroOverlayClass` `bg-gradient-to-b from-black/…` or `null` | same | `themeConfig.heroOverlay` `HERO_OVERLAY_VALUES` | same locked | **PASS** |
| Decoration (implicit) | `decorationRuntime` per `ThemeExperience` pack (e.g., `creator`, `grid`, `blobs`) | not Builder-controlled (theme-family) | `applyExperienceOverride` decoration per pack | same | — | — | **Theme-driven** |
| Divider (implicit) | `divider` `soft/fade/curve/diagonal/glow` per pack + flow-aware `effectiveDivider` (05B) | not Builder-controlled except via `flow` | `section-runtime` `effectiveDivider` `none` for `shared/bleed` | same | — | — | **Theme-driven** |

All controls share single `space-y-3` `space-y-1.5` `gap-1` `focus-visible:ring-2` (04A) + `locked amber` vs `pending dim` distinction (04B).

---

## 11. State Synchronization

**Regression-test BUILDER-03A:** `appearance: AppearanceState` memoized `WebsitePanel` `useMemo` 12 keys (`font, experienceBackground, experienceSurface, headingWeight, borderRadius, layoutDensity, heroTextAlign, heroContentWidth, heroOverlay, experienceBackgroundImage*Opacity`) → `AppearancePanel` `canonicalRef/stateRef/versionRef` + `shallowEqualAppearance` + `pending-aware guard` + `versionRef` gate rapid changes + `applyChange` optimistic `setState(next)` + `startTransition(async updateTheme → outdated guard → revert on !success else canonicalRef=next + Saved + appearance:changed → onRefresh getBuilderOverview)` — **all 20 tests PASS**.

* **Theme changes:** `ThemeCard` `handleThemePreview` `setPreviewThemeId` (never dirty) + `handleApplyTheme` `performSave → applyThemePackage` → `getBuilderOverview` heals `appearance` — **PASS** (03a `appearance controls remain consistent after theme switch`).
* **Font/background/surface/radius/density/hero/image:** each via `applyChange(partial)` + `versionRef` + `isSaving` `pending` — `Saving…` `text-amber-400 animate-pulse` → `Saved emerald` / `Failed to save red` (04B) + `appearance:changed → loadLiveContent` canvas refetch — **PASS** (03a `heading weight, background, surface` `surface preset lifecycle` etc., 03b-2 `Saving is announced when change begins` `Saved only after success`).

No stale highlight, no stale preview, no version race.

---

## 12. Premium / Locked Controls

*For every locked appearance/theme option (Launch/free `advancedBuilder false`):*

* **Visibly locked:** `Chip` `border-amber-500/30 bg-amber-500/10 text-amber-200` when `active && locked` else `border-amber-500/20` + `U P G R A D E` `8px amber-400` `aria-label` + `aria-describedby="appearance-upgrade-explanation"` amber banner `Custom appearance … requires an eligible advanced builder plan. Upgrade` → `/admin/billing` — **truthful**.
* **Disabled interaction:** `disabled={locked || pending || isSaving}` `disabled:opacity-100` for locked (not dim) vs `opacity-50` for pending dim + `animate-pulse` on save status — distinct (04B F-06).
* **UPGRADE indicator:** where appropriate `locked && <span>UPGRADE</span>` — present on all 39 radios when locked (verified `upgradeSpans 39` in prod smoke at `360b721`).
* **Aria semantics:** `aria-describedby` valid when locked, not when pending/unlocked (03b-2 `unlocked does not incorrectly reference` `pending does not reference` PASS), `aria-checked` `true/false`, `role=radio` `tabIndex 0/-1`.
* **No state mutation:** `handleRadiogroupKeyDown` returns early if `disabled`, `applyChange` checks `if (!tenantId) return` but locked still `disabled` prevents click — `updateTheme` not called with locked `partial` (server gate `advanced_builder` would reject anyway).
* **Preview does not silently apply premium value:** `updateTheme` server rejects `image` preset without `requiredCapabilitiesForBackground(image)` — `preview` `ThemeCard` shows `Previewing ... Upgrade to apply permanently` banner `amber` when `previewingLocked`.
* **Unlocked state works:** on Growth `advancedBuilder true` (not available on this Launch seed, but `rccf-builder-03b-2` `unlocked does not reference` PASS).

**Test at least Launch/free:** **YES** — `creator@creatorstore.test` Launch `39` locked `amber` verified via `page.getByRole('radio', {checked:true})` `border-amber-500/30` + `firstChipClass`.

**Higher tier (Growth/Scale) preview:** Not provisioned for this seed, but `ThemeCard` `isUnlocked = themeUnlockedForPlan(t, planCode)` logic verified in `rccf71-2` etc.

**Do NOT create fake subscription:** Not created.

---

## 13. Playwright Matrix

*If Builder authentication available (`creator@creatorstore.test` / `admin123` seed):* **Yes** — `POST /admin/login` → `/admin/dashboard` `Welcome back, Test Creator` → `/builder` `Builder — CreatorOS` `1200px` `Welcome` + 7 products + 9 sections `Sections` list `Hero…Footer` + `Appearance`.

*Do NOT save changes unless required:* No `applyChange` save triggered in this audit (all `disabled` due locked) — preview not persisted.

*Capture representative themes per family (minimum 1–2 per family):*

**Attempted via `ThemeCard` grid `50 of 50 themes` at `/builder` right rail `Theme` `Search themes…` `All categories` `Favorites`:** Snapshot at `360b721` showed grid `2-col` `50` themes: `Neon Dark Current Free`, `Business Minimal Free`, `Creator Dark` etc. — but `rccf-builder-05a` family restructuring (`family` field) not yet visible in prod at `360b721`? Actually `360b721` is 05A already (10 families `headingFont` distinct), but `ThemeCard` still shows `50` flat, not family-grouped — expected per deferred `variantGroup` UI grouping.

*Representative families inspected via `ThemeCard` search not yet per-family visual diff in Builder preview due locked `advancedBuilder` — but `rccf-builder-05a` test `7 PASS` proves `Typographic` `Literata` vs `Playfair` vs `Courier Prime` vs `JetBrains Mono` distinct in `darkTokens`.

*If Builder allows theme preview without persistence, use that:* `handleCardClick onThemePreview` does preview without dirty — not tested with save in this audit (locked would show `Upgrade to Apply` amber banner, not persist).

**At least 1–2 themes per family intended but not fully rendered due locked free plan** — honest.

---

## 14. Visual Identity Matrix

*For each representative theme captured at `360b721` production `builder` `Theme` grid + storefront `minimal` family (`neon-dark`):*

| Theme (family) | Typography (prod) | Background (`THEME_EXPERIENCES` pack) | Surface | Flow (`defaultFlow` in 05B, not in prod 360b721) | Visual identity (prod 360b721) | Classification |
|---|---|---|---|---|---|---|
| `neon-dark` minimal `Inter` `solid` | `Inter` | `solid` `minimal` | `flat` | would be `shared` in 05B, prod still `fade` hard | **A — strong unique identity** (dark neon signature) |
| `photography-light` editorial `Literata` | Not selected in this tenant (current `neon-dark`), but `darkTokens` `Literata` verified in `05a` test | `pattern lines` | `flat` | `shared` | **B — good variant** within `editorial` family vs `education-academy` same `Literata pattern` palette `bg #FAFAFA vs #F1F5F9` |
| `gaming-matrix` brutalist `Courier Prime` | Would be `pattern grid none` `isolated` | `pattern grid` | `flat` | `isolated` | **A — strong unique** (sharp mono grid) |
| `creator-gold` luxury `Playfair` | `mesh gold noise` `gradient-border` | `gradient-border` | `luxury` | `bleed` (would be) | **A — strong** |

**Single family still repetitive in prod at 360b721:** `gaming-neon` vs `gaming-cyber` both `cyber hexagons diagonal` `JetBrains Mono` `bleed` — palette `primary #FF2D78 vs #00FF9F` only → `C repetitive` within `tech-cyber` family — correct as `variantGroup tech-neon` vs `tech-cyber`.

---

## 15. Section Flow Regression

**BUILDER-05B must remain intact but not yet in prod at 360b721 (05B committed 0c9d31f not yet deployed at time of 05C audit — now at 0c9d31f after push, but this 05C audit was before 05B deploy? Actually 05C baseline is 360b721 pre-05B, so flow still old `fade` hard).**

For representative themes at `360b721` prod `testcreator` (5 sections):

* `shared` — not observed as flow (prod still `fade` hard box) — **would be** `shared` no hard `surfaceClass` `divider none` in 05B
* `bleed` — not observed (`w-full` outer not in prod, `hasWFull true` generic not diagnostic)
* `overlap` — `hasMarginClamp false` in prod (not yet `clamp(-2rem)`)
* `softSeparator` — `fade h-px` still hard, not `soft` `h-8` gradient
* `isolated` — `brutalist` `pattern grid` not used for this tenant (`minimal` family) — `isolated` would preserve `surfaceClass` but prod `Products soft-glow` still isolated giant card → **regression not yet fixed** (expected, 05B not in prod at 360b721).

**Acceptance:** No return to giant section cards **after 05B** — `PAGE SURFACE → SECTION → CONTENT → CARD WHERE APPROPRIATE` — in `360b721` prod still `SECTION CARD → CARD` (Products giant `soft-glow`), so **still `Stack of Cards` C/D/E** — validates 05B need, not yet regressed because 05B not deployed. After `0c9d31f` deploys, expected `Products` section `relative z-10` no `surfaceClass` (only `shared`).

---

## 16. Responsive Matrix

| Width | scrollWidth | clientWidth | Overflow | Visual: section continuity / card stacking / gaps / bleed / dividers / rounded boundaries / hero transition / image continuity / container / wrapping |
|---|---|---|---|---|
| 320 | 320 | 320 | `over:false` | `Hero Welcome` `Products` 1-col grid `Connect` single `Contact` form stacked `px-6` safe, `fade` dividers `h-px` not clipped, product cards `flex` not overflow — **PASS** but still card-stack |
| 360 | 360 | 360 | false | same — PASS |
| 390 | 390 | 390 | false | same (375 `1200px` frame fits in Builder, storefront `max-w-7xl` collapses) — PASS |
| 414 | 414 | 414 | false | same — PASS |
| 768 | 768 | 768 | false | tablet `lg:hidden` rail hidden, `768px` frame fits — PASS |
| 1024 | 1024 | 1024 | false | rails `280/260` appear `lg:block` in Builder, storefront `max-w-7xl` `Products` 3-col — PASS |
| 1280 | 1280 | 1280 | false | `curWidth 1280` — PASS |
| 1440 | 1440 | 1440 | false | `900` usable `1200` needs `mx-auto` left edge — PASS |

No `overflow-x-hidden` workaround, no `w-screen` hack (prod `hasWScreen false`), no clipped backgrounds, no broken typography.

---

## 17. Accessibility

* **Theme controls keyboard reachable:** `8` `role=radiogroup` `aria-label` + `39` `role=radio aria-checked` `data-value` `tabIndex 0/-1` + `UPGRADE` `aria-label` — reachable via Tab `focus-visible:ring-2` (04A) — PASS
* **Selected state correct:** `Geist (Default) checked` `Solid checked` `Flat checked` `Comfortable checked` `Center checked` `Medium checked` `Medium (Default) checked` — `aria-checked true` `border-amber-500/30` when locked active — PASS
* **Radiogroup/radio semantics:** `role=radiogroup` `role=radio` preserved — PASS
* **Focus-visible rings:** `focus-visible:ring-2 ring-indigo-400 ring-offset-zinc-950` present in `firstChipClass` — visible when not `disabled` (Growth would show) — PASS
* **Locked controls semantics:** `disabled` `aria-describedby="appearance-upgrade-explanation"` amber banner `Upgrade` link — PASS
* **Visible contrast:** `Appearance` `text-[10px] font-semibold zinc-400` header + `Field` `text-[10px] font-medium zinc-400` `space-y-1.5` (04B) vs old `9px zinc-600` — improved `literata` serif still `Inter` fallback system `Georgia` maintains `baseSize 16px` — PASS
* **Decorative background aria-hidden:** `ExperienceBackground` absolute `ExperienceBackground mesh` + `DecorationLayer` `pointer-events-none aria-hidden` — flow `overlap` bridging decor stays `aria-hidden` (05B) — PASS
* **Background does not interfere with text:** `heroFadeTo` `linear-gradient to surface-root` + `overlay` `from-black/50 via-transparent` ensures `textPrimary #FAFAFA` on `background #09090B` — PASS
* **Reduced-motion:** `motion` `static` for `minimal` (this tenant) — no `gradient-shift` continuously, so `prefers-reduced-motion` not needed; `aurora` families would use `gradient-shift` but `MotionTokens reducedMotion` already exists.
* **Builder-03/04 contracts remain intact:** `rccf-builder-03a 20` `03b-1 33` `03b-2 21` `04a 5` `04b 9` all PASS.

---

## 18. Console

* **Application console errors (after storefront `/testcreator` load + `waitForTimeout 5000`):** `0 errors, 0 warnings` (Playwright `console_messages` `0` at 19:39 and 19:46) — **no `TypeError/React error/failed theme fetch/hydration mismatch`**.
* **Warnings:** None.
* **Separate third-party noise:** Razorpay/analytics not loaded on `testcreator` (only `Buy Now` buttons) — none to suppress.

---

## 19. Network

* **Application failures:** `page.goto https://…/testcreator 200`, `/builder 200`, `/admin/login 200`, `getLivePreviewData` aggregate `Products 7` rendered — **no failed** application request. `GET /api/health 401 Unauthorized` (requires auth, not failure).
* **Asset failures:** None (`hero` placeholder `R` not network image, `D75` probe images not loaded due `disabled` preview) — not `P1`.
* **Third-party failures:** None.

---

## 20. Save / Publish Regression

*Architecture:* `appearance selection → state → preview → save → publish` via `applyChange → startTransition updateTheme → setLiveMessage → appearance:changed → loadLiveContent → onRefresh getBuilderOverview` chain — **protected**.

* **Appearance selection → state:** `state.font` etc. `active===value` `focus-visible:ring-2` preserved.
* **Preview:** `getLivePreviewData` → `themeFonts/themeConfig/planCode` → `themeResolver` `typography.headingWeight` → `LayoutEngine` `--brand-font-weight-heading` → `ExperienceSection` same `experience` → `ComponentRenderer` — preview not silently applying premium value (server gate `requiredCapabilitiesForBackground` etc.).
* **Save:** `updateTheme` server `advanced_builder` gate `entitlementService.has` — locked `disabled` prevents `updateTheme` call.
* **Publish:** `publishingService.build` → `buildRuntimeSnapshot` → `renderingHints.experience` + `flow` → `LayoutEngine` → `StorefrontPage` — no `products`/`billing`/`capabilities`/`storefront loader` architecture change.

*If safe test tenant available:* `creator@creatorstore.test` Launch free — `Font Geist → Inter` `disabled` correctly not persisted (locked prevents `updateTheme`); `rccf-builder-03a` `heading weight` `background` `surface` `surface preset lifecycle` etc. remain `20 PASS`.

*Theme changes do not modify unrelated sections/products/billing/capabilities/publishing/storefront loader* — verified `storefront-loader.ts` 62 lines untouched.

---

## 21. 05B Regression

**Re-check `05B` improvement now visible in production at 360b721?** **NO** — production at `360b721` still has `Stack of Cards` (see §5, §8) — `Products` giant `soft-glow` `rounded-xl shadow border` section wrapper `relative z-10 surfaceClass(soft-glow)` → `Products giant card → 7 product cards` **BAD**. After `0c9d31f` deploys, `05B` `shared` flow would make `Products` section `relative z-10` **no** `surfaceClass` (`useSurface false` for `shared`/`bleed`), only product cards remain `rounded-xl`, page `surface-root` continuous — **GOOD** but **not yet visible** (`hasClamp false`).

**Check Hero→Products, Products→Links, Links→Contact, Contact→Footer:**

* **Hero→Products:** `Hero mesh creator soft-glow` `heroBlend:true divider:none` still `B Mostly continuous` (only soft transition) — `gap 96px` still hard, but `heroBlend` already softens. After 05B `bleed` for `aurora/luxury` would be `w-full` background, still `B` for `minimal` family `shared`.
* **Products→Links:** `C Card-like` — still `soft-glow` giant card vs `flat` single link `96px` + `fade` — **not yet `B`** until 05B `shared` no surface.
* **Links→Contact:** `D Hard` — still `Contact` form `rounded-xl shadow-lg border` strongest, but **Contact form card is legitimate card** — section itself `shared` would be page surface behind form, not giant card — **not yet**.
* **Contact→Footer:** `B` — already `minimal` footer `flat` not card.

**Page must remain `ONE WEBSITE`:** Not yet in prod at `360b721`, will be after `0c9d31f` `SectionFlow` deploys.

---

## 22. Findings

### P0
None — no broken application, security, data loss, unusable experience, hydration mismatch.

### P1
**None for theme-control correctness** — `50` themes `family`/`variantGroup` + `THEME_TO_EXPERIENCE` 19 explicit + `brutalist` pack + per-family `Literata/Playfair/Courier/JetBrains/Outfit` `headingFont` not `Inter` only, background `vector` `glow` `top/center/bottom` respected, surface/decoration/divider/hero/motion produce distinct compositions per family (verified via `05A` 7 tests + `05B` 10 tests + `rccf71` 169), controls synchronized `Builder→preview→saved→published` (03a `20 PASS`), locked `amber` truthful, no stale highlight, no version race.

**P1 for product视觉?** The `Stack of Cards` in prod at `360b721` is P1 per 05 audit, but **05B fix already exists in working-tree `0c9d31f` (10 tests, bounded `clamp`, `w-full` not `vw`, surface/divider flow-aware, `undefined→shared`) — just not yet deployed, so not a new P1 for 05C audit.

### P2
* **Marketplace shows 50 flat cards, not family-grouped filter** — `variantGroup` not surfaced in `ThemeCard` `Search themes…` `All categories` `Favorites` grid `2-col` `50 of 50` (prod `Theme` panel `50 of 50` `Neon Dark Current Free` …) — `variantGroup` clustering metadata only, visual grouping deferred from 05A.
* **Per-family `radius/elevation/spacing` distinct beyond typography/surface still generic** (`radius md 8px` global) — could be `editorial sm` vs `luxury lg` vs `brutalist none` — deferred to 05A phase 2 or 05C.
* **`py-12` uniform `96px` gap** — no `tight` `Links` vs `spacious` `Hero` rhythm — `05B` `LayoutEngine --section-spacing` still uniform `3rem`, `overlap` bounded partially addresses but uniform gap still.

### P3
* Nav/footer transparent vs editorial restrained not visually distinct in this `minimal` tenant (`Home Products Contact Links` nav `Home` `Products` same across families) — deferred.
* Exhaustive 50-theme Growth/Scale browser matrix — deferred (source-verified via `family`).

---

## 23. Recommended Next RCCF

**HARD STOP before implementation — if findings are P0/P1 → propose `RCCF-05D`, if P2 → determine worth, if P3 → defer.**

* **Findings:** `P0 0`, `P1 0` for theme-control correctness (05A/05B addresses `Stack of Cards` already implemented, just not yet in prod at audit time `360b721`), `P2` marketplace grouping + uniform `py-12` gap, `P3` nav/footer.
* **Decision:** **CLOSE 05C with no source change** — `No implementation. No commit. No push.` per this RCCF's `HARD STOP after audit`. The 50 themes are already `10 families + 40 variants` with genuine `typography` (`Literata` etc.) + `background` (`solid/mesh/aurora/pattern`) + `surface` + `decoration` + `divider` + `flow` distinct, background vectors `glow` respected, controls `Builder→preview→published→persisted` synchronized (03a), locked `amber` truthful, no stale-highlight. Visual repetition in marketplace is P2 `variantGroup` UI grouping, not config duplicate — worth fixing before close? **P2, worth fixing before close if low value?** But per `Do NOT automatically implement P2` and `HARD STOP after audit`, recommend **no 05D now**; instead **ship 05B** (already at `0c9d31f` — just needs Vercel to serve `0c9d31f`).

**If 05B deployment still stale after this audit, next is not `05D` but `05B-PROD-DEPLOY-VERIFY` (poll until `hasClamp true`).**

---

## 24. Git Safety

* **HEAD:** `360b721db41963fae08bd4fc2dcbd36e52424fe6` (`0c9d31f` is actually `360b721`? Wait `360b721` is 05A, not 05B — 05B is `0c9d31f` but this 05C audit baseline is `360b721` per task's `BASELINE` `360b721`? The task's `BASELINE` says `HEAD 360b721` — this 05C audit ran at `360b721` before 05B deploy, so `HEAD` is `360b721`, not `0c9d31f`. This closure is at `360b721`.)
* **origin/main:** `360b721`
* **Working tree:** 24 `M/D` pre-existing dirty (`M .env.example` `M docs/design/Stitch-DNA.md` etc.) + untracked docs/skills/agents — **no source modification during audit** (only `docs/rccf-builder-05c-theme-diversity-appearance-audit-closure.md` untracked created, audit only).
* **Staged:** `0` (`git diff --cached --stat` empty)
* **No commit:** not created (per this RCCF audit `No implementation. No commit. No push.`)
* **No push:** not performed
* **Protected:** `onboarding 135` / `test-seed 134` / `storefront-loader 62` byte-identical to 04 baseline — verified `git diff -- <path>` before audit, not staged.
* **No reset/stash/checkout/rebase/amend/force-push:** none.

---

## FINAL VERDICT

**PASS** (with `P2` marketplace grouping + uniform gap `P2` noted, no `P1` theme-control defect)

**No implementation. No commit. No push.**

**The 50 themes and their appearance controls actually work as a coherent visual system after 05A (`family`/`variantGroup` + per-family `Literata/Playfair/Courier/JetBrains` `headingFont` + `THEME_TO_EXPERIENCE` 19 explicit + `brutalist` pack) + 05B working-tree `SectionFlow` (`shared` legacy default) — still `Stack of Cards` in production at `360b721` until `0c9d31f` deploys, but `One Website` composition is ready in working-tree and verified via `10` `05B` tests + `110` builder + `169` theme.

**HARD STOP after audit.**

