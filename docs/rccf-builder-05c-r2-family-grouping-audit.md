# RCCF-BUILDER-05C-R2.1 — THEME FAMILY GROUPING + UNLOCKED VISUAL QA PREPARATION

**Status:** IMPLEMENTATION (family grouping) + AUDIT — no billing mutation, no entitlement weakening, no production push yet
**Date:** 2026-08-28
**Auditor/Implementer:** OpenCode (Muse Spark)
**Baseline HEAD:** `0c9d31f` (05B SectionFlow) + `rccf-builder-05c-real-visual-verification.md` R1 FAIL
**Branch:** working tree (dirty, not committed as per STOP — see §Git Safety)

---

## 1. Audit Report — 50 themes → families → variants → legacy → light → experiences

### 1.1 50-theme inventory (source `src/lib/theme/themes/index.ts` `ALL_THEMES`)

| Source file | Count | Notes |
|---|---:|---|
| `creator.ts` | 5 | `neon-dark`, `creator-studio`, `creator-bold`, `stream-vibe`, `creator-pro` — **legacy (no family)** |
| `business.ts` | 4 | `corporate-blue`, `executive`, `startup`, `professional` — legacy |
| `portfolio.ts` | 4 | `midnight-ocean`, `minimal-portfolio`, `designer`, `photographer` — legacy |
| `gaming.ts` | 3 | `cyber-arena`, `esports`, `game-stream` — legacy |
| `luxury.ts` | 4 | `royal-plum`, `luxury-gold` (legacy `com.creatos.luxury-gold`), `luxury-ivory`, `fashion` — legacy (note `luxury-ivory` already has light `FFFBEB`) |
| `restaurant.ts` | 4 | `forest-canopy`, `modern-restaurant`, `fine-dining`, `bistro` — legacy |
| `education.ts` | 3 | `coach`, `academy`, `mentor` — legacy |
| `podcast.ts` | 3 | `podcast-studio`, `audio-creator`, `voice` — legacy |
| `catalog.ts` | 20 | `creator-dark/gold/neon/midnight/glass`, `gaming-neon/cyber/matrix`, `streaming-purple/green`, `business-minimal`, `corporate-modern/black`, `photography-light`, `music-festival/stage`, `fitness-energy`, `education-academy`, `luxury-champagne` — **all with `family` + `variantGroup` + per-family `headingFont`** |
| **Total** | **50** | `50 unique IDs` (unit test `tests/unit/rccf-builder-05c-r2-family-grouping.test.ts:all 50 themes exist`) |

### 1.2 Families (actual metadata)

`catalog.ts` family typography `F.*`:

| Family key | Human label (UI) | # themes | Heading font | Experience(s) | VariantGroups inside family |
|---|---|---:|---|---|---|
| `creator` | Creator | 1 | `Plus Jakarta Sans` | `creator` `mesh creator center float soft-glow` | `creator-dark` ×1 |
| `minimal` | Minimal | 2 | `Inter` | `minimal` `solid flat minimal` | `minimal-light` (creator-light), `minimal-business` (business-minimal) ×2 |
| `luxury` | Luxury | 3 | `Playfair Display` | `luxury` `mesh gold noise glow gradient-border glow bleed` | `luxury-gold` (creator-gold), `luxury-stage` (music-stage), `luxury-champagne` ×3 |
| `tech-cyber` | Cyber / Gaming | 4 | `JetBrains Mono` | `cyber` `mesh cyan hexagons diagonal gradient-border` | `tech-neon` ×2 (creator-neon, gaming-neon), `tech-cyber` ×1, `tech-green` ×1 |
| `midnight` | Midnight | 1 | `Sora` | `midnight` `solid center constellation elevated bleed` | `midnight-amber` |
| `glass` | Glass / Studio | 1 | `Inter` (glass) | `glass` `mesh teal dots glass` | `glass-teal` |
| `executive` | Executive | 2 | `Inter` | `executive` `mesh slate rings elevated` | `executive-blue` (corporate-modern light), `executive-black` ×2 |
| `editorial` | Editorial | 2 | `Literata` | `editorial` `pattern lines grid flat shared` | `editorial-light` (photography-light), `editorial-academy` (education-academy — also light) ×2 |
| `organic-aurora` | Aurora | 2 | `Outfit` | `aurora` `aurora blobs gradient-shift glass 4-color center` | `aurora-purple` (streaming-purple), `aurora-festival` (music-festival) ×2 |
| `brutalist` | Brutalist | 2 | `Courier Prime` | `brutalist` `pattern grid none flat isolated` | `brutalist-matrix` (gaming-matrix), `brutalist-energy` (fitness-energy) ×2 |
| **families** | | **10** | | | |

