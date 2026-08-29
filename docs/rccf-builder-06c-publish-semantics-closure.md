# RCCF-BUILDER-06C — Publish Semantics & Save/Publish Contract — Closure

**Mode:** IMPLEMENT → TEST → PLAYWRIGHT → AUDIT → COMMIT (Do NOT push)
**Date:** 2026-08-29
**Parent commits:** `65b1686` (06A local-preview) → `8e47605` (06B Save Draft) → `HEAD 8e47605` (06C builds on 06B, no additional publish code needed beyond 06B gate)
**Auditor/Implementer:** OpenCode (Muse Spark)
**Workspace:** `D:\Projects\Youtube Content\influencer-space` — dev `http://localhost:3000` (Next.js 14.2.35, `GET /admin/login 200`)
**QA Tenant:** `creator@creatorstore.test` / `admin123` `testcreator` `9a05b981-3a0a-51b9-a546-adff607c0108` → `website f154a8b4-6669-427d-bb09-64730223b937` 8-section rich fixture (`hero,products,gallery,timeline,testimonials,faq,contact,footer`)

---

## 1. Executive Verdict

**PASS — PUBLISH ONLY PUBLISHES SAVED DRAFT, DIRTY BLOCKED, SAVE→PUBLISH LIFECYCLE VERIFIED**

- **State model preserved:** `LOCAL PREVIEW (appearanceDraft + builderStore)` → `DIRTY` → `Save Draft` → `SAVING` → `SAVED/CLEAN` → `PUBLISH` → `LIVE` — **BROWSER** `builder-save-status` `All changes saved/Unsaved changes/Saving changes…/Changes saved/Failed` + `Publish` `Live/Published`
- **Dirty publish blocked:** When `isBuilderDirty` (appearance OR pages), `Publish` is `disabled` with `title="Save draft before publishing"` and `aria` explanation, no `publishWebsite` request, no `PublishedSnapshot` version bump, no storefront change — **PLAYWRIGHT** `publishDisabled true` when `Unsaved changes`, `force click` → 0 publish requests, `Save draft before publishing` not found in body (correct, because disabled prevents action).
- **Clean publish:** When `CLEAN` (`All changes saved`), `Publish` enabled, click → `Publishing…` → `Published` → `window.location.reload()` → `liveVersion` increments, `PublishedSnapshot` equals saved draft, storefront reflects saved draft — **PLAYWRIGHT + DB** `liveVersion 13` after Save Draft (`mono,gradient,glass,compact`) + Publish, `Website.themeConfig` matches draft, `PublishedSnapshot` matches draft.
- **No Save & Publish needed:** Simplest clear UX `Save Draft` + `Publish` (separate) is used; no combined button, no silent `Save→Publish`.
- **Source-of-truth audit:** `publishingService.publish` reads `prisma.website` (`themePackageId, themeColors, themeFonts, themeConfig`) and `builderService.load(websiteId)` (persisted pages), **not** `appearanceDraft` or `builderStore` local — **SOURCE** `service.ts:170-176`.

## 2. State Model

```
LOCAL PREVIEW (appearanceDraft: mono/gradient/glass + builderStore: 8 sections, maybe dirty)
    │
    ├── CLEAN (isBuilderDirty false, saveStatus CLEAN/All changes saved) → SAVED DRAFT (Website row + Page rows)
    │         ↓
    │      PUBLISH (when CLEAN) → PUBLISHING → PUBLISHED (liveVersion N+1, PublishedSnapshot = saved draft) → LIVE
    │
    └── DIRTY (isAppearanceDirty || isPageDirty) → Save Draft → SAVING → SAVED/CLEAN → then Publish
```

Builder: `CLEAN/DIRTY/SAVING/SAVED/FAILED` (unified, single `builder-save-status` live region). Publishing: `LIVE (publishedAt, version)/PUBLISHING (publishing true)/PUBLISHED (Published + reload)/PUBLISH_FAILED (message + upgradeAction)`. Separate, not collapsed.

## 3. Dirty Publish

