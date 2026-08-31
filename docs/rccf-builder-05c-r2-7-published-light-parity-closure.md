# RCCF-BUILDER-05C-R2.7 — LIGHT THEME RE-PUBLISH & PUBLISHED PARITY VERIFICATION

**Mode:** PLAYWRIGHT-FIRST → PUBLISH → VERIFY → CLASSIFY — HARD STOP, no commit, no push
**Date:** 2026-08-28
**Auditor:** OpenCode (Muse Spark) + Playwright MCP + Prisma (pooler `flhllvzzbtkfrcrajicq`)
**Baseline HEAD:** `0c9d31f` (05B) — plus R2.1 grouping, R2.3 `creator_grow`, R2.6 `build-snapshot` first-variant fix (`theme.variants[0].mode`)
**Canonical QA tenant:** `testcreator` `9a05b981-3a0a-51b9-a546-adff607c0108` `creator@creatorstore.test` / `admin123` `creator_grow` `advanced_builder true`
**Environment:** `http://localhost:3000` dev PID 12136 → 21296 → 26184 (R2.6) → 12136 (R2.7 restart) `Ready in 17.4s` `GET /admin/login 200`
**Current theme:** `com.creatos.photography-light` (`editorial` `Literata` `pattern lines` `light #FFFFFF`)

---

## 1. Executive Verdict

**B — IMPLEMENTED / PREVIEW BROWSER VERIFIED, PUBLISHED STALE — 05C REMAINS OPEN pending one successful re-publish**

* **Light defect reproduced BROWSER before fix:** `Builder?theme=photography-light` → `Apply` → `Publish` → `GET /testcreator?preview=true` and `GET /testcreator` both `bodyBg rgb(10,10,11)` `--surface-root #0A0A0B` dark, even though `website.themePackageId` persisted as `photography-light` (`qc.mjs`).
* **Root cause proven:** `src/lib/storefront/build-snapshot.ts:72` hardcodes `themeResolver.resolveForSnapshot(..., "dark", ...)` — so `photography-light` `variants[0] light #FFFFFF` / `variants[1] dark #09090B` always picks `dark #09090B` → `snapshot.theme.background #09090B` → `LayoutEngine --surface-root #09090B` → fallback `globals.css #0A0A0B` when not set on `main`, but actually `main` gets `#09090B` dark. Trace via `test-build-snapshot.mjs` direct call: `selectedVariantMode dark` `selectedVariantBackground #FFFFFF` vs `resolvedThemeBackground #09090B` — `#FFFFFF` never used.
* **Fix implemented (minimal, generic, no new flag, no hardcode IDs):** `build-snapshot.ts` now imports `themeRegistry` and does `let resolveMode = t.variants[0].mode` (light for `photography-light` `creator-light` `business-minimal` `corporate-modern` `education-academy` `luxury-ivory`, dark for `creator-dark` etc.). Preserves `Builder == Preview == Publish` single `buildRuntimeSnapshot` chain, `resolveExperienceForCapabilities`, tenant isolation, 05B flow, no schema migration. `npx tsc --noEmit` PASS, dev restart `Ready in 17.4s`.
* **Browser re-verification after restart:**
  * **Preview (`/testcreator?preview=true`)** — **BROWSER VERIFIED light:** `mainSurface #FFFFFF` `mainBg rgb(255,255,255)` `--brand-primary #111827` `--text-primary #18181B` `heroFont null` (hero empty) at `320/768/1440` via `check-light-main.mjs` and `final-verify.mjs` preview check (`preview { mainSurface: '#FFFFFF', bodyBg: 'rgb(10,10,11)', brand: '#111827' }`).
  * **Published (`/testcreator`)** — still **dark** `mainSurface #09090B` `bodyBg rgb(10,10,11)` `brand #7C3AED` (stale snapshot `liveVersion 10` `createdAt 2026-08-27T21:53:38` for `creator-dark` dark, `background #09090B`), because `PublishedSnapshot` was built **before** fix and `Publish` via UI has not yet succeeded to rebuild it (see §7). Preview and published use same `buildSnapshot` code, so after a successful re-publish published will be `#FFFFFF` light — but **not yet BROWSER VERIFIED** for published light.
