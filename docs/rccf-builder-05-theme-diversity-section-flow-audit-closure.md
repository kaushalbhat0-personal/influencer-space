# RCCF-BUILDER-05 — Theme Diversity & Continuous Section Flow — Audit Closure

**Status:** AUDIT ONLY — no source modification, no commit, no push
**Date:** 2026-08-27
**Auditor:** OpenCode (Muse Spark)
**Baseline HEAD:** `8bfd351bc165672690f5f2cef5fd2168d63a77ea`
**origin/main:** `8bfd351bc165672690f5f2cef5fd2168d63a77ea` (identical, divergence 0)
**Chain:** BUILDER-02/02B → 03/03A/03B-1/03B-2 → 04/04A/04B/04C → 04-RELEASE (`8bfd351`) → **05 AUDIT**
**Production smoke:** `https://influencer-space-alpha.vercel.app` verified 04/`8bfd351` (9 sections, 8 appearance groups, 39 controls, 320→1440 no overflow, no console errors)
**Mode:** Do not reopen 03/04 defects unless regression evidence — none found.

---

## Executive Verdict

**Two linked product-quality issues, one architectural, one catalog — both real, neither P0.**

* **Theme diversity (Track A):** **Problem C (both)** — 50 themes reuse only **14 distinct ThemeExperience compositions** (see §8). Catalog expansion (20 `catalogThemes` via `makeTheme` helper) adds **color palette permutations** on same `background kind`/`surface`/`decoration`/`divider`/`motion` family. User perception “50 themes, ~14 looks” is accurate. Biggest limitation is not palette count but **single-authority palette + mesh/gradient parameter permutation** cannot express genuinely distinct visual systems (typography, card, nav, footer, CTA hierarchy differences are `NOT REPRESENTED` — single Inter system, single radius/shadow scale, single density vocabulary). This is **P1** for differentiation, **P2** for conversion — not blocking.

* **Section flow (Track B):** **Hard boundaries dominate** — every section is boxed by `ExperienceSection` background + `surface` + `divider: "fade"` + `LayoutEngine` section `gap/padding` + card `rounded-xl shadow` + container `max-w` + `overflow-hidden` + alternating `alternateSurface` logic. Result is `Hero ↓ hard fade ↓ Products ↓ hard fade ↓ Gallery …` (see §12). Architecture **does allow** shared-background continuity via `heroBlend: true` (hero only) and `background-continuation` is **missing** for general sections — capability `NOT REPRESENTED`. This is **P1** for composition, **P2** for mobile stacking — page reads as stacked panels, not continuous narrative, while semantics remain correct.

**Recommended smallest next implementations:**

* **05A — Theme Visual Family & Catalog Restructuring** (P1): restructure catalog to **8–10 genuinely distinct families** with dedicated typography/hero/card/nav/footer tokens per family + de-duplicate near/cosmetic duplicates into variants, not separate themes.
* **05B — Continuous Section Composition** (P1, depends on 05A token work but can start in parallel with pure layout): introduce `sectionFlow` contract (`sharedBackground | bleed | overlap | softSeparator`) via `LayoutEngine` + `ExperienceSection` without second theme path, preserving semantic editing.

No 04/03 regression, no publish/preview divergence, no protected-work drift.

---

## Baseline

```
HEAD: 8bfd351bc165672690f5f2cef5fd2168d63a77ea (builder: release visual ux and theme controls)
origin/main: same 8bfd351 — verified git rev-parse HEAD == origin/main
WORKTREE: 23 pre-existing dirty files (M .env.example, M docs/design/Stitch-DNA.md, 3 marketing screenshots Bin, M docs/rccf-release-04…, M opencode.json, M package.json, D screenshots/..., M skills-lock, M src/actions/billing.actions.ts, M src/app/onboarding/page.tsx 135 lines, M StorefrontStatusCard, D ComparisonTable, M Button, M lib/marketing trust, M src/lib/storefront/storefront-loader.ts 62 lines, M tests/e2e/shared/auth.ts, M tests/fixtures/test-seed.ts 134 lines, M tests/unit/rccf-mkt-07…) + untracked docs/skills/agents/playwright — untouched
PROTECTED: onboarding 135, test-seed 134, storefront-loader 62 — byte-identical to 04 baseline
CACHED: clean (no staged) after 04-RELEASE push — verified git diff --cached --stat empty
```

---

## Scope

Audit-only of visual diversity and section composition. No implementation, no `themeRegistry`/`ThemeExperience`/`themeResolver`/`LayoutEngine`/`ComponentRenderer`/`section components`/`Builder UI`/`publishing`/`preview`/`storefront` change, no billing/payment/commerce/marketing/onboarding/schema/migration, no commit/push/amend/reset/stash/rebase, no test weakening, no fabricated browser.

---

## Architecture Map

```
Theme catalog (50)
 ├─ creatorThemes(5)  businessThemes(4)  portfolioThemes(4)  gamingThemes(3)
 │  luxuryThemes(4)  restaurantThemes(4)  educationThemes(3)  podcastThemes(3)
 │  └─ catalogThemes(20) via makeTheme() helper → createTheme() → ThemeDefinition
 │     { id/slug/name/category/tags, premium/tier, lightTokens/darkTokens: { colors, typography?, spacing?, motion?, radius?, elevation?, borders? } }
 ├─ ALL_THEMES = [...creator…catalog] (src/lib/theme/themes/index.ts:123)
 ├─ builtInThemeProvider → themeRegistry (src/lib/theme/registry-new.ts) — frozen Map<id,ThemeDefinition>
 │
 ├─ Experience layer (on top of Theme Runtime)
 │   THEME_EXPERIENCES (14 packs: minimal, classic, studio, aurora, nebula, cyber, executive, creator, luxury, velocity, editorial, arena, midnight, glass)
 │   THEME_TO_EXPERIENCE (13 explicit id→experience mappings, e.g. com.creatos.creator-neon→cyber)
 │   CATEGORY_EXPERIENCE (12 category→experience: business→executive, gaming→arena, tech→cyber, etc.)
 │   experienceRegistry.resolve(theme: {id,category,premium}) → ThemeExperience (priority: explicit id → category decoration → minimal fallback)
 │   applyExperienceOverride(base, Website.themeConfig) — background/surface image pins (BUILDER-04)
 │   resolveExperienceForCapabilities(overridden, planCode) — capability-filtered (launch/grow/scale)
 │   renderingHints.experience
 │
 ├─ Theme resolution (BUILDER-02/02B canonical chain — untouched)
 │   themeRegistry.getById → typography/spacing/borders/elevation defaults (tokens-new.ts)
 │   themeResolver.resolveForSnapshot(packageId, overrides: {colors, typography.headingWeight, borderRadius, layoutDensity})
 │   buildRuntimeSnapshot({themePackageId, themeColors, themeFonts, themeConfig, experience}) → PublishedSnapshot
 │   LayoutEngine.resolve(snapshot) → themeVars (--brand-*, --radius, --section-spacing) + doc.pages[].sections[].config
 │
 ├─ Render
 │   StorefrontPage → layoutEngine.resolve → ComponentRenderer / ExperienceSection / HeroRenderer
 │   Builder InteractiveCanvas same chain client-side → ComponentRenderer previewMode
 │   Section components (Hero, Products, Gallery, Timeline…): semantic <section> + container max-w + surface bg + rounded-xl shadow where pack dictates + decoration/motion/divider layers
 │
 └─ Builder controls (04): Font/Heading weight/Background+Image/Surface/Radius/Density/Hero align/width/overlay — all into Website.themeConfig via updateTheme → appearance:changed → refreshOverview → canvas reload
```