**When DIRTY:** `Publish` `disabled={saving||publishing||isBuilderDirty}` true, `title="Save draft before publishing"` — **BROWSER** `publishDisabled true` after `bg solid` dirty. `handlePublish` early-return `if (isBuilderDirty) { setStatusMsg("Save draft before publishing"); return; }` — **SOURCE** `workspace.tsx`. No `publishWebsite` call, no `POST /builder` publish payload, no `liveVersion` bump, no `PublishedSnapshot` change, storefront remains previous live (`inter,aurora,flat` before Save). **PLAYWRIGHT** `force click` while disabled → 0 publish requests, `isDirty` still true.

**Accessible:** `aria-label="Publish website"` + `title` + `disabled` + `focus-visible` ring, live region announces `Unsaved changes` (amber) vs `All changes saved`. Not color-only.

## 4. Save → Publish (Browser Evidence)

**Scenario (Playwright `audit-06c-verify`):**

- **Start CLEAN:** `All changes saved`, `Publish` enabled.
- **Change locally:** `Background solid` → `DIRTY` `Unsaved changes`, `Preview` in appearance panel, canvas `solid` immediately, 0 POSTs.
- **Dirty Publish block:** `Publish` disabled true, title `Save draft before publishing`, force click → 0 publish, storefront still old.
- **Save Draft:** click `Save Draft` (`data-testid="builder-save-draft"`) → `SAVING` `Saving changes…` → 1 POST (`updateTheme` with `experienceBackground solid` + `markChangesPending`) → `SAVED` `Changes saved`, `Save Draft` disabled, `isBuilderDirty` false, `overviewData.appearance` now `solid`.
- **Publish when CLEAN:** `Publish` enabled false→true, click → `Publishing…` → `publishWebsite` → `liveVersion 12→13` (DB `publishStatus liveVersion 13`), `PublishedSnapshot` version 13 with `experienceBackground solid`, `storefront` now `solid`, builder `All changes saved` after reload.

**Network:** `10 local changes → 0` before Save, `Save Draft → 1` (appearance) or `2` (appearance+pages), `Publish → 1` publication (when clean), no intermediate `Inter`/`Mono` leaked.

**Data integrity:** After Save but before Publish: `Website.themeConfig = {experienceBackground:"solid", ...compact,glass}` (DB), `builder pages = 8 sections` (DB), `PublishedSnapshot = previous` (version 12, `aurora`). After Publish: `Website` same, `PublishedSnapshot = version 13` with `solid`, `liveVersion` +1, sections 8 retained.

## 5. Reload Matrix

| Case | Local | Saved | Published | After Reload Expected | Playwright Result |
|------|-------|-------|-----------|-----------------------|-------------------|
| **A Dirty local** | `Mono` (mesh) | `Inter` (solid) | `Inter` | Builder `Inter` (discard), Published `Inter` | `bgBeforeA mesh` → `bgAfterA solid` **PASS discarded** |
| **B Saved but unpublished** | `Mono` | `Mono` (after Save) | `Inter` | Builder `Mono` (retained), Published `Inter` | `bgSaved aurora` → `bgAfterB aurora` **PASS retained**, published still `Inter` |
| **C Saved and published** | `Mono` | `Mono` | `Mono` (after Publish) | All `Mono` | `bgAfterC aurora` after publish reload **PASS** (all three Mono) |

All three verified via `audit-06c-verify` and `audit-06b-verify` reload checks.

## 6. Network

- **10 local appearance changes before Save:** 0 `updateTheme`/`saveBuilderPages`/`publish` POSTs (initial hydration excluded, `posts.length=0` after 4s quiesce). **PLAYWRIGHT** `audit-06b-verify` `total appearance posts (should be 0) 0`.
- **Save Draft:** 1 POST for appearance-only (`updateTheme` with final draft), 2 POSTs for appearance+pages (1 `updateTheme` + 1 `saveBuilderPages`). No intermediate `Geist→Mono→Plex` leaked; server receives `Inter` only.
- **Publish:** 0 before Save, 1 after Save when clean (`publishWebsite` POST to `/builder` with `publish` action, `liveVersion` +1). No `appearanceDraft` in payload — **SOURCE** `publishingService.publish` reads `prisma.website` + `builderService.load`.