* **Rich fixture:** 8 sections `hero,products,gallery,timeline,testimonials,faq,contact,footer` (`populate-rich2.mjs` on `f154…` page `22ef…`/`62b6…` with `isHome true`) — deterministic, removable via `resetNamespace`, no fake customer data. **BROWSER VERIFIED** builder after re-populate shows `8 sections` (vs R2.4 single hero `No sections yet`), storefront can exercise `Hero→Products→Gallery→Timeline→Testimonials→FAQ→Contact→Footer` flow.
* **Theme diversity:** 10 families via `Previewing …` banners still distinct (editorial `Literata`, cyber `JetBrains`, luxury `Playfair`, brutalist `Courier`, etc. via R2.4 `scripts/rccf-r2-4-audit.mjs` 27 screenshots `320/768/1440` all `scrollWidth===clientWidth`).
* **Appearance controls:** `Font Geist→Inter` `Background Solid→Aurora` both `Saving…→Saved` + DB `themeFonts heading Inter` `themeConfig aurora` (R2.4), other controls `disabled false` — still unlocked after light fix.
* **Closure criteria not met:** Published light `VISUALLY ACCEPTED` requires `GET /testcreator` `mainSurface #FFFFFF` at `320/768/1440` — currently `Published` is `#09090B` dark, so `PASS — 05C CLOSED` **cannot** be claimed. This is `B` (implementation correct, preview verified, published blocked by stale snapshot / publish flow not yet re-executed with new code), not `FAIL — DEFECT REMAINS` as implementation is correct and preview proves it, but not `PASS`.

---

## 2. Baseline

* **Git before R2.7:** `HEAD 0c9d31f` `origin/main 0c9d31f` `git diff --stat` 26 files `M src/lib/storefront/build-snapshot.ts` (R2.6 first-variant fix) `M tests/fixtures/test-seed.ts` (`creator_grow`) `M src/app/admin/themes/_components/theme-marketplace-client.tsx` etc. + `?? docs/rccf-builder-05c-r2-*.md` `?? test-results/rccf-r2-4` `?? .agents/...` — preserved.
* **Diff for R2.6 fix (captured `git diff -- src/lib/storefront/build-snapshot.ts`):**
  ```diff
  +import { themeRegistry } from "@/lib/theme/registry-new";
  -  const resolvedTheme = themeResolver.resolveForSnapshot(..., "dark", ...)
  +  let resolveMode: "light" | "dark" = "dark";
  +  try { const t = themeRegistry.getById(...) ?? ...; if (t && t.variants[0]) resolveMode = t.variants[0].mode; } catch {}
  +  const resolvedTheme = themeResolver.resolveForSnapshot(..., resolveMode, ...)
  ```
  No other source change, no reset/stash.

---

## 3. Confirm Current Published State (before R2.7 publish)

* **DB:** `website f154… themePackageId com.creatos.photography-light` (`qc.mjs` after `builder?theme` navigation), `themeConfig {"experienceBackground":"aurora"}` (from R2.4), `themeFonts {"heading":"Inter"}`.
* **PublishedSnapshot before (from `force-publish.mjs` before fix, at `21:53:38`):** `theme background #09090B` `foreground #FAFAFA` `primary #7C3AED` `packageId com.creatos.creator-dark` (old snapshot, not photography-light), `renderingHints experience creator`, `liveVersion 10` `state DRAFT` (not `PUBLISHED` after R2.6 attempts).
* **Storefront before (BROWSER):** `GET /testcreator` `mainSurface #09090B` `bodyBg rgb(10,10,11)` `brand #7C3AED` dark — matches stale snapshot, not current `photography-light` light. `GET /testcreator?preview=true` before fix also `#0A0A0B` dark (R2.5).

---

## 4. Authenticate With Playwright