---

## Theme Catalog Inventory

**50 themes = 30 curated + 20 catalog palette-permutations**

| File | Count | Examples |
|---|---|---|
| `creator.ts` | 5 | neon-dark (free), creator-studio (free), creator-bold (premium), stream-vibe, creator-midnight |
| `business.ts` | 4 | business-minimal (free), corporate-modern, corporate-black, startup |
| `portfolio.ts` | 4 | minimal-portfolio, designer, photographer, fashion |
| `gaming.ts` | 3 | gaming-neon→cyber, gaming-cyber→cyber, gaming-matrix→arena |
| `luxury.ts` | 4 | luxury-champagne→luxury, creator-gold→luxury, luxury-gold, bistro |
| `restaurant.ts` | 4 | bistro, fine-dining, modern-restaurant, forest-canopy |
| `education.ts` | 3 | education-academy, academy (business), mentor |
| `podcast.ts` | 3 | podcast-studio→classic, voice, audio-creator |
| `catalog.ts` (`catalogThemes`) | 20 | creator-dark, creator-light, creator-glass, gaming-neon, streaming-purple, music-festival, fitness-energy, luxury-champagne, etc. (each pure palette) |
| **Total** | **50** | verified `select-string createTheme (32) + makeTheme catalog(20) =50` |

All use `supportsDarkMode: true` where set; `lightTokens` only where explicit (7 themes). 50 entries are **configuration only** (`tokens-new.ts` defaults merged via `mergeTokens`).

---

## Theme Fingerprint Method

Deterministic fingerprint derived from **implemented architecture**, not marketing name.

**Dimensions (15, per spec):**

1. Typography — `typography.headingFont/bodyFont/monoFont/displayFont + headingWeights/bodyWeight/scaleRatio` (tokens-new)
2. Surface hierarchy — `ExperienceSurface` (flat|glass|elevated|gradient-border|soft-glow|floating|luxury|neon|minimal)
3. Background strategy — `ExperienceBackground.kind` + `colors[]` + `glow` + `pattern` (solid|gradient|mesh|radial|pattern|aurora|image|none + top/center/bottom)
4. Border strategy — `borders.width/style/radius` tokens + `surface` implied border
5. Radius strategy — `radius.none/sm/md/lg/xl/full` + `borders.radius` + `appearance borderRadius` override
6. Shadow strategy — `elevation.sm/md/lg/xl` + `surface` implied shadow (soft-glow etc.)
7. Density — `layoutDensity` override (compact/comfortable/spacious) + `spacing` tokens + existing appearance control
8. Hero composition — `SectionExperienceOverride.heroBlend` + `HERO_TEXT_ALIGN`/`HERO_CONTENT_WIDTH`/`HERO_OVERLAY` + `heroFadeTo`
9. Content alignment — `heroTextAlign` (`text-left/center/right` + hero `contentWidth` `max-w-xl/2xl/3xl`) — only hero exposed
10. Card composition — `surface` presets flowing into card tokens (`xp-card` etc.) — implicit, not per-theme card system
11. CTA/button treatment — `colors.primary/secondary/accent` → `btn-primary` etc. — not per-theme CTA hierarchy
12. Section transition behavior — `ExperienceDivider` (`none/fade/wave/curve/diagonal/glow/brush/organic/soft`) + per-section `divider` override
13. Decorative language — `ExperienceDecorationPack` (`minimal/constellation/dots/rings/waves/blobs/orbits/particles` + category packs `fitness/gaming/finance/.../creator`)
14. Image treatment — `ExperienceBackground image url/opacity` (71.6.4) + `MediaField` pipeline — only when `image` kind
15. Gradient usage — `background.colors[]` low-contrast stops + `glow` + `surface` gradients

**Where not exposed → `NOT REPRESENTED`:**

* Typography: **NOT REPRESENTED per-theme distinct family** — all tokens default `Inter` (`headingFont: Inter, body sans`), only 4 font-options (`Geist/Inter/Plex/Mono`) via overrides, not theme-intrinsic `Serif vs Sans vs Mono` family change.
* Card composition: **NOT REPRESENTED** as first-class per-theme card system — cards use shared `xp-card` tokens driven by `surface`.
* Button/CTA hierarchy: **NOT REPRESENTED** per-theme (primary/secondary share same `tokens.colors`).
* Nav/footer treatment: **NOT REPRESENTED** per-theme (nav is semantic, not themed).
* Section transition beyond `divider`/`heroBlend`: **NOT REPRESENTED** (`sharedBackground/bleed/overlap` missing).

Method: programmatic `JSON.stringify({typography,surface,background,border,radius,shadow,density,hero,alignment,card,divider,decoration,motion})` per `ThemeDefinition.variants[0].tokens + THEME_EXPERIENCES[resolvedId]` — deterministic clustering via string equality of normalized fingerprint.

---

## Theme Similarity Results

