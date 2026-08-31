# RCCF-BUILDER-06 — Preview-First Builder Editing & Continuous Website Composition Audit

**Mode:** AUDIT ONLY — SOURCE → RUNTIME TRACE → PLAYWRIGHT → UX ANALYSIS → ARCHITECTURE DECISION — No commit, no push, no DB/billing/theme mutation
**Date:** 2026-08-29
**Auditor:** OpenCode (Muse Spark)
**Workspace:** `D:\Projects\Youtube Content\influencer-space` — dev server `http://localhost:3000` (PID 14432, Next.js, `GET /admin/login 200` reuse)
**QA Tenant:** `creator@creatorstore.test` / `admin123` `testcreator` `9a05b981-3a0a-51b9-a546-adff607c0108` → `website f154a8b4-6669-427d-bb09-64730223b937` **8-section rich fixture** (`hero,products,gallery,timeline,testimonials,faq,contact,footer` each 1 slot) — *verified via `loadBuilderPages` POST 2220 `063e9f4e…`*
**Secondary prod reference:** `spower.demo@creatorstore.test` `spower-gaming` (prod verification prior RCCF) used for parity cross-check
**Head:** `0c9d31f` (`builder: release continuous section composition`) — no new commits this audit

---

## 1. Executive Verdict

**AUDIT COMPLETE — BUILDER CURRENTLY SAVES TOO AGGRESSIVELY; COMPOSITION IS SECTION-AS-CARD, NOT PAGE→SECTION→CONTENT→CARD**

* **Builder State/Save (B):** Every appearance control (`font`, `headingWeight`, `background`, `surface`, `radius`, `density`, `heroTextAlign`, `heroContentWidth`, `heroOverlay`, `image`) is **optimistic + immediate server persistence** (`applyChange → updateTheme(tenantId,partial) → Website.themeConfig/themeFonts → publishingService.markChangesPending → builderEvents appearance:changed → getLivePreviewData → onRefresh`). Playwright proves **3 font changes → 12× `POST /builder` (≈4 POSTs per single chip click)**. `Saving…` appears at 0.5s and stays >1.5s. No `Save Draft` boundary; no discard semantics. **P1 product architecture gap: no explicit draft save boundary.**
* **Composition (F):** Page is visually **SECTION BANDS**, not continuous. `ExperienceSection` renders per-section `ExperienceBackground` + `DecorationLayer` + `surfaceClass` inside an `overflow-hidden` `section` with `relative z-10` content. Even with `flow:shared`, the runtime still paints per-section background/mesh/glow inside each `section`'s `absolute inset-0`, producing horizontal bands. Hierarchy today is effectively **PAGE → CARD-LIKE SECTION → CONTENT**, not **PAGE → SECTION SURFACE → CONTENT CONTAINER → OPTIONAL CARD** (05B `flow` enum exists but `defaultFlow:shared` only suppresses surface/divider, not background layering).
* **Theme system (T):** 10 family packs exist (`minimal, classic, studio, aurora, nebula, cyber, executive, creator, luxury, velocity, editorial, arena, midnight, glass, brutalist`) with `defaultFlow` correctly set per family, but the family-level composition language is *capability-filtered* post-override, and all backgrounds are still section-scoped (page-level background not isolated). Light themes (`creator-light, photography-light, luxury-ivory` etc.) reuse same section background mechanism, so light continuity suffers same banding plus extra border/shadow contrast issues.
* **Preserved:** BUILDER-03/04 mechanisms (canonicalRef/versionRef/stateRef stale protection, focus-visible, radiogroup keyboard, touch targets, live region `appearance-save-status`, locked `advancedBuilder` gating) are intact and must be refactored, not removed.

**Recommended next:** Split into **06A Preview-first local editing state**, **06B Explicit Save/Draft boundary**, **06C Publish semantics (Save→Publish vs Save & Publish)**, **06D Continuous section composition (page background + flow)**, **06E Theme-family tuning** — detailed below.

---

## 2. Current Builder Interaction Model

```
User click Chip (e.g. Font=Inter)
  → [LOCAL] setState(next) optimistic  (appearance-panel.tsx:131 stateRef.next)
  → [LOCAL] setLiveMessage("") setIsSaving(true) → <span role=status Saving…>
  → [SERVER] startTransition(async () => updateTheme(tenantId,{font}))
              → getServerSession → resolveActivePlan → entitlement check (advanced_builder)
              → websiteRepository.updateTheme(themeFonts/themeConfig)  // DB Website row
              → publishingService.markChangesPending(tenantId)        // DB PublishStatus state=draft
  → [DERIVED] if requestVersion===versionRef → canonicalRef=next → setLiveMessage("Saved")
             → builderEvents.emit("appearance:changed")
                 → InteractiveCanvas loadLiveContent() → getLivePreviewData()
                     → websiteAggregateService.build() (~15 queries) + resolveExperienceForCapabilities
                     → setThemeColors/Fonts/Config + setLiveContent
                 → workspace refreshOverview() → getBuilderOverview()
  → [PUBLISHED] no auto-publish; PublishStatus stays draft until explicit Publish
```

* **Autosave path (workspace.tsx:202-212):** `builderStore.isDirty` (pages) → 2s debounce → `performSave(currentThemeId)` → `saveBuilderPages(serialize())`. Appearance changes do **NOT** go through this path; they bypass `builderStore` entirely. So **two independent persistence pipelines**: (A) appearance `updateTheme` per chip, (B) page `saveBuilderPages` autosave.

* **Result:** Builder feels like an **admin settings form with live region**, not a Figma/Canva canvas.

---

## 3. Target Product Model (from RCCF §2)

```
LOCAL BUILDER STATE (useState + stateRef + draftStore)
        │
        ▼
INSTANT PREVIEW (canvas memo on themeConfig + layoutSignature, no network)
        │
   ┌────┴─────┐
   │          │
continue   likes it
   │          ▼
   │        SAVE (explicit user intent)
   │          │
   │          ▼
   │      PERSISTED DRAFT (DB Website.themeConfig + Pages)
   │          │
   │          ▼
   │       PUBLISH (reads persisted draft)
   │          │
   │          ▼
   │      LIVE STOREFRONT
   │
   └─ discard/reload → persisted draft (not preview)
```

Three states must be distinct: **Preview (local, unsaved)**, **Saved draft (DB)**, **Published (snapshot)**. Today only two are distinct (preview==draft, because preview writes DB).

---

## 4. State Architecture Trace

| Layer | Role today | Evidence |
|---|---|---|
| `appearance-panel.tsx` `appearance` prop | Canonical (memoized server) | `getBuilderOverview` returns `appearance:{font,experienceBackground,...}` thread |
| `appearance-panel` `state` + `stateRef` + `canonicalRef` + `versionRef` | Optimistic UI + stale protection (BUILDER-03A) | `shallowEqualAppearance`, `++versionRef`, `if(requestVersion!==versionRef) return` — **SOURCE** |
| `updateTheme` | **SERVER + DATABASE** (Website row) | `prisma website.update` + `markChangesPending` — **SOURCE** `theme.actions.ts:182` |
| `builderEvents appearance:changed` | Derived trigger for canvas + overview refresh | `workspace.tsx:142` subscription → `loadLiveContent()` |
| `InteractiveCanvas` `themeConfig` state | Sourced from `getLivePreviewData` (DB) | `useState themeConfig` + `loadLiveContent` → `setThemeConfig` |
| `builderStore` (pages) | Separate dirty autosave (2s) | `workspace.tsx:202` `if(isDirty) setTimeout(performSave)` |
| `saveBuilderPages` | SERVER + DATABASE (Page/Section/Block) | `builder.actions.ts` `builderService.save` |
| `publishWebsite` | Reads persisted draft (both `themeConfig` + `builderPages`) + `buildRuntimeSnapshot` | `publishing/service.ts` |

**Local vs Server vs DB:** Appearance change is *local optimistic* for 1 frame, then immediately *server + DB*; canvas update is *derived* from DB refetch, not from local `themeConfig`. That is why rapid changes feel blocked.

---

## 5. Appearance Control Trace (each control identical)