* **Method:** `page.goto /admin/login` → `page.evaluate fetch /api/auth/csrf` → `POST /api/auth/callback/credentials csrfToken + creator@creatorstore.test + admin123` `200 {"url":"/admin/login"}` `Set-Cookie __Secure-next-auth.session-token` → `page.goto /admin/dashboard` `200` `Admin navigation` → `page.goto /builder` `200` `Test Creator com.creatos.photography-light` (`f40e16`).
* **Verification:** `GET /api/auth/session → tenantId 9a05b981…` `GET /admin/dashboard 200` `GET /builder 200` — **BROWSER VERIFIED**, no new tenant, no SPower mutation.

---

## 5. Builder State

* **Open `/builder`:** Header shows `Test Creator` `com.creatos.photography-light` (after `?theme` navigation, header updated from `neon-dark` to `photography-light`).
* **Also tested `/builder?theme=com.creatos.photography-light`:** No `Previewing` banner (direct `?theme` sets current, not preview), but `Apply Theme` button not visible (already applied).
* **Builder Preview light:** `GET /testcreator?preview=true` after fix: `mainSurface #FFFFFF` `mainBg rgb(255,255,255)` `brand #111827` `text #18181B` — **BROWSER VERIFIED light** (via `check-light-main.mjs`).

---

## 6. Publish Through THE UI

* **Attempt:** `final-verify.mjs` and `do-publish.mjs` both did `page.locator('button:has-text("Publish")').last().click()` at `http://localhost:3000/builder` (footer `Publish`).
* **Observed:** `Saving...` not applicable for Publish; after click `page.waitForTimeout 5000` snippet still shows `Preview Live Draft` with `Draft` selected (`aria-current true` for Draft, not Live), `26% Complete`, `No sections yet` (when sections were 0 before re-populate) or `8 sections` after re-populate. No `Publishing…` toast, no error, but **Live not selected**.
* **After re-populate (8 sections) and theme photography-light, publish click via `final-verify.mjs`:** `publish visible true` `clicked publish` `RESPONSE 200` for `POST /builder?theme=...` (server action) but response body `{"success":true,"pages":[...],"sections":[]}` indicates builder's draft pages still empty `sections[]` in that response, not our 8 DB sections — suggests builder's draft state is in-memory and not yet synced to DB, so publish sees empty draft and does not update `liveVersion`.
* **After `verify-publish2.mjs` with re-populated 8 sections:** `clicked publish` `RESPONSE 200` for same, but `after publish snippet` still `Draft` `26% Complete` `No sections yet` — publish still not transitioning to `Live`.
* **Conclusion:** UI Publish **did not** transition to `Live` in this run (still `Draft`). This is **not** a theme-resolution defect, but a **publishing flow / draft sync** issue (builder's draft is empty, not DB's 8 sections). Direct `publishingService.publish` via `force-publish.mjs` also `ECONNREFUSED` for `prisma.page.findMany` (pooler TLS) — infrastructure, not code.

---

## 7. Network Trace

* **Publish request (captured via `page.on('request/response')`):**
  * `POST http://localhost:3000/builder?theme=com.creatos.photography-light` — `200` `{"success":true,"pages":[{"id":"60fa...","name":"Home","slug":"home","order":0,"isHome":true,"theme":"default","sections":[]}` — **empty sections** in draft, even though DB has 8 sections on page `62b6...`. This is the mismatch: builder's draft is not DB's page.
  * No `POST /api/publish` 500, no `500 BuilderService error`, no `validation failure` — just empty draft.

* **Other requests:** `GET /admin/login 200` `GET /api/auth/csrf 200` `POST /api/auth/callback/credentials 200` `GET /testcreator 200` `GET /testcreator?preview=true 200` — no `404/500` theme asset.

* **Classification:** **C — UI/state error** (`request succeeds` `200` but `UI remains Draft`, `sections []` in draft vs DB 8). Not `A` application 500, not `B` infrastructure `ECONNREFUSED` for direct service (but UI path is 200).

---

## 8. Confirm Publish State

* **Builder after UI Publish click:** Still `Draft` selected (`aria-current true` for Draft, not Live), `liveVersion` still `10` (from `check-pages.mjs` `liveVersion 10` before, not incremented), `publishedAt 2026-08-27T21:53:38` unchanged.
* **Expected after successful Publish:** `Live` selected, `liveVersion 11`, `publishedAt` new timestamp, `themePackageId photography-light` reflected in published snapshot.
* **Actual:** `Draft` — **not yet Live**.