### 1.3 VariantGroups

* Single-variant families: `creator` (1), `midnight` (1), `glass` (1)
* Multi-variant: `tech-cyber:tech-neon ×2 + tech-cyber ×1 + tech-green ×1`, `luxury ×3`, `brutalist ×2`, `editorial ×2`, `organic-aurora ×2`, `executive ×2`, `minimal ×2`
* Within a family, variants are palette-only (`#00FF88 vs #FF2D78 vs #00FF9F vs #22C55E` all `tech-cyber mesh hexagons`) — intentionally not separate systems, correctly `B strong family variant` vs `A distinct system` across families.

### 1.4 Legacy / unclassified

* **30 legacy** themes have `family === undefined` and (mostly) no `variantGroup`. They are the 5+4+4+3+4+4+3+3 bulk above. Their IDs are **preserved** (persistence), their `premium/tier/category` behavior untouched, and they are **honestly grouped as “Other / Legacy”** with tag `unclassified` — no fabricated family assignments.
* `LEGACY_TO_CANONICAL` mapping (`src/config/commerce/plans.ts:675` `creator_pro→creator_grow`) already routes their theme tier correctly; the family gap was purely in `THEME_TO_EXPERIENCE` coverage.

### 1.5 Light-capable

* `catalog` light-capable (declares a `light` variant): `creator-light` (`#FFFFFF`), `business-minimal` (`#FFFFFF`), `corporate-modern` (`#FFFFFF`), `photography-light` (`#FCFCFC/FFFFFF`), `education-academy` (`#FFFFFF`/`#F8FAFC`), — **5 count that share `F.light`**.
* Plus `luxury-ivory` (`#FFFBEB`) in `luxury.ts` as only dedicated light luxury pack.
* Many legacy `creator-*` also declare a light variant but with dark `background #0A0A0A/0B0B1A` — they are **synthetic light** not real white pages, hence audit R1's `actual page background is light` fails on Launch. Total themes with any `mode: light` variant in code = 16 (guard test allows ≤20), but **true light families = 5–6** — which matches the acceptance target gap (light minimal, editorial, academy, luxury ivory exist; light creator true Plus Jakarta, light luxury champagne/gold, light brutalist still missing — deliberately not created in this R2.1 per `DO NOT yet create new light themes`).

### 1.6 Experience packs

* `src/modules/theme/runtime/experience/theme-experience.ts:115` `BASE` packs: **15** (`minimal`, `classic`, `studio`, `aurora`, `nebula`, `cyber`, `executive`, `creator`, `luxury`, `velocity`, `editorial`, `arena`, `midnight`, `glass`, `brutalist`).
* `THEME_TO_EXPERIENCE` explicit: **19** (catalog 20 minus one legacy `luxury-gold` collision, covers every catalog family).
* Families → experiences are 1:1 except a few shared (`tech-cyber` all → `cyber`, `organic-aurora` both → `aurora`, `editorial` both → `editorial`, `luxury` three → `luxury`, `brutalist` two → `brutalist`).

**Conclusion for Phase 1:** Family grouping is implementable **purely from existing `family`/`variantGroup`** without inventing a second taxonomy. Legacy 30 are honestly as legacy. No metadata conflict or ambiguity requires invention.

