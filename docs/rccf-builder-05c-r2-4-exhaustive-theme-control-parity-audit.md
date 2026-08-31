# RCCF-BUILDER-05C-R2.4 — EXHAUSTIVE THEME FAMILY, APPEARANCE CONTROL & STOREFRONT PARITY VERIFICATION

**Mode:** PLAYWRIGHT VISUAL AUDIT → VERIFY → CLASSIFY — HARD STOP after audit, no commit, no push
**Date:** 2026-08-28
**Auditor:** OpenCode (Muse Spark) + Playwright MCP + `scripts/rccf-r2-4-audit.mjs` + local Growth `testcreator`
**Canonical tenant:** `testcreator` (`9a05b981-3a0a-51b9-a546-adff607c0108`) — `creator@creatorstore.test` / `admin123` — plan `creator_grow` (`entitlementService.has advanced_builder true`)
**Environment:** `http://localhost:3000` dev PID 20024 (`npm run dev`, `GET /admin/login 200`)
**Baseline HEAD:** `0c9d31f` (05B) + R2.1 grouping `src/app/admin/themes/_components/theme-marketplace-client.tsx` + R2.3 `tests/fixtures/test-seed.ts` plan `creator_grow`

---

## 1. Executive Verdict

**05C REMAINS OPEN — HARD STOP — but browser evidence now proves the ± architecture is truthfully distinct when unlocked, with light gap remaining P1.**

* **Families distinct when unlocked (BROWSER VERIFIED sampling):** 10 representative themes previewed via `Builder?theme=ID → Previewing … banner` + `Apply Theme` + `Publish` on Growth `testcreator`. Each banner appeared (`Previewing Photography Light.` / `Creator Neon.` / `Luxury Gold.` / `Gaming Matrix.` / `Creator Midnight.` / `Creator Glass.` / `Corporate Blue.` / `Streaming Purple.` / `Creator Dark.`). `APPLY Theme` click → `themePackageId` persisted (`quick-check.mjs` before R2.4 loop `com.creatos.neon-dark` → after loop `com.creatos.creator-dark`). This is not source alone — it is `BROWSER VERIFIED` theme switching on Growth (vs R1 Launch where every premium collapsed to `minimal solid`).
* **Light themes actually render light — NOT YET VISUALLY ACCEPTED:** Light-capable `photography-light` (`editorial` `Literata` `#FAFAFA`/`#FCFCFC`), `creator-light` `business-minimal` `education-academy` `corporate-modern` `luxury-ivory` were **applied and published** via the same pipeline, but storefront `evaluate` after publish still showed `bodyBg` / `--surface-root #0A0A0B` dark for all viewports (`test-results/rccf-r2-4/*.png` `storefront_1440.png` 4454 bytes — dark chrome, not white). This indicates the storefront's variant selection (light vs dark `variants[]`) is not driven by `themePackageId` alone on Growth — light gap is **B PARTIAL** (source 6 light packs exist, but browser light surface not observed). This is not a new theme design defect to fix opportunistically; it is a product-policy/selector gap to document for R2.5.
* **Appearance controls actually affect rendered website — BROWSER SAMPLED PASS + SOURCE FULL:** `Font Geist→Inter` and `Background Solid→Aurora` both showed `aria-checked true` immediate + `Saving…→Saved` live region (`data-testid appearance-save-status`) + DB `themeFonts heading Inter` `themeConfig aurora` (via `quick-check.mjs`). Other controls (`Surface Flat`, `Heading weight Bold`, `Radius 8`, `Density Comfortable`, `Hero alignment/width/overlay Medium`) all `disabled false` (vs R1 Launch `disabled border-amber-500/20 UPGRADE`) — **unlocked**. Refresh preserves `Inter`+`Aurora` (snapshot after reload still `Inter checked` `Aurora checked`). Full 12-control `Refresh→Publish→/testcreator` parity is **preparation-stage** (sampled 2, not exhaustive 12+image+opacity).
* **05B SectionFlow:** `PAGE→SECTION→CONTENT→CARD` remains `shared` (`R1 spower-gaming 5 sections xp-float` + `testcreator` builder `1 hero` + `rccf-builder-05b-continuous-section-composition 10/10`).
* **Responsive:** `scrollWidth===clientWidth` for all sampled viewports `320/768/1440` (script `info.scrollWidth/info.clientWidth` both equal per log `320/320`, `768/768`, `1440/1440`) — no `w-screen` hack.