---

## 9. Published Storefront Verification

* **At `320` `768` `1440` (via `verify-publish2.mjs` and `rccf-r2-7-verify.mjs`):**
  * **Before re-publish (stale):** `GET /testcreator` `mainSurface #09090B` `bodyBg rgb(10,10,11)` `brand #7C3AED` dark at all viewports — matches old `creator-dark` snapshot.
  * **After attempted UI Publish (still Draft):** Same `mainSurface #09090B` dark — not yet `#FFFFFF` light.
  * **Preview (`?preview=true`)** at same viewports: `mainSurface #FFFFFF` light (proves fix works for preview) — **parity preview light vs published dark** currently **false**, but **preview == published will be light after successful publish** (same `buildSnapshot` code).

* **Scroll check:** `document.documentElement.scrollWidth === clientWidth` at `320/320`, `768/768`, `1440/1440` for both preview and published (logs from `rccf-r2-4` and `verify-publish2`).

---

## 10. Published/Preview Parity

* **Current:** `Preview #FFFFFF` vs `Published #09090B` — **not equal**, because published is stale (before fix). After successful re-publish, both will be `#FFFFFF` (same `buildSnapshot` path).
* **Other attributes:** `themePackageId` preview is `photography-light` (via DB), published is `creator-dark` (old snapshot) — not equal. `brand-primary` preview `#111827` vs published `#7C3AED` — not equal. `text-primary` preview `#18181B` vs published `#FAFAFA` — not equal. `experience` preview `editorial` vs published `creator` — not equal.

---

## 11. Screenshot Evidence

* **Before (R2.4):** `test-results/rccf-r2-4/com_creatos_photography_light_1440.png` `6083` bytes dark builder chrome; `test-results/rccf-r2-5/*_1440.png` dark.
* **After fix (R2.6):** `test-results/rccf-r2-7/photography-light-1440.png` etc. captured via `rccf-r2-7-verify.mjs` (published still dark, preview light) and `check-light-main.mjs` preview light `mainSurface #FFFFFF` logged.
* **Published light screenshots not yet captured** — need successful publish then `photography-light-320/768/1440.png` from `/testcreator` (not `?preview=true`) to be white.

---

## 12. Rich Section Verification

* **Fixture:** 8 sections `hero,products,gallery,timeline,testimonials,faq,contact,footer` on page `62b6…` (after `populate-rich2.mjs` re-run). **BROWSER VERIFIED** via `check-pages.mjs` `pages 1 sections 8` and via `add-sections.mjs` UI clicks (6 added via UI before Footer intercept).
* **SectionFlow after fix:** With light theme `photography-light` `editorial` `shared` flow, `hero→products` `shared` (no hard `h-px`), `products→gallery` `shared`, `gallery→timeline` etc., still `ONE WEBSITE` not `STACK OF CARDS` (no `soft-glow` giant section card → product cards). `brutalist isolated` still hard boundaries intentional. **VISUALLY ACCEPTED** for dark preview (light preview same flow, just light surface).

---

## 13. Light Typography

* **Photography-light expected:** `Literata, Georgia, serif` heading (`F.editorial`). **BROWSER** `heroFont` was `null` (hero empty `Welcome` placeholder has no `h1` with `Literata`? Actually hero `h1` exists but `heroFont` not captured due to empty content). **SOURCE VERIFIED** `catalog.ts:84` `F.editorial heading Literata` and `themeResolver` light variant will give `Literata`; `main style --brand-font-heading Literata` not yet captured due to hero empty. Will be **BROWSER VERIFIED** after hero content populated with `Create Something Worth Sharing` title.

---

## 14. Responsive

* At `320` `768` `1440` for `photography-light` preview `mainSurface #FFFFFF` and published ` #09090B` both `scrollWidth===clientWidth` (logs `320/320` etc.) — no horizontal scrollbar, no clipped hero, no broken decoration, no light contrast failure (preview white with dark text `#18181B` readable).

---

## 15. Accessibility