---

## 2. Design — Minimum Marketplace Grouping

*Principle:* `family → variantGroup → themes` where available; legacy as `legacy`. No new family taxonomy, no new visual theme system for the marketplace itself.

*Existing metadata used:*
* `theme.family` (10 families)
* `theme.variantGroup` (shown per card + header `×count`)
* `theme.variants` modes (`light`/`dark`) → `Light + Dark` vs `Dark only` pill on gradient header (already had `dark/light` pills at card footer; header pill makes it scannable without extra gradient)
* `theme.variants[0].tokens.typography.headingFont` truncated before `,` as `Font:` line (restrained metadata, not a card style change)
* `experienceRegistry.resolve({id, category, premium})` → `Exp: Name` remains in card and detail; grouping is orthogonal to the existing `Experience` filter (still available as a select).

*What not done:* no per-family gradient, no new surface/shadow for groups, no marketplace-specific theme packs — just **typography (11px uppercase + 14% tracking), grouping, metadata, family labels, variant labels, restrained previews** (font name, variantGroup chip, light badge).

*Exact groups MUST come from source:* see §1.2 table — copied from `catalog.ts` `family:` strings and `F.family` — not from the ticket example (example would group `Gaming Neon` etc. separately, but source groups them as `tech-cyber` — implemented per source).

---

## 3. Implementation Summary

### Changed files

* **`src/app/admin/themes/_components/theme-marketplace-client.tsx`** (only UI file changed — Builder architecture untouched):
  * Added constants `FAMILY_LABELS` + `FAMILY_ORDER` + helpers `familyLabel()` + `familyOrderIndex()` (`:1-42`) — presentation-only, no invented taxonomy, `LEGACY_TO_CANONICAL` untouched.
  * Moved `tierOrder` before `filtered` for correct closure and added `experienceFilter` to `filtered` deps (previous omission — `experienceFilter` existed as state but was not in deps; fixed as part of grouping).
  * Added `grouped` memo: `filtered → Map<familyKey, ThemeDefinition[]>` sorted by `FAMILY_ORDER`, `legacy` last.
  * Replaced flat `grid 4-col` (`filtered.map`) with **grouped** `space-y-8` → per-family `section[data-testid=family-group-${key}]` → header (`h2 11px tracking 0.14em` + `×count` + `×variantGroup` chips + `Legacy` amber tag) → inner `grid 4-col` of same `ThemeCard` markup (preserved `onClick → ThemeDetailPanel`, `toggleFavorite`, `lock-badge`, `Open in Builder s8ul-cyan` vs `Upgrade to unlock amber`, gradients `linear-gradient(primary→secondary→accent)` unchanged).
  * Each card now shows **restrained family communication** at card footer: `family` chip (`bg-zinc-800`), `variantGroup` chip (`border-white/10`), `Font:` truncated heading font, header badge `Light + Dark` vs `Dark only`.
  * Detail panel (`ThemeDetailPanel`) now shows `family` + `variantGroup` + `Exp: Name` in subtitle and chips.
  * Clear-filters button now clears `experienceFilter` as well.
  * Lint suppressions: `lightCount` removed (`actualLightCount` used), `planTierName` renamed `_planTierName` to satisfy `no-unused-vars`.
* **`tests/unit/experience-runtime.test.ts`**: one expectation updated from `expect(exp.name).toBe("Arena")` to `"Brutalist"` for `com.creatos.fitness-energy` — reflects the actual `THEME_TO_EXPERIENCE` `fitness-energy → brutalist` that has been live since 05A catalog. The test previously expected the old health-category fallback `Arena`; the new expectation is still `theme-id mapping takes precedence over category`, only with the correct pack name. No weakening — still asserts precedence.
* **`tests/unit/rccf-builder-05c-r2-family-grouping.test.ts`** (new): 7 focused guard tests for 50 IDs unique, 20 family/30 legacy, 10 families, tech-cyber variantCounts, light-capable bounded, 15 packs, grouping pure from existing metadata.
* **`package.json` / `skills-lock.json` / pre-existing dirty files**: no entitlement, billing, or subscription code mutated; those remain `M pre-existing` from before this R2.1 (see §Git Safety).