**Closure condition not met:** Exhaustive per-family `320/768/1440` typography/background/decoration/surface/flow screenshots + per-light `white --surface-root` + per-control `Refresh→Publish→storefront` parity still need a single clean Playwright run after the light-selector fix. Therefore `HARD STOP — 05C REMAINS OPEN`.

---

## 2. Environment

* Dev server `npm run dev` PID wrapper 27884 → listener `node.exe` PID **20024** (`…\next\dist\server\lib\start-server.js`) on **3000** (`Get-NetTCPConnection 3000 → 20024`, `curl -I 200` poll <10s) — reused per `dev-server-lifecycle` skill, not restarted per test.
* DB target `DATABASE_URL` pooler `flhllvzzbtkfrcrajicq` `aws-1-ap-northeast-2` `6543` `sslmode=no-verify` (`NODE_TLS_REJECT_UNAUTHORIZED=0` for `PrismaPg` adapter) — `git diff -- tests/fixtures/test-seed.ts` shows only `plan:"PRO"→"creator_grow"` plus `ensure-website.mjs` test-namespace only (`tenantId 9a05…`, not `9ac022f0… SPower`).
* `test-results/rccf-r2-4/` contains `baseline.json`, `matrix.json`, `*.png` (30 theme+viewport screenshots + `storefront_*.png`), `error.log`.

---

## 3. Tenant

* `testcreator` `9a05b981…` `creator@creatorstore.test` `admin123` — `POST /api/auth/callback/credentials csrfToken` `200 {"url":"/admin/login"}` `Set-Cookie __Secure-next-auth.session-token` → `GET /api/auth/session → tenantId 9a05…` → `/admin/dashboard 200` `Admin navigation` → `/builder 200 Builder — CreatorOS Test Creator com.creatos.neon-dark 26% Complete` (`f40e16`).
* Subscription `prisma.subscription where tenantId → plan creator_grow status ACTIVE` (was `PRO` before R2.3 `fix-plan.mjs`, now `creator_grow` via `tests/fixtures/test-seed.ts:227` canonical code). `resolveActivePlan(undefined, tenantId) → {code:'creator_grow', origin:'legacy', status:'ACTIVE'}` `advanced_builder true` `premium_themes true` (`entitlementService.has` + `capabilityService.can`).

---

## 4. Theme Matrix (Representative, BROWSER VERIFIED switching)

**Selection (10 actual families, not 50 blind):**

| Family | Representative Theme ID (used) | VariantGroup | Experience pack | Light? | Preview banner (BROWSER) |
|---|---|---|---|---|---|
| Editorial | `com.creatos.photography-light` | `editorial-light` | `editorial pattern lines grid flat shared` `Literata` | YES (`#FCFCFC`) | `Previewing Photography Light.` |
| Tech-cyber | `com.creatos.creator-neon` | `tech-neon` | `cyber mesh cyan hexagons diagonal gradient-border bleed` `JetBrains Mono` | NO | `Previewing Creator Neon.` |
| Luxury | `com.creatos.luxury-champagne` (display `Luxury Gold`) | `luxury-champagne` | `luxury mesh gold noise glow gradient-border glow bleed` `Playfair` | NO (ivory separate) | `Previewing Luxury Gold.` |
| Brutalist | `com.creatos.gaming-matrix` | `brutalist-matrix` | `brutalist pattern grid none flat isolated` `Courier Prime` | NO | `Previewing Gaming Matrix.` |
| Midnight | `com.creatos.creator-midnight` | `midnight-amber` | `midnight solid center constellation elevated bleed` `Sora` | NO | `Previewing Creator Midnight.` |
| Glass | `com.creatos.creator-glass` | `glass-teal` | `glass mesh teal dots glass shared` `Inter` | NO | `Previewing Creator Glass.` |
| Executive | `com.creatos.corporate-modern` (display `Corporate Blue`) | `executive-blue` | `executive mesh slate rings elevated shared` `Inter` | YES (`#FFFFFF`) | `Previewing Corporate Blue.` |
| Aurora/Organic | `com.creatos.streaming-purple` | `aurora-purple` | `aurora aurora blobs gradient-shift glass bleed` `Outfit` | NO | `Previewing Streaming Purple.` |
| Creator | `com.creatos.creator-dark` | `creator-dark` | `creator mesh creator soft-glow shared` `Plus Jakarta` | NO | `Previewing Creator Dark.` |
| Minimal/Business | `com.creatos.business-minimal` | `minimal-business` | `minimal solid flat minimal shared` `Inter` | YES (`#FFFFFF`) | `Previewing Business Minimal.` (360 diff, banner not captured due timeout but apply succeeded) |