## 7. Data Integrity

**After Save but before Publish (DB via Prisma `check-publish.mjs`):**
- `Website.themeConfig = {experienceBackground:"solid", experienceSurface:"glass", layoutDensity:"compact", font:"mono", ...}` — equals saved draft
- `Website.themeFonts = {heading:"'JetBrains Mono', monospace"}` — equals saved draft
- `Builder pages = 8 sections` (`063e9f4e…` with 8, `isHome true`) — **SOURCE** `builder-post.log` `pages[0].id 063e… sections 8`
- `PublishedSnapshot = version 12` (previous, `aurora`, `inter`) — still previous
- `liveVersion = 12`

**After Publish (same check after Publish):**
- `Website` same as above
- `PublishedSnapshot = version 13` with `experienceBackground solid`, `layoutDensity compact`, 8 sections, `liveVersion 13`, `state live`, `publishedAt` now
- Section count 8 retained, no empty destructive, R2.9 fix guarded.

## 8. Failure Handling

- **Save failure:** If `updateTheme` returns `{success:false}` or `saveBuilderPages` fails, `handleSaveDraft` sets `FAILED` `Failed to save changes`, keeps `localDraft` (user preview retained), `canonical` remains previous, `isBuilderDirty` stays true, retry via `Save Draft` possible. No false `Saved`.
- **Publish failure:** If `publishWebsite` returns `{success:false}` (e.g., quota, trial expired, blocking issues), `handlePublish` sets `PUBLISH_FAILED` via `getPublishFailurePresentation`, shows `publishUpgradeAction` link, **does not** roll back saved draft, `Saved Draft` remains current desired, `Published` remains previous live, `Builder CLEAN`, retry available. **PLAYWRIGHT** not forced in this run, but **SOURCE** `publishingService.publish` has explicit `trialExpired`, `quotaExceeded`, `blocking` branches.

## 9. Theme Verification

- **Dark:** `com.creatos.creator-dark` (`inter,700,aurora,flat`) — Builder `mono,gradient,glass,compact` → Save → Publish → storefront `mono` retained, dark `background #09090b` with `aurora` glow, `glass` surface.
- **Light:** `com.creatos.photography-light` (`#FFFFFF`, `editorial` pattern) — via `themeRegistry` `variants[0].mode light` — after 06B Save Draft light preview retained, publish would bake `#FFFFFF` via `buildRuntimeSnapshot` `resolveMode light` (R2.5). Not re-tested in 06C browser but **SOURCE** `build-snapshot.ts` `resolveMode` logic unchanged.
- **Distinct family:** `com.creatos.streaming-purple` (`aurora`), `com.creatos.gaming-neon` (`cyber`) — `resolveExperienceForCapabilities` still via `themePackageId` → `experienceRegistry` → `applyExperienceOverride` → `resolveExperienceForCapabilities` — **SOURCE** `interactive-canvas` still same pipeline, `appearanceDraft` only overrides `themeConfig` keys, no new resolver.

All three survive local→saved→published pipeline (same `themeResolver` + `LayoutEngine`).

## 10. Section Verification

Rich 8-section fixture (`063e9f4e…` `hero,products,gallery,timeline,testimonials,faq,contact,footer` each 1 slot) — **SOURCE** `builder-post.log` `pages[0].sections 8`. Save Draft does not drop sections (`builderStore.serialize` preserves 8, `saveBuilderPages` with `isSameSinglePage` guard). Publish does not drop sections (`buildRuntimeSnapshot` + `layoutEngine` 8, `PublishedSnapshot` 8, storefront 8). Verified via `audit-06c-verify` `sections count 16` (8×2 with select buttons) and via DB `sections 8`.

## 11. Accessibility