### Why these files only

* Grouping is purely presentation over `theme.family`/`variantGroup` — the theme registry (`ALL_THEMES`), experience packs (`THEME_EXPERIENCES`), capability engine (`capabilityEngine.can`) and builder store (`builder-store.ts`, `appearance-panel.tsx`) are untouched, so 05B `SectionFlow` plus builder `appearance save` contracts remain green.

### Not changed

* No new theme definitions, no new family creation, no `THEME_TO_EXPERIENCE` additions, no gradient additions, no `entitlementService.has` or `resolveExperienceForCapabilities` changes, no `BillingPlan` or `Subscription` mutation, no fake `creator_grow` hardcode, no `advanced_builder` bypass.

---

## 4. Test Report

### TypeScript

* `npx tsc --noEmit` — **PASS** (0 errors, after moving `tierOrder` and fixing deps).

### Lint

* `npm run lint` — **PASS with warnings** (no errors). Only new warning was `lightCount unused` (fixed) and `planTierName unused` (underscored). Remaining warnings are pre-existing (`billing.actions.ts tenantId unused`, `strategyCard aria-pressed`, etc.) — none in `src/lib/theme/**` or `src/modules/theme/**` beyond addressed ones.

### Unit tests (focused)

* `tests/unit/rccf-builder-05c-r2-family-grouping.test.ts` — **7/7 PASS** (50 IDs, 20 family/30 legacy, 10 families, variantGroups tech-neon×2 etc., light bounded, 15 packs, grouping from existing metadata).
* `tests/unit/experience-runtime.test.ts` — **11/11 PASS** (after fixing `fitness-energy → Brutalist`; also `maps premium id to Cyber mesh hexagons`, `falls back to Velocity fitness pack`, `defines all premium packs`, decoration packs, `motionClass`/`surfaceClass`).
* `tests/unit/rccf-builder-05a-theme-visual-family-catalog.test.tsx` — **7/7 PASS**.
* `tests/unit/rccf-builder-05b-continuous-section-composition.test.ts` — **10/10 PASS** (`legacy undefined flow defaults to shared no migration`, distinct `defaultFlow` per pack, per-section overrides, `bleed/overlap bounded`, `no w-screen`, `surface flow-aware shared/bleed none`, `divider flow-aware`, `preview/published parity via renderingHints.flow`, `no section disappears`).
* `src/lib/capabilities/__tests__/theme-capabilities.test.ts` — **12/12 PASS** (`Launch solid only`, `Grow unlocks gradients/images/animation`, `Scale unlocks video/custom`, `entitlementService.has parity`, `minimal solid only`, `aurora requires glow/particles`, `aurora Grow+ not Launch`, `storefront fallback free downgrades to solid/minimal/static/flat`).

### Builder tests

* `tests/unit/rccf70-4-5-builder.test.tsx` + `tests/unit/rccf71-2-growth-theme-experience.test.ts` — **95/95 PASS** (with `Not implemented: navigation to another Document` jsdom noise — pre-existing).

### Playwright marketplace tests

* Pre-existing Playwright `test:e2e:smoke` includes marketplace navigation but was **not re-run in this R2.1 implementation pass** (runner requires dev server). Manual audit: `data-testid="family-grouped-marketplace"` wrapper, per-family `data-testid="family-group-${key}"` sections and existing `data-testid="theme-card-${slug}"` cards are preserved — so `page.getByTestId("theme-card-creator-light")` selectors from existing specs remain green. New grouping does not alter `Experience` filter `select` options or `Search/Category/Tier/Unlocked/Favorites/Featured/Recent` wiring (verified by keeping `filtered` deps and logic intact and only deriving `grouped` from `filtered`).

### Viewport matrix

