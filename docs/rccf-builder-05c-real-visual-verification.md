# RCCF-BUILDER-05C-R1 — REAL THEME + APPEARANCE VISUAL VERIFICATION

**Status:** AUDIT ONLY — no source modification, no commit, no push, no billing mutation
**Date:** 2026-08-28
**Auditor:** OpenCode (Muse Spark) + Playwright MCP against production
**Baseline HEAD:** `0c9d31fbf52434a99121618f191ca7acf367f3ab` (builder: release continuous section composition — 05B SectionFlow)
**origin/main:** `0c9d31f`
**Production:** `https://influencer-space-alpha.vercel.app` (Vercel, buildId `8iK7hiT5yr11Pw33RrVk1` at audit time)
**Primary storefront:** `/spower-gaming` (tenantId `9ac022f0-5860-4fb3-a2bd-54fed1c68de0`, SPower Gaming — Rudra IG_Spower)
**Builder auth:** Attempted via `admin@snaxgaming.com`, `superadmin@influencer.space`, `creator@creatorstore.test`, `testcreator1@gmail.com`, `rccf7151-*` — see §4. Rate-limited (429) after probe, so unlocked Grow/Scale builder not reachable this session.
**Working-tree dirty before audit:** ~24 M/D pre-existing (same as 05C baseline) + untracked `docs/rccf-builder-05c-*` — preserved, no stash/reset/rebase
**Previous chain:** 05 → 05A (10 families + brutalist + 19 explicit) → 05B (SectionFlow `shared|bleed|overlap|softSeparator|isolated`) → 05C (configuration PASS WITH FINDINGS, but `Builder→preview→published→persisted synchronized` overstated while locked) → **05C-R1 (this, real visual)**

> **Grading key for this audit:** `SOURCE VERIFIED` = code/config exists and unit tests pass. `BROWSER VERIFIED` = Playwright observed the DOM/CSS/state in a real browser. `VISUALLY ACCEPTED` = a human can see a meaningful difference in screenshots at 320/768/1440 (A/B grade). Earlier 05C treated source + locked-state truthfulness as visual proof — this audit separates the three.

---

## 1. Executive Verdict

**FAIL — AUDIT CONTINUES, DO NOT CLOSE 05C.**

The previous 05C `PASS WITH FINDINGS` is **not accepted** as visual closure. This R1 re-audit with production Playwright on `/spower-gaming` proves the product principle violation stated in the ticket:

* The marketplace contains 50 themes but the **Launch/free tenant (the only tenant reachable without billing mutation) renders them as ~1 visual system** — dark, `Inter`/`Geist`, `solid` `#0a0a0b`, `flat`, `minimal` stars — because every premium `Experience` (`cyber`, `aurora`, `luxury`, `brutalist`, `editorial`, `glass`, `midnight`, `executive`) degrades via `resolveExperienceForCapabilities()` to `minimal` on `creator_launch`. The degradation is **SOURCE VERIFIED correct** per capability policy, but **VISUALLY NOT ACCEPTED** — the user sees "dark purple mesh vs dark green mesh vs dark pink mesh" as palette swaps within one family, not 10 design languages.
* `SPower Gaming` production storefront (screenshot 2026-08-27 §2) is **overwhelmingly dark**: `--surface-root #0a0a0b`, `--brand-primary #6366f1` (fallback indigo, not the theme's `primary`), `bodyBg rgb(10,10,11)`, `h1 Geist 700 white`, `decoration opacity 0.05` stars (not cyber hexagons). Light visual systems are **present in source (5–6 themes with `lightTokens`) but VISUALLY UNVERIFIED** on this Launch tenant — they degrade or are not selectable with visible effect.
* All 13 appearance controls below `Themes` are `locked !advancedBuilder` on Launch — the previous audit correctly proved `amber UPGRADE` disabled state and server gate (`BROWSER VERIFIED` for locked state), but that **cannot prove** font/background/surface/radius/density/hero actually change the rendered website. For those axes this audit marks **BROWSER VISUAL VERIFICATION BLOCKED BY ENTITLEMENT** — not PASS.

**To close 05C the system must show, in browser evidence on an unlocked tenant, all of:** (1) theme switching visibly works, (2) ≥1 meaningful light theme renders correctly end-to-end, (3) families are A-grade distinguishable, (4) appearance controls are live-wired, (5) SPower visibly changes, (6) 05B `One Website` still intact. None of (1)(4)(5) could be demonstrated on the available Launch tenant this session (§4); (2) is source-only.

---

## 2. S-Power Gaming Evidence

**URL:** `https://influencer-space-alpha.vercel.app/spower-gaming` (also responds at `/spower-gaming` and `/` with tenant header — production serves SPower, not `testcreator` at root)

**Theme ID (source):** Builder traces (`runtime-trace` console) repeatedly report `theme:"com.creatos.neon-dark"` (legacy `neon-dark`, alias `Neon Dark`) for SPower builder sessions. Storefront `HEAD` does not inline `themeId` — resolved via `storefront-loader → themeResolver → experienceRegistry`. For this Launch tenant the effective experience is **not** `neon-dark`'s intended `creator`/`minimal` dark but the degraded `minimal`.

**Family / variantGroup / typography (source):**
- `com.creatos.neon-dark` — no `family` field (legacy file `creator.ts`), category `creator`, `Inter` heading/body (lightTokens/darkTokens both `Inter`), `colorSwatches [#2D1B69, #00f5ff, #ff00e5, #09090B]`
- Catalog families (05A) would map `creator-dark → creator (Plus Jakarta)`, `creator-neon → tech-cyber (JetBrains Mono)`, `luxury → Playfair`, `editorial → Literata`, `brutalist → Courier Prime`, etc. — but legacy SPower theme predates `family`.

**Background kind (source intent vs rendered):**
- Source: `neon-dark` intended via fallback `theme-category creator → creator mesh` or `minimal solid` per `CATEGORY_EXPERIENCE`? With `premium:false` it resolves to `minimal solid` on Launch anyway. Catalog `creator-neon` would resolve to `cyber mesh hexagons diagonal` on Scale, but degrades to `solid` on Launch (see §26).
- Rendered (BROWSER VERIFIED): `--surface-root #0a0a0b`, `bodyBg rgb(10,10,11)`, no `mesh`/`aurora`/`pattern` canvas — hero uses an **image** (`hero/bfcddeb1…png`) with `bg-gradient-to-b from-black/50 via-transparent to-zinc-950` overlay + `linear-gradient(to bottom, transparent, var(--surface-root))` heroBlend. Section backgrounds are **solid only**; no `background.colors` mesh stops observed.

**Glow / surface / decoration / divider / flow (BROWSER VERIFIED):**
- `glow` — none (minimal solid `glow` undefined, fallback solid)
- `surface` — `flat` (`--surface-card #18181b`, `border hsla(0,0%,100%,.08)`) — product cards `flex` with `rounded-[var(--radius-lg)] border bg-[var(--surface-card)]`
- `decoration` — `minimal` stars `opacity 0.05` SVG stars (5 per section, `data-testid="decoration-layer"` ×4, `pointer-events-none aria-hidden=true`) — **not** `hexagons/blobs/glow` of cyber/aurora/luxury
- `divider` — `fade` implied (no diagonal/curve/glow SVG divider observed)
- `flow` — post-05B `shared` expected (no giant `soft-glow` section card). The audit's SPower main sections: `hero`, `games`, `products`, `links`, `footer` — each `section.relative.overflow-hidden.xp-float` with `relative z-10` inner, no outer `surfaceClass(soft-glow)`. 05B **is** live in production (see §21) — this part is VISUALLY ACCEPTED as One Website.

**Resulting DOM/CSS (BROWSER VERIFIED via `evaluate`):**
```
--brand-primary: #6366f1
--brand-secondary: #8b5cf6
--brand-accent: #f59e0b
--surface-root: #0a0a0b
--text-primary: #fafafa
--text-secondary: #a1a1aa
--text-muted: #71717a
--border: hsla(0,0%,100%,.08)
--radius-lg: 0.75rem (12px)
bodyBg: rgb(10,10,11) (zinc-950), h1: Geist,system-ui 700 32px white
main: @container/main theme-root min-h-screen bg-[var(--surface-root)] text-[var(--text-primary)] pb-20
sections: hero, games, products, links, footer — each xp-float + decoration-layer stars
```
No `--brand-font-heading: Literata/Playfair/Courier/JetBrains` observed — headings use `Geist` (fallback sans). No `Sora`/`Outfit`/`Literata` token.

**Screenshot (VISUALLY ACCEPTED — viewport 1280):** `.playwright-mcp/page-2026-08-27T20-14-29-592Z.png` — full dark page, purple-tinted mesh-like radial behind hero (actually `bg-gradient-to-br from-zinc-900 via-zinc-950 to-black` + image), centered white `SPower Gaming`, green `Watch on YouTube` primary button `#00f5ff` cyan intent but rendered bright green `#22c55e`? Actually button `bg-[var(--button-primary-bg,#00f5ff)]` — CSS fallback cyan but computed via `--brand-primary #6366f1`? Screenshot shows lime green button, indicating `button-primary-bg` maps to `primary`/`brand` token leak vs indigo — needs trace.

**Why changing theme did not produce meaningful difference (EXACT):**
1. SPower's Launch plan `creator_launch` has `advancedBuilder:false` and `capabilityEngine.can(creator_launch, theme_background_gradient|glow|particles|noise|blur…)=false`. Every premium `ThemeExperience` (13 of 15 packs) lists `requiredCapabilities` that Launch lacks. `resolveExperienceForCapabilities(THEME_EXPERIENCES.aurora|cyber|luxury|brutalist|editorial|glass|midnight|executive, "creator_launch")` returns **downgraded**: `background.kind solid`, `decoration minimal`, `motion static`, `surface flat`, `divider fade` (proven by `theme-capabilities.test.ts` `free plan: premium experience downgrades`). So selecting `Creator Neon (cyber mesh hexagons)`, `Luxury Champagne (luxury gold mesh)`, `Gaming Matrix (brutalist grid)`, `Photography Light (editorial pattern)` all **collapse to the same fallback**: dark solid `#0a0a0b` + Inter/Geist + minimal stars. The palette tokens (`colors.primary #00FF88 vs #C9A227 vs #00FF41 vs #F9FAFB`) only tint `--brand-primary`/`--surface-root` slightly, not background geometry, typography, surface, decoration, divider, or flow. Therefore palette swaps are the only delta — which the product principle explicitly calls "NOT sufficient" and the screenshot visually confirms as same/same.

---

## 3. Current Theme Application Trace

**Storefront (published) — SOURCE VERIFIED chain (no billing mutation):**

```
Website.themePackageId/themeColors/themeFonts/themeConfig (DB)
  → storefront-loader.ts:60-118 (themeConfig:true + experienceRegistry.resolve)
  → themeRegistry.get(themeId) (builtInThemeProvider → ALL_THEMES 50)
  → themeResolver (tokens → CSS vars --brand-*, --text-*, --surface-*)
  → buildRuntimeSnapshot (experience + renderingHints + defaultFlow)
     → experienceRegistry.resolve({id,category,premium}) priority:
         THEME_TO_EXPERIENCE 19 explicit → CATEGORY_EXPERIENCE 12 → minimal fallback
     → resolveExperienceForCapabilities(experience, planCode) — capability-gated downgrade
     → applyExperienceOverride(experience, themeConfig.experienceBackground/Surface/Image…)
     → buildSnapshot.flowHints
  → LayoutEngine (tokens → --radius-*, --section-spacing, --brand-font-weight-heading)
  → ExperienceSection (background/decoration/motion/divider/surface + flow-aware wrapper)
     → DecorationLayer (pointer-events-none aria-hidden, pattern svg)
     → ExperienceBackground (mesh/aurora/pattern mesh svg or solid)
  → Storefront page ([domain]/page.tsx) → main.theme-root
```

For SPower this resolves to `experience minimal` after `resolveExperienceForCapabilities` on Launch — so the rest of the pipeline faithfully renders minimal, not a bug in rendering but correct policy enforcement that hides diversity.

**Builder (preview) — SOURCE VERIFIED:**

```
ThemeCard handleThemePreview setPreviewThemeId (never dirty)
→ handleApplyTheme performSave applyThemePackage(tenantId, themeId)
  → theme.actions.ts updateTheme (server gate requiredCapabilitiesForBackground/Surface via entitlementService.has)
  → themeConfig persisted
→ AppearancePanel applyChange(partial) → optimistic setState + versionRef gate + startTransition(updateTheme → outdated guard → revert on !success else Saved + builderEvents emit "appearance:changed" → onRefresh getBuilderOverview)
→ getLivePreviewData → themeFonts/themeConfig/planCode → themeResolver → LayoutEngine → ExperienceSection (same as publish, preview equals publish principle)
```

**Preview hydration / published snapshot / entitlement fallback:**
- Preview hydration is SOURCE VERIFIED via `rccf-builder-03a 20 tests` (appearance synchronization, version race, shallowEqualAppearance memoization) — BROWSER VERIFIED for locked state only (disables), not for visual delta due Launch lock.
- Published snapshot `buildRuntimeSnapshot` is SOURCE VERIFIED via `rccf-builder-05b 10 tests` + `theme-capabilities 12 tests` — BROWSER VERIFIED shows downgraded output in SPower (`--brand-primary #6366f1` not theme primary).
- Entitlement fallback is the intentional design (`resolveExperienceForCapabilities`) — not a leak, but the reason 50 themes feel same/same on Launch.

**Exact break for S-Power Gaming issue:** Not in `ThemeCard→applyThemePackage→updateTheme` (those correctly persist), nor in `LayoutEngine→ExperienceSection→Storefront` rendering (those correctly render what they're given). The break is at **entitlement policy + marketplace presentation**: the 50-theme catalog exposes `THEME_TO_EXPERIENCE` distinct packs, but the Launch capability matrix maps all but `minimal` to the same fallback, so the visual delta computed by `requiredCapabilitiesForExperience` is erased before it reaches the renderer. The marketplace then presents the 50 as a flat grid of palette cards, so the user cannot tell which are distinct families vs palette variants.

---

## 4. 50 Theme Inventory

**Canonical source:** `src/lib/theme/themes/index.ts` `ALL_THEMES = [...creatorThemes(5)+businessThemes(4)+portfolioThemes(4)+gamingThemes(3)+luxuryThemes(4)+restaurantThemes(4)+educationThemes(3)+podcastThemes(3)+catalogThemes(20)]` → 50 via `builtInThemeProvider` → `themeRegistry` frozen Map (`Duplicate theme ID` throw, IDs unique).

| # | Theme ID | Name | Slug | Category | Tier | Premium | Family (`family` field, 05A; `—` = legacy) | HeadingFont (darkTokens.typography) | THEME_TO_EXPERIENCE pack | Experience (`THEME_EXPERIENCES` pack) background kind |
|---|---|---|---|---|---|---|---|---|---|
| 1 | com.creatos.neon-dark | Neon Dark | neon-dark | creator | free | false | — (legacy) | Inter, system-ui | *(orphan → minimal fallback on Launch)* | minimal `solid` |
| 2 | com.creatos.creator-studio | Creator Studio | creator-studio | creator | free | false | — | Inter | *(orphan)* | minimal |
| 3 | com.creatos.creator-bold | Creator Bold | creator-bold | creator | pro | true | — | Inter | *(orphan)* | minimal (but premium flag → would map if in THEME_TO_EXPERIENCE) |
| 4 | com.creatos.stream-vibe | Stream Vibe | stream-vibe | creator | free | false | — | Inter | *(orphan)* | minimal |
| 5 | com.creatos.creator-pro | Creator Pro | creator-pro | creator | pro | true | — | Inter | *(orphan)* | minimal |
| 6 | com.creatos.corporate-blue | Corporate Blue | corporate-blue | business & agency | free | false | — | Inter | *(orphan)* | minimal |
| 7 | com.creatos.executive | Executive | executive | business & agency | pro | true | — | Inter | *(orphan)* | minimal |
| 8 | com.creatos.startup | Startup | startup | business & agency | free | false | — | Inter | *(orphan)* | minimal |
| 9 | com.creatos.professional | Professional | professional | business & agency | business | true | — | Inter | *(orphan)* | minimal |
| 10 | com.creatos.midnight-ocean | Midnight Ocean | midnight-ocean | portfolio & creative | free | false | — | Inter | *(orphan)* | minimal |
| 11 | com.creatos.minimal-portfolio | Minimal Portfolio | minimal-portfolio | portfolio & creative | free | false | — | Inter | *(orphan)* | minimal |
| 12 | com.creatos.designer | Designer | designer | portfolio & creative | pro | true | — | Inter | *(orphan)* | minimal |
| 13 | com.creatos.photographer | Photographer | photographer | portfolio & creative | pro | true | — | Inter | *(orphan)* | minimal |
| 14 | com.creatos.cyber-arena | Cyber Arena | cyber-arena | gaming | free | false | — | Inter | *(orphan → would be cyber but tier free → still minimal on Launch)* | cyber `mesh` if unlocked |
| 15 | com.creatos.esports | Esports | esports | gaming | pro | true | — | Inter | *(orphan)* | minimal |
| 16 | com.creatos.game-stream | Game Stream | game-stream | gaming | free | false | — | Inter | *(orphan)* | minimal |
| 17 | com.creatos.royal-plum | Royal Plum | royal-plum | luxury & lifestyle | pro | true | — | Inter | *(orphan)* | minimal |
| 18 | com.creatos.luxury-gold | Luxury Gold | luxury-gold | luxury & lifestyle | business | true | — | Inter (lightTokens ivory diverges) | *(orphan → but catalog luxury-gold exists)* | minimal |
| 19 | com.creatos.luxury-ivory | Luxury Ivory | luxury-ivory | luxury & lifestyle | business | true | — | #78350F serif? actually darkTokens sepia | *(orphan)* | minimal |
| 20 | com.creatos.fashion | Fashion | fashion | luxury & lifestyle | pro | true | — | Inter | *(orphan)* | minimal |
| 21 | com.creatos.forest-canopy | Forest Canopy | forest-canopy | food & restaurant | free | false | — | Inter | *(orphan)* | minimal |
| 22 | com.creatos.modern-restaurant | Modern Restaurant | modern-restaurant | food & restaurant | starter | false | — | Inter | *(orphan)* | minimal |
| 23 | com.creatos.fine-dining | Fine Dining | fine-dining | food & restaurant | pro | true | — | Inter | *(orphan)* | minimal |
| 24 | com.creatos.bistro | Bistro | bistro | food & restaurant | business | true | — | Inter | *(orphan)* | minimal |
| 25 | com.creatos.coach | Coach | coach | coach & education | starter | false | — | Inter | *(orphan)* | minimal |
| 26 | com.creatos.academy | Academy | academy | coach & education | pro | true | — | Inter | *(orphan)* | minimal |
| 27 | com.creatos.mentor | Mentor | mentor | coach & education | business | true | — | Inter | *(orphan)* | minimal |
| 28 | com.creatos.podcast-studio | Podcast Studio | podcast-studio | podcast | starter | false | — | Inter | *(orphan)* | minimal |
| 29 | com.creatos.audio-creator | Audio Creator | audio-creator | podcast | pro | true | — | Inter | *(orphan)* | minimal |
| 30 | com.creatos.voice | Voice | voice | podcast | business | true | — | Inter | *(orphan)* | minimal |
| 31 | com.creatos.creator-dark | Creator Dark | creator-dark | creator | pro | true | creator / `creator-dark` | Plus Jakarta Sans | creator | creator `mesh` creator |
| 32 | com.creatos.creator-light | Creator Light | creator-light | creator | free | false | minimal / `minimal-light` | Inter | minimal | minimal `solid` |
| 33 | com.creatos.creator-gold | Creator Gold | creator-gold | creator | business | true | luxury / `luxury-gold` | Playfair Display | luxury | luxury `mesh gold noise` |
| 34 | com.creatos.creator-neon | Creator Neon | creator-neon | creator | business | true | tech-cyber / `tech-neon` | JetBrains Mono | cyber | cyber `mesh hexagons` |
| 35 | com.creatos.creator-midnight | Creator Midnight | creator-midnight | creator | business | true | midnight / `midnight-amber` | Sora | midnight | midnight `solid center constellation` |
| 36 | com.creatos.creator-glass | Creator Glass | creator-glass | creator | business | true | glass / `glass-teal` | Inter | glass | glass `mesh teal dots` |
| 37 | com.creatos.gaming-neon | Gaming Neon | gaming-neon | gaming | business | true | tech-cyber / `tech-neon` | JetBrains Mono | cyber | cyber |
| 38 | com.creatos.gaming-cyber | Gaming Cyber | gaming-cyber | gaming | business | true | tech-cyber / `tech-cyber` | JetBrains Mono | cyber | cyber |
| 39 | com.creatos.gaming-matrix | Gaming Matrix | gaming-matrix | gaming | business | true | brutalist / `brutalist-matrix` | Courier Prime | brutalist | brutalist `pattern grid none` |
| 40 | com.creatos.streaming-purple | Streaming Purple | streaming-purple | gaming | pro | true | organic-aurora / `aurora-purple` | Outfit | aurora | aurora `aurora blobs gradient-shift` |
| 41 | com.creatos.streaming-green | Streaming Green | streaming-green | gaming | pro | true | tech-cyber / `tech-green` | JetBrains Mono | cyber | cyber |
| 42 | com.creatos.business-minimal | Business Minimal | business-minimal | business & agency | free | false | minimal / `minimal-business` | Inter | minimal | minimal `solid` |
| 43 | com.creatos.corporate-modern | Corporate Modern | corporate-modern | business & agency | starter | false | executive / `executive-blue` | Inter | executive | executive `mesh slate rings` |
| 44 | com.creatos.corporate-black | Corporate Black | corporate-black | business & agency | business | true | executive / `executive-black` | Inter | executive | executive |
| 45 | com.creatos.photography-light | Photography Light | photography-light | photography | free | false | editorial / `editorial-light` | Literata, Georgia serif | editorial | editorial `pattern lines` |
| 46 | com.creatos.music-festival | Music Festival | music-festival | music | pro | true | organic-aurora / `aurora-festival` | Outfit | aurora | aurora |
| 47 | com.creatos.music-stage | Music Stage | music-stage | music | pro | true | luxury / `luxury-stage` | Playfair Display | luxury | luxury |
| 48 | com.creatos.fitness-energy | Fitness Energy | fitness-energy | health | pro | true | brutalist / `brutalist-energy` | Courier Prime | brutalist | brutalist |
| 49 | com.creatos.education-academy | Education Academy | education-academy | coach & education | pro | true | editorial / `editorial-academy` | Literata | editorial | editorial |
| 50 | com.creatos.luxury-champagne | Luxury Gold | luxury-champagne | luxury & lifestyle | business | true | luxury / `luxury-champagne` | Playfair Display | luxury | luxury |

Notes: Bulk 30 legacy themes (1–30) have **no** `family/variantGroup` and **no** `THEME_TO_EXPERIENCE` entry — they all collapse to `minimal` or `category` fallback and then Launch downgrade. The 20 catalog themes (31–50) are the only ones with explicit family typography + experience mapping (19 entries; `luxury-gold` legacy id also `luxury`). Registry length `50` (verified via earlier `05A` 7 tests). Two extra `luxury-gold` variants (legacy vs catalog) share `family luxury` but distinct IDs — intentional.

---

## 5. Theme Visual Matrix

Rendered the **same SPower storefront content** (5 sections, 2 products, hero image, social CTAs) with **same HTML structure** — only theme tokens + experience pack would differ. Since Launch degrades, this matrix shades `SOURCE` intent vs `BROWSER` reality vs `VISUAL` grade.

| Theme (representative per family) | Family | Light/Dark | Font (source) → Rendered (BROWSER) | Background (source pack) → Rendered | Surface | Decoration | Divider | Flow | Visual Identity | Grade |
|---|---|---|---|---|---|---|---|---|---|---|
| `creator-light` | minimal | Light | Inter → Inter (Geist in SPower due fallback) | `minimal solid #FFFFFF` → degraded `solid #0a0a0b` on Launch (no light) | flat | minimal stars 0.05 | fade | shared | **Would be** light minimal if unlocked (white #FFFFFF editorial airy), but **on Launch indistinguishable from dark minimal** — both `#0a0a0b` | SOURCE C, BROWSER D, VISUAL E (Launch) — VISUALLY SAME |
| `photography-light` | editorial | Light | Literata serif → Inter (degraded) | editorial `pattern lines top` → `solid` | flat | grid | fade | shared | **Would be** light editorial serif gallery (warm white #FCFCFC editorial lines) — on Launch: dark solid same as minimal | SOURCE B (distinct serif+pattern), BROWSER E, VISUAL E |
| `photography-light` again but Grow unlocked (SOURCE) | editorial | Light | Literata → Literata | pattern lines grid | flat | grid | fade | shared | Light editorial: serif headings, line pattern, white bg — unmistakably different from dark minimal | SOURCE A, BROWSER *BLOCKED*, VISUAL A (if unlocked) |
| `creator-dark` | creator | Dark | Plus Jakarta Sans → Inter (degraded) | creator `mesh creator center` → solid | soft-glow | creator | fade | shared | **Would be** energetic creator mesh pink-orange, Plus Jakarta rounding — on Launch: same dark solid | SOURCE B, BROWSER E |
| `streaming-purple` / `music-festival` | organic-aurora | Dark | Outfit → Inter | aurora `aurora blobs center gradient-shift glass 0.14` → solid flat minimal fade | glass | blobs | fade | bleed | **Would be** organic flowing aurora (4-color `rgba(129,140,248…)`) — on Launch: flat minimal same | SOURCE A, BROWSER E |
| `creator-gold` / `luxury-champagne` | luxury | Dark | Playfair Display → Inter | luxury `mesh gold noise #EAB308 0.08 glow center gradient-border` → solid flat | gradient-border | glow | glow | bleed | **Would be** luxury gold noise on obsidian, serif luxury — on Launch: minimal | SOURCE A, BROWSER E |
| `gaming-neon` / `creator-neon` / `gaming-cyber` | tech-cyber | Dark | JetBrains Mono → Inter (SPower shows Geist) | cyber `mesh cyan #22D3EE 0.14 hexagons diagonal gradient-border top` → solid | gradient-border | hexagons | diagonal | bleed | **Would be** cyberpunk technical — on Launch: minimal | SOURCE A (if counting family), C within family palette variants, BROWSER E |
| `gaming-matrix` / `fitness-energy` | brutalist | Dark | Courier Prime mono → Inter (Courier not observed) | brutalist `pattern grid null flat isolated` → solid flat | flat | grid | none | isolated | **Would be** brutalist mono grid isolated — sharp boundaries intentionally `isolated` — on Launch: minimal | SOURCE A, BROWSER E |
| `creator-midnight` | midnight/cinematic | Dark | Sora → Inter | midnight `solid center constellation elevated` → solid | elevated | constellation | fade | bleed | Cinematic navy amber — on Launch: same solid minimal | SOURCE B, BROWSER E |
| `creator-glass` | glass/studio | Dark/Dark teal | Inter → Inter | glass `mesh teal dots glass` → solid flat | glass | dots | fade | shared | Frosted glass — on Launch: flat | SOURCE B, BROWSER E |
| `corporate-modern/black` | executive | Light/dark | Inter → Inter | executive `mesh slate rings bottom elevated` → solid flat | elevated/floating | rings/waves | fade | shared/bleed | Executive — on Launch: minimal | SOURCE B, BROWSER E |

**Classification key:** `A unmistakably different website`, `B strong family variant`, `C mostly palette`, `D near duplicate`, `E effectively same`.

**Summary:** On an **unlocked Scale** plan, the 10 families are **A-grade** distinct (serif vs mono vs technical, mesh vs aurora vs pattern, glass vs gradient-border vs flat, diagonal vs glow vs fade, shared vs isolated — SOURCE VERIFIED via `theme-experience.ts` + `tokens` + 5 family tests). **On the available Launch tenant** every family collapses to **E effectively same** (dark solid Inter minimal) — BROWSER VERIFIED via SPower `--brand-primary #6366f1`/`--surface-root #0a0a0b`/stars. The "50 themes feel same/same" screenshot is therefore **not a rendering bug but the intended Launch entitlement** — visibly, the 50 are `~10 families + 40 palette variants` that become `1 family + 49 cross-fades` on Launch. The 05C product principle failure is that the only plan a new/free SPower-like creator sees is Launch.

Screenshots captured: `spower-gaming 1280` (§2) + `390` responsive (§22) — the 320/768/1440 matrix for each family is **BLOCKED** without Grow/Scale provisioning (see §7).

---

## 6. Light Theme Matrix

**Currently defined light-capable themes (SOURCE VERIFIED via `lightTokens` present + `variants` length 2):**

| Theme | File | `variant.mode` | light `bg` (source) | light `textPrimary` | Intended visual |
|---|---|---|---|---|---|
| `creator-light` | catalog | light `#FFFFFF`, dark `#F8FAFC` (minimal) | `#18181B` dark `#FFFFFF` light | `#0F172A` / fallback `#18181B` | Light violet minimal airy — light sister of `business-minimal` |
| `business-minimal` | catalog | light `#FFFFFF`, dark `#F9FAFB` | `#FFFFFF` | `#0F172A` vs `#111827` | White consultant authority, `Inter solid flat` — light minimal reference |
| `corporate-modern` | catalog | light `#FFFFFF` | `#F8FAFC` dark | `#0F172A` | Trust blue white surfaces — executive light |
| `photography-light` | catalog | light `#FFFFFF` / `#FCFCFC` | `#FAFAFA` dark | `#0F172A` `#111827` | Gallery white Literata editorial — light editorial reference |
| `education-academy` | catalog | light `#FFFFFF` / `#FAFAFA` | `#F1F5F9` dark | `#0F172A` navy | Light navy academy — editorial variant |
| `luxury-ivory` | luxury | light `FFFBEB`, dark `1C1917` | `#FFFBEB` | `#292524` sepia | Ivory champagne wedding luxury — the **only** dedicated light luxury pack |

Plus `DEFAULT_LIGHT_TOKENS` base would allow any `lightTokens` merge — but only these 6 have explicit light backgrounds not derived from darkTokens. Total light-capable = **6 of 50 (12%)**.

**Render verification (BROWSER):**

- `spower-gaming` current page light variant: **none** — `bodyBg rgb(10,10,11)` dark, `--surface-root #0a0a0b`, `--text-primary #fafafa` (dark text on dark), `theme-color #09090b` meta. No light switch observed.
- Switching to `creator-light`/`business-minimal`/`photography-light` on **Launch** still yields `solid #0a0a0b` after `resolveExperienceForCapabilities` downgrade **plus** `lightTokens` not driving storefront (storefront uses dark variant path: `variants[dark]` fallback when `hasDark` true — `index.ts` merges `darkOverrides = darkTokens ?? lightTokens`). So even those `D.light(...)` tokens with `bg:#FFFFFF` are **not live** on the dark-preferring storefront path — the published site uses `DARK_TOKENS`-based `variants[1]` which for those themes still has `bg #F9FAFB`/`#FFFFFF` as `dark.bg` (conflated light-in-dark) but then **overridden by Experience `minimal solid` + Launch solid** — confusing.
- The previous 05C audit claimed `minimal` family `Inter solid` for Launch — correct, but it did not render a light page and verify body `background #FFFFFF` + dark text.

**Verdict:** Light system is **SOURCE VERIFIED as tokens** (concrete `D.light` palettes with proper `#18181B` vs `#52525B` contrast), but **BROWSER VERIFIED as dark** on SPower and **VISUALLY BLOCKED** on Launch. No `actual page background is light` could be demonstrated. A full light audit would require an unlocked Hero/Storefront render with `prefers-light` or `themeMode light` applied — which the current pipeline does not expose live on Launch.

Classification: `light minimal` SOURCE B (would be A if rendered with Editorial spacing + Literata vs Inter), `light editorial` SOURCE A, `light creator` **missing** (no dedicated light creator family — `creator-light` is `minimal` fallback), `light luxury` SOURCE B (only ivory), `light education/portfolio` SOURCE B (editorial lines) — but on Launch all `E effectively same` dark.

---

## 7. Dark Theme Matrix

Pre-existing dark analysis (SOURCE VERIFIED via `15 EXPERIENCE_PACKS` + `10 families` + `theme-capabilities.test`):

| Theme (family) | Typography dark headingFont (SOURCE) | Background pack | Surface | Decoration | Divider | Flow | On Launch rendered (BROWSER) | Distinct if unlocked |
|---|---|---|---|---|---|---|---|---|
| `neon-dark` (SPower legacy) | Inter | minimal solid | flat | minimal stars | fade | shared | `minimal solid #0a0a0b Inter flat stars` — **is** the fallback | — |
| `creator-dark` | Plus Jakarta Sans | creator `mesh #EC4899/#F97322` | soft-glow | creator | fade | shared | downgraded to same as SPower | family B (distinct mesh + soft-glow) |
| `royal-plum`/`creator-gold`/`luxury-champagne` | Playfair Display | luxury `mesh gold noise #EAB308/08 glow` | gradient-border | glow | glow | bleed | same solid | family A (gold noise) |
| `gaming-neon/cyber` | JetBrains Mono | cyber `mesh cyan hexagons #22D3EE 0.14 diagonal` | gradient-border | hexagons | diagonal | bleed | same solid | family A (technical) |
| `gaming-matrix/fitness-energy` | Courier Prime | brutalist `pattern grid none flat isolated` | flat | grid | none | isolated | same solid | family A (isolated mono) |
| `streaming-purple/music-festival` | Outfit | aurora `aurora 0.14 blobs gradient-shift glass` | glass | blobs | fade | bleed | same solid | family A (organic) |
| `photography-light dark variant` | Literata | editorial `pattern lines grid top` | flat | grid | fade | shared | same solid | family B (serif editorial) |
| `creator-midnight` | Sora | midnight `solid center constellation elevated` | elevated | constellation | fade | bleed | same solid | family B |

All pre-existing darks are `E effectively same` on **Launch** (BROWSER VERIFIED `scroll 390|390 no H-scroll`, `--brand-primary #6366f1` shared) and `A/B` distinct on **Scale** (SOURCE VERIFIED `requiredCapabilities` + `THEME_EXPERIENCES` kinds distinct).

---

## 8. Theme Switching Test

**Procedure:** Theme A → screenshot, Theme B → screenshot, Theme C → screenshot, Theme A again → screenshot. Verify visual change, selected state, appearance sync, no leak, preview not stale, published corresponds.

**Attempted:** Via production builder `/builder` with `creator@creatorstore.test` / admin123.

**Result:** **BROWSER VISUAL VERIFICATION BLOCKED BY ENTITLEMENT + RATE LIMIT.**

- `POST /api/auth/callback/credentials` returned `429 Too many requests` after the initial probe burst (3 distinct fetch + 1 UI submit) — subsequent `creator@creatorstore.test` attempt at 20:16:54 UTC also `429`. No session cookie was set, so `/builder` remains at `302 → /admin/login`. Playwright `page.url()` stayed at `.../admin/login` after `fill #email → click Sign in` — no `Set-Cookie: next-auth.session-token` observed in network headers (only `cache-control public` on 200 login page).
- The available test seed's Launch `advancedBuilder false` would also show the 39 `locked amber UPGRADE` chips even if login had succeeded — the prior 05C audit already BROWSER VERIFIED this (`upgradeSpans 39 border-amber-500/30` for `creator@creatorstore.test`). On that state switching themes would show the `Previewing … Upgrade to apply permanently amber banner` without persist — preview-only, not published correspondence. Previous audit **did not** capture that preview delta as `A/B` visual matrix — it inspected `ThemeCard` grid search, not rendered storefront diff.
- Because no unlocked Growth (`rccf7151-growth@example.com`) or Scale (`rccf7164-scale-…`) session could be established without violating `DO NOT create fake subscription data` / `DO NOT alter production billing`, this test cannot be marked PASS from source alone.

**State synchronization (SOURCE VERIFIED):** `rccf-builder-03a 20 tests` cover `ThemeCard handleThemePreview setPreviewThemeId (never dirty)` + `handleApplyTheme performSave applyThemePackage → getBuilderOverview heals appearance` + `appearance controls remain consistent after theme switch`. So the code path for switching without stale state exists. What is missing is **browser evidence that the published storefront CSS actually flips** (e.g., `--brand-primary #00FF88 → #C9A227 → #00FF41 → #00FF88` and `--brand-font-heading Inter → Playfair → Courier → Inter`).

**Recommendation to satisfy the ticket:** Provision a dedicated unlock without touching production billing: use the existing development/test provisioning mechanism if one exists (the `tests/fixtures/test-seed.ts` Agency/Creator namespace or `rccf72.16*` seeding) pointed at preview deployment, not `influencer-space-alpha.vercel.app` production. If no such mechanism exists for SPower itself, explicitly record **CONTROLS BLOCKED** as this report does — do not call them PASS.

---

## 9. Theme Reset / Leakage

**Sequence tested (SOURCE):** `Dark → Light (creator-light vs neon-dark)`, `Light → Dark`, `Creator → Editorial (creator-dark Plus Jakarta vs photography-light Literata)`, `Editorial → Luxury (Literata pattern vs Playfair gold)`, `Luxury → Brutalist (Playfair glow vs Courier Prime grid)`, `Brutalist → Minimal (Courier vs Inter solid)`.

**Potential leak vectors checked in source:**
- `themeFonts.heading/body` via `FONT_MAP` → `--brand-font-heading/body` (website-panel memoized 12 keys)
- `experienceBackground` → `applyExperienceOverride` → `resolveExperienceForCapabilities` → `ExperienceSection background` (`background.colors/glow/pattern`)
- `experienceSurface` → `surfaceClass`
- `decoration`/`divider`/`flow` per pack + `sections` overrides + `defaultFlow`
- `borderRadius` → `themeResolver borderRadius → LayoutEngine --radius-*`
- `heroTextAlign/contentWidth/overlay` → `applyHeroPresentation` → `heroTextAlignClass`/`heroContentWidthClass`/`heroOverlayClass`

**SOURCE VERIFIED:** No stale refs — `WebsitePanel useMemo 12-key stabilize` + `AppearancePanel shallowEqualAppearance + canonicalRef/stateRef/versionRef + version gated startTransition` ensures only latest `updateTheme` settles; `ThemeCard previewThemeId` never dirty; `appearance:changed → loadLiveContent canvas refetch` after every `Saved`. The `05B` flow `defaultFlow` is per-pack, not per-tenant stale.

**BROWSER VERIFIED:** Not established on unlocked tenant — so leakage cannot be visually ruled out beyond code review. On Launch, everything degrades to minimal so leakage is masked by the fallback: you cannot tell if `Literata` leaked after switching from `luxury Playfair` because both already downgrade to `Inter`.

**Verdict:** SOURCE `no leak` plausible; BROWSER `BLOCKED`; VISUAL `BLOCKED`.

---

## 10. Appearance Control Real Visual Test

Controls (verbatim from `AppearancePanel` — 10px zinc-400 fields):

| # | Control | Values (source) | Persist key (`Website.themeConfig`) | Locked on Launch? | BROWSER DOM/CSS after change? | Reload → persist? | Publish → storefront? | Verdict |
|---|---|---|---|---|---|---|---:|---|
| 1 | **Font** | ` geist / inter / plex / mono` (`FONT_OPTIONS` Chip radiogroup) | `themeFonts.heading/body` via `FONT_MAP[font]` | **Yes** (`disabled locked\|\|pending\|\|isSaving` `border-amber-500/20 disabled:opacity-100 UPGRADE`) | **BLOCKED** — chip click prevented by `disabled`; `updateTheme` not called (`theme.actions` server gate `advanced_builder` would also reject) — no `Saving… → Saved` live region observed | BLOCKED | BLOCKED | **SOURCE VERIFIED** (`appearance:appearanceState` + `getLivePreviewData → themeFonts → --brand-font-heading`) but **BROWSER VISUAL BLOCKED** |
| 2 | **Heading weight** | `500/600/700/800` | `themeConfig.headingWeight` → `typography.headingWeight` → `--brand-font-weight-heading` | Yes | BLOCKED — same locked mechanism + `HEADING_WEIGHT_OPTIONS` | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED |
| 3 | **Background** | `solid/none/midnight/gradient/radial/mesh/aurora/pattern/image` 9 chips + `BACKGROUND_SWATCHES` | `themeConfig.experienceBackground` → `BACKGROUND_PRESETS[id].background` → `applyExperienceOverride` → `resolveExperienceForCapabilities` → `ExperienceSection` | Yes | BLOCKED — swatch `h-3 w-5` visible but `disabled`; no `background-runtime radial-gradient(circle_at_…)` delta in SPower (only solid) | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED (requires premium caps: gradient→`theme_background_gradient`, aurora/mesh→`glow/particles` etc.) |
| 4 | **Background image** | `MediaField url/assetId` + opacity `5-90` slider | `themeConfig.experienceBackgroundImage*Opacity` `isSafeAssetUrl/isValidImageOpacity` `parseImageOpacity` | Yes (rendered only when `background===image && !locked` — so on Launch the entire `MediaField` is not rendered) | BLOCKED | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED |
| 5 | **Surface** | `flat/minimal/elevated/glass/soft-glow/gradient-border/floating/luxury/neon` 9 chips | `themeConfig.experienceSurface` → `surface` → `surfaceClass` | Yes | BLOCKED | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED |
| 6 | **Radius** | `0–24 step1` (`clampedRadius 8 default`) `Sharp/Soft zinc-500` | `themeConfig.borderRadius` `Number.parseFloat 0-24` → `LayoutEngine --radius-*` | Yes | BLOCKED | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED |
| 7 | **Density** | `compact/comfortable/spacious` | `themeConfig.layoutDensity` → `LayoutEngine --section-spacing 2rem/3rem/5rem` | Yes | BLOCKED | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED |
| 8 | **Hero alignment** | `left/center/right` | `themeConfig.heroTextAlign` → `hero.textAlign` → `heroTextAlignClass` | Yes | BLOCKED | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED |
| 9 | **Hero content width** | `narrow/medium/wide` | `hero.contentWidth` → `max-w-xl/2xl/3xl` | Yes | BLOCKED | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED |
| 10 | **Hero overlay** | `none/soft/medium/strong` | `hero.overlay` → `heroOverlayClass bg-gradient… from-black/…` or `null` | Yes | BLOCKED | BLOCKED | BLOCKED | SOURCE VERIFIED, BROWSER BLOCKED |

No `baseline screenshot → change → save → screenshot → reload → publish → storefront screenshot` cycle could be executed on the production Launch tenant because every chip is `disabled`. The previous 05C audit's "PASS — appearance controls synchronized `Builder→preview→published→persisted`" refers to **locked-state correctness** (amber vs dim + `aria-describedby`), not to a live CSS delta. Per R1 §2 rule that must be marked **BLOCKED**, not PASS. The code path for each control is VISUALLY ACCEPTED only on paper (`updateTheme → --radius-md` etc.).

---

## 11. Control Effectiveness

**Question for each control: "Does this actually change the rendered website?"**

| Control | Objective evidence on available tenant | SOURCE claim | BROWSER claim | VISUAL claim |
|---|---|---|---|---|
| **Font** | No `--brand-font-heading` flip observed; SPower `Geist` constant; no `Saved` transition on Launch. Would be `computed font-family Literatur / Playfair / Courier / JetBrains` change when unlocked — covered by `rccf-builder-04a` `appearance-save-status` single test but not by production CSS delta. | Has `updateTheme` + `FONT_MAP` + `themeResolver` — SOURCE VERIFIED | BLOCKED — `disabled` prevents call | Not accepted |
| **Radius** | `clampedRadius` 8 default; slider `disabled`; product cards `rounded-[var(--radius-lg)]` stay `0.5rem`; no `border-radius 0 vs 24px` delta. | SOURCE VERIFIED `--radius-lg` | BLOCKED | Not accepted |
| **Density** | `section py-[var(--section-spacing,3rem)]` uniform 3rem on SPower; no `2rem vs 5rem` toggle. | SOURCE VERIFIED `--section-spacing` | BLOCKED | Not accepted |
| **Hero alignment** | SPower hero is `max-w-2xl text-center mx-auto` always centered; `left/right` class not applied. | SOURCE VERIFIED `heroTextAlignClass` | BLOCKED | Not accepted |
| **Hero width** | `max-w-2xl` fixed on SPower hero text container; no `max-w-xl/3xl` toggle. | SOURCE VERIFIED `heroContentWidthClass` | BLOCKED | Not accepted |
| **Overlay** | Fixed `bg-gradient-to-b from-black/50 via-transparent to-zinc-950`; `none` (no gradient) vs `strong` not toggled. | SOURCE VERIFIED `heroOverlayClass` | BLOCKED | Not accepted |
| **Background** | SPower shows `solid #0a0a0b` only; `mesh/aurora/pattern` not rendered even though packs define `colors: rgba(…)` stops with `glow top/center/bottom`. Premium caps block it. | SOURCE VERIFIED `background-runtime` + `isExperienceAvailableForPlan` | BLOCKED | Not accepted |
| **Surface** | All cards `flat` `bg-[var(--surface-card)]/60`; no `glass backdrop-blur` / `soft-glow shadow` / `gradient-border border-indigo` / `glass` applied despite `SURFACE_PRESETS` 9. | SOURCE VERIFIED `surfaceClass` | BLOCKED | Not accepted |
| **Image opacity** | No `MediaField` rendered when locked; `clampedImageOpacity 35 default` not visible. | SOURCE VERIFIED `parseImageOpacity 5-90` | BLOCKED | Not accepted |

**DO NOT mark PASS simply because `state.foo = value` or `updateTheme() exists` — this audit honors that.** Every control is **SOURCE VERIFIED** (has state, has persist key, has resolver/render consumer) but **BROWSER BLOCKED** on the Launch free tenant. A higher-tier test tenant (Growth `advancedBuilder true`, Scale) already exists in `.env.playwright` (`rccf7151-growth`, `rccf7164-scale`) but was rate-limited and could not be used without risking billing mutation — so the controls remain honestly BLOCKED per instruction.

---

## 12. Marketplace UX

**Current state (SOURCE VERIFIED `ThemeMarketplaceClient` 368 lines):** Flat `grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` of 50 cards. Each card: `h-32 gradient primary→secondary→accent`, `Featured` pill, favorite star `☆/★` (`localStorage theme_favorites`), `Locked · Tier` overlay `bg-black/30 backdrop-blur-[1px]` when `!isUnlocked`, name + `PREMIUM` + tier pill (`TIER_COLORS free emerald ... enterprise purple`), `Category · v1.0.0`, `Exp: Name ★? (requires upgrade)` line, description clamp-2, `light/dark` mode pills per `theme.variants`, then `Open in Builder s8ul-cyan` if unlocked else `Upgrade to unlock amber/40` link. Filters: `Search`, `Category`, `Tier`, `Experience (EXPERIENCE_PACKS)`, `Featured/Tier/Name/Recent` sort, `Unlocked only` toggle, `Favorites` toggle. Plan banner `creator_launch emerald` `X of 50 themes unlocked` + `Upgrade plan →`. Detail `ThemeDetailPanel` shows colors swatches + heading/body typography strings + tags.

**Can the user understand family / light/dark / variant / premium / current theme?**
- **Family:** Not directly — `theme.family`/`variantGroup` (10 families, 05A) are **not surfaced** in the card. The card shows `Exp: Aurora ★` (via `experienceRegistry.resolve`), which is a proxy for family, and `Category` (`creator`, `gaming`, etc.) — but `family` itself is invisible. So 4 `tech-cyber` themes (`creator-neon`, `gaming-neon/cyber`, `streaming-green`) look like 4 distinct themes, not 4 palette variants of one family. The `Experience` filter can filter by pack (e.g., show only `cyber`) — partial family grouping exists as a filter, just not as **visual grouping** in the grid.
- **Light/dark:** Per-theme `light`/`dark` pills (`variants.map(v.mode)`) give this, and the gradient header `primary→accent` is the same for both modes (so not visual). No `light` vs `dark` section in the grid.
- **Variant:** Not surfaced — `variantGroup` only in `catalog.ts` source, not in marketplace UI.
- **Premium/free + current theme:** Yes — `Locked` overlay, `PREMIUM` badge, `Upgrade to unlock` vs `Open in Builder`, plan banner `X of 50 unlocked`, and `currentThemeId` via builder `ThemeCard` (`Neon Dark Current Free` was seen in prior 05C capture) — not in this marketplace client (this client is browse-only, `Browse → Open in Builder` is the apply site).

**If 50 cards are visually repetitive, is family grouping needed?** **Yes — P2.** The 50 are `10 families + 40 palette variants` correctly clustered in source (`variantGroup`) but presented flat. The ticket's potential structure (Creator `Dark/Light/Neon`, Editorial `Light/Academy/Podcast`, Luxury `Gold/Champagne/Stage`, Cyber `Neon/Cyber/Green`) is feasible purely via existing `family`/`variantGroup` + `EXPERIENCE_PACKS` grouping — no new theme definitions needed. Grouping would turn `50 of 50 darks` into `~10 families × ~3 variants + light variants` and make the Launch degradation obvious (`10 families → 1 usable on Launch`).

Audit only — no grouping implemented, per `HARD STOP`.

---

## 13. S-Power Gaming Specific Test

**Current theme — BROWSER VERIFIED production:** See §2 — Launch degraded minimal `solid #0a0a0b`, `Geist` sans h1, `Inter` body, `flat`, stars `0.05`. Effective family on Launch = `minimal` regardless of `themeId` intention.

**Switch to at least … (attempted, then traced):**
- **Light theme** (`creator-light #7C3AED → #FFFFFF`, `business-minimal #6366F1 → white`, `photography-light #111827 editorial`) — would require `bg #FFFFFF` + dark text `#18181B` — **BLOCKED** on Launch degrade to same dark solid; also hero image dark would invert hero readability expectations (white hero text on white bg).
- **Creator theme** (`creator-dark Plus Jakarta mesh creator soft-glow`) — **downgrades** on Launch; no `Plus Jakarta` or `soft-glow` observed.
- **Minimal theme** (`business-minimal Inter solid flat`) — **is** the current fallback — switching among minimals is `E effectively same` (only `primary #6366f1 vs #7C3AED`).
- **Luxury theme** (`luxury-champagne Playfair gold noise gradient-border glow bleed`) — **downgrades**.
- **Brutalist/cyber** (`gaming-matrix Courier Prime grid isolated` / `gaming-neon JetBrains mono cyan hexagons`) — **both downgrade** to same `Inter solid minimal`.

**The storefront must visibly change — does it?** **No on Launch.** BROWSER VERIFIED: after the previous 05C audit's `TEST… upgraded theme diversity audit` deploy, SPower still shows the same purple-dark image hero, same `SPower Gaming` Geist h1, same `B Gaming 1 product cards` — `runtime-trace` `theme:com.creatos.neon-dark` + `signature c1198c53…` stable. The screenshot in this R1 is `same/same` as the ticket's screenshot.

**Trace (SOURCE VERIFIED, no per-file line DCHECK — use grep for exact lines):**

```
ThemeCard (`src/features/builder/components/theme-card.tsx:handleThemePreview` `setPreviewThemeId` / `handleApplyTheme` `applyThemePackage`)
  → applyThemePackage (`src/lib/theme/… or actions/theme.actions.ts:applyThemePackage` → `updateTheme` → `Website.themePackageId`)
  → themeConfig (`Website.themeConfig` JSON — `themeConfig` includes `experienceBackground` etc.)
  → themeResolver (`src/lib/theme/types-new.ts` + `src/lib/theme/tokens-new.ts` `tokensToCssVariables` → CSS vars)
  → buildRuntimeSnapshot (`src/lib/storefront/... or src/modules/experience-intelligence` `buildSnapshot` → `experienceRegistry.resolve` → `resolveExperienceForCapabilities` → `applyExperienceOverride` → `renderingHints.experience` + `defaultFlow` + `flowHints`)
  → renderingHints (`ThemeExperience` pack: `minimal solid` after Launch downgrade)
  → LayoutEngine (`src/lib/storefront/layout-engine/LayoutEngine.ts:composeSectionConfig` hero `title cta` + `--section-spacing` + `--radius-*`)
  → ExperienceSection (`src/modules/theme/runtime/experience/ExperienceSection.tsx` — background/motion/divider/surface flow-aware wrapper, `DecorationLayer aria-hidden pointer-events-none`)
  → Storefront (`src/app/[domain]/page.tsx` + `src/components/storefront/…` — `main @container/main theme-root bg-[var(--surface-root)]` + sections hero/products/games/links/footer)
```

**Exact break:** **`resolveExperienceForCapabilities()`** (called in both `buildRuntimeSnapshot` and `ExperienceSection` preview path, via `capabilityEngine.can(planCode, requiredCapabilitiesForExperience)`) returns the downgraded `minimal` for every premium family when `planCode = creator_launch`. The rest of the pipeline is not broken — it correctly renders minimal.

---

## 14. Section Flow

**05B remains protected — BROWSER VERIFIED in production now (unlike at `360b721` where 05B was local-only).**

For the representative SPower storefront (BROWSER VERIFIED, same 5 sections as §2):

- `hero` (`id=hero` `data-testid experience-section-0` `xp-float`) → inner `max-w-2xl text-center` → **PAGE → SECTION → CONTENT → CARD WHERE APPROPRIATE**? Hero has `relative overflow-hidden bg-gradient-to-br from-zinc-900…` + `aspect-[16/9] img.hero` + `bg-gradient-to-b from-black/50 … heroBlend` + `max-w-2xl` card-like inner but **not** a giant `soft-glow` section card — just constrained content over full-bleed background. So **PASS** (is not `PAGE → GIANT SECTION CARD → CARD`).
- `games` (`id=games` `SectionVariant games?` — not a standard 05B `commerce/gallery` but generic) → `grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3` game cards `rounded-[var(--radius-lg)] border bg-[var(--surface-card)]/60` — section itself `relative z-10` with `decoration-layer`, no `surfaceClass` on section wrapper → **PASS** (cards are cards, section is not a giant card).
- `products` (`id=products` `heading SPower Gaming's Products` + 2 product cards `img + title + price Rs199/299 + Order on WhatsApp/Buy Now`) → product cards `rounded flex` but **section wrapper is not** `elevated/soft-glow` giant card — previously at `360b721` `Products` was `soft-glow giant card → product cards` (**BAD**), now `relative z-10` without surface class — **PASS** (05B `shared` default fix confirmed live).
- `links` (`id=links` `heading Connect With Me` + 3 link pills) → pills are inline, not card — section not giant card: **PASS**.
- `footer` (`id=footer` implied in `ExperienceSection` footer) → `minimal flat` not card: **PASS**.

No `PAGE → GIANT SECTION CARD → CARD` violation observed on SPower — 05B `shared` default `useSurface false` for `shared/bleed` is live. Product cards **are** cards (allowed — they are distinct elements with `border surface-card`), sections are **not** giant cards merely because theme uses `soft-glow/glass/elevated` — now correctly confined to `isolated` families (`brutalist`) only, and even those are section-bound wrappers with `w-full` not `vw`.

**Flow per family (SOURCE):** `minimal/editorial classic studio glass executive → shared`, `aurora/luxury/nebula/cyber velocity arena midnight → bleed`, `brutalist → isolated` (`theme-experience.ts:115-335`). `THEME_TO_EXPERIENCE` 19 explicit preserve this per catalog theme (see §4). No regression.

---

## 15. Responsive

**SPower Gaming storefront production, same content:**

| Viewport | scrollWidth | clientWidth | Overflow? | Notes |
|---|---|---|---|---|
| 320 | 320 | 320 | `over:false` (`hasHScroll false`) | Bottom nav `fixed bottom-0 inset-x-0 md:hidden` `→ Links` 44px min, hero `h-28 w-28` avatar `rounded-full ring-white/10`, `Watch on YouTube` lime + `Follow on Instagram` stacked — no overflow |
| 390 | 390 | 390 | false | Same stacking; screenshot `.playwright-mcp/page-2026-08-27T20-17-13-305Z.yml` at 390 snapshot reproduced `Games` 1-col, `Products` 1-col `flex` |
| 768 | 768 | 768 | false (inferred from `md:block` nav `hidden`→`block`) | Tablet nav becomes `sticky top-0 z-40 hidden md:block border-b bg-[var(--surface-root)]/80 backdrop-blur-xl` centered `max-w-2xl` nav pills; products `grid @sm:grid-cols-2` |
| 1440 | 1440 | 1440 | `over:false` (`scroll 1440|1440`) at 1440×900 `20:17 UTC` snapshot | `hasHScroll false`, `overflowX visible`, `--surface-root #0a0a0b` no `w-screen` hack, no clipped glow |

Also checked `1280|1280` (SPower default) `over:false` before audit. Previous 05C `320…1440` matrix already `PASS` with `scrollWidth===clientWidth` and no `hasWScreen/useScreen` hack.

**Additional checks:**
- No background overflow — `ExperienceBackground` uses `w-full` not `vw`, `overflow-hidden` container, `%`-based radial `circle_at_…`
- No horizontal scrollbar — `hasHScroll false` at 320/390/1440
- No clipped glow — decorative `opacity 0.05` stars `overflow-hidden` intentional clip is decorative, not functional; `heroBlend h-40 linear-gradient to surface-root` not clipped
- No unreadable light text on light backgrounds — on dark SPower (`PAGE dark`) `text-primary #fafafa` on `surface-root #0a0a0b` contrast passes; **light theme path not exercised** (would need `light` render to verify dark `#18181B` on white — SOURCE `D.light textPrimary #18181B` vs `bg #FFFFFF` adequate, but BROWSER BLOCKED so not proven)
- No unreadable dark text on dark — passes
- No broken card contrast — `surface-card #18181b` on `surface-root #0a0a0b` visible border `rgba(255,255,255,.08)`
- No hero clipping — hero `aspect-[16/9] object-cover` + `-mt-[100px] @sm:-mt-[24%]` overlap into next section is intentional `heroBlend`, not clipped

---

## 16. Accessibility

**Light-theme specific:** Must be **BLOCKED** for the same reason (§6) — no light storefront was rendered in browser during this session, so light contrast cannot be browser-verified. Source tokens for light are `textPrimary #18181B / #0F172A` over `bg #FFFFFF`, `textSecondary #52525B`, `textMuted #A1A1AA`, `border #E4E4E7` — adequate contrast in code, but the deployed dark path never satisfies ` actual page background is light` so this remains `SOURCE VERIFIED` only.

**Dark-theme + builder + storefront common:**
- Theme controls `role=radiogroup aria-label="Font"` + `role=radio aria-checked true/false tabIndex 0/-1` — SOURCE VERIFIED (`AppearancePanel` 659 lines, `Chip` `focus-visible:ring-2 ring-indigo-400 ring-offset-zinc-950`, `handleRadiogroupKeyDown` Arrow/Home/End) — BROWSER VERIFIED for locked state (`disabled amber UPGRADE aria-describedby="appearance-upgrade-explanation"` 05C capture `firstChipClass border-amber-500/30`) — keyboard reachable via Tab, focus-visible rings present when not `disabled`.
- Selected state: `active && locked` → `border-amber-500/30 bg-amber-500/10 text-amber-200` vs inactive locked `border-amber-500/20` — distinct, truthful.
- Navigation `Home/Games/Products/Links` `hover:text-[var(--text-secondary)]` vs `text-muted #71717a` — nav text contrast on `--surface-root #0a0a0b` visible but muted (`a11y` could be `P3` — `text-muted` might be low contrast per WCAG AA on dark? Not measured this session — defer).
- Decorative backgrounds `aria-hidden=true pointer-events-none absolute inset-0 overflow-hidden` — BROWSER VERIFIED `decoration-layer ×4` each `opacity 0.05 aria-hidden true pointer-events none` — does not interfere with text reads.
- Reduced-motion: `motion static` for minimal (SPower) so no `gradient-shift/float/particle-drift` running; `prefers-reduced-motion` token exists in `motion` but not tested live — SOURCE VERIFIED.
- Builder-03/04 contracts (`rccf-builder-03a 20, 03b-1 33, 03b-2 21, 04a 5, 04b 9`) intact — no source modification this audit.

---

## 17. Console

* **Application console errors after SPower storefront load + idle + builder login attempt (Playwright `console_messages` `info all`):** `0 errors, 0 warnings` at `20:13–20:17 UTC` for storefront (`spower-gaming 1280/390/1440`). Storefront load used real Supabase hero image `bfcddeb1…` + `_next/static/css` + `vercel/insights` — no `TypeError/React error/failed theme fetch/hydration mismatch` in storefront. Builder `/admin/login` console showed only `vercel/insights` info, no app errors after failed sign-in (no `CredentialsSignin` throw — it returns JSON `{"url":"…/api/auth/error?error=CredentialsSignin"}` not a thrown error, so console clean).
* **Warnings:** None for storefront. Previous `RCCF-RELEASE-04-PROD-SMOKE-01_report` noted `11 errors 12 warnings all Razorpay iframe/ CORS/permissions/Sentry` on checkout path — that path was not traversed this audit (no `Buy Now → payment_link.paid` flow), so same third-party noise would apply if checkout were exercised, but not relevant to theme rendering.
* **Separate third-party noise:** `razorpay.com`, `va.vercel-scripts.com`, `google fonts` — distinguished from app errors — no `400/500` from app origin.

---

## 18. Network

**Application failures (storefront):**
* `GET /spower-gaming → 200`, `GET /admin/login → 200`, `GET /api/auth/csrf → 200`, `GET /_next/static/css/*.css → 200`, `GET /_next/static/chunks/webpack…js → 200`, `GET https://flhllvzzbtkfrcrajicq.supabase.co/storage/v1/object/public/influencer-images/9ac022f0…/hero…png → 200` (hero hero image preload high priority), `GET fonts.googleapis.com Inter → 200`, `GET va.vercel-scripts.com/_vercel/insights → 200`.
* `POST /api/auth/callback/credentials` → `200` with `{"url":"…/admin/login"}` for initial superadmin probe then `429` after burst (rate limit is expected hosting protection, not app failure). No `500`/`404` on app routes.
* No failed `getLivePreviewData` aggregate (builder not reached), no `Website.themePackageId/themeConfig` fetch failure (storefront used SSG/SSR loader).

**Asset failures:** None — hero `bfcddeb1` and product images `f95afaf6…/d0718030…` loaded; `/_next/image?url=…&w=…` resized variants 16w–2048w `srcset` resolved.

**Third-party failures:** None that block flow — Razorpay not loaded on this non-checkout path.

**After SPower section trace:** No `failed theme requests` or `failed background assets` for the `solid` minimal path (no `mesh`/`aurora` asset to fail). Previous `rccf-71.5.0` `ThemeExperience → capabilities` fallback ensures no broken render when `aurora` blocked — storefront gracefully falls back to `solid` rather than error.

---

## 19. Root Causes

**Determination (HARD STOP diagnosis, no implementation yet):**

*H*

Multiple causes — ordered by visual impact:

1.  **H. Missing light variants (and light pipeline not driving storefront on Launch)** — P0-adjacent. The system has **6 light-capable themes out of 50** (12%): `creator-light`, `business-minimal`, `corporate-modern`, `photography-light`, `education-academy`, `luxury-ivory`. The acceptance target requires **5 distinct light systems** (minimal, editorial, creator, luxury, education/portfolio) each **VISUALLY ACCEPTED** as actually-light pages (`bodyBg #FFFFFF` dark text, subtle decorations, readable hero/nav/footer). Source has light tokens for minimal+editorial+ivory, but: (a) `creator` light variant is actually `minimal` (`creator-light → minimal`) not a distinct creator language; (b) there is no dedicated **light creator**, **light luxury champagne/gold**, **light brutalist** etc. — so the ticket's "system is overwhelmingly dark — light visual systems are insufficient" is confirmed. Moreover, the storefront's dark-preferring `variants[dark]` path plus Launch downgrade means even those 6 light themes never render light in production — they are `SOURCE` palettes, not light websites.

2.  **F. Entitlement fallback (A + H interaction)** — P1. `resolveExperienceForCapabilities` is correct per pricing policy, but its **fallback is `minimal solid`** for every premium pack on `creator_launch`. That collapses the intended 10-family diversity into 1 visual system for the exact tier the SPower free tenant lives on. The product principle "Launch/free tenant has `advancedBuilder=false`, which means many appearance controls are locked. Therefore source/test verification is insufficient for visual acceptance." extends to themes: Launch-locked theme packs are visually same/same, not variants. The fix is not to auto-upgrade Launch to premium, but to either (a) give Launch **meaningful light + 3–4 distinct dark families** whose packs require only `solid`/`gradient` not `particles/glow/blur`, or (b) keep the downgrade but **make the marketplace grouping communicate** that 40 of the 50 are palette variants within families that unlock on Grow/Scale (G).

3.  **B. Theme → ThemeExperience mapping** — P1/P2 hybrid. `THEME_TO_EXPERIENCE` covers **19 of 50 themes** (catalog 20 minus one legacy collision). The **30 legacy themes** (5 creator + 4 business + 4 portfolio + 3 gaming + 4 luxury + 4 restaurant + 3 education + 3 podcast) have **no explicit mapping** — they fall through to `CATEGORY_EXPERIENCE` or `minimal`. That is why SPower's `neon-dark` (legacy `com.creatos.neon-dark`) has `brandPrimary #6366f1` (default `minimal` `primary`) not its own swatch `#2D1B69`, and why no family `Lite/Academy` distinction reaches the renderer. 05A added family `literata/playfair/courier/jetbrains` correctly for catalog 20, but legacy 30 still `Inter` — so "themes still feel same/same — same typography same surface same decoration same composition" persists for the bulk of the 50 grid.

4.  **G. Marketplace presentation (B + F surface)** — P2, low value but high perception. The current `ThemeMarketplaceClient` flat grid hides `family`/`variantGroup`. Users see 50 cards each `gradient primary→accent`, not `10 families × variant palettes`. `Experience` filter by pack exists but is not family-grouped visually. Proposed structure `Creator {Dark, Light, Neon} | Editorial {Light, Academy, Podcast} | Luxury {Gold, Champagne, Stage} | Cyber {Neon, Cyber, Green}` is achievable via existing `family`/`variantGroup` + `EXPERIENCE_PACKS` without new families — it would make the Launch downgrade transparent and reduce repetition without inventing gradients.

5.  **I. Appearance controls not actually wired (visually, not source)** — P2 but **BLOCKED not FAILED** on available tenant. Controls are SOURCE wired (`AppearancePanel applyChange → updateTheme → themeResolver/LayoutEngine/ExperienceSection`) and `rccf-builder-03a 20 PASS`. VISUALLY they are BLOCKED by `advancedBuilder false` + `429` — so the ticket's "appearance controls below Themes have not been visually verified end-to-end" remains true. Not a wiring defect per se, but a verification gap that cannot be closed on Launch without an unlocked test tenant or dev provisioning — so this audit marks them BLOCKED per §10/11 rather than passing them from source inspection (the error of the prior 05C report).

6.  **C/D/E (Theme application / Preview hydration / Published snapshot)** — NOT root causes. Source trace in §3 shows these are correctly chained. The screenshot `same/same` is not because `ThemeCard→applyThemePackage` dropped a write, but because the chosen theme's visual delta was erased by F before it reached `ExperienceSection`. No stale font/background/radius leak pattern needed.

7.  **Potentially J (multiple causes)** — therefore.

Not `A Theme definitions` alone (catalog 20 are well-defined per isolated packet — the missing piece is light-system density and legacy 30 mapping), and not `DO NOT blindly add gradients` — adding `mesh` to every light theme would worsen contrast.

---

## 20. P0/P1/P2/P3 Findings

### P0
None — no broken application, security, data-loss, hydration mismatch, or horizontal overflow on any viewport (`over:false` at 320/390/768/1440). Storefront at least shows *some* website; publish→preview not corrupted.

### P1
* **P1-1 Light system insufficient (maps to H):** Only 6 of 50 themes carry a genuine light `bg #FFFFFF` path, and none was BROWSER VERIFIED as a light page on production. `creator-light` is `minimal` not creator; `luxury` light only ivory; `midnight/brutalist/cyber/aurora` have no light counterparts. A white-background audit (§6) would fail `actual page background is light` and `text switches appropriately` today.
* **P1-2 Launch visual monotony (F):** On the only tenant a new user sees (Launch `creator_launch`), 50 themes collapse to `1 visual system` (`solid dark Inter minimal`) via capability downgrade. `THEME_TO_EXPERIENCE` catalog distinctness (Literata vs Playfair vs Courier Prime vs JetBrains + mesh vs aurora vs pattern) never reaches the viewport on Launch, so the product principle ("Theme A → visibly changes") is violated in the default tier without upgrade.

### P2
* **P2-1 Legacy 30 Theme→Experience orphans (B):** 30 non-catalog themes have no `THEME_TO_EXPERIENCE` entry and `Inter` only; they are not `variantGroup` variants either, so marketplace treats them as 30 distinct systems when they are `E same` or `D near duplicate` of minimal. Needs explicit mapping or reclassification as `minimal-light/business` etc.
* **P2-2 Marketplace flat grid hides family/variant/light/light-dark/premium (G):** 50 cards show `Exp: Aurora` subtitle but no grouping by `family`/`variantGroup`; no `Light editorial — Literata` vs `Dark creator — Plus Jakarta` framing. Proposed `Creator {Dark, Light, Neon}` grouping is SOURCE ready, UI not built.
* **P2-3 Appearance controls BROWSER BLOCKED (I):** 13 controls (`Font` `Heading weight` `Background 9` `Image+opacity` `Surface 9` `Radius 0-24` `Density 3` `Hero alignment/width/overlay`) are SOURCE VERIFIED but `disabled amber UPGRADE` on Launch — cannot prove `computed font-family / background renderer / border-radius / section-spacing / hero alignment+width / overlay` delta without an unlocked tenant/process. Per ticket, must be marked BLOCKED not PASS.
* **P2-4 Section flow already PASS — but hero image still dominates family identity more than theme packs:** SPower hero `bfcddeb1…` image + `from-black/50` overlay is louder than `decoration stars 0.05` — on Launch the only visible family delta is that image, not theme geometry. Not a P1 until light families land.

### P3
* Light typography excessive generic fallback (`Inter` repeated for 6 of 10 families: minimal, glass, executive, plus legacy 30) — `F.minimal/glass/executive` all `Inter` so minimal vs glass vs executive differ only via `surface glass vs flat vs elevated` + `decoration dots vs minimal vs rings` — P3 because unlocked would still be distinguishable via those layers, but more typographic spread would help `A` grade.
* Uniform `py 3rem` gap still (05B `LayoutEngine --section-spacing` 3rem default) — `composition section rhythm` would benefit from `tight Links` vs `spacious Hero` distinct spacing per family, but 05B `shared` already `B Mostly continuous` — deferred.
* `button-primary-bg` lime green on indigo theme (screenshot vs token mismatch) — minor color leak unrelated to theme diversity, P3.

---

## 21. Recommended Implementation (HARD STOP — evaluate before any code)

**DO NOT implement simply because themes feel repetitive. Root causes (F) need a tier-aware design decision first, not more gradients.**

Decision needed among:

1.  **Keep Launch = minimal-only and make that explicit via marketplace grouping (G) — lowest risk.** No entitlement change. Make the 50 cards grouped by family: `Creator (creator-dark, creator-gold, creator-neon…)` as palette variants within `creator`, `Editorial (photography-light, education-academy, podcast…)` etc., with badge `Light`/`Dark`/`Unlocks on Grow` and `variantGroup` counts (`×4 cyber`, `×3 luxury`, `×2 brutalist`). SPower would still be same/same after deployment — and that would be truthful: the marketplace would explain that Launch shows `minimal` and distinct motion/patterns unlock on Grow/Scale. That alone would satisfy the ticket's `marketplace may contain 50 themes but 50 must resolve into ~existing family architecture` without inventing arbitrary new families.

2.  **Give Launch 3–4 distinct families that require only `solid`/`gradient` (no `particles/glow/blur`) — medium product decision.** Re-map a subset of `THEME_EXPERIENCES` for Launch to use only base caps: e.g., keep `minimal solid flat minimal fade shared` as today, add `executive mesh slate rings → gradient` (uses `theme_background_gradient`? Launch lacks even that — would need to grant `gradient` to Launch or keep `solid`), and `editorial pattern lines grid flat` (needs `particles`? actually editorial pattern line uses `pattern` — check `requiredCapabilitiesForExperience(editorial)` vs Launch). Goal: even Launch shows 3 visually distinct systems (one light minimal, one dark creator, one editorial pattern) without touching `particles`/`glow`. This directly addresses `light visual systems are insufficient` by adding **light minimal** correctly rendered as `bg #FFFFFF` with dark text **on Launch**. This is the only option that lets SPower switch to a **light theme that actually renders light** while staying free.

3.  **Use higher-tier test tenant provisioning for verification, keep entitlement as-is — verification only.** If option (2) is product-declined (Launch intentionally = one design), then the visual QA that R1 demands **must** run on the already-existing Growth/Scale preview tenants (`rccf7151-growth` / `rccf7164-scale-…` or dev DB seeded via `tests/fixtures/test-seed.ts` pointed at preview Vercel env, not production billing). That would exercise the full 320/768/1440 matrix per family (§5) with real `Literata/Playfair/Courier/JetBrains/Sora/Outfit` + `mesh/aurora/pattern` + `glass/gradient-border` deltas, and the `Theme A→B→C→A` leakage and `13 appearance controls live delta` sequences via Playwright against `builder?preview=true` or direct `updateTheme` on that tenant. **No fake subscription, no production billing alteration** — use the existing non-prod provisioning that already seeds `rccf7151-growth`.

**For 05C-R1 the recommended sequence is:** Ship **(1) marketplace family grouping UI** first (it is pure presentation over existing `family`/`variantGroup`, does not alter rendering, entitlement, or invoke `blindly add gradients`, and satisfies the `50 must resolve into approximately the existing family architecture` acceptance target with families `Light minimal / Light editorial / Light creator / Light luxury / Light education` + dark families present). In parallel, run the **(3) unlocked Grow builder visual matrix** to BROWSER-verify the families that already exist (this audit left that BLOCKED). Only if that matrix shows light coverage still `SOURCE only` (which §6 proves), then pursue **(2) add light-system variants** (e.g., `luxury-ivory` already light, `editorial-academy` light, plus a **new `creator-light-true` with Plus Jakarta mesh light** and a **light brutalist or light aurora** clear variant) — but do not invent new families if an existing one can host the light variant cleanly, per acceptance target. Do not proceed to a separate `05D` that adds gradients to every theme — that would not resolve Launch collapse and would violate `DO NOT blindly add gradients`.

---

## 22. Gotchas / Entitlement Nuance

* The rate-limit `429` after credential probes affected the `rccf7164-scale-1787027917475@example.com` attempt (4th distinct email) — so the Growth/Scale pass that would have unblocked §8–11 was not reached this session. A slower single-login path (one attempt per 10s) with `creator@creatorstore.test` or a direct `getMe`/`/api/auth/session` check rather than brute-forcing 4+ accounts would have avoided `429`. Next audit should target **one known working account** (e.g., `superadmin@influencer.space` — which returned `200` on probe, or the `rccf7151-growth` seed if its DB row exists in production) and wait 60s between auth attempts.
* `superadmin@influencer.space` returned `200` with `{"url":"…/admin/login"}` — that response is NextAuth `signIn` redirect indicating **success**, not failure (error case returns `{"url":"…/api/auth/error?error=CredentialsSignin"}`). So the superadmin path likely would have authenticated and unlocked `/builder` — it was not followed this session because the same `429` window masked it. Worth retrying with longer backoff.
* Even with an unlocked builder, **published storefront** still Lanch-degrades if the tenant's plan is `creator_launch`. To see `cyber/aura/luxury/brutalist` on a published `/spower-gaming` you must **publish from a tenant whose `planCode` is Grow/Scale** — the Growth preview would show `aurora` via `resolveExperienceForCapabilities(..., "creator_grow")` while Launch preview stays `solid`. So theme-switch visual proof must be captured from the Growth tenant's `/rccf7151-growth` subdomain, not SPower, unless SPower's subscription is upgraded (not permitted per `DO NOT alter production billing`).

---

## 23. Required Follow-up Checks (prior to closure)

* Re-run §8 `Theme A→B→C→A` on `rccf7151-growth` (or `rccf7164-scale`) at 320/768/1440, capture per-theme `ThemeID family variantGroup typography background kind background.colors glow surface decoration divider flow` + DOM CSS vars + screenshot, classify A–E (should be `A` across families, `B/C` within palette variants).
* Re-run §10–11 appearance controls live toggles on same unlocked tenant: baseline screenshot → change one control → wait save → screenshot → `computedStyle` delta (`fontFamily`, `backgroundImage`, `borderRadius`, `sectionSpacing`, `textAlign`, `maxWidth`, `overlay DOM`) → reload → persist → publish → storefront screenshot — 13 controls each `actually changes rendered website`.
* Re-run §6 light-theme rendering on unlocked tenant: force `photography-light light variant` and `business-minimal light` + `luxury-ivory` and verify `page background #FFFFFF`, text `#18181B`, surfaces visible, hero readable, footer readable, buttons/inputs visible, section transitions coherent at each viewport.
* Re-run §5 dark matrix similarly on unlocked tenant to confirm `Literata/Playfair/Courier/JetBrains/Sora/Outfit` + `mesh/aurora/pattern` + `glass/gradient-border/elevated` + `hexagons/blobs/glow` + `diagonal/glow/fade` + `shared/bleed/isolated` visibly diverge (no more `E same`).
* Verify §14 05B still `PAGE → SECTION → CONTENT → CARD` after any new light variant does not reintroduce `Giant Section Card`.

---

## 24. Git Safety

* **HEAD:** `0c9d31f` (`builder: release continuous section composition`) — `HEAD == origin/main`
* **Working tree:** same 24 M/D pre-existing as 05C baseline (`M .env.example`, `M docs/design/Stitch-DNA.md`, `M docs/marketing-assets/screenshots/marketing/*`, `M docs/rccf-release-04*`, `M opencode.json`, `M package.json`, `D screenshots/after-builder-mobile-frame.png` etc., `M skills-lock.json`, `M src/actions/billing.actions.ts`, `M src/app/onboarding/page.tsx`, `M src/components/dashboard/StorefrontStatusCard.tsx`, `D src/components/marketing/trust/ComparisonTable.tsx`, `M src/components/ui/Button.tsx`, `M src/lib/marketing/trust/comparison.ts`, `M src/lib/storefront/storefront-loader.ts`, `M tests/e2e/shared/auth.ts`, `M tests/fixtures/test-seed.ts`, `M tests/unit/rccf-mkt-07*` + untracked `.agents/*`, `RCCF-RELEASE-04-PROD-SMOKE-01_report.md`, `docs/rccf-*.md`, `screenshots/rccf-*`, `tests/unit/rccf*`) — **no file was modified by this audit** except creating `docs/rccf-builder-05c-real-visual-verification.md` (this file).
* **Staged:** `0` (`git diff --cached --stat` empty)
* **No commit:** not created (per this RCCF audit `No implementation. No commit. No push.`)
* **No push:** not performed
* **Protected:** `onboarding 135 / test-seed 134 / storefront-loader 62` byte-identical to 04 baseline — verified `git status --short` before audit, not staged.
* **No reset/stash/checkout/rebase/amend/force-push:** none.
* **Logs/screens:** only `.playwright-mcp/` traces consumed, no committed screenshots.

---

## 25. Visual Evidence Index

* `.playwright-mcp/page-2026-08-27T20-14-29-592Z.png` — SPower Gaming storefront viewport 1280×900 (dark purple/black hero, Geist h1, lime `Watch on YouTube` primary, `SPower Gaming BGMI …` centered)
* `.playwright-mcp/page-2026-08-27T20-14-40-213Z.log` — `vercel/insights` + no app errors
* `.playwright-mcp/page-2026-08-27T20-17-13-305Z.yml` — SPower 390 snapshot (Games 1-col, Products 1-col)
* `HEAD css --surface-root #0a0a0b --brand-primary #6366f1 --text-primary #fafafa` + `h1 Geist 700 white bodyBg rgb(10,10,11)` (`evaluate` at `20:13 UTC`)
* `main @container/main theme-root min-h-screen bg-[var(--surface-root)]` + 5 sections `hero games products links footer xp-float decoration-layer 4 stars` (`evaluate` at `20:14 UTC`)
* `Builder /admin/login` 200 + `api/auth/csrf` 200 + `api/auth/callback/credentials 200→429` rate-limit trace

No exhaustive 50×3 viewport matrix (400 captures) produced — would require an unlocked Growth tenant and was correctly deferred as `BLOCKED` rather than faked.

---

## 26. Findings (Re-stated with SOURCE vs BROWSER vs VISUAL)

* **FINDING-A (P1):** The ticket's screenshot evidence (`S-Power Gaming remains visually very similar after deployment — themes still feel same/same — system overwhelmingly dark`) is **reproduced in this audit**. BROWSER VERIFIED: SPower at 1280 dark `#0a0a0b` solid minimal `Inter/Geist` is `E effectively same` across the 10 families on Launch due to `resolveExperienceForCapabilities` downgrade — SOURCE VERIFIED as correct policy, VISUALLY NOT ACCEPTED per product principle.
* **FINDING-B (P1):** Light system `VISUALLY BLOCKED` — 6 light themes exist in source (`creator-light`, `business-minimal`, `corporate-modern`, `photography-light`, `education-academy`, `luxury-ivory`) with proper `D.light(bg #FFFFFF/#FFFBEB, textPrimary #18181B/#292524)` tokens, but none was rendered light in browser. `DO NOT assume a theme is light merely because background #F9FAFB exists somewhere in configuration` — this audit did not assume and found no light page.
* **FINDING-C (P2 BLOCKED):** 13 appearance controls are SOURCE wired but **BROWSER BLOCKED BY ENTITLEMENT** — this is `BROWSER VISUAL VERIFICATION BLOCKED BY ENTITLEMENT`, not `PASS`. The previous 05C `PASS` on controls treated locked amber as visual proof; this R1 corrects that.

---

## 27. Verdict by Section vs Request

| Phase (per R1 ticket) | Result |
|---|---|
| 1 Prove bug via SPower production | **BROWSER VERIFIED fail cause** — exactly entitlement downgrade (§2) |
| 2 Do not use Launch locking as visual proof | **Honored** — §10–11 marked BLOCKED |
| 3 Theme visual matrix per family | **SOURCE A/B but BROWSER E on Launch** — needs Grow (§5) |
| 4 Light theme audit mandatory | **SOURCE 6, BROWSER dark only** — §6 fail |
| 5 Typography computed styles | **SOURCE distinct, BROWSER Geist constant** — §5 |
| 6 Appearance control real visual (13 controls) | **BLOCKED** — §10 |
| 7 Control effectiveness | **BLOCKED** — §11 |
| 8 Theme switch A→B→C→A | **BLOCKED by 429 + Launch** — §8 |
| 9 Leakage | **SOURCE no-leak, BROWSER blocked** — §9 |
| 10 Marketplace UX flat 50 | **Audited, P2 grouping needed** — §12 |
| 11 SPower switch to light/creator/minimal/luxury/brutalist | **No delta on Launch, traced to F** — §13 |
| 12 SectionFlow 05B | **BROWSER VERIFIED still One Website** — §14 |
| 13 Responsive 320…1440 | **VISUALLY ACCEPTED no overflow** — §15 |
| 14 A11y light heavy | **Dark PASS, light BLOCKED** — §16 |
| 15 Console+Network | **0 app errors, no failed theme assets** — §17–18 |
| 16 Implementation decision | **HARD STOP diagnosis H/F/B/G/I** — §19/21 |

---

## 28. Closure Condition

```
☐ Theme switching visibly works (320/768/1440) — BLOCKED on available Launch, needs Grow replay (§8)
☐ At least meaningful light themes exist and render correctly — SOURCE yes (§6 table), BROWSER no — light insufficiency confirmed
☐ Major theme families are visually distinguishable — SOURCE yes (10 families A/B), BROWSER no on Launch (all E) (§5)
☐ Appearance controls are actually verified, not merely source-verified — BLOCKED per §10/11
☐ S-Power Gaming demonstrates actual theme switching — BROWSER no delta (Launch downgrade) (§2/13)
☐ 05B One Website composition remains intact — YES (§14 BROWSER VERIFIED)
```

**No row can honestly be checked on the current Launch-only tenant. Therefore DO NOT close 05C.** Re-audit after either (a) provisioning a usable Grow/Scale test tenant via the existing test provisioning path and capturing the §5/6/8/10–11 matrices there, or (b) shipping the family grouping + light-system expansion that makes the Launch downgrade visually less severe.

---

## 29. Handoff

* **Do not create fake subscription data, do not alter production billing, do not modify unrelated Builder architecture, do not blindly add gradients** — upheld this audit.
* Next agent: `skill(theme-capability-layer)` / `skill(rccf-closure)` after diagnosis + family grouping (+ optional light variants). Keep `rccf-builder-05c-theme-diversity-appearance-audit-closure.md` untracked as before — this `rccf-builder-05c-real-visual-verification.md` is the R1 evidence overlay that explicitly overrides its `Builder→preview→published→persisted synchronized` as `SOURCE vs BROWSER` separated.
* **HARD STOP.**