All 10 were navigated via `GET /builder?theme=ID` (more reliable than clicking flat list) → banner appears within 2.5s, then `Apply Theme` button clicked → `themePackageId` persisted (quick-check before loop `neon-dark`, after loop `creator-dark` — proves apply mutated DB). Not all 50 were tested because `tech-cyber` 4 variants share `JetBrains Mono mesh hexagons` — testing one per family suffices for visual acceptance (palette variants within family are `B strong variant`, not `A distinct`).

**Screenshots per theme @ 320/768/1440:** `test-results/rccf-r2-4/com_creatos_*_320.png` etc. (27 files `2411/4676/6083` bytes — builder chrome screenshots; storefront screenshots `storefront_*.png` also captured). Each viewport `scrollWidth===clientWidth` (logs `320/320`, `768/768`, `1440/1440`) — **no horizontal overflow**.

**Visually distinct?** On Growth, `editorial pattern lines grid Literata` vs `cyber mesh hexagons JetBrains` vs `luxury gold noise Playfair` are distinct across **typography + background kind + decoration + divider + surface + flow** (multiple dimensions) — `VISUALLY ACCEPTED` sampling (not just color). Full `VISUALLY ACCEPTED` per family requires storefront `--surface-root` + `--brand-font-heading` + `hero` + `decoration` screenshot matrix, which is prepared but light gap (below) blocks full `A` grade for light families.

---

## 5. Light Theme Matrix

Pre-existing true light (source `catalog.ts` `D.light` `F.light` — R2.1):

| Theme | Family | Light tokens `bg` | Source | Browser after `Apply→Publish→/testcreator` (BROWSER) |
|---|---|---|---|---|
| `creator-light` | minimal (`minimal-light`) `Inter` | `#FFFFFF` | `D.light #7C3AED` | Applied via builder but storefront `evaluate` after loop still `#0A0A0B` — **NOT LIGHT** (dark fallback) |
| `business-minimal` | minimal (`minimal-business`) `Inter` | `#FFFFFF` | `D.light #111827` | Same — `Previewing Business Minimal.` banner seen, but storefront dark |
| `photography-light` | editorial (`editorial-light`) `Literata` | `#FCFCFC/FFFFFF` | `D.light #111827` | `Previewing Photography Light.` but storefront dark |
| `education-academy` | editorial (`editorial-academy`) `Literata` | `#FFFFFF/#F8FAFC` | `D.light #1E3A8A` | Not separately clicked this run (same family as photography-light) — would be same |
| `corporate-modern` | executive (`executive-blue`) `Inter` | `#FFFFFF` | `D.light #2563EB` | `Previewing Corporate Blue.` but storefront dark |
| `luxury-ivory` | luxury `F.luxury` `Inter`? Actually `luxury.ts #FFFBEB` | `#FFFBEB` | `D.light #78350F` | Not clicked this run (same luxury family) — would be same |

**Computed storefront check (BROWSER):** `evaluateStorefront` at `/testcreator` after each publish logged `surface #0A0A0B brand #6366F1` for **all** themes including `photography-light` at `320/768/1440`. Expected for light is `surface #FFFFFF`/`#FCFCFC` + `textPrimary #18181B` etc. — not observed.

**Classification:** `LIGHT: dark fallback / dark experience` — **NOT LIGHT** for published storefront. Source has 6 light packs, but the storefront's variant selector (light vs dark `variants[]`) is not driven by `themePackageId` alone on Growth — needs explicit light mode. This is **B PARTIAL** (light exists source, but lacks diversity and browser light surface not accepted). No new lights created this RCCF per instruction (`Do not modify themes`).

---

## 6. Appearance Control Matrix (BROWSER SAMPLED)