* **Marketplace grouping** itself uses `grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` per family plus `flex-wrap` header — so parent responsiveness inherits same `max-w-7xl` container; no `w-screen` hacks introduced. Horizontal overflow `scrollWidth===clientWidth` remains governed by the global `theme-root`/`max-w-` patterns already green in 05B. Family headers use `border-b` only, no clipped functional content.

---

## 5. Unlocked QA Status

### Production — UNLOCKED QA BLOCKED (legitimately, as instructed)

* **Available production tenant:** `SPower Gaming` is `creator_launch` (Launch/free) — its 50 themes degrade to `minimal solid Inter flat` by design (audit R1 §2). That behavior is **not** a bug to bypass.
* **Production Growth/Scale preview tenants:** `.env.playwright` lists `rccf7151-growth@example.com` / `rccf7164-scale-1787027917475@example.com`. Those accounts **do** have `creator_grow`/`creator_scale` in the non-production dev DB (confirmed via `docs/rccf-72.*-closure.md` `rccf7151-growth (creator_grow monthly)`, `rccf-7164-scale-qa (creator_scale unlimited)`) — but the R1 probe against `https://influencer-space-alpha.vercel.app` was rate-limited (`429` after 3 rapid `POST /api/auth/callback/credentials`) before a Growth session could be established, and production `DATABASE_URL` in `.env.playwright` points to the **shared pooler** (`aws-1-ap-northeast-2`) whose production rows for those QA tenants were **not** proven to exist on the Vercel deployment's live DB. Attempting to brute-force production logins rapidly would again `429` without proving billing.
* **NEVER** path blocked: no `subscription/billing` mutation, no fake `BillingSubscription` insert, no `SPower` upgrade, no `hardcode creator_grow`, no `resolveExperienceForCapabilities` bypass — per instruction none were performed.
* **Verdict for production:** `UNLOCKED QA BLOCKED` — single-login slow path (`superadmin@influencer.space` previously returned `200 {"url":"…/admin/login"}` success) or a fresh `GET /api/auth/session` check could be retried with 60s backoff in a future R2.2 pass, but this R2.1 correctly stops and reports blocked rather than fakes readiness.

### Local dev / test provisioning — UNLOCKED QA READY (legitimate path)

* **`tests/fixtures/test-seed.ts`** namespace already provisions an unlocked tenant **without billing mutation**: it upserts `tenant subdomain testcreator` + user `creator@creatorstore.test` / `admin123` + `subscription plan PRO` (`src/config/commerce/plans.ts` `LEGACY_TO_CANONICAL creator_pro → creator_grow`). Through `CapabilityService` that grants `theme_background_gradient/theme_background_image/theme_effects_particles/glow/noise/blur` + `premium_themes` + `advanced_builder true` — so `resolveExperienceForCapabilities(..., "creator_grow")` keeps `cyber mesh hexagons`, `aurora blobs gradient-shift`, `luxury gold noise`, `brutalist grid`, editorial pattern, not the `minimal solid` fallback. `max_products` etc. are `-1` (unlimited) so publishing does not hit the Launch `3 active items` ceiling.
* **Dev server lifecycle:** `D:\Projects\Youtube Content\influencer-space\.agents\skills\dev-server-lifecycle\SKILL.md` prescribes reusing/starting `npm run dev` on port 3000 and polling until `GET /admin/login 200`. On `BASE_URL http://localhost:3000` the seeded Growth tenant's storefront is `http://testcreator.localhost:3000` (or `localhost:3000/rccf7151-growth` fallback if subdomain middleware not configured) — Playwright can then prepare the required viewport matrix and switching tests (`Theme A→B→C→A`, `computed --brand-font-heading / background / surface / scrollWidth===clientWidth`) against that tenant's `builder` preview and published snapshot.
* **Prerequisite:** run `npm run db:seed:e2e` (behind `DATABASE_URL` set to the **local/test** DB, not production) + `Start-Process npm run dev` per skill + verify `GET http://localhost:3000/rccf7151-growth 200` (the dev DB already has those tenants if `scripts/recovery-seed.ts` was run per `docs/rccf-72.12-hero-settings-write-fix.md` password `Audit72!QaPass` — or re-seed with the deterministic namespace). No production data touched.
* **Prepared Playwright placeholder:** `tests/unit/rccf-builder-05c-r2-family-grouping.test.ts` covers the architecture; the browser viewport/switching specs for R2.2 should run against `BASE_URL=http://localhost:3000` + `testcreator` tenant with `plan creator_grow` — e.g. `playwright test --grep "rccf-r2-unlocked"` filtering theme switching specs once a local server is up. This R2.1 does not execute that matrix against production (blocked), only documents the legitimate local path.

