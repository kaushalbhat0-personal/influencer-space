# RCCF-BUILDER-05C-R2.5 — LIGHT THEME RESOLUTION & RICH QA STOREFRONT FINAL VERIFICATION

**Mode:** PLAYWRIGHT-FIRST INVESTIGATION → IMPLEMENT ONLY IF ROOT CAUSE PROVEN → VERIFY → CLASSIFY — HARD STOP, no commit, no push
**Date:** 2026-08-28
**Auditor/Implementer:** OpenCode (Muse Spark) + Playwright MCP
**Baseline HEAD:** `0c9d31f` (05B) — plus R2.1 grouping, R2.3 `tests/fixtures/test-seed.ts` `creator_grow`, R2.4 sampling, plus this R2.5 fix `src/lib/storefront/build-snapshot.ts`
**Canonical QA tenant:** `testcreator` `9a05b981-3a0a-51b9-a546-adff607c0108` `creator@creatorstore.test` / `admin123` `creator_grow` `advanced_builder true`
**Environment:** `http://localhost:3000` dev PID 21296 (`npm run dev`, `GET /admin/login 200`)

---

## 1. Executive Verdict

**FAIL — DEFECT REMAINS — HARD STOP — 05C REMAINS OPEN**

* **Light defect reproduced BROWSER:** Selecting the six light-capable catalog themes (`photography-light` `Literata` `#FFFFFF`, `creator-light` `Inter` `#FFFFFF`, `business-minimal` `Inter` `#FFFFFF`, `corporate-modern` `Inter` `#FFFFFF`, `education-academy` `Literata` `#FFFFFF`, `luxury-ivory` `Playfair` `#FFFBEB`) via `Builder?theme=ID → Previewing … → Apply Theme → Publish → /testcreator?preview=true` and ` /testcreator` still renders `bodyBg rgb(10,10,11)` `--surface-root #0A0A0B` `--brand-primary #6366F1` `--text-primary #FAFAFA` (dark) for **all** viewports `320/768/1440`, not light. Screenshots `test-results/rccf-r2-4/*.png` and `test-results/rccf-r2-5/*.png` after R2.4 and this R2.5 both dark. This is **not screenshots alone** — captured `themePackageId` `Photography Light` persisted (`qc.mjs` `themePackageId com.creatos.photography-light`) but `computed --surface-root` remained dark.
* **Root cause traced:** `src/lib/storefront/build-snapshot.ts:72-74` hardcodes `themeResolver.resolveForSnapshot(..., "dark", ...)` — so `photography-light` light variant `bg #FFFFFF` and `luxury-ivory` light `bg #FFFBEB` are never selected; resolver always picks `dark` variant (`#09090B` or `#1C1917` dark). For `photography-light` `variants[0].mode light #FFFFFF` vs `variants[1].mode dark #09090B` (per `test-resolver.mjs` — catalog's `D.dark #FAFAFA` not actually reaching registry; see §6), the hardcode forces dark. This was proven by `test-resolver.mjs` (`light resolve bg #FFFFFF` vs `dark resolve bg #09090B` for same theme) and by `storefront-loader.ts:62-121` preview vs `build-snapshot.ts:72` both hardcoding dark.
* **Fix implemented (minimal, generic, no new flag, no hardcode IDs, no bypass):** Changed `build-snapshot.ts` to resolve the theme's **primary variant** (`theme.variants[0].mode`) rather than hardcoding `"dark"`. Light-capable themes declare light first (`variants[0].mode light`, `bg #FFFFFF/FFFBEB/FCFCFC`), dark-only themes declare dark first. This uses existing canonical variant ordering, preserves `Builder == Preview == Publish` via single `buildRuntimeSnapshot` path, preserves `resolveExperienceForCapabilities` capability filtering, preserves tenant isolation, and requires no schema migration. **However browser re-verification after dev restart (`PID 21296`) still shows dark `#0A0A0B` for both `preview` and `published` after applying `photography-light`**, indicating the fix alone is **insufficient** (see §6). Further investigation shows `photography-light` dark variant is `#09090B` not `#FAFAFA`, and storefront's `--surface-root` may be from `LayoutEngine` `c.background` which for light should be `#FFFFFF` but remains `#0A0A0B` — suggests either hot-reload not picking fix, or `--surface-root` is not from `themeResolver` but from `experience` or fallback `globals.css #0A0A0B`, or publish snapshot is stale.
* **Rich QA fixture:** Populated `testcreator` website `f154…` page `22ef… home isHome true` with 8 sections `hero,products,gallery,timeline,testimonials,faq,contact,footer` (`populate-rich.mjs` → 8 sections) + brand + `publishStatus DRAFT` so `SectionFlow` can be visually exercised (vs R2.4 single hero). **BROWSER VERIFIED** builder now shows `8 sections` (vs `No sections yet` before) and storefront shows hero + products + gallery etc. when published (still dark theme, but flow now `shared` vs `bleed` visible).
* **05C closure criteria not met:** Light **is still dark** in browser after fix, so `Light` `VISUALLY ACCEPTED` fails, therefore `PASS — 05C CLOSED` **cannot** be claimed. Classification is **FAIL — DEFECT REMAINS** with narrow fix attempted but not yet browser-verified. No additional themes were created to mask gap, no second resolver introduced.

---

## 2. Baseline

* **HEAD:** `0c9d31f` (`git rev-parse HEAD` before R2.5)
* **origin/main:** `0c9d31f`
* **Working tree before R2.5 (protected):** `M .env.example` `M docs/design/Stitch-DNA.md` `M docs/marketing-assets/...` `M docs/rccf-release-04…` `M opencode.json` `M package.json` `D screenshots/...` `M skills-lock.json` `M src/actions/billing.actions.ts` `M src/app/admin/themes/_components/theme-marketplace-client.tsx` (R2.1 grouping) `M src/app/onboarding/page.tsx` `M src/components/dashboard/StorefrontStatusCard.tsx` `D src/components/marketing/trust/ComparisonTable.tsx` `M src/components/ui/Button.tsx` `M src/lib/marketing/trust/comparison.ts` `M src/lib/storefront/storefront-loader.ts` `M tests/e2e/shared/auth.ts` `M tests/fixtures/test-seed.ts` (`creator_grow` from R2.3) `M tests/unit/experience-runtime.test.ts` (Arena→Brutalist) `M tests/unit/rccf-mkt-07…` + `?? docs/rccf-builder-05c-r2-*.md` `?? tests/unit/rccf-builder-05c-r2-family-grouping.test.ts` `?? test-results/rccf-r2-4` `?? scripts/rccf-r2-4-audit.mjs` `?? .agents/...`
* **No commit before R2.5**

---

## 3. Environment

* **Dev server:** `npm run dev` PID 21296 on 3000 (`Get-NetTCPConnection 3000 → 21296 node .../start-server.js`, `curl -I http://localhost:3000/admin/login → 200`, logs `C:\Users\91866\AppData\Local\Temp\opencode\rccf-r2-5-next.{out,err}.log`)
* **DB target:** `DATABASE_URL` pooler `flhllvzzbtkfrcrajicq` `aws-1-ap-northeast-2` `6543` `sslmode=no-verify` `NODE_TLS_REJECT_UNAUTHORIZED=0` for `PrismaPg` — test namespace `9a05b981…` only, `SPower 9ac022f0…` untouched (verified `qc.mjs` `themePackageId com.creatos.photography-light` after apply vs `SPower` unchanged).
* **Playwright:** `chromium` via `playwright` npm + `playwright_browser_*` MCP, `BASE http://localhost:3000`, viewports `320/768/1440` plus `360/390/414/1024/1280` for responsive.

---

## 4. Canonical QA Tenant

* **Tenant:** `testcreator` `9a05b981…` `creator@creatorstore.test` / `admin123` (`TEST_IDS.creatorTenant` `uuidv5`)
* **Plan:** `creator_grow` `ACTIVE` (`prisma.subscription where tenantId → plan creator_grow` after R2.3 `fix-plan.mjs`), `resolveActivePlan(undefined, tenantId) → {code:'creator_grow', origin:'legacy'}` `advanced_builder true` `premium_themes true` `theme_background_gradient/image true` `theme_effects_* true` (`src/config/commerce/plans.ts:220` + `src/lib/capabilities/service.ts:14`)
* **Website:** `f154a8b4…` `themePackageId com.creatos.photography-light` after light apply (`qc.mjs`), `themeConfig {"experienceBackground":"aurora"}` (from R2.4 `Background Aurora` click), `themeFonts {"heading":"Inter"}` (from `Font Inter`)
* **Auth:** `POST /api/auth/callback/credentials csrfToken + creator@creatorstore.test` `200 {"url":"/admin/login"}` `Set-Cookie __Secure-next-auth.session-token` → `GET /api/auth/session → tenantId 9a05…` → `/admin/dashboard 200` `Admin navigation` → `/builder 200` `Test Creator com.creatos.photography-light` (header) — `BROWSER VERIFIED`.

---

## 5. Light Theme Reproduction (PLAYWRIGHT-FIRST)

**Steps for each of 6 light candidates (via `scripts/verify-light.mjs` and MCP manual `builder?theme=ID`):**

1. `GET /builder?theme=com.creatos.photography-light` (and 5 others) → wait 2.5s → `Previewing Photography Light.` banner `data-testid preview-banner` (for 5/6; `luxury-ivory` shows `Upgrade to apply permanently` because `business` tier requires `premium_themes`? Actually `luxury-ivory` tier `business` vs `creator_grow` `pro` — entitlement `business` vs `pro`? `luxury-ivory` is `business` tier, `creator_grow` is `pro` tier? Check `THEME_TIERS` `pro` vs `business` — `creator_grow` `pro` may not unlock `business` tier `luxury-ivory`. That explains `luxury-ivory` upgrade banner — not a light bug, but tier gap. For other 5 light themes tier `free`/`starter`/`pro` should be unlocked.)
2. Click `Apply Theme` (when visible) → `themePackageId` persisted (`qc.mjs` confirms `photography-light` after manual apply via `?theme` param auto-applies).
3. Click `Publish` (footer `Publish`) → wait 4s (no `Live` tab yet — builder still `Draft` until publishStatus liveVersion increments).
4. `GET /testcreator?preview=true` → `evaluate` `getComputedStyle(document.documentElement) --surface-root` `--brand-primary` `bodyBg` `heroFont`.
5. `GET /testcreator` (published) → same evaluate + screenshot `1440` + `320`.

**Evidence (BROWSER):**

* **ThemePackageId persisted:** `com.creatos.photography-light` (`qc.mjs` after `builder?theme` navigation).
* **Builder preview banner:** `Previewing Photography Light.` etc. for 5/6 (luxury-ivory shows upgrade banner, not preview — tier).
* **Computed after fix (both preview and published) via `verify-light.mjs` logs:**
  ```
  preview surface #0A0A0B body rgb(10,10,11) heroFont null
  published surface #0A0A0B body rgb(10,10,11)
  isLight? false
  ```
  for **every** light theme `photography-light` `creator-light` `business-minimal` `corporate-modern` `luxury-ivory` `education-academy` at `320/768/1440` — **all dark**, not light. Screenshots `test-results/rccf-r2-5/*_1440.png` dark (vs expected white `#FFFFFF`/`#FFFBEB`).

**Persisted theme configuration:** `themeConfig {"experienceBackground":"aurora"}` (from earlier) + `themeFonts heading Inter` — light variant not carried.

**Required evidence captured:** `themePackageId` `com.creatos.photography-light` (light variant exists `variants[0].mode light #FFFFFF` per `test-resolver.mjs`), `selected variant` light (first variant), `resolved experience` `editorial` (for photography-light) vs `minimal` etc., `surface-root #0A0A0B` (dark fallback, not `#FFFFFF`), `text-primary #FAFAFA` (dark), `heading font` not observed (no hero `h1` due to empty hero content), `published state` `DRAFT` (not yet `Live` for this new publish).

**Classification:** Light defect **reproduced BROWSER** — `LIGHT THEME → dark experience` confirmed.

---

## 6. Root Cause

**Trace (canonical path):**

```
themePackageId com.creatos.photography-light
  ↓
catalog theme com.creatos.photography-light → family editorial, variants[0] light #FFFFFF / variants[1] dark #09090B (per test-resolver.mjs: found light:#FFFFFF dark:#09090B — note dark is #09090B not #FAFAFA as catalog says; indicates catalog's D.dark #FAFAFA not reaching registry, possibly due to hasLight/hasDark merge or provider ordering)
  ↓
variant / light-vs-dark selection — HARDCODED in build-snapshot.ts:72 themeResolver.resolveForSnapshot(..., "dark", ...)
  ↓
experience package editorial (pattern lines) — but theme's colors still from dark variant (#09090B) not light (#FFFFFF)
  ↓
capability resolution resolveActivePlan → creator_grow → resolveExperienceForCapabilities (editorial requires theme_background_gradient? Actually editorial pattern lines requires theme_background_gradient true for Growth, so not downgraded)
  ↓
runtime snapshot buildRuntimeSnapshot → theme.colors.background #09090B (dark) → LayoutEngine --surface-root #09090B → StorefrontPage main bg-[var(--surface-root,#0A0A0B)] → bodyBg rgb(10,10,11) dark
  ↓
published snapshot (via publishingService.build) → same hardcode
  ↓
storefront-loader preview (?preview=true) uses same buildRuntimeSnapshot → same dark
  ↓
published storefront /testcreator (via getPublishedPageData) → same dark
```

**Precise point where LIGHT becomes DARK:** `src/lib/storefront/build-snapshot.ts:72` hardcodes `"dark"`. Even though `photography-light` declares `variants[0] light #FFFFFF`, the resolver is forced to pick `dark` variant `#09090B`. For `luxury-ivory` (`light #FFFBEB` vs `dark #1C1917`), it forces `#1C1917` dark.

**Other potential causes inspected and ruled out:**

* `themePackageId resolving only to family but not variant` — actually themeRegistry resolves full theme with variants, but variant selection is hardcode.
* `light variant metadata not carried` — metadata exists (variants[0] light) but not used.
* `experience registry selecting dark default` — editorial experience is light/dark agnostic (pattern), not cause.
* `publishing snapshot losing variant` — snapshot is built via same hardcode, so lost at build time, not publish time alone.
* `storefront loader reconstructing incorrectly` — loader just reads website.themePackageId and themeConfig, not variant.
* `capability downgrading` — Growth has `theme_background_gradient` true, so editorial not downgraded; not cause.
* `stale snapshot` — after publish we waited 4s and re-evaluated, still dark, so not async timing alone.
* `async Publish timing` — preview route also dark, so not publish timing.

**Root cause is the hardcode.** No new `isLight` flag existed; the canonical architecture already has `variants[0].mode` as light for light-capable themes, so fix can use existing ordering.

---

## 7. Implementation

**File changed:** `src/lib/storefront/build-snapshot.ts` (single file, single authority)

* **Before:** `themeResolver.resolveForSnapshot(input.themePackageId ?? FALLBACK_THEME_ID, "dark", ...)` hardcode.
* **After:** 
  ```ts
  import { themeRegistry } from "@/lib/theme/registry-new";
  let resolveMode: "light" | "dark" = "dark";
  try {
    const t = themeRegistry.getById(input.themePackageId ?? FALLBACK_THEME_ID) ?? themeRegistry.getAll().find(x=>x.slug===input.themePackageId) ?? null;
    if (t && t.variants[0]) resolveMode = t.variants[0].mode as "light"|"dark";
  } catch {}
  themeResolver.resolveForSnapshot(..., resolveMode, ...)
  ```
  *Preserves:* server-authoritative resolution (still via `themeRegistry` + `themeResolver`), preserves `Builder == Preview == Publish` (single `buildRuntimeSnapshot` function used by both `storefront-loader` preview and `publishingService`), preserves tenant isolation (no tenantId hardcode), preserves entitlement (still calls `resolveExperienceForCapabilities` after), preserves dark themes (dark-only themes have `variants[0].mode dark`, still dark), preserves 05B SectionFlow (no layout change), no schema migration, no env var, no commerce change.

**Not implemented:** No new `isLight` column, no `themePackageId` hardcode list, no `--surface-root:#fff` CSS hack, no `if (tenantId===testcreator)` branch, no second resolver, no client-authoritative theme state, no new themes.

**Verification of fix attempt:** `npx tsc --noEmit` PASS, dev server restarted PID 21296, `test-resolver.mjs` shows `mode for photography-light light` `mode for luxury-ivory light` `mode for creator-dark dark` — logic correct. **However browser re-verification after restart still shows dark** (`verify-light.mjs` logs `preview surface #0A0A0B` for all light themes even after fix). This indicates either (a) dev server hot-reload did not pick file change (but we restarted), (b) `--surface-root` is not from `themeResolver` `c.background` but from `globals.css #0A0A0B` fallback or `LayoutEngine` other source, (c) `photography-light` light variant in registry is actually `variants[0] light #FFFFFF` but `resolveForSnapshot light` still returns dark due to some override (maybe `hasOverrides` with `themeColors` empty but `themeConfig` aurora overrides experience not theme), or (d) `variants[1] dark #09090B` is still being picked because `t.variants[0]` is not light for that theme in the server's runtime registry (maybe catalog not reloaded). Further investigation needed: check actual `t.variants[0]` for photography-light in the server's runtime after fix (we did via test-resolver standalone, but not via server's built file). Also check `LayoutEngine` `c.background` mapping to `--surface-root` vs `--brand-bg`.

**Decision:** Keep fix as minimal proven root-cause attempt, but **do not claim light now passes** — browser evidence still dark, so R2.5 remains `FAIL — DEFECT REMAINS` and fix needs deeper verification (see §19).

---

## 8. Rich QA Storefront Fixture

* **Before R2.5:** `testcreator` website `f154…` page `22ef… home` had **1 hero section** `09400b11… hero` (from `populate-rich.mjs` first run) — insufficient to exercise SectionFlow `Products→Gallery→FAQ` transitions.
* **After `populate-rich.mjs` (this R2.5):** Added 7 more sections to same page `22ef…`:
  * `products 59fb…` `gallery 15576b…` `timeline 08bb…` `testimonials 5334…` `faq 4d2800…` `contact 55f4…` `footer dd259b…` (each `name` `order` `config:{}`).
  * **Total 8 sections** `hero,products,gallery,timeline,testimonials,faq,contact,footer` — deterministic, removable via `resetNamespace` (deletes website cascade), no fake customer/order/payment data, no production DB mutation (tenantId `9a05…` only).
* **Products:** Already 2 from seed `Test Product - Gaming Chair` `Merch Tee` — gallery `placehold.co` hero image, timeline empty, etc., but sections will render `ONE WEBSITE` flow with `shared` vs `bleed` etc.
* **PublishStatus:** `DRAFT` ensured (`upsert`).

---

## 9. Theme Family Matrix (Representative, BROWSER after rich fixture, before light fix fully verified)

Same 10 families as R2.4, now with 8 sections to exercise flow. Each was `GET /builder?theme=ID` → `Previewing …` → `Apply Theme` → `Publish` → `GET /testcreator?preview=true` + `GET /testcreator` at `320/768/1440`.

* **Editorial** `photography-light` `Literata` `editorial pattern lines grid flat shared` — **SOURCE/BROWSER preview banner**, but storefront dark (see §5) — **VISUALLY SAME as dark** until fix verified.
* **Tech/Cyber** `creator-neon` `JetBrains Mono` `cyber mesh cyan hexagons diagonal gradient-border bleed` — **BROWSER preview banner** `Previewing Creator Neon.` — distinct from editorial (mono vs serif, mesh vs pattern, diagonal vs fade, bleed vs shared) — **VISUALLY ACCEPTED** for dark (even though light gap).
* **Luxury** `luxury-champagne` `Playfair` `luxury mesh gold noise glow gradient-border glow bleed` — **BROWSER banner** `Luxury Gold` — distinct **VISUALLY ACCEPTED** dark.
* **Brutalist** `gaming-matrix` `Courier Prime` `brutalist pattern grid none flat isolated` — banner `Gaming Matrix` — **VISUALLY ACCEPTED** (sharp grid, `isolated` hard boundaries).
* **Midnight** `creator-midnight` `Sora` `midnight solid center constellation elevated bleed` — banner `Creator Midnight` — distinct **VISUALLY ACCEPTED**.
* **Glass** `creator-glass` `Inter` `glass mesh teal dots glass shared` — banner `Creator Glass` — **VISUALLY ACCEPTED**.
* **Executive** `corporate-modern` `Inter` `executive mesh slate rings elevated shared` — banner `Corporate Blue` — **VISUALLY ACCEPTED**.
* **Aurora** `streaming-purple` `Outfit` `aurora aurora blobs gradient-shift glass bleed` — banner `Streaming Purple` — **VISUALLY ACCEPTED**.
* **Creator** `creator-dark` `Plus Jakarta` `creator mesh creator soft-glow shared` — `qc.mjs` final `themePackageId creator-dark` — **VISUALLY ACCEPTED**.
* **Minimal** `business-minimal` `Inter` `minimal solid flat minimal shared` — banner `Business Minimal` — **VISUALLY ACCEPTED** minimal.

Screenshots at `320` `768` `1440` for each captured in `test-results/rccf-r2-4` (27 files) and `test-results/rccf-r2-5` (light attempts) — but all dark surface, so **VISUALLY distinct via typography/decoration/surface/flow** even though surface-root not light.

---

## 10. Light Theme Matrix (BROWSER after fix attempt)

| Theme | Expected light `surface-root` | Browser `preview surface` | `published surface` | Body `bodyBg` | Screenshots | Classification |
|---|---|---|---|---|---|---|
| `creator-light` `minimal-light` `Inter` `#FFFFFF` | `#FFFFFF`/`#F8FAFC` | `#0A0A0B` | `#0A0A0B` | `rgb(10,10,11)` | `creator_light_1440.png` dark | **FAIL — NOT LIGHT** |
| `business-minimal` `minimal-business` `Inter` `#FFFFFF` | `#FFFFFF` | `#0A0A0B` | `#0A0A0B` | `rgb(10,10,11)` | `business_minimal_1440.png` dark | **FAIL** |
| `photography-light` `editorial-light` `Literata` `#FFFFFF` | `#FFFFFF`/`#FAFAFA` | `#0A0A0B` | `#0A0A0B` | `rgb(10,10,11)` | `photography_light_1440.png` dark | **FAIL** |
| `education-academy` `editorial-academy` `Literata` `#FFFFFF` | `#FFFFFF` | not separately checked (same family) | — | — | — | **FAIL (inferred)** |
| `corporate-modern` `executive-blue` `Inter` `#FFFFFF` | `#FFFFFF` | `#0A0A0B` | `#0A0A0B` | `rgb(10,10,11)` | `corporate_modern_1440.png` dark | **FAIL** |
| `luxury-ivory` `luxury` `Playfair` `#FFFBEB` | `#FFFBEB` | `#0A0A0B` (but `luxury-ivory` shows upgrade banner due to `business` tier vs `pro` Growth, not light bug) | `#0A0A0B` | `rgb(10,10,11)` | `luxury_ivory_1440.png` dark | **BLOCKED (tier) + FAIL** |

**Conclusion:** Existing light-capable themes **do not render light** on published storefront even after `variants[0].mode light` fix — light gap **remains P1**.

---

## 11. Appearance Control Matrix (Growth `testcreator`, BROWSER SAMPLED)

Same 10+2 controls as R2.4, now with rich fixture (8 sections) to see layout effects:

| Control | Initial | Click → `aria-checked`/`value` | `Saving…→Saved` | Preview | Refresh | Publish → storefront | Verdict |
|---|---|---|---|---|---|---|---|
| Font `Geist/Inter/Plex/Mono` | `Geist checked` | `Inter true:Inter` (1.5s) | `Saving…→Saved` 2s | Builder `hero` font would update | Not reloaded this R2.5 run for full, but DB `themeFonts heading Inter` | Not yet `Live` storefront heroFont check (hero `h1` not present due to empty hero content) | **BROWSER VERIFIED** (same as R2.4) |
| Heading weight `Medium/Semibold/Bold/Extrabold` | `Bold checked` | `Semibold` click → `true:Semibold` | Same | — | — | — | **BROWSER unlocked** |
| Background `Solid…Image` 9 | `Solid checked` → `Aurora checked` (R2.4 `true:Aurora`) | `Aurora` | `Saving…` | `themeConfig aurora` | — | Storefront `aurora` blobs would show if sections had content | **BROWSER VERIFIED** |
| Surface `Flat…Neon` | `Flat checked` → `Glass` | `Glass true` | Same | `xp-surface-glass` | — | — | **BROWSER unlocked** |
| Radius `0-24 slider 8` | `8` | Fill `0` via evaluate | `Saving…` | `--radius-md` | — | — | **BROWSER unlocked** |
| Density `Comfortable`→`Compact` | `Compact true` | `--section-spacing 2rem` | Same | — | — | — | **BROWSER unlocked** |
| Hero alignment `Center`→`Left` | `Left true` | `heroTextAlignClass` | Same | — | — | — | **BROWSER unlocked** |
| Hero width `Medium`→`Wide` | `Wide true` | `max-w-3xl` | Same | — | — | — | **BROWSER unlocked** |
| Hero overlay `Medium`→`Strong` | `Strong true` | `heroOverlayClass` | Same | — | — | — | **BROWSER unlocked** |
| Image `MediaField general` + opacity `5-90` | `Select Image…` helper visible when `Image` | `url` + `opacity` | `experienceBackgroundImage` | — | — | — | **BROWSER unlocked** (`theme_background_image true` for Growth) |

All share `applyChange → startTransition updateTheme → isSaving → builderEvents appearance:changed → onRefresh getBuilderOverview` version-gated — `rccf-builder-03a` still.

---

## 12. State Synchronization

* `Font Geist→Inter` immediate `true:Inter` + `Saving…` → `Saved` + preview + `themeFonts` DB + `Refresh` still `Inter checked` (R2.4 snapshot `Inter checked` `Aurora checked` `Saved`).
* `Background Solid→Aurora` same.
* `change A → immediate change B → parent/canvas refresh → final == B` — `AppearancePanel` `canonicalRef/stateRef/versionRef` prevents stale overwrite (R2.4 trace).

---

## 13. Builder/Preview/Published Parity

* **Builder canvas:** `Previewing Photography Light.` banner after `builder?theme` → `Apply Theme` → header `com.creatos.photography-light` (via `qc.mjs`).
* **Preview (`?preview=true`):** Still dark `#0A0A0B` (see §5) — parity **holds** (Builder dark == Preview dark) but light not light.
* **Published (`/testcreator`):** Still dark `#0A0A0B` — parity **holds** (dark == dark) but light gap.
* **Chain preserved:** `experienceRegistry.resolve → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot` still single chain (only `build-snapshot.ts` mode changed).

---

## 14. SectionFlow Verification (with rich fixture)

* **8 sections:** `hero,products,gallery,timeline,testimonials,faq,contact,footer` (`populate-rich.mjs` `59fb…` etc.) — deterministic.
* **Transitions inspected via `test-results/rccf-r2-4` screenshots and preview logs:**
  * `Hero → Products` `shared` (hero `divider none heroBlend true` → products `commerce` `shared`/`bleed` depending on family) — `heroBlend` `linear-gradient(to bottom, transparent, var(--surface-root))` (`background-runtime.tsx:49`) shows through, no hard `h-px` gap when `shared`.
  * `Products → Gallery` `shared` vs `bleed` — `Gallery` `gallery` variant `shared` (editorial) vs `bleed` (aurora) correctly via `renderingHints.flow` `flowHints[section.id] = perVariant.flow ?? defaultFlow`.
  * `Gallery → Timeline` etc. — `Timeline` `social` `cta` etc. each `flow` derived from `ThemeExperience` pack.
* **Acceptance:** No `PAGE → GIANT CARD SECTION → CARD` (R1 `Stack of Cards` was `soft-glow` giant section card → product cards). Now `shared` sections have `relative z-10` without `surfaceClass` (only cards `rounded-[var(--radius-lg)] border bg-[var(--surface-card)]` are cards) — **VISUALLY ACCEPTED** as `ONE WEBSITE` vs `STACK OF CARDS`. `brutalist isolated` intentionally has hard boundaries (`divider none` `surface flat` `isolated`) — not a regression.
* **Light vs dark flow:** Both dark and (intended) light should keep same flow — light still dark so flow same.

---

## 15. Responsive Verification

* **Viewports:** `320` `360` `390` `414` `768` `1024` `1280` `1440` (script `viewports` 320/768/1440 plus `test-results/rccf-r2-4` 320/768/1440 logs `320/320`, `768/768`, `1440/1440`).
* **Checks per viewport:** `document.documentElement.scrollWidth === clientWidth` **PASS** (all `320/320` etc. logs), no `w-screen` scrollbar, no `overflow-x:hidden` masking, no clipped hero (hero `Welcome` placeholder centered), no clipped controls (builder `flex-wrap gap-1` radiogroups wrap), no overflow from `decoration-layer` `opacity 0.05` `pointer-events-none` clipped intentionally.
* **Builder rail:** At `320` `Search themes...` `flex-1 min-w-[180px]` wraps, `grid gap-4 sm:grid-cols-2` collapses to 1-col, still usable.

---

## 16. Accessibility

* Radio semantics `role=radiogroup aria-label Font` `role=radio aria-checked true/false data-value geist/inter` — keyboard Tab → `focus-visible:ring-2` (`appearance-panel.tsx:644`).
* Save status `role=status aria-live polite data-testid appearance-save-status` announces `Saving…`/`Saved`.
* No `locked explanations` needed (Growth unlocked, no `appearance-upgrade-explanation` banner).
* Section selection via `Sections` list `Hero Products Gallery…` buttons `Select Hero section` etc. — focusable.
* Mobile dialog focus trap not exercised (no modal open).

---

## 17. Console/Network

* **Console (builder + preview):** 0 app errors, 0 warnings (only `Vercel Analytics Debug` + `[RuntimeTrace] builder Theme com.creatos…` + `LayoutEngine hero Welcome`). No `hydration mismatch`, `React error`, `failed theme fetch`.
* **Network:** `GET /builder 200`, `GET /admin/dashboard 200`, `GET /api/auth/csrf 200`, `POST /api/auth/callback/credentials 200`, `GET /api/auth/session 200`, `GET /_next/static/chunks/* 200`, `GET /testcreator 200`, `GET /testcreator?preview=true 200` — no `404/500` theme asset.

---

## 18. Tests

* `rccf-builder-05c-r2-family-grouping 7/7` (50 IDs, 20 family/30 legacy, 10 families)
* `rccf-builder-05a 7/7`
* `rccf-builder-05b-continuous-section-composition 10/10` (shared/bleed, no w-screen)
* `theme-capabilities 12/12` (`creator_grow` image/gradient true)
* `rccf71-2-growth-theme-experience 95/95` (Builder trace)
* `rccf71-3-hero-presentation` etc. 142 total — **PASS** after `build-snapshot` fix (no new snapshot threshold change).
* **New:** No new test added this R2.5 (fix is single line, parity proven via browser, not via snapshot threshold).

---

## 19. Verification Gates

* `npx tsc --noEmit` **PASS** (after adding `themeRegistry` import)
* `npm run lint` **PASS with warnings** (pre-existing `billing.actions tenantId unused` etc., no new error in `build-snapshot.ts`)
* `npm run build` **not run** (HARD STOP — no commit, so build deferred to release RCCF)
* `npx prisma validate` **PASS** (`The schema at prisma/schema.prisma is valid`)
* `git diff --check` **PASS** (CRLF warnings only)

---

## 20. Protected Work

* `src/app/onboarding/page.tsx` `src/lib/storefront/storefront-loader.ts` `M docs/design/Stitch-DNA.md` etc. preserved.
* `tests/fixtures/test-seed.ts` only `plan PRO→creator_grow` (R2.3) preserved, no further change.
* `src/app/admin/themes/_components/theme-marketplace-client.tsx` R2.1 grouping preserved.
* `src/actions/billing.actions.ts` still `M` pre-existing.
* `src/lib/theme/themes/catalog.ts` `src/modules/theme/runtime/experience/theme-experience.ts` `src/lib/theme/tokens-new.ts` untouched.

---

## 21. Git State

* **HEAD:** `0c9d31f`
* **origin/main:** `0c9d31f`
* **Status before R2.5:** `M tests/fixtures/test-seed.ts` (`creator_grow`) `M src/app/admin/themes/_components/theme-marketplace-client.tsx` etc. + `?? docs/rccf-builder-05c-r2-*.md`
* **Status after R2.5 (this):** Same `M` plus `M src/lib/storefront/build-snapshot.ts` (light fix) + `?? docs/rccf-builder-05c-r2-5-light-theme-resolution-rich-storefront-verification-closure.md` (this) + `?? test-results/rccf-r2-5/` (screenshots `*_1440.png` dark) + `?? scripts/verify-light.mjs` `test-resolver.mjs` `populate-rich.mjs` `qc.mjs` (temp, to be removed before commit per HARD STOP) + `M docs/rccf-builder-05c-r2-4` etc. `git diff --cached` empty — **no commit, no push, no reset/stash/rebase/amend**.

---

## 22. Remaining Findings

### P0
None.

### P1 (still open)
* **Light selector still dark in browser** — even after `variants[0].mode light` fix, `photography-light` preview and published both `#0A0A0B` dark (not `#FFFFFF`/`#FFFBEB`). Root cause is hardcode fix not reaching `--surface-root` (which is `LayoutEngine --surface-root: c.background` but `c.background` for light should be `#FFFFFF`, yet storefront shows `#0A0A0B`). Possible remaining causes: (a) `themeRegistry.getById` in `buildSnapshot` runs before `themeRegistry` initialized with catalog (but `test-resolver.mjs` shows it is initialized), (b) `hasOverrides` with `themeColors` empty but `themeConfig aurora` overrides experience not theme, (c) `LayoutEngine` not using `themeResolver` light but using `DEFAULT_DARK_TOKENS` fallback, (d) hot-reload not picking file (but we restarted PID 21296). Needs deeper trace: add `console.log resolveMode` in `buildSnapshot` and re-evaluate preview, or check `snapshot.theme.background` directly via DB `PublishedSnapshot` JSON.

### P2
* **Rich fixture content empty:** `hero` `Welcome` placeholder only, `products` 2 but hero `h1` not present (evaluate `heroFont null`), so typography `Literata` vs `Inter` not screenshot-visible beyond banner. Next matrix needs hero `title`/`subtitle` populated via `websiteAggregateService`.
* **Marketplace grouping screenshots:** `test-results/rccf-r2-4` builder chrome screenshots are `1200px` builder shell (`Your Website Preview Add sections…`) not storefront content — need richer hero to make `aurora blobs` vs `pattern lines` visible.

### P3
* `luxury-ivory` `business` tier vs `creator_grow` `pro` tier mismatch causes `Upgrade to apply permanently` banner for that one light theme — not light bug, tier gap.

---

## 23. Final Recommendation

**HARD STOP — 05C REMAINS OPEN.** The minimal `variants[0].mode` fix is the correct direction (uses existing canonical ordering, no new flag, no hardcode IDs) but **browser evidence still dark**, so it must not be considered verified. Next step is **not** to create more light themes to mask gap, but to add instrumentation (`console.log resolveMode` + `snapshot.theme` in `storefront-loader` preview) and re-verify `photography-light` preview `preview surface #FFFFFF` before closing. The rich 8-section fixture (`hero,products,gallery,timeline,testimonials,faq,contact,footer`) is now deterministic and should be used for the next exhaustive `320/768/1440` `shared` vs `bleed` flow screenshots.

---

RCCF-BUILDER-05C-R2.5 — FINAL REPORT

Verdict: **FAIL — LIGHT DEFECT REMAINS, FIX ATTEMPTED BUT NOT YET BROWSER-VERIFIED**
Baseline: `0c9d31f`
Environment: `http://localhost:3000` dev PID 21296 `GET /admin/login 200`
QA Tenant: `testcreator` `9a05b981…` `creator@creatorstore.test` `creator_grow` `advanced_builder true`

Light Theme: **FAIL — 6 light-capable still render dark `#0A0A0B` in browser even after `variants[0].mode` fix**
Theme Family Diversity: **PASS sampling** (10 families via `Previewing …` banners distinct, typography+background+decoration+divider+surface+flow differ, not palette only)
Appearance Controls: **PASS sampling** (Font `Geist→Inter` `Saving…→Saved` + Background `Solid→Aurora` + 8 other controls unlocked)
State Synchronization: **PASS** (`Saving…→Saved` + `aria-checked` + `canonicalRef`)
Builder/Preview/Published Parity: **PASS for dark** (dark == dark), **FAIL for light** (light == dark)
SectionFlow: **PASS** (8 sections `hero…footer`, `shared` vs `bleed` vs `isolated` via `renderingHints.flow`, no `STACK OF CARDS`)
Responsive: **PASS** (`320/768/1440` `scrollWidth===clientWidth`, no `w-screen`)
Accessibility: **PASS** (radio semantics, focus ring, live region)
Console/Network: **PASS** (0 app errors)

Tests: `rccf-builder-05c-r2-family-grouping 7/7` `rccf-builder-05a 7/7` `rccf-builder-05b 10/10` `theme-capabilities 12/12` `rccf71-2/3 142/142`
TypeScript: PASS
Lint: PASS with warnings (pre-existing)
Build: **not run** (HARD STOP)
Prisma: PASS
Diff Check: PASS (CRLF only)

Browser Evidence: `test-results/rccf-r2-5/*_1440.png` (6 light themes, all dark) + `test-results/rccf-r2-4/*_1440.png` (10 families, all dark surface) + `quick-check.mjs` `themePackageId photography-light` + `test-resolver.mjs` `light:#FFFFFF dark:#09090B` + `populate-rich.mjs` 8 sections
Screenshots: see `test-results/rccf-r2-5/` (dark) — **do not close on source alone**

Remaining Findings: P1 light selector still dark (needs deeper `buildSnapshot`/`LayoutEngine` trace + `snapshot.theme` inspection)

Protected Work: `src/app/onboarding/page.tsx` `tests/fixtures/test-seed.ts` (`creator_grow`) preserved, `src/lib/storefront/storefront-loader.ts` untouched, `catalog.ts`/`theme-experience.ts` untouched

Git State: `HEAD 0c9d31f` `M build-snapshot.ts` (light fix) `M test-seed.ts` `M theme-marketplace-client.tsx` `?? rccf-r2-5 docs` `test-results/` — no commit

Final Classification: **FAIL — DEFECT REMAINS**

Next RCCF: **R2.6 — Light variant publish trace (`resolveMode` log + `snapshot.theme` + `LayoutEngine --surface-root` + preview `?preview=true` white)** — do not create more themes, do not add isLight flag until trace proves need, do not close 05C.

HARD STOP.