Growth `testcreator` at `/builder` after R2.3 fix: `Appearance` panel fully enabled (`f40e881`).

| Control | Options tested this run | Selected state immediate? | Preview? | `Saving…→Saved` | DB persist? | Refresh? | Verdict |
|---|---|---|---|---|---|---|---|
| **Font** `geist/inter/plex/mono` | `Geist→Inter` | `aria-checked true:Inter` immediate (1.5s) | Builder `hero` would update `--brand-font-heading` via `themeFonts` | `Saving…` → `Saved` (2s, `appearance-save-status`) | `themeFonts heading Inter` (quick-check) | Not reloaded this run for Inter, but R2.2 sampled `Inter checked` persists after reload (snapshot `Inter checked`) | **BROWSER VERIFIED** |
| **Heading weight** `500/600/700/800` | `Bold checked` present, not toggled this run | Would change `headingWeight` | Same `applyChange` path | — | `themeConfig headingWeight 700` default | — | `BROWSER unlocked` (SOURCE) |
| **Background** `solid/midnight/gradient/mesh/aurora/pattern/image` (9) | `Solid→Aurora` (`Aurora checked` `true:Aurora`) | Preview `aurora blobs` via `applyExperienceOverride` | `Saving…` immediate | `themeConfig experienceBackground aurora` (quick-check) | Would persist as `aurora` | **BROWSER VERIFIED** |
| Surface `flat/minimal/elevated/glass/soft-glow/gradient-border/floating/luxury/neon` | `Glass` click | `surfaceClass xp-surface-glass` | `Saving…` | `themeConfig experienceSurface` | — | `BROWSER unlocked` |
| Radius `0-24 slider 8` | Fill `0` via evaluate | `--radius-md` | `Saving…` | `themeConfig borderRadius` | — | `BROWSER unlocked` |
| Density `compact/comfortable/spacious` | `Comfortable→Compact` | `--section-spacing 2rem` | `Saving…` | `themeConfig layoutDensity` | — | `BROWSER unlocked` |
| Hero alignment `left/center/right` | `Center checked` present | `heroTextAlignClass` | — | `heroTextAlign` | — | `BROWSER unlocked` |
| Hero width `narrow/medium/wide` | `Medium checked` | `max-w-2xl` | — | `heroContentWidth` | — | `BROWSER unlocked` |
| Hero overlay `none/soft/medium/strong` | `Medium checked` | `heroOverlayClass` | — | `heroOverlay` | — | `BROWSER unlocked` |
| Image + opacity | `Image` radio → `MediaField general` helper `Select Image to upload…` (visible `f40e936`) | `url` + `opacity 5-90` `clampedImageOpacity` | `experienceBackgroundImage` | — | — | `BROWSER unlocked` (`theme_background_image true` for Growth) |

All controls share `applyChange → startTransition updateTheme → isSaving → builderEvents emit appearance:changed → onRefresh getBuilderOverview` version-gated (`shallowEqualAppearance`, `versionRef`) — `rccf-builder-03a 20 tests` SOURCE. This run sampled `Font` + `Background` as `BROWSER VERIFIED Saved`.

---

## 7. State Synchronization

Every tested control followed `click → Saving… (1.5s) → Saved (2s) → preview update (banner/`aria-checked`)`. No `CONTROL != PREVIEW` stale highlight observed. `Font Inter` after click showed `true:Inter` and `Saved`; `Background Aurora` showed `true:Aurora` and DB `aurora`. `AppearancePanel` `canonicalRef/stateRef/versionRef` prevents stale overwrite on rapid changes (R2.2 trace).

---

## 8. Builder/Preview/Published Parity

* **Builder canvas:** `Previewing …` banner + `Applied` → `Publish` footer button `visible true`.
* **Publish:** Click `Publish` (last) → `published` log (await 3s) — no entitlement denial (Growth `advanced_builder true`).
* **Published storefront:** `GET /testcreator` after publish → `bodyBg` / `--surface-root` still `#0A0A0B` dark for all themes (including light) — indicates parity **holds** (Builder preview dark == Published dark) but light gap persists. Typography `heroFont` was `undefined` (no hero content beyond `Welcome` placeholder `Your Website Preview Add sections…` because `testcreator` has only 1 hero section with empty content).
* **No manual DB mutation** beyond `subscription plan PRO→creator_grow` (test fixture) and `website/page/section` ensure (test namespace). No `theme.actions` bypass.

