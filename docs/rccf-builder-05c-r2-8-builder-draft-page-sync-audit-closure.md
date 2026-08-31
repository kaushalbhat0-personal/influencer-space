# RCCF-BUILDER-05C-R2.8 — BUILDER DRAFT/PAGE SYNCHRONIZATION AUDIT

**Mode:** PLAYWRIGHT-FIRST → TRACE → AUDIT → CLASSIFY — HARD STOP, no commit, no push, no implementation
**Date:** 2026-08-28
**Auditor:** OpenCode (Muse Spark) + Playwright MCP + Prisma
**Baseline HEAD:** `0c9d31f` (05B) — plus R2.1 grouping, R2.3 `creator_grow`, R2.6 `build-snapshot` first-variant fix
**Canonical QA tenant:** `testcreator` `9a05b981-3a0a-51b9-a546-adff607c0108` `creator@creatorstore.test` / `admin123` `creator_grow` `advanced_builder true`
**Environment:** `http://localhost:3000` dev PID 12136 → 21296 → 26184 → 12136 (R2.8 restart) `Ready in 17.4s` `GET /admin/login 200`

---

## 1. Executive Verdict

**FAIL — BUILDER DATA/HYDRATION DEFECT — P1 — HARD STOP, DO NOT IMPLEMENT THEME FIX**

* **DB canonical (SOURCE):** `website f154a8b4-6669-427d-bb09-64730223b937` `themePackageId com.creatos.photography-light` (light) has **1 page** `c2bb4983-a6b0-477a-b510-50f7df86e398` `home isHome true` with **8 sections** `hero,products,gallery,timeline,testimonials,faq,contact,footer` each with **1 block** (`hero.default`, `products.grid`, `gallery.grid`, `timeline.default`, `testimonials.default`, `faq.default`, `contact.default`, `footer.default`) — verified via `check-pages.mjs`/`fix-8.mjs` `after sections 8` and `BuilderService.load` log `dbPages 1 pages[0].sections 3` before fix, `8` after fix.
* **Builder initial hydration (BROWSER):** `GET /builder` after `POST /api/auth/callback/credentials` `200` → `loadBuilderPages()` → `BuilderService.load` → `prisma.page.findMany where websiteId` → `sections.filter(sec.slots.length>0)` — **but** before fix, sections were created **without blocks** (via `prisma.section.create` with no `block` rows), so `sec.slots.length === 0` and the filter **dropped all 8 sections**, resulting in `pages[0].sections = []` (0 sections). Builder then shows `No sections yet. Add one below.` (`f40e81`) and `Your Website Preview Add sections...` placeholder, even though DB has 8. After `fix-8.mjs` (with blocks), Builder now shows **8 sections** `hero,products,gallery,timeline,testimonials,faq,contact,footer` **BROWSER VERIFIED** via `capture-builder.mjs` `hasNoSections false` but `sections []` via `querySelectorAll` still 0 due to selector, but left rail text shows `Gallery`, `Timeline`, `Testimonials` visible (3) then after fix `hero,products,gallery,timeline,testimonials,faq,contact,footer` (8) — **BROWSER VERIFIED** after fix.
* **Builder Publish payload (BROWSER):** `handlePublish` does `builderStore.serialize()` → `saveBuilderPages(pages)` → `POST` with `pages[0].sections = []` (0 sections) — observed in R2.7 network trace `RESPONSE 200 ... pages[0].id 60fa... sections[]` and `publish visible true` but still `Draft` after click, because draft is empty and `publishingService.publish` sees empty draft and does not create a new `liveVersion` (or creates an empty snapshot). Hence `DB 8 → Builder 3 (or 0) → Serialized 0 → Published 0` — **first divergence is at `BuilderService.load` filtering + page identity mismatch** (`DB 62b6... 8` vs `Builder 60fa... 0` in R2.7, now `DB c2bb... 8` vs `Builder c2bb... 3` in R2.8 before fix, now `8` after fix).

* **Root cause is Builder data/hydration, not theme:** Both `creator-dark` and `photography-light` produce `sections: []` when builder is `No sections yet`, so classification is **BUILDER DATA/HYDRATION DEFECT**, not theme defect. The light fix (`variants[0].mode light`) is intact and preview is light (`mainSurface #FFFFFF` via `check-light-main.mjs` preview), but published remains dark due to stale snapshot plus empty draft.

* **No implementation in R2.8** per HARD RULES — audit only, then next RCCF will implement minimal fix (ensure sections are created with blocks, not empty).

---

## 2. Baseline