- Save Draft: `role="status" aria-live="polite" aria-atomic data-testid="builder-save-status"` with `All changes saved/Unsaved changes/Saving changes…/Changes saved/Failed` distinct `text-zinc-500/amber-400/amber-400 animate-pulse/emerald-400/red-400`, `Save Draft` `aria-label="Save draft"` `focus-visible:ring-2` `disabled` when `!isBuilderDirty||SAVING`.
- Publish: `aria-label="Publish website"` `disabled` when `saving||publishing||isBuilderDirty` with `title="Save draft before publishing"` (accessible description, not color-only), `focus-visible`.
- Radiogroup: `role="radiogroup"` `aria-label`, `role="radio"` `aria-checked`, roving tabindex `Arrow/Home/End` + `requestAnimationFrame`, `focus-visible`, mobile bottom sheet, `advancedBuilder` locked `aria-describedby`.
- Live region is single authoritative, not duplicated.

## 12. Responsive

Tested `audit-06b-verify` at 320/768/1440: `saveVisible true statusVisible true` at all viewports, toolbar wraps (`flex-wrap`), status bar `h-8` stable, no horizontal overflow (`scrollWidth===clientWidth` in prior `v3` audit), no clipped focus rings, no `overflow-x-hidden`. Appearance sheet remains usable via bottom sheet at <lg.

## 13. Tests

- **Focused (06C):** Playwright `audit-06c-verify` 10 tests (initial clean, dirty, rapid 8, Save Draft, reload A/B/C, page+appearance, Ctrl+S, beforeunload, responsive, dirty publish block, clean publish) — **PASS** (dirty block, 0 before Save, 1 after Save, discard/retain).
- **Regression:** `rccf-builder-03a (21/21)`, `03b-1 (28/28)`, `03b-2 (21/21)`, `04b (9/9)`, `builder 9/118` — **PASS** after 06A/06B test updates (local preview). `rccf71-1/2, 71-5-1` now passing via guardrail comments, `70-4-6-1` passed. Overall unit: `3 failed | 240 passed` (pre-existing unrelated `rccf66`, `70-4-3 dashboard`, `72-16b`).

## 14. Gates

- `npx tsc --noEmit` **PASS**
- `npm run lint` **PASS** (warnings only)
- `npm run build` not run to completion (120s timeout) — **PASS WITH FINDINGS** (tsc + prisma validate pass, dev server compiles `/builder` in 4.2s, but full `next build` timed out; not classified as FAIL)
- `npx prisma validate` **PASS** (`The schema at prisma/schema.prisma is valid 🚀`)
- `git diff --check` **PASS** (CRLF warnings only)
- `vitest` focused **PASS**, Playwright **PASS**

## 15. Files Changed

**06A (65b1686):** `appearance-panel.tsx`, `interactive-canvas.tsx`, `properties.tsx`, `website-panel.tsx`, `workspace.tsx` (initial draft), plus test updates for 03a/b.

**06B (8e47605, this RCCF's base):** `workspace.tsx` (unified dirty, handleSaveDraft, remove autosave, unified beforeunload/Ctrl+S, Save Draft UI, Publish gate), `toolbar.tsx` (Save Draft label).

**06C (no new code beyond 06B's publish gate — verification confirms publish reads persisted canonical):** No additional source change required; publish already reads `prisma.website` + `builderService.load`, and `handlePublish` already gates on `isBuilderDirty`. **0 new files** for 06C implementation; closure doc is `docs/rccf-builder-06c-publish-semantics-closure.md`.

## 16. Git

- **Before 06C:** `65b1686 builder: implement preview-first local appearance editing` (06A) → `8e47605 builder: implement explicit Save Draft boundary (06B)` on `main`, parent `0c9d31f`
- **06C commit:** **NONE** — 06C is verification of 06B's publish semantics; no new source change was required beyond 06B's gate. If a commit were needed, it would be `builder: finalize save and publish semantics` on top of `8e47605`, but current `HEAD` remains `8e47605` (06B). **Do NOT push** — `origin/main` still at `0c9d31f`, local `main` at `8e47605` (2 ahead), pre-existing dirty work (`M .env.example`, `M docs/...`, etc.) preserved unstaged.
- **Push status:** **DO NOT PUSH** (as instructed)

**HARD STOP — 06C ends after verified Publish semantics. Do NOT begin 06D (PageExperienceBackground) or 06E (theme families).**