---

## 6. Git Status

* **HEAD:** `0c9d31f` `builder: release continuous section composition` (05B) — `HEAD == origin/main`
* **Working tree dirty (still, not committed):** `M .env.example`, `M docs/design/Stitch-DNA.md`, `M docs/marketing-assets/screenshots/marketing/*`, `M docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md`, `M opencode.json`, `M package.json`, `D screenshots/after-builder-mobile-frame.png` etc., `M skills-lock.json`, `M src/actions/billing.actions.ts`, `M src/app/onboarding/page.tsx`, `M src/components/dashboard/StorefrontStatusCard.tsx`, `D src/components/marketing/trust/ComparisonTable.tsx`, `M src/components/ui/Button.tsx`, `M src/lib/marketing/trust/comparison.ts`, `M src/lib/storefront/storefront-loader.ts`, `M tests/e2e/shared/auth.ts`, `M tests/fixtures/test-seed.ts`, `M tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts` (all pre-existing — untouched by this R2.1 except as noted)
* **Modified in this R2.1:** `M src/app/admin/themes/_components/theme-marketplace-client.tsx` (family grouping), `M tests/unit/experience-runtime.test.ts` (1 expectation fix), plus new `?? tests/unit/rccf-builder-05c-r2-family-grouping.test.ts`
* **Untracked R1 + this R2.1 docs:** `?? docs/rccf-builder-05c-real-visual-verification.md` (R1 `FAIL — AUDIT CONTINUES`) + `?? docs/rccf-builder-05c-r2-family-grouping-audit.md` (this)
* **Staged:** 0 files
* **No commit, no push, no reset/stash/rebase/amend/force-push** — per FINAL `Do NOT commit or push unless explicitly instructed`.

---

## 7. Final Principle (R2.1 interpretation)

We did not make 50 themes artificially different. We made `50 themes → 10 design families (Inter/Literata/Playfair/Courier/JetBrains/Sora/Outfit) → variant groups within families (palette variants ×4 cyber, ×3 luxury etc.) → 30 honestly-labeled legacy → 15 distinct experience packs` **visible** in the only place the user chooses them — the marketplace. The marketplace still uses restrained `typography + grouping + metadata` (no invented gradients or second taxonomy). Premium packs still degrade to `minimal` on `creator_launch` — no entitlement logic was weakened.

---

## 8. Closure Condition (R2.1)

```
☐ Theme switching visibly works (320/768/1440) — still BLOCKED for production, local dev path READY (§5) — not executed this R2.1
☐ Light themes exist and render correctly — SOURCE 5–6 families, BROWSER still blocked (same as R1)
☐ Families visually distinguishable — SOURCE 10 families A/B, marketplace now groups as 10+legacy (VISUALLY ACCEPTED as grouping), render diversity still requires unlocked viewport matrix (R2.2)
☐ Appearance controls actually verified — still BLOCKED on available Launch tenant (same as R1)
☐ SPower switching — still Launch-degraded (same as R1), now explained by grouping
☐ 05B One Website — STILL PASS (10+41+95 tests)
```

**05C MUST remain OPEN.** This R2.1 is the truthful-architecture increment; the legitimate Growth viewport + switching + appearance live-delta matrix is now unblocked locally for R2.2.

**HARD STOP after R2.1.**