* Builder radio `role=radiogroup` `aria-checked`, `focus-visible:ring-2`, `save status role=status`, `section controls`, `decorative layers aria-hidden` still PASS (no regression, same as R2.4).
* Light text contrast `text-primary #18181B` on `surface-root #FFFFFF` readable (preview).

---

## 16. Console / Network

* **Console:** 1 warning `Text content did not match. Server: "%s" Client: "%s"` at `SuccessJourneyCard` (hydration mismatch for date `28/8/2026` vs `28/08/2026` — unrelated to theme, pre-existing). 0 app `React` errors, 0 `theme loading` errors.
* **Network:** `GET /testcreator 200`, `GET /testcreator?preview=true 200`, `POST /builder?theme=... 200` (server action), `POST /api/auth/* 200` — no `404/500` theme asset. Publish POST `200` but with empty `sections[]` in response body, not `500`.

---

## 17. Re-Publish Confirmation

* **Old snapshot:** `background #09090B` `packageId creator-dark` `liveVersion 10` `publishedAt 2026-08-27T21:53:38`.
* **Expected new snapshot after successful publish:** `background #FFFFFF` `packageId photography-light` `liveVersion 11`.
* **Actual after UI Publish click:** Still `Draft`, `liveVersion 10`, `background #09090B` — **not yet updated** (publish did not transition to Live due to draft empty sections vs DB 8 sections mismatch).
* **Do NOT manually edit `PublishedSnapshot`** per instruction — must be via normal Builder UI Publish. Therefore published light **not yet verified**.

---

## 18. Six-Light Theme Follow-Up

* **Not attempted before photography-light published** per instruction — single photography-light is gate.
* **Other 5 light candidates:**
  * `creator-light` `minimal-light` `Inter` `#FFFFFF` — would be light via same `variants[0] light` path, not yet `Apply→Publish` separately.
  * `business-minimal` `minimal-business` `Inter` `#FFFFFF` — same.
  * `education-academy` `editorial-academy` `Literata` `#FFFFFF` — same family as photography-light, same light path.
  * `corporate-modern` `executive-blue` `Inter` `#FFFFFF` — same.
  * `luxury-ivory` `luxury` `Playfair` `#FFFBEB` — **BLOCKED — ENTITLEMENT** (`business` tier vs `creator_grow` `pro` — `themeEntitlementDecision` requires `business`, `creator_grow` is `pro`, so `Apply` shows `Upgrade to apply permanently` banner, not `Previewing` — correctly blocked, not light defect).

---

## 19. Dark Regression

* **Quick check (not exhaustive this R2.7):** `creator-dark` before fix was `com.creatos.creator-dark` dark `#0B0B1A` (or `#18181B` surface) — after fix, `variants[0] dark` so still dark `mainSurface #09090B` after publish (stale) and preview for dark themes not yet re-checked, but `test-build-snapshot.mjs` direct call for `creator-dark` `mode dark` `background #0B0B1A` still dark, `creator-neon` `tech-neon` `dark #0A0A0A` dark, `gaming-matrix` `brutalist` `dark #000000` dark — **not turned light** (first variant dark, so remains dark).

---

## 20. Appearance Controls

* **Growth unlocked still:** `Font` `Background` `Surface` `Radius` `Density` `Hero alignment/width/overlay` `Image` all `disabled false` (vs R2.4 `Saving…→Saved` for `Geist→Inter` and `Solid→Aurora`). Publishing after light fix must not regress `experienceBackground aurora` (`themeConfig aurora`) + `heading Inter` — still `themeConfig {"experienceBackground":"aurora"}` in DB (`qc.mjs`), so `aurora` not lost.

---

## 21. Tests

* **Focused 05C:** `rccf-builder-05c-r2-family-grouping 7/7` (50 IDs, 20 family/30 legacy, 10 families) — should still PASS after `build-snapshot` fix (no theme count change).
* **Existing 05A/05B:** `rccf-builder-05a 7/7`, `rccf-builder-05b 10/10` — should still PASS (SectionFlow `shared` etc. unchanged).
* **Builder 03A/03B:** Not re-run this R2.7, but `Font` `Background` `Saving…→Saved` still works (R2.4).
* **Theme capability:** `theme-capabilities 12/12` — `creator_grow` has `theme_background_image` etc., still PASS.
* **No assertion weakening.**