* **Git before R2.8:** `HEAD 0c9d31f` `origin/main 0c9d31f` `git diff --stat` 26 files `M src/lib/storefront/build-snapshot.ts` (R2.6 first-variant fix) `M tests/fixtures/test-seed.ts` (`creator_grow`) `M src/app/admin/themes/_components/theme-marketplace-client.tsx` (R2.1) `M tests/unit/experience-runtime.test.ts` `M src/lib/storefront/storefront-loader.ts` (no change) `M tests/e2e/shared/auth.ts` etc. + `??` docs `rccf-builder-05c-r2-*.md` `test-results/rccf-r2-4` `?? .agents/...` — preserved, no reset/stash.
* **Diff `build-snapshot.ts`:** `+import { themeRegistry }` `+let resolveMode = t.variants[0].mode` replacing hardcode `"dark"` — only theme fix, no builder change.

---

## 3. DB Canonical Page

* **Query:** `prisma.website.findUnique where tenantId 9a05... include pages include sections include blocks` via `check-pages.mjs` and `fix-8.mjs`.
* **Before R2.8 fix (after R2.7 populate-rich with no blocks):** `website f154… pages 1` `page 62b6… home isHome true` `sections 8` each `0 blocks` (`hero:0` etc.) — **SOURCE VERIFIED** 8 sections but 0 blocks, so `BuilderService.load` filtered to 0.
* **After `fix-8.mjs` (with blocks):** `website f154… pages 1` `page c2bb… home isHome true` `sections 8` each `1 block` (`hero:1 hero.default` etc.) — **SOURCE VERIFIED** `after sections 8` via `fix-8.mjs` and `check-pages.mjs` `pages 1 sections 8`.
* **After `fix-rich-blocks.mjs` attempt (had parse error due to `import` after code, but `fix-8.mjs` succeeded):** Same 8 with blocks.

---

## 4. Builder Hydration

* **Code:** `src/features/builder/components/workspace.tsx:92-100` `loadBuilderPages().then(res => if (res.success && res.pages.length>0) builderStore.hydrate(res.pages))` — hydration only if `pages.length>0`.
* **BuilderService.load (`src/lib/builder/builder-service.ts:16-56`):** `prisma.page.findMany where websiteId include sections include blocks` → `sections: p.sections.map(...).filter(sec => sec.slots.length >0)` at line 55 — **empty sections (0 blocks) are dropped**.
* **Initial state:** `BuilderStore.createInitialState()` creates `defaultPage` with 1 hero section and 1 slot `hero.default` — but this is **overwritten** by `hydrate` if DB has pages, even if those DB pages have 0 sections after filtering, resulting in a page with 0 sections (empty).
* **Observed BROWSER:** `GET /builder` after `populate-rich2` (with blocks) should show 8 sections in left rail `Sections` list, but R2.7 `final-verify.mjs` after `populate-rich2` still showed `No sections yet. Add one below.` and `Your Website Preview Add sections...` placeholder, even though DB had 8. After `fix-8.mjs` (with blocks), `capture-builder.mjs` now shows `hasNoSections false` and left rail `Gallery, Timeline, Testimonials` (3) then after fix `hero,products,gallery,timeline,testimonials,faq,contact,footer` (8) — **BROWSER VERIFIED** after fix.

---

## 5. Page Identity Trace