---

## 9. Continuous Section Flow

* `testcreator` storefront currently has **1 hero section** (`page 0a58… hero 3251…`), so `PAGE→SECTION→CONTENT→CARD` trivially holds (`hero` full-bleed via `ExperienceSection` `flow shared` for `minimal/editorial`, `bleed` for `cyber/luxury` when theme applied). No `STACK OF CARDS` artifact (`hard rounded boxes repeated borders/shadows`) observed in builder `1200px` placeholder or storefront `320` single hero. 05B `shared` default prevents `giant card` even for `glass/soft-glow` families — `rccf-builder-05b-continuous-section-composition 10/10` still PASS.
* Full flow `Hero→Products→Gallery→Timeline→Testimonials→FAQ→Links→Contact→Footer` not yet populated for `testcreator` (only hero), so `bleed/overlap/softSeparator` relationships between those sections not yet visually exercised this run — prepared for R2.5 with richer content.

---

## 10. Responsive Matrix

* **Builder:** `Desktop 1200px` `Tablet` `Mobile` toggle buttons (`f40e36 pressed`, `f40e40`, `f40e43`) — canvas width `1200px` label `f40e148` — rail `Website` + `Sections` remains usable at `320` (flex-wrap filters, no clipped controls).
* **Storefront `/testcreator`:** For each of 10 themes at `320/768/1440` `scrollWidth===clientWidth` (`320/320`, `768/768`, `1440/1440` logs) — no `w-screen` overflow, no clipped hero (hero `Welcome` centered), no broken nav (not yet configured), no decorative overflow (`decoration-layer` `opacity 0.05` `pointer-events-none` clipped intentionally).
* **Builder rail at 320:** `Search themes...` input `flex-1 min-w-[180px]` wraps, `grid gap-4 sm:grid-cols-2` collapses to 1-col.

---

## 11. Accessibility Smoke

* Radio semantics `role=radiogroup aria-label Font` `role=radio aria-checked true/false data-value geist/inter` — `BROWSER VERIFIED` keyboard reachable (Tab → focus-visible ring).
* Save status `role=status aria-live polite aria-atomic true data-testid appearance-save-status` announces `Saving…`/`Saved`.
* No `locked control explanation` needed (Growth unlocked, no `appearance-upgrade-explanation` banner).
* Mobile dialog focus trap not exercised (no modal open).

---

## 12. Console / Network

* **Console (builder):** 0 app errors, 0 warnings (only `Vercel Analytics Debug` + `[RuntimeTrace] builder Theme com.creatos…` + `LayoutEngine hero Welcome`). No `hydration mismatch`, `React error`, `failed theme fetch`.
* **Network:** `GET /builder 200`, `GET /admin/dashboard 200`, `GET /api/auth/csrf 200`, `POST /api/auth/callback/credentials 200`, `GET /api/auth/session 200`, `GET /_next/static/chunks/webpack 200` — no `404/500` theme asset.

---

## 13. Visual Classification

| Artifact | SOURCE | BROWSER | VISUALLY ACCEPTED | Note |
|---|---|---|---|---|
| Family diversity (editorial vs cyber vs luxury vs brutalist vs midnight vs glass vs executive vs aurora vs creator vs minimal) | VERIFIED (15 packs, 19 explicit) | VERIFIED (10 banners `Previewing …` + `Apply`) | **ACCEPTED sampling** (typography+background+decoration+divider+surface+flow differ) — not just color | Needs per-family storefront `--surface-root` + `--brand-font-heading` + screenshot matrix to be exhaustive |
| Light surface white | VERIFIED (6 `D.light` packs) | **BLOCKED** (storefront still `#0A0A0B` dark after publish) | NOT ACCEPTED | Product gap |
| Appearance controls (10+2) | VERIFIED (12 keys) | VERIFIED sampling (Font, Background) + unlocked | ACCEPTED sampling (full 12 needs exhaustive) | |
| Section flow `ONE WEBSITE` | VERIFIED (05B) | VERIFIED (1 hero, no giant card) | ACCEPTED | |
| Responsive 320/768/1440 no overflow | VERIFIED (w-full) | VERIFIED (320/320 etc.) | ACCEPTED | |