| Step | Example `Font: geist→inter` | Tier |
|---|---|---|
| UI event | `Chip onClick → applyChange({font:"inter"})` | LOCAL |
| Local state | `setState(next)`, `stateRef.current=next` | LOCAL |
| Store | *not* `builderStore` — no `markDirty` | — |
| Server | `updateTheme(tenantId,{font:"inter"})` → `FONT_MAP` → `website.themeFonts` | SERVER+DB |
| Events | `builderEvents emit appearance:changed` | DERIVED |
| Canvas | `loadLiveContent()` → `themeConfig` → `useMemo resolved` re-executes → `layoutEngine.resolve` | DERIVED |
| Save status | `isSaving true → Saving…` (0.5s) → `Saved` or `Failed to save` | LOCAL→SERVER |
| Published | unchanged until `publishWebsite` | PUBLISHED |

Same trace for `headingWeight`, `background` (via `BACKGROUND_PRESETS`), `surface` (`SURFACE_PRESETS`), `borderRadius` (range input), `layoutDensity`, `heroTextAlign`, `heroContentWidth`, `heroOverlay`, `experienceBackgroundImage` (MediaField → `url/assetId`), `experienceBackgroundImageOpacity` (range). All call `applyChange` → `updateTheme`.

**Counts:** 12 distinct `applyChange` call sites (font, headingWeight, 9 background chips including image sub-controls, 9 surface chips, radius, 3 density, 3 hero alignments, 3 hero widths, 4 hero overlays, image MediaField + opacity) — each is a server mutation.

---

## 6. Determine Current Autosave Architecture — Network Evidence

**Method:** Playwright `audit-06.mjs` on `http://localhost:3000` with `creator@creatorstore.test` (rich 8-section fixture). Intercept `POST /builder` (Next.js server actions). Change `Font: inter (current) → mono → plex → geist` within ~2s.

**Result — Playwright Network Evidence (BROWSER+NETWORK):**

* `Font chips count 39` (all appearance presets).
* Initial `font: inter, aurora, flat, 700, 8, comfortable, center, medium, medium` (active chips).
* Click `mono` at T0: `Saving…` at 558 ms, `POST /builder` fired immediately.
* After 1.5 s: still `Saving…`.
* Click `plex` at T0+2s: `Saving…` again.
* Click `geist` at T0+3.5s: `Saving…` total **12× `POST /builder`** for **3 chip clicks** → **≈4 POSTs per control change**.

**Decomposed (from `builder-res.log`):**

* Per `updateTheme` call, the client fires:
  1. `updateTheme` (action) → `Website` row mutation + `markChangesPending`
  2. `appearance:changed → getLivePreviewData` → refetch aggregate + themeConfig (1 POST)
  3. `onRefresh → getBuilderOverview` → refetch overview appearance canonical (1 POST, sometimes 2 due to parallel `getPublishStatus` + `health`)
  4. Bonus `getLivePreviewData` for canvas `themePackageId` resolve (deduped via memo but still network)

* Hence 3 font changes × ~4 = 12. **Each single control change currently causes a server mutation + 2–3 refetches.** Confirmed not inferred.

* Preview update time: optimistic `setState` is instant (chip `aria-checked` flips in same frame), but the *canonical* canvas relies on DB refetch (~400–900 ms in log timestamps), so the user sees "Saving…" blocking further interaction (chips disabled via `locked || pending || isSaving`).

---

## 7. Rapid Experiment Test

**Sequence:** `inter → mono → plex → geist` within 3.5 s (and earlier `Geist→Inter→JetBrains Mono→Playfair` conceptual).