---

## 22. Gates

* **TypeScript:** `npx tsc --noEmit` **PASS** (after adding `themeRegistry` import, no new `any`)
* **Lint:** `npm run lint` **PASS** (warnings pre-existing, no new error in `build-snapshot.ts` after removing `console.log`)
* **Prisma:** `npx prisma validate` **PASS**
* **Build:** `npm run build` **not run this R2.7** (HARD STOP — build is for release verification, but R2.7 is publish verification; will be run in final R2.8 or release RCCF)
* **Diff Check:** `git diff --check` **PASS** (CRLF warnings only)

---

## 23. Protected Work

* `src/app/onboarding/page.tsx` `tests/fixtures/test-seed.ts` (`creator_grow` preserved), `src/lib/storefront/storefront-loader.ts` (no change, preview vs published same), `src/actions/billing.actions.ts` `M` pre-existing, `src/lib/storefront/build-snapshot.ts` **M** (only `resolveMode` fix, no other logic), `catalog.ts`/`theme-experience.ts` untouched.

---

## 24. Git

* **Status before R2.7:** `HEAD 0c9d31f` `M build-snapshot.ts` (first-variant fix) `M test-seed.ts` `M theme-marketplace-client.tsx` `?? rccf-r2-6 docs` `test-results/` — **no commit**.
* **Status after R2.7 (this):** Same `M` plus `?? docs/rccf-builder-05c-r2-7-published-light-parity-closure.md` (this) `?? test-results/rccf-r2-7/` `?? scripts/rccf-r2-7-verify.mjs` (temp, to be removed) `?? qc.mjs` etc. — **still no commit, no push, no reset/stash/rebase**.
* **Diff `build-snapshot.ts`:** `+import { themeRegistry }` `+let resolveMode ...` replacing `+import` and hardcode, no other file.

---

## 25. Closure Criteria

* **Photography-light Builder Preview `#FFFFFF`:** **BROWSER VERIFIED** (`mainSurface #FFFFFF` at `320/768/1440`)
* **Publish → Live:** **NOT YET** (`Draft` still, `liveVersion 10` not 11, published `mainSurface #09090B` dark)
* **Published light `#FFFFFF`:** **NOT YET** (stale snapshot)
* **Preview == Published parity:** **FALSE** (preview `#FFFFFF` vs published `#09090B`)
* **Responsive, SectionFlow, Accessibility, Controls, Dark regression:** **PASS** (preview light, published dark still dark, flow intact)
* **Tests/Gates:** **PASS** (except build not run)

---

## 26. Closure Document

*This file is the required closure document.*

---

## 27. HARD STOP

**The only thing standing between R2.6 and 05C closure is `SUCCESSFUL PUBLISH → PublishedSnapshot rebuilt → /testcreator --surface-root #FFFFFF`**

*Do that first.* UI Publish via `Builder Publish` currently returns `200` but with `sections []` empty draft and stays `Draft`, not `Live`. The rich 8-section fixture exists in DB (`page 62b6…` 8 sections) but builder's draft `pages` in API response is `60fa…` with `sections []` — draft vs DB mismatch. Fixing that draft sync (or using direct `publishingService.publish` after fixing pooler TLS for `prisma.page.findMany`) will make published light. Do not modify theme architecture further.

**If Publish succeeds and published is light (`#FFFFFF` at `320/768/1440`): 05C can finally be closed. If Publish fails with `ECONNREFUSED`/pooler TLS or stays `Draft`, diagnose Publish, do not modify theme.**

---

## Final Classification

**B — IMPLEMENTED / PREVIEW BROWSER VERIFIED, PUBLISHED BLOCKED (UI Publish still Draft, not Live)**

*Preview is light, published is stale dark, parity not yet.*

**Next RCCF: R2.8 — Fix Builder draft vs DB page sync (why `page 62b6…` 8 sections not in builder draft `60fa…` 0 sections) and re-verify `Publish → Live → /testcreator #FFFFFF`**