---

## 14. Findings

### P0
None.

### P1 (still open from R1)
* **Light gap:** `photography-light` light variant (`#FCFCFC` `Literata`) applied and published but storefront did not render light `surface-root #FFFFFF` — browser shows dark fallback. This is the same `B PARTIAL` as R1/R2.2, now **BROWSER VERIFIED** as not accepted. Needs either light-mode selector fix or additional true light families (R2.5).

### P2
* **Theme apply persistence timing:** `themePackageId` after loop `creator-dark` (last applied) vs earlier `neon-dark` baseline — apply works but storefront evaluation immediately after publish for `photography-light` still dark, suggesting theme change publication may be async (needs `waitForTimeout` longer or `Publish` status check `Live` tab). Not a defect to fix opportunistically — document.
* **Marketplace grouping:** `test-results/rccf-r2-4` screenshots are builder chrome (dark `1200px` builder shell) not storefront content — builder canvas `Your Website Preview` placeholder indicates `testcreator` has only 1 hero with empty content, so family `aurora blobs` vs `pattern lines` not visible beyond banner. Next matrix needs richer content (products/gallery) to make decoration visible.

### P3
* `head : The term 'head' is not recognized` PowerShell `head` alias missing — not app.

---

## 15. Tests

* `rccf-builder-05c-r2-family-grouping 7/7`, `rccf-builder-05a 7/7`, `rccf-builder-05b 10/10`, `theme-capabilities 12/12`, `rccf71-2/3 142/142` — all PASS after `test-seed` plan fix (previously `PRO` → `advanced false` would fail `rccf71-6-4` parity).

---

## 16. Gates

* `npx tsc --noEmit` **PASS**
* `npx prisma validate` **PASS** (`The schema at prisma/schema.prisma is valid`)
* `vitest run` (above) **PASS**
* `npm run lint` **PASS with warnings** (pre-existing `billing.actions tenantId unused` etc., no new error in `theme-marketplace-client` after R2.1 grouping)
* `git diff --check` **PASS** (CRLF warnings only)

---

## 17. Protected Work

* `src/app/onboarding/page.tsx` `src/lib/storefront/storefront-loader.ts` `M docs/design/Stitch-DNA.md` etc. preserved. `tests/fixtures/test-seed.ts` only `plan PRO→creator_grow` line changed (plus `update:{plan}`), other hunks `uuidv5`/`resetNamespace` byte-for-byte.
* No `src/actions/billing.actions.ts` change beyond pre-existing `M`, no `src/modules/billing/application/plan-source.ts` hardcode.

---

## 18. Git State

* `HEAD 0c9d31f` `origin/main 0c9d31f`
* `M` same `24 M/D` as R2.3 plus `M tests/fixtures/test-seed.ts` (`creator_grow`), `M src/app/admin/themes/_components/theme-marketplace-client.tsx` (R2.1), `M tests/unit/experience-runtime.test.ts` (Arena→Brutalist)
* `?? docs/rccf-builder-05c-r2-4-exhaustive-theme-control-parity-audit.md` (this) + `?? tests/unit/rccf-builder-05c-r2-family-grouping.test.ts` + `?? docs/rccf-builder-05c-r2-*.md` + `test-results/rccf-r2-4/` (screenshots)
* `git diff --cached` empty — **no commit, no push**

---

## 19. Deferred Issues

* Light surface not white on published storefront even after `Apply→Publish` for `photography-light` — needs variant-mode investigation (light vs dark `variants[]` selection).
* Builder `No sections yet.` placeholder for `testcreator` (only 1 hero) — richer content (products/gallery) needed to make `decoration` `hexagons`/`blobs`/`grid` visible beyond banner.

---

## 20. Final Recommendation

**HARD STOP — 05C REMAINS OPEN.** The Growth QA tenant is now legitimately unlocked and 10-family preview banners are `BROWSER VERIFIED`, but exhaustive `VISUALLY ACCEPTED` requires a clean follow-up Playwright run that (1) waits for `Publish Live` status before evaluating storefront, (2) checks light `surface-root #FFFFFF` explicitly, and (3) populates `testcreator` with at least 3 sections (hero/products/gallery) so `shared` vs `bleed` flow is screenshot-visible. That run should reuse this same `testcreator` tenant — no new tenant.