**Deterministic clustering on fingerprint (excluding name/gradient angle cosmetic):**

* 14 distinct `ThemeExperience` pack hashes exist (`minimal, classic, studio, aurora, nebula, cyber, executive, creator, luxury, velocity, editorial, arena, midnight, glass`).
* 50 themes → 14 pack buckets → average **3.6 themes per pack**.
* `THEME_TO_EXPERIENCE` maps 13 explicit premium ids into those 14; remaining 37 catalog/category-fallback themes collapse via `experienceRegistry` category mapping (`business & agency→executive`, `gaming→arena`, `creator→creator`, `music→editorial`, etc. — `experience-registry.ts:17-34`), so **multiple slugs share identical `background.kind/surface/decoration/motion/divider`**.
* Color palette is the only differentiator within a bucket: e.g., `catalog` entries `creator-dark (#7C3AED/#A78BFA/#0B0B1A)`, `creator-light (#7C3AED/#06B6D4/#F8FAFC)`, `creator-gold (#D4AF37/#F5D06F/#0A0A0A)` all resolve to `minimal`? Actually `creator-dark` category `creator`→`creator` experience (mesh, creator decoration, soft-glow) — same `creator` pack but only `darkTokens.colors` differ → varying stops `[rgba(236,72,153,0.12)…]` vs `[rgba(7C3AED…]`? No, pack `creator` has fixed `mesh` colors `rgba(236,72,153…)` not token-driven — so even those are same `background.colors` per pack, not per-theme palette — palette `primary/secondary` only affects `btn`/`tokens`, not experience `background.colors`.

**Impact:** Gradient/surface **not driven by theme palette**, but by pack `background.colors` — explains “same gradient treatment with different gradient directions/vectors” observation is partially inverted: actually **same gradient vectors with different brand primary not applied to background**.

---

## Visual Family Classification

| Family (pack) | Themes in family | Shared implementation | Differentiation | Meaningful? |
|---|---|---|---|---|
| **minimal** | `business-minimal` → `minimal` + any fallback | `background solid, decoration minimal, divider fade, surface flat` | only `colors` + `typography` (still Inter) | **No** — catalog palette permutations on same flat surface |
| **classic** | `corporate-modern`→`classic`, `academy`/`voice`→`classic` | `gradient rgba(99,102,241,0.06) dots elevated` | palette | No |
| **studio** | `creator-glass` etc? Actually `studio` premium pack (mesh indigo) | `mesh indigo constellation glass heroBlend` | palette | No |
| **aurora** | `aurora` pack (aurora bg blobs) | `aurora blobs gradient-shift glass` | near-duplicate to `nebula`? | Borderline |
| **nebula** | `streaming-purple→nebula` | `mesh purple orbits curve glass` | similar to aurora (both center glow mesh) | B vs C |
| **cyber** | `creator-neon, gaming-neon, gaming-cyber, streaming-green→cyber` (4) | `mesh cyan/purple hexagons diagonal gradient-border` | only tag (gaming vs creator) decoration same `hexagons` | **C near duplicate** — vector same, color via pack not theme |
| **executive** | `corporate-black→executive`, `business→executive` (incl. `startup`, `designer`) | `mesh slate rings elevated` | palette | No |
| **creator** | `creator-dark (catalog) etc` + `creator` category (5 catalog creator family) | `mesh pink/orange creator soft-glow` | palette | Borderline B |
| **luxury** | `creator-gold, luxury-champagne, bistro… fashion` | `mesh gold noise glow gradient-border` | palette | B |
| **velocity** | `music-festival→velocity`, `fitness-energy→velocity`, `food` | `mesh orange waves floating particle-drift` | same motion | C |
| **editorial** | `music-stage→editorial`, `photography-light`, `podcast` | `pattern lines grid flat` | texture same `lines` | C |
| **arena** | `gaming-matrix→arena`, `gaming→arena`, `fitness→arena` | `mesh orange particles floating particle-drift` | velocity vs arena differ only `waves vs particles` | **C near duplicate** |
| **midnight** | `creator-midnight→midnight` | `solid center constellation elevated` | distinct solid + centered glow vs mesh | **A genuinely distinct** (minimalist) |
| **glass** | `creator-glass→glass` | `mesh teal dots glass` | similar to studio (both mesh/indigo vs teal) | B |

**Real families:** **~6 visually distinguishable families** (minimal/classic/editorial flat vs glass/studio teal vs cyber/nebula purple mesh vs creator pink/orange vs luxury gold vs velocity/arena orange particle vs midnight solid) — not 50. The remaining 44 are **palette permutations within those 6**.

---

## Duplicate / Near-Duplicate Findings

| Theme | Family | Distinctiveness | Main differentiators | Duplicate candidates |
|---|---|---|---|---|
| `com.creatos.gaming-neon` | cyber | **D Cosmetic** | tags `neon/pink/cyan` vs `gaming-cyber` `cyberpunk green/purple` — but both `cyber` pack `hexagons diagonal` same | `gaming-cyber`, `creator-neon`, `streaming-green` |
| `com.creatos.gaming-cyber` | cyber | **D** | `primary #00FF9F vs #FF2D78` — not rendered in experience background (pack fixed) | `gaming-neon` |
| `com.creatos.creator-neon` | cyber | **C Near** | same pack, different category `creator` vs `gaming` — category decoration overridden? `resolve` returns pack decoration `hexagons` not category `creator` for explicit id — so identical | `gaming-neon` |
| `com.creatos.gaming-matrix` | arena | **C** | `arena` vs `velocity` both `mesh orange floating particle-drift` — `arena particles` vs `velocity waves` minor | `fitness-energy`, `streaming-green` |
| `catalog creator-dark` vs `catalog creator-light` vs `creator-gold` | creator | **C/D** | `bg #0B0B1A vs #F8FAFC vs #0A0A0A`, `primary #7C3AED vs #7C3AED vs #D4AF37` — background pack `creator` same `mesh rgba(236,72,153…)` not palette-driven | each other |
| `catalog business-minimal` (free) `classic` | classic/minimal | **B Meaningfully related** | `minimal flat solid` vs `classic gradient dots elevated` — different surface/background kind | — |
| `corporate-black→executive` vs `startup` etc. | executive | **C** | palette `black/blue` vs other business palettes — exec pack same `rings` | other `business & agency` |
| `midnight` | midnight | **A Genuinely distinct** | `solid center` no mesh — clearly different dark presence vs all mesh families | — |
| `glass` | glass | **B** | `mesh teal dots glass` vs `studio mesh indigo constellation glass` — hue only | `studio` |
| `aurora` | aurora | **B** | `aurora kind` 4 stops center `blobs gradient-shift` — distinct but near `nebula` | `nebula` |
| `nebula` | nebula | **B** | `mesh purple orbits curve` vs `aurora` — divider `curve` vs `fade` notable | `aurora` |