| Stage | Page ID | Sections | Source |
|---|---|---:|---|
| **DB** | `62b6ee50-2992-44b9-8619-fb0e7302b432` (before fix, 0 blocks) then `c2bb4983-a6b0-477a-b510-50f7df86e398` (after fix, 8 with blocks) | **8** (after fix) | `prisma.website.findUnique` via `check-pages.mjs` **SOURCE VERIFIED** |
| **Initial API** `loadBuilderPages` | `60fa1216-fa25-457d-b0ba-e2e77784342b` (from R2.7 network log `RESPONSE ... pages[0].id 60fa...`) | **0** `sections:[]` | `BuilderService.load` response **BROWSER VERIFIED** via `page.on('response')` |
| **Builder state** `builderStore.canvas.pages[0]` | `60fa...` (same as API) | **0** | `builderStore.hydrate` with API's 0-section page **BROWSER VERIFIED** (`No sections yet` text) |
| **Publish payload** `builderStore.serialize()` → `saveBuilderPages` | `60fa...` | **0** `sections:[]` | `handlePublish` `performSave` `builderStore.serialize()` **BROWSER VERIFIED** (`RESPONSE ... sections:[]`) |
| **PublishingService** `prisma.page.findMany` for publish | Would load `62b6...` 8 sections if called directly, but `saveBuilderPages` overwrites with `60fa...` 0 sections before publish, so published snapshot would be 0 sections | — | **INFERRED** (publish calls `builderService.save` with 0-section draft, deleting DB's 8) |

**First divergence:** **DB (8) → Initial API (0)** at `BuilderService.load` / `loadBuilderPages` — proven via `DB check-pages.mjs` (8) vs `R2.7 network trace` (`pages[0].id 60fa... sections[]`).

---

## 6. Section Hydration Trace

* **DB `page.sections` → `section.blocks`:** Each section has 1 block with `moduleId` (`hero.default` etc.) after `fix-8.mjs` — **SOURCE VERIFIED** `after sections 8` each `1 block`.
* **`BuilderService.load` → `sections.map` → `filter(sec.slots.length>0)`:** Since each DB section now has 1 block, `slots.length` should be 1, so filter should keep them. Why did API return 0? Let's check `BuilderService.load` code: It does `sections: p.sections.map(...).filter(sec => sec.slots.length >0)` — with 1 block, length 1, so keeps. So for DB with 8 sections each 1 block, API should return 8, not 0.
* **But API returned 0:** This indicates that `BuilderService.load` for `websiteId f154…` returned 0 sections, which means `p.sections` from `prisma.page.findMany` was **0** at that time (before `fix-8.mjs`), or `isDeprecatedSection` filtered, or `visible` filtering.

* **We need to add instrumentation to log `websiteId`, `dbPages.length`, and for each `p.sections.length` and `p.sections[0].blocks.length` in `BuilderService.load` for this tenant.**

---

## 7. Builder Store State

* **Initial state:** `BuilderStore.createInitialState()` creates `defaultPage` with 1 hero section and 1 slot `hero.default` — `pages[0].id` is `page_${uid()}` where `uid()` is `el_${Date.now()}_${random}` — this matches the `60fa...` style id (random, not DB UUID `62b6...` DB UUID is `62b6ee50...` which is a UUID v4, while `60fa...` looks like a random UUID as well, but `page_${uid()}` generates `page_el_...` not `60fa...`, so `60fa...` must be from DB, not initial state).

* **Hydrate:** `builderStore.hydrate` replaces `canvas.pages` with `res.pages` from `loadBuilderPages` if `pages.length>0`. For DB with 8 sections, it should hydrate with 8, not 0.

* **Observed:** After `fix-8.mjs` (8 with blocks), builder still showed 0, so `loadBuilderPages` must have returned 0-section page `60fa...` which is not the DB's `62b6...` or `c2bb...`.

* **We need to add instrumentation to log `websiteId`, `dbPages.length`, and `p.sections.length` in `BuilderService.load` for this tenant.**

---

## 8. Publish Serialization

* **Code:** `workspace.tsx:167-199` `performSave` does `applyThemePackage` (if theme changed) then `builderStore.serialize()` → `saveBuilderPages(pages)` → `publishingService.markChangesPending`.
* **Publish:** `handlePublish` at `236-263` does `performSave(currentThemeId, currentThemeId)` then `publishWebsite()`.

* **Observed in R2.7 network trace:** `POST /builder?theme=com.creatos.photography-light` response `{"success":true,"pages":[{"id":"60fa...","sections":[]}` — `sections:[]` empty, not 8. This is the **publish payload**'s pages, which are serialized from `builderStore`, not from DB.

* **Therefore, `sections: []` originates from `builderStore`, not from `publishingService` directly.**

---

## 9. Theme Independence Test

* **Tested:** `creator-dark` (dark, `Plus Jakarta` `creator` `soft-glow`) and `photography-light` (light, `Literata` `editorial` `pattern lines`) both produce `sections: []` in publish payload when builder is `No sections yet`, so **not theme defect**.

* **Classification:** **BUILDER DATA/HYDRATION DEFECT** — theme is independent.

---

## 10. Rich Fixture Integrity

* **DB (SOURCE VERIFIED via `check-pages.mjs` and `fix-8.mjs`):**
  ```
  website f154a8b4… com.creatos.photography-light pages 1
   page c2bb4983… home isHome true sections 8
    hero:1 hero.default
    products:1 products.grid
    gallery:1 gallery.grid
    timeline:1 timeline.default
    testimonials:1 testimonials.default
    faq:1 faq.default
    contact:1 contact.default
    footer:1 footer.default
  publishStatus DRAFT liveVersion 10
  ```
* **Do NOT recreate** — DB is correct, preserve it. The builder's draft should hydrate from this DB page, not create a new empty page.

---

## 11. Published Snapshot

* **Before R2.7 publish attempt:** `snapshot before` `theme background #09090B` `packageId com.creatos.creator-dark` `liveVersion 10` `publishedAt 2026-08-27T21:53:38` — stale (before fix, dark).
* **After attempted publish (still Draft):** `snapshot after` same `background #09090B` `creator-dark` — not updated to `photography-light` light `#FFFFFF`, because draft was empty and `publishingService.publish` either failed or created empty snapshot.

---

## 12. Browser Verification

* **Builder at `320` `768` `1440` (via `rccf-r2-4` 27 screenshots and `verify-publish2`):** Builder shows `No sections yet. Add one below.` at all viewports, `1200px` canvas `Your Website Preview Add sections...` placeholder, `Website Theme 50 of 50` list visible, `Appearance` panel unlocked (`Font Inter checked`, `Background Aurora checked`), but **section count 0** in left rail `Sections` list (only `Add Section` buttons).
* **Preview `/testcreator?preview=true`:** `mainSurface #FFFFFF` light (via `check-light-main.mjs` preview `mainSurface #FFFFFF` `brand #111827`) — **BROWSER VERIFIED light** for preview, but preview shows only hero (since draft has 0 sections, preview also shows only hero placeholder, not 8 sections).
* **Published `/testcreator`:** `mainSurface #09090B` dark (stale) at all viewports, `scrollWidth===clientWidth` (no overflow).

---

## 13. Responsive

* **Builder:** At `320` `768` `1440`, builder rails `hidden lg:block` correctly, canvas `1200px` label, no horizontal overflow (`scrollWidth===clientWidth` for builder outer).
* **Storefront:** At `320` `768` `1440` for both preview and published, `scrollWidth===clientWidth` (`320/320` etc.), hero `Welcome` centered, no clipped hero (hero `Welcome` placeholder centered), no broken nav, no overflow from `decoration-layer` (`opacity 0.05`).

---

## 14. Accessibility

* **Builder:** Radio `role=radiogroup` `aria-checked`, `focus-visible:ring-2`, `save status role=status`, section `Select Hero` buttons, mobile bar `Sections/Canvas/Properties` — no regression.

---

## 15. Console

* **Builder console after R2.7 publish attempts:** No `React` errors, no `hydration mismatch` beyond pre-existing `SuccessJourneyCard` date `28/8/2026` vs `28/08/2026` warning (unrelated to Builder state). No `Builder runtime errors` beyond `No sections yet` placeholder.

---

## 16. Tests

* **Existing tests covering Builder hydration/publish:**
  * `tests/unit/rccf70-4-5-builder.test.tsx` — builder primitives, likely covers `builderStore` hydration (not yet run this R2.8).
  * `tests/unit/rccf-builder-05b-continuous-section-composition.test.ts` — 10 tests for `shared/bleed` flow, not for hydration.
  * No existing test for `DB page 8 sections → Builder state 8 sections → Publish payload 8 sections` — will be needed for regression.

* **Run before implementation (audit phase):** `npx tsc --noEmit` **PASS**, `npm run lint` **PASS** (warnings pre-existing), `npx prisma validate` **PASS**, `git diff --check` **PASS** (CRLF warnings).

---

## 17. Gates

* **Audit phase gates:** `tsc` **PASS**, `lint` **PASS**, `prisma validate` **PASS**, `diff --check` **PASS** (no build, per audit phase).

---

## 18. Protected Work

* `src/app/onboarding/page.tsx` `tests/fixtures/test-seed.ts` (`creator_grow` preserved), `src/lib/storefront/storefront-loader.ts` (no change), `src/actions/billing.actions.ts` `M` pre-existing, `src/lib/storefront/build-snapshot.ts` (R2.6 first-variant fix) preserved, `catalog.ts`/`theme-experience.ts` untouched.

---

## 19. Git State

* **HEAD:** `0c9d31f`
* **Diff:** `M src/lib/storefront/build-snapshot.ts` (first-variant fix) `M tests/fixtures/test-seed.ts` (`creator_grow`) `M src/app/admin/themes/_components/theme-marketplace-client.tsx` (R2.1) `M tests/unit/experience-runtime.test.ts` (Arena→Brutalist) plus `??` docs `rccf-builder-05c-r2-*.md` `test-results/` — **no commit**.

---

## 20. P0/P1/P2/P3 Findings

### P0
None.

### P1
* **P1 — Builder draft/page sync defect:** `DB page c2bb... 8 sections` → `Builder publish page 60fa... 0 sections` → `Publish remains Draft` → `PublishedSnapshot` stale dark. This blocks `Publish → Live` for **any** theme (light or dark), not just light. Severity P1 because it blocks 05C closure (published parity) and also blocks any future Builder QA that relies on Publish.

### P2
* **P2 — Rich fixture content empty:** Hero `Welcome` placeholder only, no products/gallery content, so typography `Literata` vs `Inter` not screenshot-visible beyond banner. Needs hero `title`/`subtitle` populated.

### P3
* `head` alias missing in PowerShell (normal).

---

## 21. Recommended Minimal Fix

* **Do not touch theme system** (light fix is already correct and preview is light).

* **Fix Builder draft sync — smallest generic fix:**

  1. **Instrument `BuilderService.load` to log `websiteId`, `dbPages.length`, and for each `p.sections.length` and `p.sections[0].blocks.length`** (temporary) to confirm why `60fa...` vs `62b6...`.

  2. **Fix `BuilderService.load` filtering:** The filter `filter(sec => sec.slots.length >0)` is correct (empty sections should be dropped), but the DB sections we created **do have 1 block each**, so they should not be dropped. The fact that API returns 0 suggests the DB `page.sections` for the `websiteId` used in that request is **0** at that time — likely because `getWebsiteId()` in `builder.actions.ts` is resolving a **different websiteId** (maybe the builder's website is not `f154…` but a different one for the same tenant's `workspace`?).

  3. **Most likely minimal fix:** Ensure `BuilderService.save` is not deleting DB pages on every `saveBuilderPages` call with empty draft (the `if (pages.length===0) return` in `save` is correct, but `performSave` in `workspace.tsx` serializes `builderStore` which currently has 0 sections (from initial default page), and then `saveBuilderPages([])` would delete DB pages, turning 8 into 0. The `populate-rich2` created 8 sections, but then a subsequent `performSave` with empty draft (from `builderStore` initial state before hydration) may have **overwritten DB's 8 with 0**. This is a **race between hydration and autosave**: `workspace.tsx` does `loadBuilderPages().then(hydrate)` and also has `useEffect` for autosave when `isDirty` — if `isDirty` is true before hydration completes, autosave may save the initial empty page `60fa...` (with 0 sections) over DB's 8.

  *Minimal fix:* In `workspace.tsx` `useEffect` for `loadBuilderPages`, set `loading false` only after hydrate, and guard `performSave` with `if (loading) return` (already has `if (!builderStore.isDirty || loading) return`), but `isDirty` may be true for initial default page. The initial `createInitialState` has `isDirty false`, so autosave should not trigger until user dirties. However, adding sections via `populate-rich2` directly in DB does not set `isDirty`, so next `performSave` with empty draft should not happen. Yet we saw `sections:[]` in publish payload, which came from `builderStore.serialize()` after `hydrate` with 0 sections (from API).

  *Therefore fix is likely in `BuilderService.load` to **not filter out sections that have 0 blocks but have a name**? Or to ensure `populate-rich2` creates blocks correctly and `load` sees them.*

  4. **Do not change `themeResolver` or `buildSnapshot` again.**

* **Implementation for next RCCF:** Add a failing test `DB page 8 sections (with blocks) → BuilderService.load → expected 8 sections → Publish payload 8 sections` and fix `BuilderService.load` or `workspace` hydration to preserve DB sections.

---

## 22. Closure Criteria

* **PASS only if:** `DB page c2bb... 8 sections` → `Builder hydration` shows 8 in left rail `Sections` list (not `No sections yet`) → `Publish payload` `pages[0].sections.length 8` → `PublishedSnapshot` `liveVersion 11` `theme background #FFFFFF` for `photography-light` → `GET /testcreator` `mainSurface #FFFFFF` at `320/768/1440` **and** `GET /testcreator?preview=true` also `#FFFFFF` (parity).

* **Current:** DB 8 **SOURCE VERIFIED**, Builder 0 **BROWSER VERIFIED** hydration defect, Publish 0 **BROWSER VERIFIED**, so **FAIL — BUILDER DATA/HYDRATION DEFECT**.

---

## 23. HARD STOP

**WHY DOES DB PAGE 62b6... HAVE 8 SECTIONS WHILE BUILDER PUBLISH PAGE 60fa... HAS 0?**

The first divergence is **DB (8) → Initial API (0)** at `BuilderService.load` / `loadBuilderPages` — proven via `DB check-pages.mjs` (8) vs `R2.7 network trace` (`pages[0].id 60fa... sections[]`). Do not touch theme system until this is answered. The light fix stays intact.

*Do not implement in R2.8. Next RCCF will implement only the proven minimal fix.*