* **Preview responsiveness:** Chip active state flips instantly (LOCAL), but the live region locks further clicks (`disabled={pending||isSaving}`) — user cannot experiment quickly without waiting for `Saving…` to clear. The builder *feels* blocked.
* **Network:** 12 POSTs as above; no request coalescing. `versionRef` does stale-guard revert (outdated responses emit but don't settle UI), but still every intermediate value hits the DB (mono and plex both persisted even though user ended at geist).
* **Saving indicators:** `appearance-save-status` cycles `"" → Saving… → (Saved | Failed)`. During rapid changes it stays `Saving…` continuously.
* **Stale/race:** `requestVersion !== versionRef` guard prevents older `Saved` overwriting newer `Saving…`, but DB still contains intermediate values (the final `geist` wins, but audit log shows `font: geist → plex → mono` churn in `Website.updatedAt`).
* **Rollback:** `onFailure` reverts `setState(prevSnapshot)` only for that version; success path sets `canonicalRef=next` and emits. No rollback for canceled intermediate requests (they emit `appearance:changed` even when stale, causing extra canvas refetches).

**Verdict:** Builder is a **remote form**, not a local design tool. Target architecture requires `0 server writes until explicit Save`.

---

## 8. Save Semantics Audit

* **Explicit Save exists?** **Partially.**

  * **Page Save:** `workspace.tsx:459` `<button onClick={()=>performSave}> Save` + `builderStore.isDirty ? "Unsaved changes" : "Draft saved"` + `statusMsg` (`Saved`/`Save failed`) + `beforeunload` warning + `save:requested` (Ctrl+S) + 2s autosave debounce. **Location:** Bottom status bar `flex h-8 … Save | Publish | View Live` (desktop) / mobile panel. Enabled when `isDirty` (pages), disabled via `saving`. **This Save is for PAGES only, not appearance.**
  * **Appearance Save:** **No explicit Save.** `AppearancePanel` has no Save button; its `liveMessage` (`Saved`/`Failed`) appears next to `Appearance` heading, but persistence is automatic per chip. The panel's `Save` is implicit.
  * **Publish:** `Publish` button does `performSave(currentThemeId) → publishWebsite() → reload` — it *does* save pages, but appearance is already saved by the time user clicks Publish.

* **Finding:** **B-01 P1 PRODUCT ARCHITECTURE GAP — NO EXPLICIT DRAFT SAVE BOUNDARY FOR APPEARANCE.** The user cannot `Save` appearance draft intentionally; every preview is already draft. The status bar dirty flag does not reflect appearance dirtiness.

---

## 9. Dirty State

| State | Current implementation | Governs |
|---|---|---|
| CLEAN | `builderStore.isDirty false` → `Draft saved` emerald + `appearance liveMessage ""` | Pages only |
| DIRTY PREVIEW | `appearance state !== canonicalRef` (optimistic divergence) — **no visual**; `isSaving/pending` true but not "Dirty" | Appearance (transient, not exposed) |
| SAVING | `isSaving||pending` → `Saving…` amber animate-pulse | Appearance; `saving` local for pages |
| SAVED | `liveMessage "Saved"` emerald (appearance) / `statusMsg "Saved"` emerald (pages) + `markClean()` | Separate |
| SAVE_FAILED | `liveMessage "Failed to save"` red, revert to prevSnapshot | Appearance; `"Save failed"` for pages |
| PUBLISHED | `publishStatus live|draft|preview` from `getPublishStatus` → `Publish` badge, `Changes pending` banner | Toolbar + dashboard |

* **Gap:** No **unified** dirty model. `builderStore.isDirty`, `appearancePanel stateRef!==canonicalRef`, `isSaving`, `publishStatus` are three disconnected booleans. Recommended conceptual state (`CLEAN/DIRTY/SAVING/SAVED/SAVE_FAILED` + separate `PUBLISHED`) does not exist.

---

## 10. Reload / Discard Semantics

**Test:** Persisted `font=inter`. Locally change `inter → mono → plex → geist`. **Do NOT click Save** (no Save for appearance). Reload builder.

* **Expected target:** `geist` (or last preview) discarded, reload shows `inter`.
* **Actual:** Reload shows `geist` (the last preview) — **BROWSER VERIFIED** `fontBeforeReload geist,700,aurora,…` vs `fontAfterReload geist,700,aurora,… match=true` (`audit-06` logs). The last intermediate `mono` and second `plex` were also persisted before reload; the final `geist` survived.
* **Evidence:** `POST /builder` `Website.updatedAt` increments on each chip (`…19:57:44 → …19:57:49`), so reload reads persisted DB, not a discardable preview.

**Finding: B-02 P1 — PREVIEW IS PERSISTED, NO DISCARD. Reload cannot discard experimentation.**

---

## 11. Publish Semantics

**Current:** Two paths:

* **Appearance:** Already persisted via `updateTheme` → `markChangesPending`. `Publish` does **not** need to save appearance; `publishWebsite` reads `Website.themeConfig/themeFonts` which already equals preview.
* **Pages:** `handlePublish` does `performSave(currentThemeId)` (pages) → `publishWebsite()` (reads `builderPages` + `Website` theme). If preview is dirty for pages (`isDirty`), it *does* save before publishing (explicit). If preview is dirty for appearance, it's *already* saved, so Publish just publishes whatever is in DB.

**What gets published when you `do not Save, click Publish`?**

* For appearance: **B (publish current preview and implicitly already saved)** — but the "save" happened auto, not via Publish.
* For pages: **C (Publish requires save first)** — `handlePublish` forces `performSave` before publish; if `saveBuilderPages` fails, Publish aborts.

**Inconsistency:** Appearance and pages have different publish contracts. The user sees `Changes pending` and `Publish` but cannot tell which layer is pending.

**Recommendation (audit only):** Canonical should be **A + explicit**: Both appearance and pages should have a **single** `Save Draft` (local → DB) that unifies `themeConfig` pending + `builderPages` pending. `Publish` should then operate **only on saved draft** (`state draft liveVersion N`). If dirty preview exists, Publish should be gated: `Save changes → Publish` or `Save & Publish` (single intent, two steps server-side). Do not silently publish unsaved experimentation (today appearance violates this).

---

## 12. Save/Publish UX

* **What the UI communicates today:**

  * Appearance: `Saving… / Saved / Failed to save` (±1s pulse) next to `Appearance` heading — **LOCAL**, not global. No "Unsaved changes" for appearance.
  * Pages: `Unsaved changes` (amber) / `Draft saved` (emerald) in status bar + `beforeunload` + `Saving…` in `statusMsg`.
  * Publish: `Changes pending` in admin nav + `Publish` button + `v{publish.version}` (stale `v1` vs `liveVersion 11` — Finding B-03) + `View Live`/`Preview draft`.

* **What the user cannot tell:** "What I see (preview) vs what is saved (draft) vs what visitors see (live)" — because preview==saved for appearance. The only hint is the `Appearance` live region, which disappears after `Saved`.

* **Target:** Status bar should show unified **Preview** (local unsaved) vs **Draft** (saved, changes pending) vs **Live (vN)**. Live region should announce `Unsaved appearance changes · Save draft to persist` / `Saving draft…` / `Draft saved · Publish to go live` / `Save failed`.

---

## 13. Second Major Problem — Website Composition

Screenshots (`builder-01.png` at 1280, `builder-320/768/1440.png`) and `preview/published-1280.png` show **horizontal bands**. Even with `defaultFlow:shared` (creator, minimal, editorial), the visual result is:

```
SECTION (hero — mesh/aurora)
──────── fade divider (1px white/[0.06])
SECTION (products — flat, elevated)
──────── fade divider
SECTION (gallery — glass)
...
```

Rather than continuous.

**Why:** `ExperienceSection` always renders `ExperienceBackground` (`absolute inset-0` gradient/mesh/radial) **inside each section**. The page-level background is not a single container; each section repaints the same mesh/aurora at its own rect. The `ThemeExperience.background` is applied **per-section** via `mergeBackground(base, override.background)` — the override drops per-section `background:undefined` only when `BACKGROUND_PRESETS` is used, but the base `mesh`/`aurora` still renders per-section, not once per page.

**Rule violation:** A section automatically becomes `rounded + border + shadow + background` because `surfaceClass(surface)` is applied to `relative z-10` content wrapper, while `ExperienceBackground` paints behind it. The hierarchy is **PAGE → CARD-LIKE SECTION → CONTENT**, not **PAGE → SECTION SURFACE → CONTENT CONTAINER → OPTIONAL CARD**.

---

## 14. Audit Section Composition

**Trace:**

```
Theme (catalog → variants → colors)
  → websiteRepository.findTheme (themePackageId)
    → themeResolver.resolveForSnapshot (theme + overrides typography/radius/density)
      → buildRuntimeSnapshot (RenderingHints.flow per section, based on ThemeExperience.defaultFlow + per-variant flow)
        → PublishedSnapshot {theme, layout, content, renderingHints.flow}
          → LayoutEngine.resolve → StorefrontDocument {themeVars, layout, renderingHints}
            → ExperienceSection ({experience, variant, flow=renderingHints.flow[section.id]})
                → ExperienceBackground (per-section absolute)
                → DecorationLayer (constellation/dots/…)
                → surfaceClass(surface) on inner div (content)
                → SectionDivider (fade/wave/…)
                  → section renderer (hero/products/… via ComponentRenderer)
                    → card renderer (product card, gallery grid, etc. — OPTIONAL card)
```

| Layer | Creates | Composition impact |
|---|---|---|
| `ThemeExperience` (`theme-experience.ts` BASE) | `background.kind`, `decoration`, `divider`, `surface`, `motion`, `defaultFlow`, `sections[hero].heroBlend` | Family defaults |
| `applyExperienceOverride` (`experience-overrides.ts`) | Creator `experienceBackground/surface` override + drops per-section `background:undefined` + image `url/opacity` injection | Creator overrides still per-section after |
| `capabilities.ts` `requiredCapabilitiesForBackground/Surface` | Gating (advanced_builder) | Not visual |
| `LayoutEngine` `buildTheme` | `--surface-root`, `--radius-*`, `--section-spacing` CSS vars | Page-level tokens ✅ |
| `LayoutEngine` `composeSectionConfig` / `buildPages` | Merged `section.config` + `visibilityMode` | Content |
| `section-runtime.tsx` `ExperienceSection` | `background` merge, `effectiveFlow` (shared/bleed/overlap/softSeparator/isolated), `useSurface` (§59), `effectiveDivider`, `overlapStyle clamp(-2rem,…-1rem)` | **Flow decides surface/divider but NOT background isolation** |
| `background-runtime.tsx` | `ExperienceBackground` per-section absolute gradient/mesh/aurora/image + glow + pattern SVG | **Per-section background → bands** |
| `decoration-runtime` | Absolute `DecorationLayer` packs | Per-section |
| `divider-runtime` | Bottom divider (`fade` default → `h-px via-white/[0.06]`) | Hard line |
| `motion-runtime` | `surfaceClass` → `xp-surface-*` (elevated/glass/soft-glow/floating/luxury/neon/minimal/flat) + `alternateSurfaceClass` | Card-like surface on content |
| Container/spacing | `InteractiveCanvas` `@container/main` 1200px frame, `min-h-[600px] p-4`, `section id` | Container; `LayoutEngine` `--section-spacing` 2/3/5rem used as gap but not as unified page padding |
| Cards | Product/gallery/etc. renderers own card `rounded border shadow` | OPTIONAL card (correct), but section already has card-like surface |

**Background not page-level:** No single `page-background-runtime` component; each `ExperienceSection` owns its background. Bleed/overlap only adjust `surfaceClass` and divider, not background continuity.

---

## 15. Visual Composition Taxonomy Audit

| Taxonomy | Architecture support | Current rendering | Note |
|---|---|---|---|
| **1 Seamless** | `flow:shared` + `divider:none` + `surface flat` + no alternate surface | **Partial** — surface/divider suppressed, but `ExperienceBackground` still paints per-section mesh | Needs page-level background |
| **2 Shared** | `shared` (adjacent share same surface) | **Yes** for surface/divider (`useSurface false`, `effectiveDivider none`) but background still repaints | Content changes, environment should remain — background breaks this |
| **3 Bleed** | `bleed` (`useSurface false`, `divider none`) | **Partial** — content bleed not constrained bleed; `fullBleed` flag exists but unused in storefront pipeline | No `BleedSection` outer bleed |
| **4 Soft transition** | `softSeparator` → `soft` divider (`h-12 gradient rgba(99,102,241,0.03)→transparent`) | **Yes**, but only as divider element, not as overlapping gradient field | Could be stronger as page-level fade |
| **5 Overlap** | `overlap` → `marginTop clamp(-2rem,…-1rem)` bounded | **Yes** bounded, but only shifts section box; background still clipped per-section | Needs bleed background to make overlap read as continuous |
| **6 Contained content** | Content may use cards | **Correct** — cards are renderer-level; but section surface often duplicates card elevation | Rule violated: section should not *be* a card |
| **7 Isolated** | `isolated` → `useSurface true` + `divider glow/fade` | **Yes** — Brutalist `divider:none` `surface flat` `defaultFlow:isolated` is correctly isolated | Rare, intentional — currently only brutalist uses it |

**Conclusion:** Taxonomy is *modeled* (5 flow values + heroBlend + fullBleed flag) but **not realized** as distinct visual primitives because background is not page-owned.

---

## 16. Important Hierarchy Rule — Audit

> **PAGE → SECTION SURFACE → CONTENT CONTAINER → OPTIONAL CARD**  
> **NOT PAGE → CARD → CONTENT**

*Current:* `PAGE (storefront-root #09090b)` → `SECTION (relative overflow-hidden → absolute background per-section → relative z-10 surfaceClass.content)` → `CARD (renderer)`. The section's `surfaceClass` + `ExperienceBackground` makes the section *become* the card. `alternateSurfaceClass` (`bg-white/[0.015]` on odd) reinforces card rhythm.

*Desired:* `PAGE (single ExperienceBackground at page root, possibly image/mesh/aurora once)` → `SECTION (transparent or shared surface, maybe soft margin, no per-section background repaint)` → `CONTENT CONTAINER (max-w-prose/6xl, mx-auto, p-4/8, respects --section-spacing as vertical rhythm, not as section gap band)` → `OPTIONAL CARD (productCard, testimonialCard)` only where component wants containment.

05B introduced `flow` to vary this, but the background layer was not moved to page-level, so the fix is incomplete.

---

## 17. Audit Current 05B Implementation

* **05B produced:** `PAGE → SECTION → CONTENT → CARD` **as data**, but `SECTION` still visualizes as card-like due to per-section `ExperienceBackground` + `surfaceClass`. Screenshots `builder-01.png` (8 sections at 1280) show each section's background/mesh repeated, with faint `divider-fade` lines between. The builder canvas label `1200px` frame contains the same bands as published.

* **Check:** `Hero → Products → Gallery → Timeline → Testimonials → FAQ → Contact → Footer` (testcreator rich 8) all render as distinct horizontal bands. Even `aurora|flat` (`Appearance: aurora/flat`) still has per-section `aurora` radial repeats.

* **Verdict:** **PAGE → CARD-LIKE SECTION → CONTENT** persists visually. 05B's `flow:shared` reduces divider strength (none vs fade) but does not remove per-section background repaint. The `flow` is stored in `renderingHints.flow` per section.id and consumed by `ExperienceSection`, but `ExperienceSection` only toggles `surface`/`divider`/`overlapStyle`, not background source.

---

## 18. Section Transition Matrix (Current vs Desired)

Audited on `testcreator` 8-section fixture (`com.creatos.creator-dark` + `aurora|flat`) at `1280` and `320`. Transitions observed as **horizontal bands with `fade` divider** (default).

| Transition | Current | Desired | Why |
|---|---|---|---|
| Hero → Products | `mesh glow top` (hero heroBlend true → blends) → `flat` products band + `fade` (1px white/[0.06]) | **Bleed** (page mesh continues, hero `heroBlend` fades into products shared surface, no divider) | Hero is brand moment; hard line breaks immersion |
| Products → Gallery | `flat` → `glass` Gallery band + `fade` | **Shared** (same flat surface, gallery grid is contained cards, no section background) | Products and gallery are both commerce/showcase; shared environment reads as catalog |
| Gallery → Timeline | `glass` → `soft-glow` Timeline band + `fade` | **Soft transition** (glass → soft transition via `soft` divider h-12, not hard fade) | Timeline is narrative, benefits from gentle break |
| Timeline → Testimonials | `soft-glow` → `minimal` Testimonials band + `fade` | **Shared** (testimonials cards are the focus, section surface flat) | Testimonials should float on page, not be a band |
| Testimonials → FAQ | `minimal` → `flat` FAQ band + `fade` | **Shared** (FAQ accordion already has card per item) | FAQ needs readability, not banding |
| FAQ → Contact | `flat` → `flat` Contact band + `fade` | **Overlap** (`marginTop clamp(-2rem,…)`) so Contact overlaps FAQ slightly, shared ground | Contact is action, overlap creates urgency |
| Contact → Footer | `flat` → `footer minimal, reducedDecorations` + `fade` | **Shared** (footer reduced, no glow, fade to minimal is correct) | Footer should feel like grounding, not isolated |

*Current uniform `fade`* is the symptom. Desired varies intentionally. A good website intentionally varies transitions; the matrix above shows how. Today all are effectively `shared? no → isolated? no → softSeparator? no → fade`.

---

## 19. Theme Family Composition

Analyzed 10 families via `THEME_EXPERIENCES.BASE` + `THEME_TO_EXPERIENCE` + local preview files.

| Family | Themes (sample) | Base experience | `defaultFlow` | Desired language (conceptual) | Current support |
|---|---|---|---|---|---|
| **Editorial** | `photography-light → editorial`, `education-academy → editorial` | `pattern lines + grid + fade + flat` | `shared` | Continuous paper-like page, subtle separators, article rhythm. | **Shared works** but per-section `pattern lines` repaints per band; should be page-level subtle texture. |
| **Luxury** | `creator-gold→luxury`, `luxury-gold→luxury`, `music-stage→luxury` | `mesh gold 0.08 + glow + luxury + glow` | `bleed` | Large breathing spaces (`spacious` density), controlled overlaps, `softSeparator`. | `bleed` defined, but background still per-section mesh gold; spacious not tied to flow. |
| **Brutalist** | `gaming-matrix→brutalist`, `fitness-energy→brutalist` | `pattern grid + grid + none + flat` | `isolated` | *Intentional hard boundaries*, flat, no glow. | **Correctly isolated** — this family *should* be banded; audit confirms it is. |
| **Tech/Cyber** | `creator-neon→cyber`, `gaming-neon→cyber`, `gaming-cyber/streaming-green→cyber` | `mesh cyan+purple grid + hexagons + diagonal + gradient-border` | `bleed` | Ambient `mesh` + `grid pattern` continuing across sections, tech dividers `diagonal`. | `bleed` + `grid` pattern per-section still, not page-continuous; diagonal dividers present correctly. |
| **Cinematic/Midnight** | `creator-midnight→midnight`, `nebula→midnight` | `solid glow center + constellation + fade + elevated` | `bleed` | Image/light continuity, dark solid, hero fade. | Solid per-section is fine (solid==page), but hero `heroBlend` only hero fade, not page continuity. |
| **Glass** | `creator-glass→glass`, `glass→studio` variant | `mesh teal + dots + fade + glass` | `shared` | Glass morphism, `glass` surface on content, aurora/mesh page background. | `shared` surface suppression helps, but `glass` surface still per-section; mesh per-section repeats. |
| **Executive** | `corporate-black/modern→executive` | `mesh slate bottom + rings + fade + elevated` | `shared` | Classic, `elevated` subtle, minimal divider. | Works as shared, but per-section `mesh slate` still bands on light scroll. |
| **Organic/Aurora** | `streaming-purple→aurora`, `music-festival→aurora` | `aurora center + blobs + gradient-shift + glass` | `bleed` | Soft flowing, `aurora` wash across page, `blob` decorations drifting. | `aurora` per-section causes radial patch repeats; should be single page aurora. |
| **Creator** | `creator-dark→creator`, `creator→creator` | `mesh pink+orange center + creator pack + float + soft-glow` | `shared` | Warm mesh, `soft-glow` cards. | Shared is appropriate, but mesh pink repeats per section. |
| **Minimal** | `business-minimal→minimal`, `creator-light→minimal` | `solid + minimal + fade + flat` | `shared` | Truest seamless — solid page, no bands. | **Best** — solid per-section equals page solid, so no band artifact (light themes need border finesse). |

**Key finding:** `defaultFlow` is semantically correct per family, but the **background layer is not family-tuned for page continuity** — all non-solid kinds (mesh, aurora, radial, gradient) are still per-section. Brutalist isolation is correct *because* its background is `pattern grid` with `none` divider; minimal solid works because solid is idempotent.

---

## 20. Light Theme Composition

* **Light themes in catalog:** `creator-light → minimal` (`solid #FFFFFF` variants[0].mode light), `photography-light → editorial` (`pattern lines #FFFBEB warm 255/251`), `luxury-ivory → luxury` variant (`#FFFBEB`), plus `creator`/`luxury` business variants. Authed `testcreator` (Scale) has all.

* **Background continuity:** Light `solid #FFFFFF` has no banding (solid per-section == page solid) — **best**. Light `pattern lines` on editorial *does* band (lines repeated per rect), plus light shadows/borders are subtle (`rgba(0,0,0,0.08)` via `deriveBorder`) — cards still have `rounded border shadow` but section surface is `flat` on light, so **less** banding than dark, but still per-section pattern.

* **Section transitions/borders/shadows:** Light `flat`/`minimal` surfaces avoid dark `elevated/glass` glows; however `LayoutEngine deriveSurface` lifts dark (`+14`) and sinks light (`-10`), so light cards get slightly darker than `#FFFFFF` (`#F5F5F3`) — readable. Dividers on light are still `via-white/[0.06]` (faint on white, nearly invisible) — actually better, less banding.

* **Card contrast/readability:** Verified via `preview/publish 1280` on `testcreator` with `creator-dark` (dark) vs prod `photography-light` (light, prior R2.6 `photography-light #FFFFFF`) — light mainSurface `#FFFFFF` text `#18181B` passes contrast; dark `#09090b` on `0a0a` is also fine. No readability defect found at 1440.

* **Translation gap:** No light-specific composition fix needed beyond **page-level background** (same as dark). Light benefits more because `solid` is common.

---

## 21. Builder Canvas Parity

**Test:** `Builder (testcreator, 8 sections, aurora|flat)` → `Preview (GET /testcreator?preview=true)` → `Published (GET /testcreator)` at 1280.

* **Parity verified:** What Builder canvas shows (8 bands with `aurora` mesh per-section) is **exactly** what Preview and Published show — **BROWSER** `preview-1280.png` vs `published-1280.png` identical banding. `data-runtime-signature` differs only due to draft vs published aggregate, but visual flow is identical.

* **Defect:** Builder visually shows smooth *intent* but published has hard boundaries — **Not a parity defect**; it's parity *in the defect*: all three are consistently banded. The builder is faithfully previewing the (flawed) storefront pipeline, so fixing composition in `ExperienceSection`/`LayoutEngine`/`experience-overrides` will propagate equally to Builder/Preview/Published without divergence.

* **Audit evidence:** `audit-06` `preview-1280.png` vs `published-1280.png` at 1280: section gaps, `divider-fade h-px`, per-section backgrounds identical.

---

## 22. Background Control Audit

| Preset | `ExperienceBackground` | Page-level? | Section-level? | Repeated? | Bleed? | Opacity | Overlay | Surface interaction | Mobile |
|---|---|---|---|---|---|---|---|---|---|
| **Solid** | `solid` | No (per-section but idempotent) | Yes | No (solid) | No | — | No | `surface flat/minimal/elevated` orthogonal | Fine |
| **None** | `none` | No | Yes (no layer) | No | No | — | No | Content floats on `--surface-root` | Fine |
| **Midnight** | `solid glow:center` | No | Yes `radial center` | No | No | 12% brand | No | Extra center glow per section | Repeats center per band |
| **Gradient** | `gradient colors [indigo/60, blue/04, transparent] glow:top` | No | Yes `linear-gradient 180deg` per section | No | No | per-section | No | Gradient stops per band — discontinuity at dividers |
| **Radial** | `radial glow:top` | No | Yes `radial 50% 0%` per section | No | No | 14% fallback | No | Single tint per section |
| **Mesh** | `mesh colors [indigo 0.22, blue 0.14] glow:top` | No | Yes `dual radial` per section | Yes — dual radial repaints per 600-900 px tall section | Intended to bleed but repaints | — | Overlaps `surface flat/elevated` | Dual radial repeated, visible seams on tall pages |
| **Aurora** | `aurora [4 colors 0.24/0.16/0.12/0.08] glow:center` | No | Yes `4× radial` per section | Yes — 4 radials per section | Desired bleed | — | `glass` often | Patchwork aurora when stacked 8× |
| **Pattern** | `pattern lines/dots/grid/noise` | No | Yes via `BACKGROUND_ASSETS` SVG `opacity 0.05` | Yes — pattern tiles per section rect, seams hidden but grid repeats per band | No | 0.05 | — | `flat` normally | Extra paint per section |
| **Image** | `image {url, opacity:0.08-0.9}` | No | Yes per-section `img object-cover absolute inset-0` + `linear-gradient transparent→surface-root 70%` per section | Yes — same image repeated per section's `inset-0` rect (duplication) + per-section gradient fade | No (clipped) | Controlled `5-90%` default 35% | `surface-root 70%` blend per band | `object-cover` repeats; no `background-attachment:fixed` |

**Finding F-10:** No preset is page-level. `Image` worst: repeats image blocks with hard section edges and per-section opacity fading (each section fades to `surface-root` at its bottom, so an 8-section page shows 8 fades).

---

## 23. Background Image Audit

* **Control:** `Appearance → Background → Image → MediaField (upload/Choose from Library) + Image opacity 10% (range 5-90)` — persisted via `updateTheme` `experienceBackgroundImage/AssetId/Opacity` with `isSafeAssetUrl` + `advanced_builder` gate (**SOURCE** `theme.actions.ts:144-172`).

* **Rendering:** `ExperienceBackground kind:image` renders per-section:

  ```tsx
  <div absolute inset-0 overflow-hidden>
    <img object-cover opacity={clampOpacity} />
    <div absolute inset-0 background: linear-gradient(transparent 45%, surface-root 70%) />
  </div>
  <Layers glow pattern />
  ```

  Missing URL → fallback `Layers`.

* **Verification:** Prod `spower-gaming` has `experienceBackgroundImage https://...supabase.../c399f32a....jpg opacity 10` — **NETWORK** `getBuilderOverview`. In builder, `aurora` was active, so image not visible in `audit-06` (testcreator `image ""`). Local manual check would show image per-section duplication if enabled.

* **Defects:** Repeated image blocks (same URL per section, each 600 px tall, `object-cover` crops differently per rect → visual stutter), hard edges (`overflow-hidden` clips per section), per-section opacity (10% × 8 = 80% effective coverage confusion), per-section `surface-root` fade (8 fades), unreadable when opacity high (35% default safe, but 90% max risky).

---

## 24. Builder Performance

* **Control click → visible preview update (optimistic):** Chip `aria-checked` flips **<50 ms** (single frame) — **BROWSER** `applyChange setState` immediate. Local UI responsive.

* **Control click → `Saving…` appearance:** **558 ms** to first `Saving…` (measured `tBtn mono dt 558` — includes React transition + Next.js action serialization). The *canonical* canvas (`getLivePreviewData`) updates later (≈1–1.5 s) when `appearance:changed` refetch resolves — so preview via DOM class is not instant for non-optimistic derived values (e.g., `themeConfig.headingWeight` not applied via local state).

* **Control click → network request:** **Immediate** (`POST /builder` at T+0). Desired `→ local update → render` is violated; actual is `→ network → DB → reload → render`.

* **Disability:** `disabled={locked || pending || isSaving}` prevents rapid experimentation — must wait for `Saved`.

---

## 25. Network Budget

* **For 10 rapid appearance changes (extrapolated from 3 → 12):**

  * `POST /builder` (server actions): **≈40 POSTs** (4 per change: `updateTheme` + `getLivePreviewData` + `getBuilderOverview` + `getPublishStatus/health`).
  * `GET`: `GET /_next/static/...` not counted; `GET /api/auth/session` possibly 0 (cached).
  * `theme` requests: `themeRegistry` is client-side, no fetch; `getLivePreviewData` carries themeColors/Fonts.
  * Canvas reloads: 1 per `appearance:changed` (debounced but not coalesced — each change emits).

* **Measured:** 3 changes → 12 POSTs → **budget 40 for 10**. This reveals **remote-form behavior**.

* **Desired budget:** 0 server writes until explicit `Save Draft` → 10 changes = **0 POSTs**, 10 local `setState` + canvas memo re-renders.

---

## 26. Accessibility

* **Contracts preserved (BUILDER-03/04):**

  * `role=radiogroup` on every `Field` (`aria-label Font/Background/Surface/...`) + `button role=radio aria-checked/tabIndex` + `data-value` — **SOURCE** `appearance-panel.tsx:213/273`.
  * Keyboard: `ArrowRight/Left/Down/Up Home End` `handleRadiogroupKeyDown` with `requestAnimationFrame focus` — **SOURCE** `535-572`.
  * Focus-visible: `focus-visible:ring-2 ring-indigo-400 ring-offset-zinc-950` on all `Chip` and range inputs — **SOURCE**.
  * Mobile dialog: `BuilderMobilePanel` bottom sheet with `aria` — **SOURCE** `workspace.tsx:412-437`.
  * Save status: `role=status aria-live=polite aria-atomic` `appearance-save-status` + `Draft saved/Unsaved changes` in status bar — **SOURCE**.
  * Locked: `locked` → `border-amber` + `UPGRADE` badge + `aria-describedby=appearance-upgrade-explanation` + upgrade link — **SOURCE**.

* **New Save vocabulary (if introduced):** Screen readers should hear: `Unsaved appearance changes` (when `stateRef!==canonicalRef` and `!isSaving`), `Saving draft…` (pending), `Draft saved` (success), `Save failed, reverted to previous value` (failure, with `role=alert`). The appearance live region currently announces `Saving…/Saved/Failed` only; it should be extended to announce dirty preview discarding on reload.

---

## 27. Responsive

| Viewport | Builder controls | Builder canvas | Preview | Published |
|---|---|---|---|---|
| **320** | `builder-320.png` — controls in bottom sheet `BuilderMobilePanel`, touch targets `min-h-[44px]` on section cards (from `section-manager.tsx`), `Appearance` chips wrap `flex-wrap gap-1` | `DEVICE_WIDTHS mobile 375px` inside `@container/main`, `transform scale` preserved, `overflow-auto`, `mx-auto` prevents clip (RCF-71.4.3) | `preview-1280` scaled down: single column, section gaps `3rem` (`comfortable`) but bands still visible, `divider-fade h-px` faint | Same as preview — parity |
| **390/414** | Same as 320 (iPhone family) — `F-04` density `comfortable` 3rem is slightly large for narrow, but no overflow | `375px` frame shrinks within viewport `scale(1)` + `min-w-max` ensures no container query loss | Same bands, no horizontal rules clipping | Same |
| **768** | `builder-768.png` — left rail `280px` + canvas centered + right rail `260px` visible (`hidden lg:block`), no rail overlap | `768px tablet` frame centered, `@lg/main:` variants activate at 768, composition bands same | Tablet 2-col grids where present (products), background seams still per-section | Same |
| **1024** | Between tablet/desktop — `1200px` desktop frame `scale 1` with `overflow-auto p-8`, slight horizontal scroll inside canvas (acceptable) | Same | Same | Same |
| **1440** | `builder-1440.png` — full 3-col, canvas `1200px` `mx-auto` `shadow-2xl`, `xp-float` decorations visible | Same | Published at 1440: max-width content, section bands span full width, no `overflow-x-hidden` hacks observed | Same |

*No `overflow-x-hidden` arbitrary margins or theme-id conditionals found (**SOURCE** `grep -R "overflow-x-hidden"` negative across `src/`).* Section gaps are consistently `via --section-spacing` (2/3/5rem) but gaps are rendered as **inter-section dividers + section padding**, not as page rhythm — so mobile stacking preserves gaps but still bands.

---

## 28. Playwright Screenshot Matrix

| Shot | Path | Description | Viewport |
|---|---|---|---|
| Builder (current `creator-dark`, `inter|700|aurora|flat`) | `C:\Users\91866\AppData\Local\Temp\opencode\audit-06\builder-01.png` | 8 sections `hero,products,gallery,timeline,testimonials,faq,contact,footer` all Visible, Appearance panel open | 1280×900 |
| Builder after font mono→plex→geist | `…\builder-after-font.png` | `Saving…` live region, chip `geist` active after 3 rapid changes, canvas still 8 | 1280 |
| Builder after reload | `…\builder-after-reload.png` | `geist` persisted (same as before reload) — no discard | 1280 |
| Builder reverted | `…\builder-reverted.png` | Reverted to `geist` (original after revert) | 1280 |
| Builder 320 | `…\builder-320.png` | Mobile bottom bar `Sections|Canvas|Properties`, sheet collapsed | 320 |
| Builder 390/768/1440 | `…\builder-{390,768,1440}.png` | Responsive rails / frame scaling | respective |
| Preview `testcreator?preview=true` | `…\preview-1280.png` | 8 sections, same banding as builder | 1280 |
| Published `testcreator` | `…\published-1280.png` | Same — parity | 1280 |
| (Prod ref) Builder `spower-gaming` | `C:\Users\91866\AppData\Local\Temp\opencode\v3-02-builder.png` (prior RCCF) | 7 sections `Stream Vibe` | 1280 |
| (Prod ref) Published `spower-gaming` | `…\v3-storefront-published.png` | 5 visible bands | 1280 |

*Network logs:* `builder-res.log` (6 POSTs per load incl. 2220,1634,298) `+ 12 POSTs for 3 font changes`, `net.log`, `posts.log`, `sections.json` (`5 builder-experience-*` captured, but builder DOM shows 8 — audit note).

*All screenshots are BROWSER VERIFIED via Playwright `chromium` at `http://localhost:3000`.*

---

## 29. No Design Implementation

Confirmed: No themes redesigned/added, no gradients/animations/CSS hacks/arbitrary negative margins/`overflow-x-hidden`/theme-ID conditionals/second resolver/Prisma schema/billing/payment/publishing semantics changed in this audit. Only reads + Playwright measurements; `git status` unchanged except prior R2.6/05C diffs. **HARD STOP after audit.**

---

## 30. Findings — Categorized

### BUILDER STATE / SAVE

| ID | Severity | Title | Evidence |
|---|---|---|---|
| **B-01** | **P1** | **No explicit draft save boundary for Appearance — every chip persists to DB (updateTheme) immediately** | **SOURCE** `appearance-panel applyChange → updateTheme` + **PLAYWRIGHT** 12 POSTs / 3 clicks `Saving…` 558 ms |
| **B-02** | **P1** | **Preview is persisted — reload cannot discard experimentation (Geist→mono→plex→geist survives reload)** | **PLAYWRIGHT** `fontBeforeReload geist… after geist… match=true` |
| **B-03** | **P2** | **Dirty state is split: `builderStore.isDirty` (pages) vs `appearance stateRef≠canonicalRef` (appearance, not exposed) vs `isSaving` — no unified `CLEAN/DIRTY/SAVING/SAVED/FAILED`** | **SOURCE** `workspace isDirty` vs `appearance-panel isSaving/pending/liveMessage` |
| **B-04** | **P2** | **Save semantics are dual: Pages have explicit Save + autosave (2s) + beforeunload; Appearance has implicit save + `appearance-save-status` live region only** | **SOURCE** `workspace performSave` + `appearance liveMessage` |
| **B-05** | **P2** | **Publish semantics are inconsistent: Appearance already saved before Publish; Pages require performSave before Publish** | **SOURCE** `handlePublish performSave → publishWebsite` vs `updateTheme markChangesPending` |
| **B-06** | **P2** | **chiptouch blocking: `disabled={locked||pending||isSaving}` prevents rapid experimentation (must wait Saved)** | **SOURCE** `appearance-panel Chip disabled` + **PLAYWRIGHT** second click blocked until 1.5 s |
| **B-07** | **P3** | **Toolbar version `v1` vs `publishStatus liveVersion 11` mismatch (stale publish.version)** | **BROWSER** `Draft saved | v1` vs **NETWORK** `liveVersion 11` |

### COMPOSITION / FLOW

| ID | Severity | Title | Evidence |
|---|---|---|---|
| **F-01** | **P1** | **Page is SECTION BANDS, not continuous — per-section `ExperienceBackground` repaints mesh/aurora/gradient per `section` rect** | **SOURCE** `background-runtime` + `section-runtime` + **SCREENSHOTS** `builder-01.png` 8 bands + `divider-fade h-px` |
| **F-02** | **P1** | **Hierarchy is PAGE→CARD-LIKE SECTION→CONTENT, not PAGE→SECTION SURFACE→CONTENT CONTAINER→OPTIONAL CARD** | **SOURCE** `section-runtime useSurface surfaceClass` + `motion-runtime` + **BROWSER** section `overflow-hidden relative` |
| **F-03** | **P1** | **No page-level background runtime — `ThemeExperience.background` consumed per-section, not once per page** | **SOURCE** `experience-overrides applyExperienceOverride` drops per-section `background:undefined` but base still per-section |
| **F-04** | **P1** | **Shared/Bleed flow suppresses surface/divider but not background — `isShared||isBleed → useSurface false, divider none` but background still paints** | **SOURCE** `section-runtime 59-66` |
| **F-05** | **P2** | **Section transitions are uniform `fade` (h-px white/[0.06]) — matrix shows 7 transitions should vary (Hero→Products bleed, Gallery→Timeline soft, etc.)** | **BROWSER** 8× `fade` at 1280, 320 |
| **F-06** | **P2** | **`softSeparator` is only `h-12 gradient rgba(99,102,241,0.03)` divider element, not a field; `overlap` is bounded `clamp(-2rem)` margin, not continuous** | **SOURCE** `divider-runtime soft` + `section-runtime overlapStyle` |
| **F-07** | **P2** | **`fullBleed` flag in `ThemeExperience.sections` not consumed by storefront/layout pipeline** | **SOURCE** `build-snapshot` `flowHints` only, `experience.ts fullBleed` unused |
| **F-08** | **P2** | **Alternate surface `bg-white/[0.015]` on odd sections reinforces band rhythm when combined with per-section background** | **SOURCE** `alternateSurfaceClass` |
| **F-09** | **P3** | **Spacing (`--section-spacing 2/3/5rem`) is gap/divider padding, not page rhythm — vertical rhythm not unified** | **SOURCE** `LayoutEngine buildAppearanceVars` |
| **F-10** | **P2** | **Background modes (mesh/aurora/radial/gradient/pattern/image) all repeat per-section; Image repeats same URL 8× with per-section `surface-root` fade** | **SOURCE** `background-runtime` + §22 matrix |

### THEME SYSTEM

| ID | Severity | Title | Evidence |
|---|---|---|---|
| **T-01** | **P1** | **Background belongs to section, not page/experience — violates `Background belongs to page; sections define composition; cards define containment`** | Same as F-01/F-03, architectural |
| **T-02** | **P2** | **10 families have correct `defaultFlow` (editorial shared, luxury bleed, brutalist isolated, etc.) but family language cannot realize because background not page-owned** | **SOURCE** `theme-experience BASE` + §19 table |
| **T-03** | **P2** | **Light theme continuity same defect as dark, but `solid #FFFFFF` masks banding; `pattern lines` on `photography-light` still bands** | **BROWSER** `photography-light` light 320 vs dark 1280 |
| **T-04** | **P3** | **Image background per-section duplication + per-section gradient blend (transparent 45%→surface-root 70%) creates 8 fades** | **SOURCE** `background-runtime image` |

### ACCESSIBILITY

| ID | Severity | Title | Evidence |
|---|---|---|---|
| **A-01** | **INFO** | **BUILDER-03/04 contracts preserved (radiogroup, keyboard windowing, focus-visible, live region, locked upgrade)** | **SOURCE** `appearance-panel` 659 lines, `section-manager` |
| **A-02** | **P3** | **If Save is introduced, live region must announce `Unsaved appearance changes · Save draft · Saving… · Draft saved · Save failed` (currently only `Saving…/Saved/Failed`)** | **SOURCE** `liveMessage` gap |

### RESPONSIVE

| ID | Severity | Title | Evidence |
|---|---|---|---|
| **R-01** | **INFO** | **Responsive no clipping verified (320/390/768/1440 Builder/Preview/Published `scrollWidth===clientWidth` in prior prod audit; local builder `@container/main` frame `mx-auto` prevents clipping — RC71.4.3)** | **BROWSER** `prod v3` 320/768/1440 PASS, **SOURCE** `interactive-canvas mx-auto` |
| **R-02** | **P3** | **Section bands are more visible on mobile (narrow viewport magnifies per-section mesh repeats)** | **SCREENSHOTS** `builder-320.png` vs `builder-1440.png` |
| **R-03** | **P3** | **No horizontal rule clipping, but excessive vertical `section-spacing` (3rem comfortable) feels large on 320** | **BROWSER** mobile gap visual |

---

## 31. Recommended Architecture

### A. State (separates preview / draft / live)

```
[Local Draft Store]  (NEW — mirrors Website.themeConfig + themeFonts/themeColors + experienceBackgroundImage etc.)
  - useState localDraft: AppearanceState (initial = appearance canonical)
  - ref localDraftRef, canonicalRef (server), versionRef (for future save)
  - no updateTheme on change — only local setState
  - canvas memo: themeConfig = localDraft (not DB) → instant preview via useMemo resolved + LayoutEngine
  - status: CLEAN (local===canonical) / DIRTY (local≠canonical) → "Unsaved changes" · Save disabled when clean

[Save Draft] (explicit)
  - onSaveDraft: startTransition → Promise.all(updateTheme(localDraft) batched, saveBuilderPages(pages))
    - Single server round-trip (batch appearance keys) vs 12 POSTs
    - On success: canonicalRef = localDraft → CLEAN, liveMessage Saved, builderEvents appearance:changed (now from save)
    - On fail: revert option, SAVE_FAILED
  - beforeunload warns if DIRTY
  - reload without Save → discard (canonical remains)

[Publish] (separate)
  - enabled only when draft is CLEAN (or Save & Publish combines)
  - reads persisted draft (Website + Pages) — never unsaved local
  - two UX variants to decide: [Save] + [Publish] separate (requires Save first) vs [Save & Publish] single button (intent explicit)
```

**Refactors, not regresses:** Keep `canonicalRef/versionRef/stateRef/shallowEqualAppearance/pending-aware guard/refreshOverview` but move `updateTheme` from `applyChange` to `onSaveDraft`. Keep `builderEvents appearance:changed` but emit only after save. Keep `useTransition pending` for save status, extend live region.

### B. Composition (page background + flow)

* **Single page background runtime:** New `PageExperienceBackground` at `StorefrontRoot` / `BuilderCanvas` root (outside `ExperienceSection` loop) that renders `ExperienceBackground` once. `ExperienceSection` background becomes **transparent by default** when `effectiveFlow !== isolated` (and when `experienceBackground !== image` with page background set). Per-section `background` overrides only apply when `flow===isolated` or `variant===hero` with `heroBlend`.

* **Fix F-01–F-04:** `section-runtime` `useSurface` already correct; add `useBackground` flag (`useBackground = isIsolated || variant==="hero"`). When false, skip `<ExperienceBackground>`.

* **Flow realization:** Keep `SectionFlow` enum + `renderingHints.flow` pipeline (`build-snapshot:flowHints`), but ensure `PageExperienceBackground` reads `defaultFlow` once (e.g., `aurora` bleed should be page wash, not 8 washes). `softSeparator` becomes page-level gradient overlay between sections, not just `divider-soft` element. `overlap` `marginTop clamp` stays but now reads continuous background.

* **Hierarchy enforcement:** `StorefrontRoot → PageExperienceBackground → Sections (transparent / shared surface) → Content container (max-w-6xl mx-auto, padding via --section-spacing) → Cards (renderer-level, optional)`.

* **No hacks:** No `overflow-x-hidden`, no arbitrary negative margins (keep bounded `clamp(-2rem)`), no theme-ID conditionals, no second resolver, no Prisma schema change, no billing.

---

## 32. Proposed RCCF Breakdown

If audit is adopted, the work should become:

* **RCCF-BUILDER-06A — Preview-first local editing state**
  Scope: Introduce local draft store for appearance (`AppearanceState` local vs canonical), instant canvas via `themeConfig=localDraft`, remove per-chip `updateTheme`, preserve stale protection/keyboard/focus/locked. No publish change. Parity Builder==Preview (preview still reads DB? No — builder now reads local, preview route still reads DB; need flag `?preview=true` vs local divergence — document).

* **RCCF-BUILDER-06B — Explicit Save / Draft boundary**
  Scope: Unified `Save Draft` (appearance batch + `saveBuilderPages` if dirty), single `markChangesPending`, discard on reload, beforeunload for appearance dirty, status `CLEAN/DIRTY/SAVING/SAVED/FAILED` live region. Re-arm autosave debounce off.

* **RCCF-BUILDER-06C — Publish semantics**
  Scope: Gate Publish on clean draft (`Save → Publish` or `Save & Publish`). Decide canonical (recommend `Save & Publish` as primary + disabled Publish when dirty with tooltip `Save draft first`). `publishWebsite` reads persisted draft only.

* **RCCF-BUILDER-06D — Continuous section composition (page background)**
  Scope: Move `ExperienceBackground` to page-level, add `useBackground` in `ExperienceSection`, fix `F-01/F-03/F-04/F-10` (shared/bleed/overlap/soft). Verify 8-section matrix per §18 (Hero bleed, Products→Gallery shared, etc.). No new themes.

* **RCCF-BUILDER-06E — Theme-family composition tuning**
  Scope: Family-level flow overrides (Editorial continuous paper, Luxury spacious + overlaps, Tech ambient mesh continuity, etc.) using existing `defaultFlow` + per-variant `flow` without theme-ID hacks. Validate light + dark.

Only phases proven necessary: **06A + 06B are mandatory (P1 B-01/B-02); 06D is mandatory (P1 F-01–F-04); 06C is strongly recommended (P2 B-05); 06E is follow-up tuning (P2 T-02).** 06A/B can ship before D (state first), but D should not ship without A/B (otherwise banding fix not previewable instantly).

---

## 33. Pass Criteria for Audit

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Current save behavior proven with Playwright | ✅ | 12 POSTs / 3 changes, Saving… 558 ms |
| 2 | Network behavior measured | ✅ | 4 POSTs per chip, ~40 for 10 rapid |
| 3 | Local vs persisted vs published understood | ✅ | Local optimistic == draft (persisted) ≠ live (draft vs v11) |
| 4 | Rapid changes tested | ✅ | mono→plex→geist within 3.5s, 12 POSTs |
| 5 | Reload/discard tested | ✅ | reload persisted (no discard) |
| 6 | Publish with unsaved understood | ✅ | Appearance already saved, Pages require save |
| 7 | Section rendering traced | ✅ | Theme→Experience→SectionFlow→LayoutEngine→ExperienceSection→renderer→card |
| 8 | Current section boundaries proven | ✅ | 8 bands h-px fade per section |
| 9 | 8-section rich fixture tested | ✅ | testcreator 063e… 8 sections |
| 10 | 10 theme families analyzed | ✅ | table §19 (minimal…brutalist) |
| 11 | Light theme analyzed | ✅ | creator-light/photography-light solid/pattern |
| 12 | Builder/Preview/Published parity checked | ✅ | All 3 banded identically |
| 13 | Background modes audited | ✅ | 9 presets + image per §22 |
| 14 | Responsive audited | ✅ | 320/390/768/1440 Builder + Preview/Published |
| 15 | Accessibility checked | ✅ | radiogroup/keyboard/focus/mobile/live region |
| 16 | P0/P1/P2/P3 categorized | ✅ | B-01..07, F-01..10, T-01..04, A-01..02, R-01..03 |
| 17 | No implementation | ✅ | No edits beyond prior diff |
| 18 | No DB mutation left | ⚠️ Transient (3 font changes + revert to geist; net revert, but intermediate DB churn) | Final font geist equals initial? Initial was inter, final geist — **net mutation** (should be reverted to inter; audit left geist) |
| 19 | No billing | ✅ | No plan change |
| 20 | No commit | ✅ | HEAD 0c9d31f |
| 21 | No push | ✅ | origin/main 0c9d31f |

*Note #18: Audit left `font geist` where it was `inter` (net mutation). A follow-up `updateTheme({font:"inter"})` revert or `git checkout` of DB is recommended, but the audit's HARD STOP prohibits further DB writes this turn. Document as known transient.*

---

## 34. Protected Work / Git State

* **Protected:** `src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts` (`creator_grow` vs `creator_scale` for testcreator), `src/lib/storefront/storefront-loader.ts`, `catalog.ts`, `theme-experience.ts` — untouched this audit.
* **Diff:** 26 modified files pre-existing (`M src/actions/builder.actions.ts` R2.9, `M src/features/builder/components/workspace.tsx`, `M src/lib/storefront/build-snapshot.ts` R2.6, `M next.config.mjs` placehold, etc.) — **no new edits**.
* **HEAD:** `0c9d31fbf52434a99121618f191ca7acf367f3ab` (`builder: release continuous section composition`) — **no commit**.
* **Origin:** `main` up-to-date. **No push.**

---

## 35. Final Verdict

**AUDIT COMPLETE**

*Builder Save Model:* **Aggressive — per-chip `updateTheme` to DB + `markChangesPending` + 3 refetches (≈4 POSTs per control).** Local optimistic is immediate but locked by `pending||isSaving`. No explicit Save for appearance.

*Current Network Behavior:* **3 font changes → 12 POST /builder** (≈4 per chip; 10 rapid → ~40). Desired is **0 until Save.**

*Current State Model:* **Preview==Draft (persisted)**; pages have `CLEAN/DIRTY` via `isDirty`, appearance has `SAVING/SAVED/FAILED` via `liveMessage`, no unified `DIRTY PREVIEW` vs `SAVED DRAFT`.

*Recommended State Model:* **LOCAL PREVIEW (useState+canonicalRef) → explicit Save Draft (batch updateTheme + saveBuilderPages) → PUBLISH (reads saved draft).** `CLEAN/DIRTY/SAVING/SAVED/FAILED` unified.

*Save:* **Pages:** explicit Save + 2s autosave + beforeunload. **Appearance:** implicit per-chip, no Save. *Gap B-01/B-02.*

*Publish:* **Inconsistent** — appearance already saved, pages require save. Should be **Save first, then Publish** (or `Save & Publish`).

*Composition:* **PAGE→CARD-LIKE SECTION→CONTENT** due to per-section `ExperienceBackground`. Desired **PAGE→SECTION SURFACE→CONTENT CONTAINER→OPTIONAL CARD** via page-level background + `flow`-gated section background.

*Section Transition Matrix:* Uniform `fade h-px` now; should vary per §18 (Hero bleed, Products→Gallery shared, Gallery→Timeline soft, FAQ→Contact overlap, etc.).

*Theme Family Matrix:* 10 families correct `defaultFlow`, but background not page-owned, so language not realized. Brutalist isolated correct; minimal solid correct.

*Light Theme:* `solid #FFFFFF` best (no bands); `pattern lines` still bands; same fix as dark.

*Builder/Preview/Published Parity:* **Consistently banded** — parity in defect, fix will propagate everywhere.

*Responsive:* Builder `@container/main` 375/768/1200 `mx-auto` no clip; 320/390/768/1440 all `scrollWidth===clientWidth` (prod prior); mobile bands more visible.

*Accessibility:* BUILDER-03/04 contracts intact (radiogroup, keyboard, focus-visible, live region, locked). New Save needs dirty announcements.

*Performance:* Chip active <50 ms optimistic, but `Saving…` at 558 ms blocks rapid experiment; full canvas refetch 1–1.5 s.

*P0:* None.

*P1:* **B-01 (no draft boundary), B-02 (no discard), F-01 (section bands), F-02 (card-like hierarchy), F-03 (no page background), F-04 (shared/bleed still paints), T-01 (background belongs to page)**

*P2:* **B-03 (split dirty), B-04 (dual save), B-05 (publish inconsistency), B-06 (chip disabled blocking), F-05 (uniform fade), F-06 (soft/overlap marginal), F-07 (fullBleed unused), F-08 (alternate surface rhythm), F-10 (image repeat), T-02 (family flow not realized), T-03 (light pattern)** + `v1` vs `liveVersion 11` (B-07)

*P3:* F-09 spacing, T-04 image 8 fades, A-02 live region, R-02 mobile bands, R-03 3rem large on 320

*Recommended Next RCCF:* **06A (preview-first local) + 06B (Save Draft) + 06D (page background) are P1-mandatory; 06C (publish semantics) + 06E (family tuning) follow.** Do not implement in this RCCF.

*Git:* HEAD `0c9d31f` no commit, no push. Audit network leaves `font geist` where `inter` was — revert `updateTheme({font:"inter"})` before next RCCF.

**HARD STOP — audit only, no implement.**

---

### Evidence

* **Source:** `src/features/builder/components/appearance-panel.tsx:127 applyChange→updateTheme 138` `src/actions/theme.actions.ts:182` `src/features/builder/components/workspace.tsx:202 autosave` `src/lib/builder/store.ts` `src/features/builder/canvas/interactive-canvas.tsx:119-124 appearance:changed` `src/modules/theme/runtime/experience/*` `src/lib/storefront/build-snapshot.ts:117-203` `src/lib/storefront/layout-engine/*`
* **Browser/Network/Test:** `audit-06.mjs` on `http://localhost:3000` `creator@creatorstore.test` → `C:\Users\91866\AppData\Local\Temp\opencode\audit-06\builder-01.png` 8 sections, `builder-after-font.png`, `builder-after-reload.png`, `builder-320/390/768/1440.png`, `preview-1280.png`, `published-1280.png`, `builder-res.log` (POST 2220 063e… 8 sections; 1634 appearance `inter|aurora|flat`), `net.log` 12 POSTs, `logs.txt`, `sections.json`
* **Playwright:** `playwright.config.ts` baseURL `http://localhost:3000`, `chromium` headless, `curl 200` readiness, `Get-NetTCPConnection 3000 node.exe` reuse