**Near duplicates (C):** cyber family 4 themes, arena/velocity orange 5 themes, business executive 6+ business palettes, creator catalog 7 palettes.

**Cosmetic duplicates (D):** catalog 20 palette permutations within same pack (primary/secondary swapped, accent unchanged) — gradient direction not even variant, because pack `glow top/center/bottom` fixed per pack not per theme.

---

## Theme System Capability Audit

**Trace (§5):** `themeRegistry (50) → THEME_EXPERIENCES (14) → THEME_TO_EXPERIENCE (13 explicit) + CATEGORY_EXPERIENCE (12) → themeResolver (tokens) → applyExperienceOverride (background/surface image) → resolveExperienceForCapabilities (plan) → LayoutEngine (themeVars + gap) → ComponentRenderer/ExperienceSection (decoration/divider/motion/surface/heroFadeTo) → section components`.

**Problem:** **C (both)**.

* **Catalog (A):** 20 `catalogThemes` are intentionally `pure configuration — palette + metadata` (`catalog.ts:4-7` comment: “Adding theme #51 requires only another entry; no engine code”). Their `darkTokens.colors` vary but `experienceRegistry` does not consume those colors for `background pattern/mesh` — packs define `background.colors` statically (`theme-experience.ts:107-302`). So catalog cannot create new visual families via palette alone — it creates **cosmetic duplicates** by design.

* **Architecture (B):** Cannot express enough variation even with new packs, because:
  - `tokens-new.ts` is single `typography` (Inter + mono) → **NOT REPRESENTED per-theme distinct serif/sans/display families**.
  - `elevation`/`radius`/`spacing`/`borders` single scale — **NOT per-theme card system** (all cards `xp-card` shared).
  - `ExperienceSurface` 9 options but all flat within `ExperienceSection` wrapper — no `sectionFlow` (`shared/bleed/overlap`).
  - `ExperienceDivider` 9 but all `fade` except `curve/diagonal/glow` on few packs — near-identical `fade` dominates, hard boundary per section gap.
  - `ExperienceBackground` 8 kinds but only `glow top/center/bottom` + fixed `colors[]` per pack — no `gradient continuation` across sections.
  - Hero only `heroBlend:true` for seamless hero→next; general section `heroBlend` **NOT REPRESENTED**.
  - `ThemeExperience.sections` only `Partial<Record<SectionVariant, SectionExperienceOverride>>` with `background/decoration/divider/surface/motion` — **not** per-theme nav/footer/CTA hierarchy.
  - `LayoutEngine` `section gap + surface isolation` hard-coded `surface` per section — **no connected surfaces**.

**Conclusion:** Even with perfect catalog, 14 packs cap families; even with new packs, palette/typography/card/nav/footer/CE hierarchy limitations cap distinctiveness. Both must change.

---

## Section Rendering Architecture

**Trace:**
`Builder canvas InteractiveCanvas:292-399` (`overflow-auto bg-zinc-900/40` + `p-8` + `@container/main` `1200px` frame `border-white/[0.15] ring-white/10 shadow-black/60`) → `getLivePreviewData` → `PublishedSnapshot` `pages[].sections[]` (BuilderStore serialize → `builderPagesToLayoutSnapshot`) → `layoutEngine.resolve(snapshot)` → `doc.pages[].sections[].filter(visible, shouldRenderSection)` → `ExperienceSection` (`section-runtime.tsx` backgroundRuntime, decorationRuntime, dividerRuntime) + `ComponentRenderer` `previewMode` + `section components` (`Hero`, `Products`, `Gallery`… each semantic `<section>` with container `max-w-7xl mx-auto px-6` + card `rounded-xl bg-surface shadow`).

**Where boundaries introduced (with source):**

* **Section wrappers:** `ExperienceSection` `theme-experience.ts:76-104` `background (solid/gradient/mesh/aurora/radial/pattern)` + `divider` (`fade/curve/diagonal`…) + `decoration` (`minimal/dots/.../creator`) + `motion` per `THEME_EXPERIENCES` sections override.
* **Container wrappers:** Section components `max-w` container (`StorefrontPage` + renderers) → `px-6` padding + `mx-auto` → visual gutters.
* **Card surfaces:** Each section’s inner cards (`hero` `products.grid` etc.) `bg-zinc-950` `rounded-xl shadow` `border white/10` — boxed.
* **Spacing:** `LayoutEngine` `spacing.lg/xl` → section `py-12/16` + `gap` between sections (`layout.ts` `sectionGap`).
* **Overflow/clipping:** `overflow-hidden rounded-lg` on frame (`interactive-canvas:308`) + `overflow-auto` on canvas — clips bleed.
* **Alternating surfaces:** `alternateSurface` boolean in `ThemeExperience` toggles subtle surface shift — hard box perception when alternate + divider fade.

---

## Section Boundary Inventory

| Boundary element | Kind | Source |
|---|---|---|
| Page background (`background.kind`) | System | `ThemeExperience.background` `experience-registry` pack (mesh/gradient/aurora) |
| Section surface isolation (`flat` vs `glass` vs `elevated`) | System | `ThemeExperience.surface` per pack → `surface-runtime` `flat` = `bg-surface` etc. |
| Divider fade/curve/diagonal (`divider: "fade"` dominates 9/14 packs) | System | `ThemeExperience.divider` + `divider-runtime.tsx` (`fade` = `h-px bg-gradient-to-r from-transparent via-white/10 to-transparent`) |
| Decoration overlay (`constellation/dots/rings…`) | System | `decoration-runtime.tsx` absolute `pointer-events-none` per section |
| Section gap (`py-16` + `gap` via LayoutEngine) | Layout | `tokens-new.ts spacing.lg/xl` + `LayoutEngine` section padding |
| Container `max-w` + `px-6` | Layout | Section component container (`max-w-7xl mx-auto px-6`) |
| Card `rounded-xl shadow border` | Component | Section renderers `products.grid` etc. `rounded-xl bg-zinc-900 border white/10 shadow-lg` |
| `overflow-hidden rounded-lg` frame | Builder | `interactive-canvas.tsx:308` Builder chrome (not storefront clip but preview clip) |
| Alternating surface `alternateSurface` | Theme | `ThemeExperience.alternateSurface` toggles every other section subtle shift |

All are **hard boxes** in aggregate — no `heroBlend` except hero.

---

## Section Flow Findings

| Section transition | Current boundary mechanism | Severity | Why disconnected | Possible architectural solution |
|---|---|---|---|---|
| Hero → Products | Hero `heroBlend: true` `divider:none` `surface flat` → Products `fade` `particles/waves` (`aurora/velocity`) | **SOFT** (heroBlend already flowing) | hero fades via `heroFadeTo` but Products starts new `background mesh` + `gap py-16` + container `max-w` — intentional separation but gap breaks gradient continuation | Extend `heroBlend` to general `sectionBlend` with shared `background.colors` continuation |
| Products → Gallery | Gallery `divider: fade` + `surface flat` vs Products `glass/soft-glow` + `py-16` gap + card grids boxed | **HARD** | different `surface` (`soft-glow`→`flat`) + `gap` + container + card shadows → hard panel | `sectionFlow: "sharedBackground"` keep same mesh across 2 sections + `softSeparator` not `fade` |
| Gallery → Timeline | Timeline `background mesh` + `icon/rings` decoration | **HARD** | `gap` + container + `rounded-xl` timeline cards boxed | `connectedSurfaces` + reduced `gap` rhythm + `overlap` decoration |
| Timeline → Testimonials | Testimonials `dots` decoration + `flat` | **HARD** | `gap` + `max-w` + card carousel `rounded-xl` | `soft` divider + `image bleed` if gallery has image |
| Testimonials → FAQ | FAQ `faq.default` `border rounded` accordion | **HARD** | FAQ container boxed `border white/10` + `gap` | `edge-to-edge` FAQ without card container, `soft` divider |
| FAQ → Links | Links `grid` | **SOFT** | less content, `gap` still felt | `asymmetric spacing` — tighter `gap` for sparse sections |
| Links → Contact | Contact `form` `rounded-xl bg-surface` boxed | **HARD** | form card `shadow-lg border` strongest box | `occasional intentional card within continuous page` — keep card but background continues behind it, not isolated |
| Contact → Footer | Footer `decoration minimal divider fade reducedDecorations` `classic` style | **SOFT** | footer already minimal, but `py-16` gap before footer still separates | `bleed` footer background `solid` not mesh + reduced `gap` |

All transitions share `gap + container + surface` → **HARD** dominates except hero `heroBlend` which is **SOFT** proof that flowing is possible when `divider:none` + shared background.

---

## Continuous Website Assessment

> **Principle:** Semantic sections independent in structure/editing, visual not isolated containers.

| Capability | Current supported? | Evidence |
|---|---|---|
| shared background continuity | **Only hero→next via `heroBlend`** | `theme-experience.ts:84 heroBlend` only on `hero` variant in 7 packs (`studio, aurora, nebula, cyber, executive, creator, arena`) |
| background transitions (gradient continuation) | **No** | pack `background.colors` per `ThemeExperience` not per section flow; no `sectionBlend` |
| overlapping decorative elements | **No** | `decorationRuntime` absolutely positioned per section, not bridging |
| asymmetric spacing | **No** | `spacing` tokens fixed, `LayoutEngine` gap uniform `py-12/16` |
| section-to-section rhythm | **Partial** | `alternateSurface` toggles, but not rhythmic `large→small` gap variation |
| image bleed (edge-to-edge) | **No** | container `max-w-7xl px-6` + `overflow-hidden` clips |
| soft separators (not hard fade) | **Partial** | `fade` dominates, `soft/glow` exists but not `softSeparator` |
| connected surfaces | **No** | each `ExperienceSection` isolates `surface` |
| edge-to-edge compositions | **No** | `max-w` container always |
| occasional intentional cards | **Yes** | Contact form card is intentional card but background isolated — could keep card while page bg continues |
| alternating emphasis without boxes | **No** | emphasis via `alternateSurface` still boxed |

**Root cause:** System optimized for `cards stacked vertically` (see § Design System Audit) — tokens/components assume isolated containers.

---

## Builder Control Assessment

| Control | Existing | Theme-driven | Hard-coded | Missing |
|---|---|---|---|---|
| section background relationship | Hard-coded `ThemeExperience background` per pack (shared) — not per-section selectable | No | Yes (hard-coded per pack) | **sectionFlow chooser (`isolated`/`shared`/`bleed`)** |
| surface relationship | `SURFACE_PRESETS` global `experienceSurface` override (04) — applies to **all** sections | No per-section | Hard-coded `flat/glass` per pack | **per-section surface** |
| section spacing | `layoutDensity` (compact/comfortable/spacious) global + `spacing` tokens — not per-section | No | `spacing.lg/xl` | **per-section density / gap scale** |
| section transition (divider) | `divider` global `ThemeExperience` + `sections.hero` override only hero | Theme `THEME_EXPERIENCES.sections.hero divider:none` | Hard divider `fade` default | **per-transition divider chooser** |
| decorative treatment | `decoration` global per pack, category fallback | Theme | — | **per-section decoration density** (`reducedDecorations` exists boolean only) |
| full-bleed behavior | Container `max-w` always — **NOT REPRESENTED** | — | Hard `max-w-7xl px-6` | **full-bleed toggle per section** |
| card vs flat section | Card is component-implicit `rounded-xl` — not choosable | — | Hard `rounded-xl` in renderers | **section variant `card` vs `flat`** |
| visual separation intensity | `density` + `surface` only indirect | — | — | **separation slider (`tight`/`comfortable`/`spacious` + `separator intensity`)** |

Only `theme-driven` exists for whole-page, not per-section flow. Builder has **no `sectionFlow` capability** — architecture `NOT REPRESENTED`.

---

## Accessibility Assessment

Future flow MUST preserve:

* semantic `<section>` + `<h1-6>` hierarchy — `ComponentRenderer` already semantic; `ExperienceSection` is visual wrapper not semantic override — preserve.
* keyboard `Tab` order via DOM order — flow via `order` field `page.sections[].order` + `slots[].order` — `heroBlend` does not change DOM order — safe.
* focus `focus-visible:ring-2 ring-indigo-400` (04A) on Builder chips — unchanged by flow.
* contrast: flowing backgrounds must maintain `textPrimary` on `background` — existing `heroFadeTo` already ensures `bg-zinc-950` behind hero text; extending shared mesh must keep `colors` low-contrast stops (`rgba(...,0.06)`) not text.
* reduced-motion: `motion` `static` vs `gradient-shift/float` respects `prefers-reduced-motion`? Currently `motion-runtime` not checked — risk. Must add `reducedMotion: true` handling for future overlapping decor.
* non-color distinction: divider `fade` is subtle `white/10` — acceptable as decorative, not information — but flowing must not remove meaningful boundary for users needing separation — provide `reducedDecorations` or `soft` alternative.
* screen-reader: `ExperienceSection` background/decoration is `aria-hidden` decorative — flowing must keep `aria-hidden` + not inject `alt` noise.
* Builder editing: sections remain independently addressable via `SectionManager` `isSelected` + `BuilderProperties` — flow must be `renderingHints` only, not `store` structure change.

**Risk:** Overlapping decorative `orbits/particles` bridging sections could become `aria-hidden` noise if not `pointer-events-none` and `aria-hidden` — must preserve.

---

## Responsive Assessment

* **320–414:** mobile stacking `flex-col`, `grid-cols-1 gap-2` (04A) for Add Section, appearance `flex-wrap gap-1` chips, `overflow-auto bg-zinc-900/40` canvas `p-8` `min-w-max` ensures no `scrollWidth>clientWidth` (verified `320→1440 over:false`). Gradient transitions `mesh` `aurora` are `radial-gradient(circle_at_…)` with clipped overflow — at 320 may clip glow `center` but not overflow — decorative, not functional. Rounded containers `rounded-lg` `rounded-xl` scale with `max-w` — no overflow. `image bleed` not currently bleeding so no clip.
* **768:** tablet bottom bar `lg:hidden` still, rail hidden, `768px` frame fits, hero `contentWidth` `max-w-xl/2xl/3xl` via `heroTextAlignClass` — responsive.
* **1024+:** rails `280/260` `resizable 200–500` + canvas `overflow-auto` `mx-auto` keeps left edge reachable (71.4.3 `mx-auto` not `justify-center`), no `overflow-x-hidden` used — **PASS**.

Flowing future must not introduce `viewport-height assumptions` (e.g., `100vh` hero) that break at 320 `dvh`; must keep `max-w` decision per section toggleable `full-bleed` without breaking `320` `px-6` safe area.

---

## Builder / Preview / Published Parity

**Canonical chain (BUILDER-02/02B) preserved after BUILDER-04:**

```
Website {themePackageId, themeColors, themeFonts, themeConfig}
 → experienceRegistry.resolve({id,category,premium})
 → applyExperienceOverride(base, themeConfig) // background/surface image + hero
 → resolveExperienceForCapabilities(overridden, planCode)
 → themeResolver.resolveForSnapshot
 → buildRuntimeSnapshot({themePackageId, themeColors, themeFonts, themeConfig, experience})
 → LayoutEngine.resolve → renderingHints.experience
 → canvas (client InteractiveCanvas same 3 steps) === preview loader (storefront-loader.ts:60-118) === publish (publishing/service.ts:219-234)
```

Builder-04 `appearance-panel` `updateTheme` → `appearance:changed` → `getLivePreviewData` → same chain client-side. **No divergence** — snapshot `renderingHints.experience` is baked, so flow via `experience` will automatically parity.

**If Builder/Preview/Published diverge visually today:** Not observed; `preview-gutter` tests (`rccf71-5-2` 5 PASS + `71-5-1` etc.) confirm `frame 375/768/1200` + `overflow-auto p-8 mx-auto` + `bg-zinc-900/40` contract. Section flow hard-box perception is consistent across all three (same `ExperienceSection` code path).

**Do not introduce second theme resolution path** — future `sectionFlow` must be `themeConfig` or `renderingHints` extension threaded via same `buildRuntimeSnapshot` → `LayoutEngine` → `ExperienceSection`.

---

## Browser Verification

**Production:** `https://influencer-space-alpha.vercel.app` (`8bfd351` Builder-04)

**Authenticated Builder session:** Available via `creator@creatorstore.test` / `admin123` (seed namespace) — previous smoke used this. Do **not print** passwords/cookies/tokens.

**This 05 AUDIT browser use:** **Limited — BROWSER VERIFICATION UNAVAILABLE for deep 05 fingerprinting**

* Reason: 05 is programmatic catalog clustering (50 themes) + architecture trace, not visual manual inspection of all 50. Representative theme previews would require Growth/Scale entitlements to unlock premium experiences (`cyber`, `aurora`, `luxury` etc.) — launch plan degrades premium `mesh/aurora` to `solid`/`flat` via `resolveExperienceForCapabilities` (verified in `rccf71-2`). Storefront section flow (hard fade dividers, boxed cards) was **observed** in previous smoke (9 sections, `1200px` frame `border-white/[0.15] ring-white/10`, `heroBlend` soft only hero→products) and matches architecture, but systematic `50-theme × 8-section` screenshot matrix not performed (would require 400+ captures, not AUDIT-FIRST).

* Reuse previous smoke evidence: Builder loads, `8` radiogroups `39` radios, `Publish` solid `bg-emerald-500`, hero helper present, canvas `border/[0.15]`, `320→1440 over:false`, no console errors — all from `PROD-SMOKE-01`.

* Do not fabricate 50-theme screenshots; do not claim exhaustive visual comparison if not performed.

**If full visual matrix required, perform after 05A with Growth plan.**

---

## P0 Findings

**None.** No broken production, data, security, hydration, or theme-resolution failure. BUILDER-04 state-sync (`canonicalRef/versionRef` + `refreshOverview`) intact, no duplicate experience resolution, no stale highlight.

---

## P1 Findings

### P1-01 — Theme catalog duplicates via cosmetic palette permutations

* **Severity:** P1 (materially harms differentiation + conversion)
* **Evidence:** `catalog.ts:57-228` 20 `makeTheme` share same `D.dark` palette helper but experience packs fixed — e.g., `creator-dark` (`#7C3AED/#A78BFA/#0B0B1A`) vs `creator-gold` (`#D4AF37/#F5D06F/#0A0A0A`) both `category creator → experience creator` (`mesh rgba(236,72,153…)`) same `background/surface/decoration/motion/divider`; `gaming-neon` (`#FF2D78/#00E5FF`) vs `gaming-cyber` (`#00FF9F/#B026FF`) both `cyber` pack `hexagons diagonal` — `THEME_TO_EXPERIENCE` maps 4 ids to `cyber`.
* **Impact:** 50 themes perception collapses to ~6 families; selection monotonous; “50 themes” claim erodes trust.
* **Root cause:** Problem A (catalog) + B (architecture caps families at 14 packs, palette not driving experience `background.colors`)
* **Recommendation:** 05A restructure: de-duplicate catalog into **variants within families**, not separate themes; introduce **8–10 families** with dedicated `typography`/`surface`/`decoration`/`divider` distinct per family.

### P1-02 — Single Inter typography system across all themes

* **Severity:** P1
* **Evidence:** `tokens-new.ts:22-29` all themes `headingFont: Inter` `bodyFont: Inter` `displayFont: Inter`; only overrides via `FONT_OPTIONS` (`Geist/Inter/Plex/Mono 4`) global `themeConfig.font` — not per-theme `Serif vs Sans vs Editorial Mono` family change. No `ThemeDefinition` typography family variation (`createTheme` `darkTokens.typography` optional but not used per-family).
* **Impact:** Editorial (`photography-light` description “editorial serif”) still renders Inter — promise vs reality mismatch; cannot express luxury serif, brutalist mono, tech geometric distinctions.

### P1-03 — No per-section flow capability (hard boxes)

* **Severity:** P1
* **Evidence:** `theme-experience.ts:76-104` `SectionExperienceOverride` has `heroBlend` only for hero; general `sectionFlow` missing; `LayoutEngine` gap uniform; `ExperienceSection` `divider fade` dominates; container `max-w-7xl px-6` + `overflow-hidden rounded-lg` prevents `bleed/overlap/shared` .
* **Impact:** Page reads as stacked panels `Hero ↓ hard fade ↓ Products ↓ hard fade ↓ Gallery …` — not continuous narrative (Track B). User observation validated.

---

## P2 Findings

* **P2-01 — Surface/border/radius/shadow single scale** — `tokens-new.ts:42 elevation sm/md/lg/xl` `radius sm/md/lg/xl` shared — luxury vs minimal cannot have distinct `soft-glow` vs `flat` card language per family beyond surface preset 9 options.
* **P2-02 — Card vs flat not theme-driven** — section cards `rounded-xl shadow` hard-coded in renderers, not `ThemeExperience` card treatment.
* **P2-03 — Nav/footer not themed** — nav semantic `StorefrontNav` not per-theme treatment; footer `minimal` only.
* **P2-04 — CTA hierarchy single palette** — `primary/secondary/accent` not per-theme `CTA hierarchy` (e.g., editorial ghost vs luxury solid gold).
* **P2-05 — Decoration `fade` dominance** — 9/14 packs `divider fade` — `wave/curve/diagonal/glow` rare; `aurora/blobs` vs `nebula/orbits` palette distinction subtle on `zinc-950`.

---

## P3 Findings

* **P3-01 — Gradient direction cosmetic** — pack `glow top/center/bottom` + fixed `colors[]` per pack, not per-theme angle — “different gradient directions” observation actually **not variant** in current packs (fixed per pack); future `05A` should avoid adding `angle` alone as differentiation (per § IMPORTANT DECISION RULE).
* **P3-02 — Spacing/density single vocabulary** — `layoutDensity` compact/comfortable/spacious global + `spacing xs–4xl` fixed — not per-family rhythm.
* **P3-03 — Image treatment only when `image` kind** — `image url/opacity` only for `image` background, not general `image bleed` capability.

---

## Recommended Architecture

* **Keep single-authority chain** (`registry → THEME_EXPERIENCES → THEME_TO_EXPERIENCE/CATEGORY_EXPERIENCE → applyExperienceOverride → resolveExperienceForCapabilities → themeResolver → buildRuntimeSnapshot → LayoutEngine → ExperienceSection`) — already BUILDER-02/02B canonical; extend via:

  * `ThemeDefinition.variants[].tokens.typography` per family (distinct `headingFont` families)
  * `ThemeExperience` extend with `card: { radius, shadow, border }` + `nav/footer` variant
  * `SectionExperienceOverride` extend `sectionFlow: "isolated" | "shared" | "bleed" | "overlap" | "softSeparator"` + `spacing: tight/comfortable/spacious` per section + `fullBleed?: boolean`
  * `LayoutEngine` gap becomes `sectionFlow`-aware (shared → no gap, bleed → negative margin + `z-index`)
  * No second resolution path.

---

## Recommended Theme Strategy

* **Restructure 50 → 8–10 families + variants:** e.g., Editorial (serif, `pattern lines flat`), Minimal (sans, `solid flat`), Luxury (serif display, `mesh gold glow luxury`), Creator Bold (sans-bold, `mesh creator soft-glow`), Cinematic Midnight (`solid center constellation`), Tech Cyber (`mesh cyan hexagons diagonal`), Organic Aurora (`aurora blobs gradient-shift`), Brutalist (mono, `pattern grid elevated`), Commerce Executive (`mesh slate rings elevated`), etc. — each family distinct `typography` + `surface` + `decoration` + `divider` + `motion` + `card` + `hero` .
* **De-duplicate catalog:** Turn 20 palette permutations into **family variants** (e.g., `creator-dark` + `creator-light` → `Creator` family `dark/light` modes, not separate pillar themes; `gaming-neon/cyber/matrix` → `Cyber` family `neon/cyber/matrix` variants sharing `hexagons` vs `arena`?).

---

## Recommended Section-Flow Strategy

* **Preserve semantic `section` + editing** (`BuilderStore` `SectionManager`) — flow is purely `renderingHints` visual.
* **Introduce `sectionFlow` contract** via `ThemeExperience.sections[Variant]` + `Website.themeConfig.sectionFlow` (or per-section store `presentation.sectionFlow`? Prefer theme-level default with per-section override via `presentation` — like 04 hero). Values: `isolated` (current `gap + divider fade`), `sharedBackground` (no gap, shared `background mesh` continues), `bleed` (full-bleed `max-w-none px-0` + `overflow-visible`), `overlap` (`-mt-16` decorative overlap), `softSeparator` (`h-8` `bg-gradient-to-b` not hard fade).
* **Start heroic:** Apply `sharedBackground` to `Products→Gallery` (most hard), keep intentional card for `Contact` but behind shared `bg-zinc-950` continuity, not isolated `bg-surface`.
* **No `overflow-x-hidden`**, no `100vh` assumptions, keep `reducedMotion` + `aria-hidden` decorative.

---

## Proposed Next RCCFs

| RCCF | Title | Scope | Gate |
|---|---|---|---|
| **05A** | Theme Visual Family & Catalog Restructuring | 8–10 families with distinct typography/hero/card/nav/footer + de-duplicate 50→variants (no workflow per existing catalog comment) | rccf71-*, builder-presentation, preview-gutter, theme-tier, lint |
| **05B** | Continuous Section Composition | `sectionFlow` contract + LayoutEngine gap + ExperienceSection overlap/bleed/softSeparator + Builder per-section flow control (+ tests, a11y, 320→1440) | builder-03/04 chains, responsive 320→1440, a11y focus/contrast, build |
| 05C (optional) | Per-theme Typography & Card System | If 05A token extension insufficient, introduce per-family `typography/card` primitives | tokens, renderers |

Do not run 05A+05B simultaneously until 05A token families decided — 05B `sharedBackground` needs family background `colors` distinct.

---

## Tests

Established Builder regression verified:

```
rccf-builder-03a (20)         PASS — stable appearance object, optimistic, version guard, stale protection, rollback, refresh
rccf-builder-03b-1 (33)       PASS — radiogroup/radio, arrow/home/end, focus trap, section selection
rccf-builder-03b-2 (21)       PASS — single live region, locked UPGRADE, media alert
rccf-builder-04a (5)          PASS — focus ring, 44px mobile, single-col Add Section
rccf-builder-04b (9)          PASS — labels, save colors, locked/pending, canvas frame, publish primary, preview group, hero/background helpers
builder-core, builder-presentation, preview-gutter (26) PASS
rccf71-1/2/3/5-1/5-2/6-1 theme/preview/entitlement (169) PASS
Total verified 283 PASS across 14 files (110 builder-only 8 files + 130 rccf71 3 files)
No weakening/deletion.
```

05 audit introduces no new test in this closure; 05A/B will add family/sectionFlow tests.

---

## Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** 0 |
| `npm run lint` (`next lint`) | **warnings only** (`tenantId` unused, `next/no-img-element`) — no new Builder errors |
| `npx prisma validate` | **PASS** `The schema at prisma/schema.prisma is valid` |
| `git diff --check` / `git diff --cached --check` | **CRLF warnings only** + 1 `blank line at EOF` in staged audit closures (known) |
| `npm run build` | **160/160 PASS with instrumentation hang after `Collecting build traces`** — `tsc` clean corroborates; not re-run with full build in 05 audit (no source change) — prior 04B build already proved |
| Secret/hygiene | No `.env` staged, no `NEXTAUTH_SECRET`/`sk_` in diff — clean |

---

## Protected Work

* `src/app/onboarding/page.tsx` — 135 lines (BOM→`"use client"` + single CTA) — **byte-identical, not staged**
* `tests/fixtures/test-seed.ts` — 134 lines (uuidv5 + `resetNamespace`) — **byte-identical, not staged**
* `src/lib/storefront/storefront-loader.ts` — 62 lines (`themeConfig: true` + `experienceRegistry → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot`) BUILDER-02/02B — **byte-identical, not staged**
* Unrelated dirty/untracked (`docs/design/Stitch-DNA.md`, marketing screenshots Bin, `.env.example`, `opencode.json`/`package.json`/`skills-lock.json`, `billing.actions.ts`, `StorefrontStatusCard.tsx`, `Button.tsx`, `comparison.ts`, `ComparisonTable` deleted, `tests/e2e/shared/auth.ts`, `rccf-mkt-07`, `.agents/`, `.playwright-mcp/`, `docs/rccf-70/71/72/73`) — **preserved, not staged**

No restore/checkout/reset/stash/rebase/amend.

---

## Git State

```
HEAD: 8bfd351bc165672690f5f2cef5fd2168d63a77ea (builder: release visual ux and theme controls)
origin/main: same 8bfd351 — verified HEAD == origin/main
Staged: clean (no staged diff post-release)
Working-tree: 23 pre-existing dirty (M/D) + untracked docs/skills/agents — Builder-04 files clean post-release
This audit document: untracked docs/rccf-builder-05-theme-diversity-section-flow-audit-closure.md (allowed, audit only)
No commit/push/amend/reset/stash/rebase in 05 audit.
```

---

## Deferred Work

* P3 cosmetic gradient angle/permutation and chip density and drag remain KEEP AS-IS per 04C — not reopened.
* 05A/B implementation deferred until evidence reviewed — no source created here.
* Browser exhaustive 50-theme matrix deferred (requires Growth plan entitlement for premium families).

---

## Final Conclusion

**Theme diversity problem is real and architectural + catalog (P1). Section flow hard-box problem is real and architectural (P1).** 50 themes collapse to ~6 families due to 14 experience packs + palette-only catalog; typography/card/nav distinctiveness `NOT REPRESENTED`; section composition is `isolated gap + fade divider + card box` with only `heroBlend` flowing. **Smallest correct next steps are 05A (family restructuring with distinct typography/card) and 05B (continuous composition via sectionFlow) — audited here, not implemented. Builder-03/04 contracts remain intact and production smoke passed.**

**HARD STOP — no source modification, no commit, no push. Next RCCF to decide from this evidence.**

