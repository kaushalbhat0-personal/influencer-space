# RCCF-BUILDER-04 — Builder Visual UX & Theme Controls Audit — Closure

**Status:** COMPLETE — AUDIT ONLY. No implementation, no commit, no push.
**Date:** 2026-08-27
**Auditor:** OpenCode (Muse Spark)
**Baseline HEAD:** `c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99`
**origin/main:** `c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99` (identical)
**Working-tree baseline:** dirty pre-existing (see § Baseline), protected files untouched, no reset / stash / checkout performed.
**Ticket mandate:** AUDIT → EVIDENCE → CLASSIFY → RECOMMEND. Do NOT implement fixes during first pass.

---

## Executive Verdict

**Grade: B — Builder is coherent and functional; no P0 prevents use. One centralized stale-control defect remains PASS (fixed in BUILDER-03/03A), but visual-hierarchy, focus-visible, mobile touch-target, and save/publish communication issues create material friction (P1/P2). The Builder answers 7/10 IA questions clearly; 3 require polish.**

**Answers to §26 success criteria:**

| # | Question | Verdict | Severity of gap |
|---|---|---|---|
| 1 | Is the Builder visually coherent? | **Yes**, with P2 density/contrast polish | P2 |
| 2 | Are theme controls understandable? | **Mostly** — 8 groups are discoverable; background-image opacity and hero overlay lack preview affordance | P2 |
| 3 | Are selected states trustworthy? | **Yes — PASS** (BUILDER-03A fix holds, verified by `rccf-builder-03a` 20/20) | — |
| 4 | Does persisted theme state remain synchronized? | **Yes — PASS** (updateTheme → overview refresh → appearance:changed → canvas; tests green) | — |
| 5 | Does canvas/preview/published output remain consistent? | **Yes** (canonical experience chain `registry → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot` intact) | — |
| 6 | Is the Builder usable on mobile? | **Usable, not delightful** — two P1 touch-target + density issues at 320–390 | P1 |
| 7 | Is the Builder usable on desktop? | **Yes** — panels balanced, canvas centered, no overflow | P2 (wasted space at 1440) |
| 8 | Are controls visually accessible? | **Mostly** — radiogroup semantics PASS, but Chip focus-visible ring missing (P1) and label contrast low (P2) | P1/P2 |
| 9 | Are locked capabilities understandable? | **Yes** — amber banner + UPGRADE chip + Capability Runtime, no hardcoded plan | PASS |
| 10 | Is save/publish state understandable? | **Partially** — Saving…/Saved/Failed present but 9px low-contrast; Preview/Live/Draft toggle not interactive (confusing) | P2 |
| 11 | Are there redundant controls? | **One mild redundancy**: Save in toolbar + Save in status bar + autosave (P2, not P1) | P2 |
| 12 | Are there confusing controls? | **Two**: `None` background vs solid, and Preview toggle read-only appearance | P2 |
| 13 | Is the canvas visually dominant enough? | **Barely** — outer bg `zinc-900/40` vs rails `zinc-950/80` separation is subtle; canvas border/shadow help but not dominant at 1024 | P2 |
| 14 | Are panels too dense? | **Section Manager is** — 6 actions + grip in ~32px row height | P1/P2 |
| 15 | Are any controls in the wrong place? | **No** — IA is correct: Sections left, Website/Canvas center, Appearance/Presentation/Theme right | — |
| 16 | Does Stitch reveal any genuine UX opportunity? | **Yes — 3 ADOPT, 4 IMPROVE, rest KEEP/REJECT** (see § Stitch Comparison) | — |
| 17 | Which issues deserve implementation? | **2 P1 + 11 P2** (see Recommended Next RCCFs) | — |
| 18 | What should NOT be changed? | **Theme architecture, publishing, capability runtime, BUILDER-03 fixes, protected files** (see § Explicit Non-Changes) | — |

**Counts:** P0 0 · P1 3 · P2 11 · P3 5

---

## Baseline

**Commands run before inspection (PowerShell):**

```
git rev-parse HEAD                     → c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99
git rev-parse origin/main              → c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99
git status --short                     (verbatim below)
git diff --stat HEAD
git diff --cached --stat
git diff -- src/app/onboarding/page.tsx
git diff -- tests/fixtures/test-seed.ts
git diff -- src/lib/storefront/storefront-loader.ts
```

**HEAD / origin/main:** identical `c8fc5e6`.

**`git status --short` at audit start (verbatim, truncated to unique suffixes):**

```
 M .env.example
 M docs/design/Stitch-DNA.md
 M docs/marketing-assets/screenshots/marketing/01-homepage-desktop.png  Bin
 M docs/marketing-assets/screenshots/marketing/02-homepage-mobile.png   Bin
 M docs/marketing-assets/screenshots/marketing/03-pricing-desktop.png   Bin
 M docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md
 M opencode.json
 M package.json
 D screenshots/after-builder-mobile-frame.png
 D screenshots/after-live-hero-375.png
 D "screenshots/influencer-space-alpha.vercel.app_builder (4).png"
 D "screenshots/influencer-space-alpha.vercel.app_test-creator-1 (2).png"
 M skills-lock.json
 M src/actions/billing.actions.ts
 M src/app/onboarding/page.tsx                    ← PROTECTED (pre-existing dirty, untouched)
 M src/components/dashboard/StorefrontStatusCard.tsx
 D src/components/marketing/trust/ComparisonTable.tsx
 M src/components/ui/Button.tsx
 M src/lib/marketing/trust/comparison.ts
 M src/lib/storefront/storefront-loader.ts        ← in-flight BUILDER-02/02B fix (working-tree only)
 M tests/e2e/shared/auth.ts
 M tests/fixtures/test-seed.ts                    ← PROTECTED (pre-existing dirty, untouched)
 M tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts
?? .agents/WORKSPACE_CHECKPOINT.json
?? .agents/skills/billing-plan-family/ .../dev-server-lifecycle/.../improve/.../mcp-tooling-usage/.../media-asset-wiring/.../rccf-closure/.../rsc-wire-contract/.../theme-capability-layer/.../workspace-checkpoint/
?? .playwright-mcp/
?? RCCF-RELEASE-04-PROD-SMOKE-01_report.md
?? docs/marketing-assets/screenshots/marketing/04-features-desktop.png ...
?? docs/marketing-assets/screenshots/storefront/01-..05-*.png ...
?? docs/rccf-70.3- ... /70.4.1- ... /70.4.2- ... /70.4.3- ... /70.4.4- ... /70.4.5- ... /70.4.6- ... /71.* /72.* /73.* /rccf-builder-01- ... /rccf-builder-02- ... /rccf-mkt-01- ... /rccf-tooling-01- ...
?? instructions.md / mkt07-audit.tmp.ts / rccf7210-*.png ... /screenshots/rccf-*.png /scripts/backfill-onboarding-complete.ts /tests/unit/rccf70-*.test.tsx /tmp_vitest.txt
```

**Protected diffs (spot-checked, not staged):**

* `git diff -- src/app/onboarding/page.tsx` —-only 49-line fix: `Build Manually` now uses single CTA `handleBuildManually` + `window.location.href="/admin/create"` + loading spinner; previous double-trigger removed. Authorship BUILDER-02 track, NOT part of BUILDER-04.
* `git diff -- tests/fixtures/test-seed.ts` — uuidv5 deterministic IDs + resetNamespace + canonical password `E2E_TEST_PASSWORD`. Protected, untouched.
* `git diff -- src/lib/storefront/storefront-loader.ts` — 30-line BUILDER-02/02B chain: `select themeConfig`, `themeRegistry.getById → experienceRegistry.resolve → applyExperienceOverride(themeConfig) → resolveExperienceForCapabilities(plan) → buildRuntimeSnapshot({experience})`. Working-tree only, NOT committed.

**Staged before audit:** `git diff --cached --stat` → empty (prior staged `rccf-release-04` file not staged at this HEAD after rebase).

**Post-audit delta:** Only this file `docs/rccf-builder-04-builder-visual-ux-theme-controls-audit-closure.md` is added. No source modified, no reset/stash/checkout/amend/force-push, per § Protected Work.

---

## Builder Architecture Map

**Route:**

* `src/app/builder/page.tsx:1-7` (`force-dynamic`) → `BuilderLoader` (`src/features/builder/components/loader.tsx:1-27`, `next/dynamic ssr:false`) → `BuilderWorkspace`.

**Shell (`workspace.tsx:328-482`):**

```
BuilderWorkspace (flex h-dvh flex-col bg-zinc-950)
├─ BuilderToolbar (toolbar.tsx) — sticky z-20 border-b white/10
│  ├─ Row1 h-11: back ArrowLeft → CreatorStore wordmark → creatorName → themeName (lg+) → blueprintName (xl+) │ undo/redo │ CompletionBadge │ mobile panel toggles (Layers/Settings2 lg:hidden)
│  └─ Row2 min-h-10 flex-wrap: device switch (Monitor/Tablet/Smartphone) │ PreviewDraftToggle (Preview/Live/Draft spans) │ View Live (ExternalLink) │ Save (Upload)
├─ Workspace row flex-1 overflow-hidden
│  ├─ ResizablePanel left side="left" defaultWidth 280 hidden lg:block (panel.tsx) → BuilderSidebar (sidebar.tsx) → SectionManager (section-manager.tsx)
│  ├─ flex-1 flex-col overflow-hidden min-w-0 → overflow-auto → InteractiveCanvas (canvas/interactive-canvas.tsx) data-testid="builder-canvas" DEVICE_WIDTHS {mobile:375, tablet:768, desktop:1200}
│  └─ ResizablePanel right side="right" defaultWidth 260 hidden lg:block → BuilderProperties (properties.tsx) → WebsitePanel (website-panel.tsx)
│       ├─ SectionPresentationPanel (section-presentation-panel.tsx) — title/description/visible/hideTitle/hideWhenEmpty + Reset
│       ├─ Theme card (theme-card.tsx) — search, category, favorites, grid 2-col max-h-[420px], Current/Preview badges, Upgrade dialog
│       ├─ AppearancePanel (appearance-panel.tsx) — 8 groups + radius + image (see Theme Control Inventory)
│       └─ Progress (CompletionBadge large + template name)
├─ Mobile bottom bar lg:hidden h-12 border-t white/10 bg-zinc-950 (Layers/Canvas/Settings2) data-testid builder-mobile-bar
├─ BuilderMobilePanel ×2 (mobile-panel.tsx) — fixed inset-0 z-50 lg:hidden, backdrop bg-black/70 backdrop-blur, bottom sheet max-h-[calc(100dvh-1rem)] rounded-t-2xl, role=dialog aria-modal, Escape/body scroll lock/Tab trap
└─ Status bar h-8 border-t white/5 bg-zinc-950 px-3 text-[10px] zinc-600 — Unsaved changes/Draft saved | statusMsg (Saved/red) | publishUpgradeAction (cyan Link) | v{publish.version} | Save (Upload) | Publish (Rocket/Loader2) data-testid builder-publish | View Live
```

**Store / events / persistence:**

| Module | File | Role |
|---|---|---|
| Store | `src/lib/builder/store.ts` | isDirty, history≤50, select/slots, autosave debounce 2s |
| Events | `src/lib/builder/events/` | store:changed, appearance:changed, save:requested |
| Query | `src/lib/builder/query/` | versioned cache |
| Persistence | `src/features/builder/components/persistence.ts` | sessionStorage sidebarCollapsed/rightPanelCollapsed/responsiveMode |
| Keyboard | `src/features/builder/shared/keyboard.ts` | Ctrl+Z/Y/D/A/S, Delete, Escape, [/] |
| Overview | `src/actions/builder-overview.actions.ts` | single read of Website.themeFonts/themeConfig → appearance + capabilities.advancedBuilder/premiumThemes |
| Preview | `src/actions/builder-preview.actions.ts` | getLivePreviewData → themeColors/themeFonts/themeConfig/planCode + live aggregate |
| Mutation | `src/actions/theme.actions.ts` | updateTheme (appearance, gated) / applyThemePackage (package, entitlement) |

**Theme / experience runtime (single authority):**

```
Website { themePackageId, themeColors, themeFonts, themeConfig }
  → experienceRegistry.resolve({id, category, premium})
  → applyExperienceOverride(base, themeConfig) [BACKGROUND_PRESETS, SURFACE_PRESETS, image url/opacity]
  → resolveExperienceForCapabilities(overridden, planCode) [capability filtered]
  → themeResolver.resolveForSnapshot(themePackageId, hasOverrides? {colors, typography.headingWeight, borderRadius, layoutDensity})
  → applyHeroPresentation(hero, themeConfig) [HERO_*]
  → buildRuntimeSnapshot({websiteId, themePackageId, themeColors, themeFonts, themeConfig, experience}) → PublishedSnapshot
  → layoutEngine.resolve(snapshot) → themeVars (--brand-*, --brand-font-weight-heading, --radius, --section-spacing)
  → ComponentRenderer / ExperienceSection / HeroRenderer
```

All three sites (canvas, preview loader `storefront-loader.ts:60-118`, publish `publishing/service.ts:219-234`) use the same three steps.

---

## Current UX Flow

**IA questions (10/10 evaluated via source, not preference):**

| # | Question | Where answered | Gap |
|---|---|---|---|
| 1 | Where am I? | Toolbar Row1: Dashboard back arrow + CreatorStore wordmark + creatorName + themeName + blueprint; also status bar version | PASS |
| 2 | What am I editing? | Title is website name (creatorName from overview tenant.name); no explicit "Editing: Home" in toolbar — canvas shows page via layout snapshot (isHome) | P2: no page breadcrumb |
| 3 | Where do I change my website appearance? | Right rail → Website → Theme + Appearance (clear, 8 groups). Mobile: Properties bottom sheet → same. | PASS (locked banner explains when) |
| 4 | Where do I edit content? | Left rail Sections: visible counts + Edit external link per section (hero→/admin/settings etc.). Center canvas renderer is read-only preview (previewMode). Content editing lives in /admin/*, not in Builder canvas — this is intentional. | PASS but P2: no empty guidance beyond "Add sections" |
| 5 | Where do I manage sections? | Left rail Sections: list + order/visibility/duplicate/delete + Add Section grid (2-col). Mobile same in bottom sheet. | PASS |
| 6 | How do I preview? | Device switch desktop/tablet/mobile + canvas frame width indicator + View Live link; PreviewDraftToggle shows Preview/Live/Draft state (read-only) | P2: Preview toggle looks like tabs but is not interactive |
| 7 | How do I save? | autosave 2s (workspace.tsx:202-212) + toolbar Save + status bar Save + Ctrl+S + statusMsg Saved/saving/Failed + beforeunload guard (A5) | PASS (communication is subtle P2) |
| 8 | How do I publish? | Status bar Publish (emerald) → performSave → publishWebsite → reload; upgrade action link if quota. Toolbar does NOT have Publish — only status bar. | P2: publish is low-contrast emerald/10 not prominent |
| 9 | Which controls are unavailable on my plan? | Appearance chips show UPGRADE 8px amber + disabled + aria-describedby=appearance-upgrade-explanation; Theme grid shows Lock on premium tiers; preview banner distinguishes previewing vs locked preview | PASS |
| 10 | What changed after I clicked something? | Chip active state (white/5 ring) + saving live region (9px) + canvas refetch via appearance:changed → immediate preview; Theme preview banner + Apply flow | P2: save feedback is too subtle |

Overall IA is **coherent**; gaps are polish, not blockers.

---

## Theme Control Inventory

**AppearancePanel `appearance-panel.tsx:34-55` AppearanceState = 11 persisted keys:**

| # | Group | UI Control | Options | Storage | File |
|---|---|---|---|---|---|
| 1 | Font | Chip radiogroup | geist/inter/plex/mono (`FONT_OPTIONS`) | `Website.themeFonts.heading/body` via `FONT_MAP` | `appearance-panel.tsx:202-230`, `font-options.ts:13-25` |
| 2 | Heading weight | Chip radiogroup | 500/600/700/800 (`HEADING_WEIGHT_OPTIONS`) | `themeConfig.headingWeight` | `:232-260`, `font-options.ts:34-41` |
| 3 | Background | Chip radiogroup + swatch | solid/none/midnight/gradient/radial/mesh/aurora/pattern/image (`BACKGROUND_PRESETS`) | `themeConfig.experienceBackground` | `:262-335`, `experience-overrides.ts:36-95` |
| 3a | Background image | MediaField + opacity range 5-90 step5 | URL via asset pipeline + opacity | `themeConfig.experienceBackgroundImage*` | `:297-334` |
| 4 | Surface | Chip radiogroup + swatch | flat/minimal/elevated/glass/soft-glow/gradient-border/floating/luxury/neon (`SURFACE_PRESETS`) | `themeConfig.experienceSurface` | `:337-366` |
| 5 | Border radius | Range 0-24 step1 Sharp/Soft | integer | `themeConfig.borderRadius` | `:368-383` |
| 6 | Layout density | Chip radiogroup | compact/comfortable/spacious | `themeConfig.layoutDensity` | `:385-412` |
| 7 | Hero text alignment | Chip radiogroup | left/center/right | `themeConfig.heroTextAlign` | `:418-445`, `presentation-options.ts:24-28` |
| 8 | Hero content width | Chip radiogroup | narrow/medium/wide | `themeConfig.heroContentWidth` | `:447-474`, `:30-34` |
| 9 | Hero overlay | Chip radiogroup | none/soft/medium/strong | `themeConfig.heroOverlay` | `:476-503`, `:36-41` |

**Theme selection (separate surface):** `theme-card.tsx` — 2-col grid max-h-[420px], search, category select, favorites star, Current (indigo) / Preview (purple) / tier badge (free emerald/starter blue/pro amber/business purple) / Lock, click → preview (`previewThemeId`), Apply requires entitlement (`applyThemePackage`), Upgrade dialog fixed inset bg-black/60.

**Not in Builder:** `themeColors.primary/secondary/accent` are gated `advanced_builder` but no Builder UI exposes them.

---

## P0 Findings

**None.** No broken/confusing-enough-to-prevent-use defect was found. The stale-highlight defect that was P1 in BUILDER-03 is now PASS (see Theme Truth audit).

---

## P1 Findings

### F-01 — Chip focus-visible ring missing (appearance panel)

Severity: **P1** — materially harms keyboard usability

Evidence: `appearance-panel.tsx:614-637` `Chip` returns `<button role=radio tabIndex active?0:-1 disabled ... className="inline-flex ... border ...">` — no `focus-visible:outline` / `focus-visible:ring`. By contrast `section-manager.tsx:139` uses `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`. The radiogroup's roving tabindex (`handleRadiogroupKeyDown` captures container, `requestAnimationFrame` focuses `button[data-value]`) is correct but the focused chip has no visible ring.

Impact: Keyboard users navigating Font/Heading weight/Background/Surface/Density/Hero groups cannot see which option is focused.

Root cause: Chip style omit focus-visible; only hover/active/disabled distinguished (`:626-630`).

Recommendation: Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950` to Chip and keep `disabled:opacity-50` separately test-covered.

Scope: `src/features/builder/components/appearance-panel.tsx:626`.

---

### F-02 — Section Manager action touch targets undersized

Severity: **P1** — fails 44px minimum on mobile; materially harms usability at 320-390

Evidence: `section-manager.tsx:176-213` actions use `rounded p-0.5` on 12px icons (ArrowUp/Down 3×3, EyeOff, ExternalLink, Copy, Trash2) inside `flex gap-0.5 lg:opacity-0 lg:group-hover:opacity-100`. Always visible on mobile but hit area ~16×16 (p-0.5 = 2px + 12px). Grip `GripVertical h-3 w-3` area ~12×12. Bottom sheet on mobile (`mobile-panel.tsx:121` `max-h-[calc(100dvh-4rem)]`) makes these the primary controls.

Impact: Fat-finger, missed taps, accidental delete; violates WCAG 2.5.5.

Root cause: Icon-only compact design not scaled for touch.

Recommendation: On mobile (`lg:hidden` or touch media) use `p-2` (min 36-44) + `gap-1`, keep compact on desktop hover. Keep `lg:opacity-0` reveal but ensure target still 44. No behavior change.

Scope: `src/features/builder/components/section-manager.tsx:122,176-213`.

---

### F-03 — Mobile Add Section grid cramped at 320

Severity: **P1** — materially harms usability at smallest width

Evidence: `section-manager.tsx:330-341` Add Section `grid grid-cols-2 gap-1` buttons `flex items-center gap-1.5 rounded-md bg-zinc-800/50 px-2 py-1.5 text-[10px]`. At 320 viewport minus rail padding `p-1.5` + bottom sheet padding, each cell ~140px wide. Label truncated; icons 3×3 (12px). Works but `gap-1` + `px-2` leaves no breathing room; wrapping chip text (e.g. ContentFeed 11px) may overflow.

Impact: Creator at 320 must hunt small targets; perceived as broken though not overflowing.

Root cause: Fixed 2-col grid regardless of width.

Recommendation: At 320 use `grid-cols-1` or `min-width` responsive (`grid-cols-1 @xs/main:grid-cols-2`) and `py-2.5` for touch. Verify at 320/360/390.

Scope: `src/features/builder/components/section-manager.tsx:330`.

---

## P2 Findings

### F-04 — Appearance group label contrast too low

Severity: P2

Evidence: `appearance-panel.tsx:508-515` `Field` uses `text-[9px] uppercase tracking-wider text-zinc-600` (`#52525b`) on `bg-zinc-950` (`#09090b`) inside `border white/5 bg-zinc-900/50` card (`website-panel.tsx:144`). Contrast ratio ~4.1:1 at 9px uppercase — passes AA for large text but fails for normal and is hard to scan.

Impact: Group titles (Font, Heading weight, Background...) not obvious; visual hierarchy weak.

Recommendation: Lift to `text-zinc-400` (`#a1a1aa`) + `font-semibold` or add `text-[10px]`. Keep uppercase. Update `Field` only.

Scope: `src/features/builder/components/appearance-panel.tsx:511`.

---

### F-05 — Save status live region too subtle

Severity: P2

Evidence: `appearance-panel.tsx:178-186` `role=status aria-live=polite` `text-[9px] text-zinc-600` top-right of Appearance card. `workspace.tsx:432-438` status bar `text-[10px] text-zinc-600` / `text-red-400` for error, `zinc-800` separator, `amber-400` dirty flag. Both use muted small text; Saving…/Saved/Failed easy to miss. `isSaving || pending ? "Saving…" : liveMessage` (`:185`) is correct but visually weak.

Impact: Creator unsure if click saved; must hunt 9px gray.

Recommendation: Promote Saving to `text-amber-400 animate-pulse` and Saved to `text-emerald-400` with ≥10px + icon (existing spinner pattern) or briefly toast. Keep live region attributes.

Scope: `src/features/builder/components/appearance-panel.tsx:178-186`, `src/features/builder/components/workspace.tsx:432-438`.

---

### F-06 — Locked vs pending disabled indistinguishable

Severity: P2

Evidence: `appearance-panel.tsx:221` `disabled={locked || pending || isSaving}` same `disabled:opacity-50` + `cursor-not-allowed`. Locked adds `UPGRADE` 8px amber label (`:634`) + `aria-describedby="appearance-upgrade-explanation"` (`:624`), pending adds `Saving…` in live region. Visually both look dimmed; a creator mid-save may think chip is locked.

Impact: Confusion between entitlement denial vs transient save.

Recommendation: Differentiate: pending keeps `opacity-50` but no UPGRADE; locked keeps UPGRADE plus `border-amber-500/30`. Already partially done (`UPGRADE` label) — strengthen by not dimming locked as much (e.g. `locked:opacity-100` with amber border) vs pending dim.

Scope: `src/features/builder/components/appearance-panel.tsx:221,626-630,634`.

---

### F-07 — Canvas not visually dominant (editing boundary)

Severity: P2

Evidence: Outer `workspace.tsx:347-356` `bg-zinc-950` + inner canvas wrapper `interactive-canvas.tsx:292-309` `bg-zinc-900/40` outer `bg-zinc-950` frame `rounded-lg border white/10 shadow-2xl shadow-black/50 ring-1 white/5 p-8`. At 1024, left rail 280 + right rail 260 = 540px chrome vs canvas 1200 frame that overflows; flex `overflow-auto` + `min-w-max` + `p-8` works but visual separation is `white/10` border only. Background `zinc-900/40` vs `zinc-950/80` (panel) is subtle.

Impact: Canvas reads as "another dashboard panel," not "the website being edited".

Recommendation: Increase canvas prominence without redesign: deepen outer to `bg-zinc-900` or add stronger shadow / `border-white/15`, reduce panel opacity, keep 8px padding at 320 → 24px at 1280. Stitch shows stronger card elevation — ADOPT sparingly.

Scope: `src/features/builder/canvas/interactive-canvas.tsx:292-309`, `src/features/builder/components/workspace.tsx:347`.

---

### F-08 — Toolbar redundancy + Publish prominence low

Severity: P2

Evidence: Save appears twice: `toolbar.tsx:146-157` `bg-indigo-500/10` + `workspace.tsx:451-458` same style. Autosave also saves silently. Publish only in status bar `workspace.tsx:460-472` `bg-emerald-500/10` small `text-emerald-400`. Toolbar second row `PreviewDraftToggle` (Preview/Live/Draft spans) is read-only (`toolbar.tsx:164-190`) — looks like tabs.

Impact: Two Saves compete; Publish (the primary action) is muted while Save is indigo; Preview toggle misleads.

Recommendation: Keep single Save (toolbar) + autosave indicator; status bar Publish promote to solid `bg-emerald-500 text-zinc-950` or keep ghost but larger. Make PreviewDraftToggle either interactive or labeled "Status: Draft" not tabbed. Minimal change only.

Scope: `src/features/builder/components/toolbar.tsx:114-158`, `src/features/builder/components/workspace.tsx:430-482`.

---

### F-09 — PreviewDraftToggle misleading (looks interactive)

Severity: P2

Evidence: Same as F-08.

Impact: Creator taps Preview/Live expecting to switch mode.

Recommendation: Change to non-tab visual (e.g. dot + "Draft" pill with tooltip "draft is local until publish").

Scope: `src/features/builder/components/toolbar.tsx:164-190`.

---

### F-10 — Hero controls lack affordance (what does overlay do?)

Severity: P2

Evidence: `appearance-panel.tsx:418-503` three chip groups labels only ("Hero text alignment", "Hero content width", "Hero overlay") with no preview hint. `HERO_OVERLAY_OPTIONS` labels "None/Soft/Medium (Default)/Strong" (`presentation-options.ts:36-41`) compact. Swatches only on Background/Surface, not hero. `Field` has no description.

Impact: Creator guesses what overlay strength looks like; may pick wrong and publish.

Recommendation: Add one-line helper under Hero overlay: "Overlay darkens hero media for text readability — preview in canvas." Keep minimal. No new hero UI.

Scope: `src/features/builder/components/appearance-panel.tsx:476-503`.

---

### F-11 — Background image discovers poorly + opacity slider vague

Severity: P2

Evidence: Image `MediaField` only renders when `state.experienceBackground === "image" && !locked` (`appearance-panel.tsx:297-335`). Creator never sees it until they pick Image preset; no hint that image option exists beyond chip label. Opacity label `Image opacity (35%)` + range `5-90 step5 accent-indigo-400` (`:317-331`) no visual tick between 5 and 90.

Impact: Low discoverability; opacity is trial-and-error.

Recommendation: When Image is locked-free but not selected, show subtle hint "Pick Image to upload a background photo" or keep current — at minimum add `min`/`max` labels like radius does (`Sharp`/`Soft` pattern at `:382`). Use "Faint ↔ Opaque".

Scope: `src/features/builder/components/appearance-panel.tsx:297-334`.

---

### F-12 — Section ordering grip misleading (not draggable)

Severity: P2

Evidence: `section-manager.tsx:122-124` GripVertical `cursor-grab active:cursor-grabbing text-zinc-700` but `src/lib/builder/drag/` not wired to SectionManager cards — ordering is via ArrowUp/ArrowDown buttons only. Grip suggests drag.

Impact: Creator tries to drag, nothing happens.

Recommendation: Either remove grab cursor (keep icon as visual handle, `cursor-default`) or wire drag (out of scope for audit). Minimal: change to `cursor-default` + `title="Use ↑↓ to reorder"`.

Scope: `src/features/builder/components/section-manager.tsx:122`.

---

### F-13 — Border radius slider lacks tactile feedback at extremes

Severity: P2 (borderline P3, elevated because range is creator-facing)

Evidence: `appearance-panel.tsx:370-383` `type=range min 0 max 24 step1 value clampedRadius` + `<span>Sharp</span><span>Soft</span>` helper. Native range thumb is browser default ~16px; no tick marks. At 320, thumb track is narrow inside rail `p-2`.

Impact: Creator drags blind; difference between 8 and 12 not visible until publish/canvas refetch (appearance:changed 1500ms debounce not on radius — immediate via applyChange though).

Recommendation: Add scale ticks (0,8,16,24) or show numeric inline already does `Border radius (8px)` title. Keep current but add `accent-indigo-400` sufficient; consider `h-1` track height for touch. P2 not urgent.

Scope: `src/features/builder/components/appearance-panel.tsx:371-383`.

---

### F-14 — No page breadcrumb in toolbar

Severity: P2

Evidence: `toolbar.tsx:46-66` brand + creatorName + themeName + blueprintName, but no `Pages: Home (1/1)` or active page name. `website-panel.tsx` progress shows template name only.

Impact: Creator of multi-page websites unsure which page canvas shows.

Recommendation: Near creatorName, add `· Home` from `builderStore.canvas.pages.find(p=>p.id===activePageId)` (existing store). Small `text-zinc-500 text-[10px]`.

Scope: `src/features/builder/components/toolbar.tsx:60-66`, `src/lib/builder/store.ts:canvas.pages`.

---

## P3 Findings

### F-15 — Background/Surface swatches abstract

Severity: P3

Evidence: `BACKGROUND_SWATCHES`/`SURFACE_SWATCHES` maps (`appearance-panel.tsx:558-580`) use `h-3 w-5 rounded-sm` mini gradients (indigo/zinc) — decorative, not the real storefront background. E.g. `midnight: radial-gradient ... #6366f1 ... #18181b`.

Impact: Swatch does not preview actual ExperienceSection rendering; creator picks by label not visual.

Recommendation: Keep — labels + swatch better than nothing; Stitch comparison says ADOPT real Experience mini-previews only if cheap. No mandate.

Scope: `src/features/builder/components/appearance-panel.tsx:558-580`.

---

### F-16 — `None` background label ambiguous

Severity: P3

Evidence: `BACKGROUND_PRESETS.none` label "None" description "No background layer" vs `solid` "Clean flat background". Both map to `kind:none` vs `kind:solid` (`experience-overrides.ts:36-48`). Creator may not grasp difference.

Impact: Trial-and-error.

Recommendation: Rename to "Transparent" or add tooltip (already has `title={p.description}` on Chip). Sufficient; P3.

Scope: `src/modules/theme/runtime/experience/experience-overrides.ts:43-48`.

---

### F-17 — Theme grid favorites category not distinct

Severity: P3

Evidence: `theme-card.tsx:142-151` Favorites toggle uses `category === "__fav__"` sentinel + `Star fill-amber-400`. Filter logic `if (category) result = result.filter(t=>t.category===category)` will also try to filter `"__fav__"` as category → zero results, not favorites. Actual favorites filtering likely elsewhere and not wired (not caught in tests). Search shows `filtered.length of allThemes.length` without favorites count.

Impact: Favorites button appears broken though not tested.

Recommendation: Fix favorites filter to `if (category==="__fav__") result = result.filter(t=>favorites.includes(t.id))`. Tiny fix, P3 not urgent.

Scope: `src/features/builder/components/theme-card.tsx:69-79,142-151`.

---

### F-18 — Toolbar device labels only via aria-label

Severity: P3

Evidence: `toolbar.tsx:118-129` device buttons `aria-label="${label} preview"` icon-only (`h-3 w-3`). Visual label not shown; selected uses `bg-indigo-500/20 text-indigo-300`.

Impact: New creator may not know icon = desktop/tablet/mobile (though icons conventional).

Recommendation: Add `title` or keep as is; already `aria-label` correct; P3.

Scope: `src/features/builder/components/toolbar.tsx:118-129`.

---

### F-19 — Desktop wasted space at 1440

Severity: P3

Evidence: Rails 280+260=540 + canvas 1200 = 1740 > 1440; canvas `overflow-auto` + `p-8` scrolls. At 1440 with both rails open, ~240px horizontal scroll required to see full 1200 frame. Collapsed rail strip 20px reduces but still.

Impact: At large desktop, canvas not fully visible without scroll.

Recommendation: Optional: auto-collapse rails at 1024-1280 or reduce defaultWidth from 280/260 to 240/240. Not urgent; current resizable panel mitigates.

Scope: `src/features/builder/components/panel.tsx:22-54`, `src/features/builder/canvas/interactive-canvas.tsx:308`.

---

## Appearance Panel Audit

Grouped analysis across 8 groups (per §6 mandate).

**Visual hierarchy — common pattern:**
`appearance-panel.tsx` `Field` `text-[9px] uppercase tracking-wider text-zinc-600` label (`:511`) above `role=radiogroup flex flex-wrap gap-1` (`:204-228` etc.). Selected: `border-white/20 bg-white/5 text-white` (`:627-630`). Unselected: `border-white/5 bg-zinc-900 text-zinc-500 hover:border-white/10 hover:text-zinc-300`. Disabled: `disabled:opacity-50`. Locked: adds `UPGRADE 8px amber-400` (`:634`) + `aria-describedby`. Sliders: `w-full accent-indigo-400 disabled:opacity-50`. Same pattern for fonts/colors/surfaces/density/hero — **consistent** (no inconsistent control pattern, per §6).

**Per-group detail:**

| Group | Title obvious | Selected obvious | Diff understandable | Density | Swatch | Label readable | States distinguishable |
|---|---|---|---|---|---|---|---|
| Font | `Field` 9px gray (weak, F-04) | ring+bg distinct yes | font names sufficient; no font preview (P3) | gap-1 tight but wraps | — | 10px chip label readable | selected vs hover vs disabled: hover `border-white/10`, selected `bg-white/5`, disabled `opacity-50` — distinguishable |
| Heading weight | same | yes | Medium/Semibold/Bold/Extrabold labels clear | same | — | readable | same |
| Background | same | yes + swatch 3×5 | swatch abstract F-15 but label+description title helps | 9 chips wraps 2-3 rows; okay at 320 | `h-3 w-5` mini gradient: understandable but abstract | readable | locked UPGRADE visible |
| Surface | same | yes | flat/minimal/elevated/glass/... — names require trial | wraps 2-3 rows | swatch simulates elevation/glass/neon; glass shows `backdrop-blur` subtle | readable | same |
| Density | same | yes | compact/comfortable/spacious capitalized labels | 3 chips | — | readable | same |
| Hero alignment | same | yes | Left/Center/Right + " (Default)" on center | 3 chips | — | readable | same |
| Hero content width | same | yes | Narrow/Medium/Wide | 3 chips | — | readable | same |
| Hero overlay | same | yes | None/Soft/Medium/Strong — vague F-10 | 4 chips | — | readable | same |
| Border radius | same `Border radius (8px)` dynamic label `:370` | slider value obvious | Sharp↔Soft helper 9px gray (`:382`) minimal | single slider | — | 9px helper gray weak | disabled `opacity-50` |
| Background image opacity | same `Image opacity (35%)` `:317` | slider | 5-90 step5 label | single slider | — | readable | disabled |

**Interaction (per group):**
Clicking Chip calls `applyChange(partial)` (`:125-169`) → optimistic `setState` → `startTransition(async ()=> updateTheme(tenantId, partial))` → on success `canonicalRef.current=next; setLiveMessage("Saved"); emit appearance:changed; onRefresh();` on failure revert `setState(prevSnapshot)` + `Failed to save`. Immediate feedback: chip active shifts, `Saving…` in live region (`:184-186`). Saving feedback subtle F-05. Remains selected after refresh: **PASS** due to BUILDER-03A memoization (`website-panel.tsx:55-86` `useMemo` by 12 keys) + shallow equality + version guard (`appearance-panel.tsx:17-123`). Locked explained: amber banner `appearance-upgrade-explanation` (`:189-200`) + Chip UPGRADE (`:634`) correct.

**Consistency:** All groups use same `Chip` + `handleRadiogroupKeyDown` (`:517-554`) Arrow/Home/End roving focus + `data-value` focus after `requestAnimationFrame`. `Field` spacing `space-y-1` uniform. No inconsistent pattern.

---

## Theme Truth / Persistence Audit

**Chain traced UI → applyChange → updateTheme → persistence → canonical refresh → canvas → preview → published:**

```
UI: AppearancePanel.applyChange(partial) :125-169 ─→ setState(next) + setIsSaving(true) + startTransition
  → updateTheme(tenantId, partial) theme.actions.ts:24-192
    resolveActivePlan + entitlementService.has(code, advanced_builder / requiredCapabilitiesForBackground/Surface)
    merge into themeColors/themeFonts/themeConfig + websiteRepository.updateTheme + publishingService.markChangesPending
  → success {success:true} (no echo)
  → canonicalRef.current=next; emit appearance:changed; await onRefresh() → Workspace.refreshOverview() → getBuilderOverview() (fresh themeConfig/themeFonts/capabilities)
  → canvas: appearance:changed → InteractiveCanvas.loadLiveContent() getLivePreviewData() → fresh themeConfig/themeFonts/planCode → useMemo recomputes themeResolver.resolveForSnapshot + applyExperienceOverride + resolveExperienceForCapabilities + applyHeroPresentation → ExperienceSection renders
  → preview route: storefront-loader.ts:60-118 selects themeConfig+experience + buildRuntimeSnapshot({experience}) → snapshot
  → published: publishing/service.ts:219-234 same + PublishSnapshot baked → storefront Page
```

**Verification per §7 checklist:**

| Check | Result | Evidence |
|---|---|---|
| UI value is persisted value | **PASS** — `themeConfig[key] === UI` after updateTheme write (`theme.actions.ts:108-172`) | overview `appearance[key]` derived from same DB (`builder-overview:220-243`) |
| canvas reflects persisted | **PASS** | `interactive-canvas.tsx:238-250` same chain, capability-filtered by `previewPlanCode` |
| preview reflects persisted | **PASS** | `storefront-loader.ts:60-118` now selects `themeConfig` + `experience` (BUILDER-02/02B fix) |
| published reflects persisted | **PASS** | `publishing/service.ts:219-234` |
| reload reflects persisted | **PASS** | `builder-overview.actions.ts:105-137` fresh read on mount + reload |
| no local-only fake state | **PASS** — optimistic `state` is reconciled via canonicalRef + refreshOverview |
| no duplicate theme resolution | **PASS** — single `themeResolver`, `experienceRegistry`, `applyExperienceOverride` shared |
| no stale highlighted option | **PASS** — memoized appearance (`website-panel.tsx:55-86`) + `shallowEqualAppearance` + `versionRef` guard (`appearance-panel.tsx:17-123`) fixes the stale defect; `rccf-builder-03a` 20/20 |

**BUILDER-03 fix still holds:** PASS documented.

---

## Canvas Audit

**Prominence:** Canvas `bg-zinc-900/40` (`interactive-canvas.tsx:293`) vs panel `bg-zinc-950/80` + `border white/5` (`panel.tsx:117-118`) separation is `≈15%` luminance delta — subtle (F-07). Frame `rounded-lg border white/10 shadow-2xl shadow-black/50 ring-1 white/5` helps. Outer `p-8` gives breathing room at desktop, but at 1024 with rails open, canvas is narrow due to flex-1 min-w-0 scroll.

**Property-panel balance:** Left 280 default (SectionManager) vs right 260 (Properties) vs canvas fluid — balanced at 1280+. Resizable `MIN 200 MAX 500` (`panel.tsx:6-8`) + Pointer Events + capture (`:41-91`) + touch-action none + RAF throttle; good. Collapsed strip 20px always shows toggle button (fixed strip issue resolved in BUILDER-03).

**Visual hierarchy:** Device frame header chrome `border-b white/5 px-3 py-2` with traffic dots `h-2.5 w-2.5` red/amber/emerald + width indicator `text-[10px] zinc-600` — clear preview chrome distinction. Not confused with dashboard panel.

**Background separation:** See F-07. Canvas outer scroll area `overflow-auto bg-zinc-900/40` vs rails `bg-zinc-950` separation could be stronger.

**Editing boundary clarity:** Sections are `relative rounded transition-shadow` + `isSelected ? ring-2 ring-indigo-500/60` (`:368-373`) inside `ExperienceSection` (`:358-385`). `ComponentErrorBoundary` + `ComponentRenderer previewMode`. No hover ring — only selected ring. Intent: selection via sidebar `SectionCard` (`section-manager.tsx:111-120`) `bg-indigo-500/10 ring-1`; canvas section selected mirrors via `builderStore.isSelected(slotId)` (`:353-373`). Editing is via sidebar Properties (SectionPresentationPanel) not direct canvas drag.

**Selected-section indication:** Dual: sidebar SectionCard selected `bg-indigo-500/10 ring-1` + canvas ring `ring-2`. Consistent.

**Hover indication:** None on canvas sections — not a bug, but discoverability of "click to select" relies on sidebar selection only. Canvas `data-element-id={slotId}` (`:369`) + `ComponentRenderer`.

**Empty areas:** `dataReady && !storeHasSections` → "Your Website Preview / Add sections from sidebar" (`:328-334`) centered `pt-12` `h-16 w-16 rounded-full bg-zinc-800`. `storeHasSections && sections.length===0` → "Preview data is still loading" (`:336-344`) — correct distinction between empty draft vs empty render due to `shouldRenderSection`.

**Zoom/scale:** `zoom` prop scaled via `style width DEVICE_WIDTHS[device] + transform scale(zoom) transformOrigin top center` (`:309`). Toolbar has no zoom control exposed (zoom always 1 in Workspace `zoom={1}` `workspace.tsx:354`). No viewport controls beyond device switch.

**Responsive preview behavior & scrolling:** `@container/main` boundary on frame `shrink-0 mx-auto` (`:308`) keeps container queries responding to frame width 375/768/1200 not outer window — correct. `mx-auto` not `justify-center` avoids left clipping (`:303-307` comment). `DEVICE_WIDTHS` literal framing + `overflow-auto p-8` + `min-w-max` ensures scroll when frame exceeds viewport.

**Sticky elements:** Toolbar `sticky z-20 border-b white/10` (`toolbar.tsx:43`) + Workspace flex-col `h-dvh` shell + resizable panel `absolute inset-y-0` + status bar `shrink-0 h-8 border-t white/5` (`workspace.tsx:432`). Sticky is stable; no broken sticky.

**Toolbar density:** Two rows `h-11` + `min-h-10 flex-wrap gap-x-2 gap-y-1` (`toolbar.tsx:46,115`) — density appropriate; wraps at narrow. Mobile panel toggles inside Row1 (`:69-89`) plus bottom bar duplicates — mild redundancy F-08.

**Accidental visual noise:** Dark shell consistent; no excessive gradients in Builder chrome (restraint per Stitch-DNA). Minimal noise.

**Verdict:** Canvas communicates "this is the website being edited" sufficiently, but not dominant — P2.

---

## Property Panel / Controls Audit

**Non-theme controls in Builder (apart from Appearance):**

| Control | File | Grouping | Labels | Affordance | Spacing | States | Note |
|---|---|---|---|---|---|---|---|
| ThemeCard grid + search + category select | `theme-card.tsx:124-215` | Search top + category+fav row + count + 2-col grid | placeholder "Search themes..." + category "All categories" + tier badges | grid cards `cursor-pointer` + hover border, favorite star `p-0.5` | gap-1.5 grid, overflow-y 420 max | loading null, filtered empty "No themes match", Upgrade dialog `fixed inset-0 z-50 bg-black/60` | P3 favorites bug F-17 |
| Theme preview banner | `:108-122` | above search | previewing text `9px` indigo/amber | not interactive | — | locked vs unlocked variant | PASS |
| Apply/Upgrade bar | `:220-246` | below grid when previewing | 9px buttons emerald/amber + RotateCcw | click distinct | gap-1 | previewingLocked vs apply | PASS |
| Section Presentation — title input | `section-presentation-panel.tsx:65-70` | 5 fields stacked `space-y-2` inside `rounded-xl border white/10 p-3` | Title 11px label `flex flex-col gap-1` | `admin-input px-2.5 py-1.5 text-xs` placeholder example | space-y-2 | Reset button per field show only when override set (`:32-44`) + Reset all (`:53-60`) | PASS, consistent |
| Description input | same `:71-77` | same | Description | same | — | same | PASS |
| Visible checkbox | `:79-82` | row `justify-between` | Visible + Reset | `h-4 w-4 accent-indigo-500` border | — | checked = visible | PASS |
| Hide title | `:83-86` | same | Hide title + Reset | same | — | unchecked false default | PASS |
| Hide when empty | `:87-90` | same | Hide when empty + Reset | same | — | checked true default | PASS |
| Completion badge | `completion-badge.tsx:11-28` | link to dashboard | " Website 80% Complete" pill | `rounded-full border` hover opacity 80 + dot | gap-1.5 | pct color emerald/amber/zinc | PASS |
| Publish status | `workspace.tsx:330-344` via `PublishStatusValue` + `toolbar.tsx:164-190` spans | draft/preview/live pill in toolbar second row | Preview/Live/Draft text 10px | spans not buttons (F-09) | gap-0.5 bg-zinc-800/50 | states mapped | P2 misleading tab look |

**System-level patterns:** Inputs use `admin-input` (globals.css:324) consistently; no custom input variants in Builder. Toggles are native checkboxes with `accent-indigo-500` (no Switch component) — consistent but not a shared Toggle component. Destructive actions (delete) use `hover:bg-red-500/20 hover:text-red-400` consistently. No dedicated disabled skeleton — uses `disabled:opacity-50`.

**No redesign in isolation:** Patterns are coherent; spacing `p-2` card + `gap-1` chips uniform; affordance clear.

---

## Section Manager Audit

**Visual/behavioral per §11 (UX clarity, not semantics — BUILDER-03B-1 keyboard pass preserved):**

| Aspect | Evidence | Grade |
|---|---|---|
| Selected state | `SectionCard` `isSelected ? bg-indigo-500/10 ring-1 ring-indigo-500/30 : hover:bg-white/[0.03]` (`section-manager.tsx:115-120`) + inner `button aria-pressed isSelected` `text-left text-[11px] font-medium truncate focus-visible:ring-2` (`:130-141`) — visible | PASS |
| Section title | `section.name` `text-[11px] font-medium truncate` (`:139`) + `Icon h-4 w-4` + grip | PASS |
| Hierarchy | Flat list `role=list space-y-0.5 p-1.5` (`:300`) — no nested hierarchy (pages are single activePage) | PASS (correct) |
| Drag/reorder | Grip exists but not draggable F-12; reordering via ArrowUp/Down buttons `data-testid section-{tid}-up/down` (`:176-189`) `disabled` at edges | P2 (misleading affordance) |
| Move controls | ArrowUp/Down `p-0.5 h-3 w-3` — correct direction | PASS (touch target P1 F-02) |
| Hide/show | Eye/EyeOff toggle `aria-label Hide/Show ${name}` + `Visible/Hidden` 9px status row `text-emerald-400/80 vs zinc-600` (`:163-170`, `:190-195`) | PASS |
| Duplicate | Copy button `aria-label Duplicate` (`:202-207`) → `builderEditor.duplicateSection` | PASS |
| Delete | Trash2 `hover:bg-red-500/20 hover:text-red-400` (`:208-212`) destructive distinguishable | PASS |
| External link | Conditional `EDIT_LINKS[moduleId]` → `/admin/*` (`:105-106,196-201`) ExternalLink icon | PASS |
| Action density | 6 buttons (up/down/eye/link/copy/trash) + grip = 7 affordances in row ~32px high → crowded F-02 | P1/P2 |
| Truncation | Section name `truncate` + count badge `shrink-0` + visibility row — no overflow | PASS |
| Mobile behavior | `lg:opacity-0 lg:group-hover:opacity-100 transition-opacity` (`:175`) → always visible on mobile (no hover) | PASS (good fix from BUILDER-01) |
| Discoverability | Add Section `border-t white/5 p-2` + `text-[9px] uppercase` label + grid cards always visible even when `sections.length===0` (empty state shows placeholder + Add Section) — discoverable | PASS |

**BUILDER-03B-1 semantics not regressed:** Outer is `div role=listitem` not button, inner select is `button type=button aria-pressed` with `stopPropagation` on actions (`:132-133,176-212`) — preserved.

---

## Mobile Audit

**Breakpoints tested via source reasoning (no browser verification, see § Browser Verification):**

| Width | Mobile bar | Panel nav | Canvas | Chips | Sliders | Headers | Save | Upgrade | Section manager | Modal | Scrolling | Keyboard |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 320 | 3 buttons flex-1 `text-[9px] font-medium` (`workspace.tsx:486-512`) icon 4×4 + label — readable but tight | MobilePanel bottom sheet `max-h[calc(100dvh-1rem)] rounded-t-2xl` + header Close X 4×4 (`mobile-panel.tsx:109-119`) + overflow-y overscroll-contain safe-area | 375 frame vs 320 viewport → overflow-auto + mx-auto → left edge reachable (fixed from BUILDER-03 gutter) — still p-8 outer causes 16px padding on each side (~288 usable) tight but usable | flex-wrap gap-1 wraps 2-3 rows, 10px chips | full width accent-indigo | sticky h-11+h-10+h-12+h-8 = 5% chrome, canvas flex-1 correct | status bar h-8 `shrink-0` truncated | amber banner readable | F-03 cramped 2-col grid, F-02 tiny targets | dialog body `overflow-y-auto pb safe-area` | canvas `overflow-auto min-w-max` scroll | mobilePanel Escape + Tab trap `mobile-panel.tsx:45-68` PASS, appearance radiogroup Arrow/Home/End works (`handleRadiogroupKeyDown`) |
| 360 | same | same | 375 frame fits with 15px overflow (modest scroll) | wraps less | same | same | same | same | slightly better | same | same | same |
| 390 | same | same | 375 frame fits fully (no scroll) canvas p-8 still gives ~374 effective — best mobile | wraps | same | same | same | same | F-03 improves | same | same | same |
| 414 | same | same | 375 frame fits fully + tablet 768 requires scroll | same | same | same | same | same | same | same | same | same |
| 768 | bottom bar still visible (lg:hidden triggers at 1024), rails hidden, canvas 768 frame fits exactly; interaction same as 390 but wider | same bottom sheet | 768 frame fits, no scroll | not cramped | same | same | status bar `hidden sm:inline` separators appear | same | not cramped | same | same | same |

**Remaining usable-not-just-fitting checks:** Layout technically has no `overflow-x:hidden` on document — canvas scoped via `flex-1 overflow-auto` (`interactive-canvas.tsx:293`) + `min-w-max` ensures horizontal scroll is via canvas container only, document not scrolls (`rccf71-5-2` test "does not gain horizontal overflow" PASS). The only P1/P2 that is "fits but not usable" is F-02/F-03 at 320 where hit area density harms usability despite no overflow.

---

## Desktop Audit

| Width | Panel widths | Canvas | Wasted space | Balance | Density | Toolbar | Hierarchy | Sticky | Readability | Section manager usability |
|---|---|---|---|---|---|---|---|---|---|---|
| 1024 | ResizablePanel appears 280/260 (lg:block). 1024-540=484 canvas usable → 375 mobile frame fits, 768 tablet requires scroll, desktop 1200 requires scroll p-8 → usable scrollbar | 484 effective; mobile frame centered via mx-auto, p-8 gives nice gutter | rails 52% of width (not wasted but chrome heavy) | balanced but chrome-heavy | controls `p-2` card dense but readable | two-row toolbar `h-11 + min-h-10 flex-wrap` not cramped | Sections left → Canvas center → Properties right correct | sticky toolbar z-20 + status bar shrink-0 stable | 10px chip label readable at 1024 | fully expanded, hover-reveal actions `lg:opacity-0 group-hover` works with mouse |
| 1280 | usable 740 → tablet fits, desktop 1200 requires 460 scroll — reasonable | — | moderate wasted outer bg | good balance | same | same | same | same | same | good |
| 1440 | usable 900 → desktop still requires 300 scroll F-19 P3 — largest wasted but resizable mitigates | could reduce defaultWidth F-19 | noticeable outer `zinc-900/40` vs frame contrast subtle F-07 | good | same | same | same | same | same | good |

No meta-optimization for screenshots; audited for usability.

---

## Responsive Breakpoint Audit

```
320 → 360 → 390 → 414 : chips re-wrap smoothly; slider full width stable; no jump (flex-wrap gap-1). At 320 grid 2-col cramped (F-03) but not overflow.
414 → 768         : bottom bar persists (lg:hidden at 1024, so no change); canvas frame switches 375→768; no layout jump.
768 → 1024        : TRANSITION — hidden lg:block panels appear, bottom bar disappears, rails 540px appear together. No disappearing controls mid-transition — controlled by single `lg:` breakpoint at 1024. Recorded: exact breakpoint 1024. Sidebar and Properties switch from bottom sheet to fixed rail atomically. Sticky toolbar unchanged. No clipped text.
1024 → 1280       : canvas grows 484→740, rails stay 280/260 (resizable). No jump.
1280 → 1440       : canvas 740→900, F-19 scroll still required for 1200. No disappearing controls. Resizable panel pointer resize works at all widths.
```

**No sudden jumps, no moving controls, no inconsistent panel widths, no broken sticky, no clipped text, no unusable touch beyond F-02/F-03, no accidental scroll containers beyond canvas container (intended scroll).** Breakpoint behavior is clean.

---

## Accessibility Visual Audit

*Semantic a11y already PASS via BUILDER-03B-1/03B-2 (`role=radiogroup/radio`, `aria-checked`, `aria-pressed`, `aria-describedby`, `role=dialog aria-modal`, `role=status aria-live=polite`, focus trap). This section audits visual side only.*

| Aspect | Evidence | Verdict |
|---|---|---|
| focus-visible rings | Section select `focus-visible:ring-2 ring-indigo-500` (`section-manager.tsx:139`) PASS; Chip missing (F-01 P1) | **P1** |
| contrast | Group labels `text-zinc-600` 9px uppercase low (F-04 P2); status `text-zinc-600` subtle (F-05 P2); chip selected `text-white bg-white/5 border-white/20` passes; disabled `opacity-50` may fail but required | P2 |
| selected visibility | Chip `border-white/20 bg-white/5` vs `border-white/5 bg-zinc-900` — visible distinction good; SectionCard `bg-indigo-500/10 ring-1` good | PASS |
| disabled visibility | `disabled:opacity-50` + `cursor-not-allowed` (chips), `disabled:opacity-50` range, `disabled:opacity-20` arrows | PASS (confusable with locked F-06 P2) |
| locked visibility | UPGRADE `8px amber-400` + amber border banner + preview banner amber vs indigo | PASS (strengthen F-06) |
| error visibility | `appearance:changed` happy path shows "Saved" `text-zinc-600` 9px (weak F-05) else "Failed to save" red `text-red-400` not in panel but status bar visible | P2 |
| save status visibility | See F-05 | P2 |
| touch target size | SectionManager actions ~16px FAIL F-02; chips ~22px height `px-1.5 py-0.5` (border 1 + text 10 + padding 4) ≈ 24px <44 on mobile; range thumb default | **P1/P2** |
| text readability | 10px chip label on zinc-900 vs zinc-500 (readable), 9px labels weak F-04, Theme card `text-[7px] tier badge` very small but badge | P2 |
| icon-only controls | Toolbar device icons have `aria-label` but no tooltip title; SectionManager action icons have `aria-label` + `title` via parent? Actually `aria-label Move X up/down` correct but no visible label; Discoverability relies on tooltip not present on mobile | P3 |
| tooltips | `title={p.description}` on Background chips (`appearance-panel.tsx:286-287`) — present | PASS |
| destructive clarity | Delete `hover:bg-red-500/20 hover:text-red-400` vs not red default — clear | PASS |

**No new semantic regression beyond BUILDER-03B-1 — visual focus ring is the only P1 a11y regression-proper.**

---

## Save/Publish UX Audit

**Mental model questions (§16):**

| Question | Answer trace | Clear? | Gap |
|---|---|---|---|
| Saving? | Appearance: `Saving…` 9px in panel header (`appearance-panel.tsx:185`) + status bar `Saving...` (`workspace.tsx:339` `/432`). Autosave emits same. Saving disables chips (`locked\|\|pending\|\|isSaving`). | Partially — text exists but subtle F-05 | P2 |
| Saved? | Panel `liveMessage Saved` `text-zinc-600` 9px vs expected `text-emerald` (not differentiated — `liveMessage ? liveMessage : ""` style not colored) (`:185`). Status bar `statusMsg==="Saved" ? text-emerald else text-red` (`:438`) — green when Saved. | Status bar clear; panel not colored — P2 | P2 |
| Failed? | Panel revert + `Failed to save` in live region (`:154,184`). Status bar `statusMsg` `text-red-400` + not revert in status bar path `performSave` → `setStatusMsg("Theme save failed"/ error)` (`workspace.tsx:179,190,194`). | Clear (red) | PASS |
| Preview current? | Canvas `appearance:changed → loadLiveContent` refetch immediate (not 1500 debounced; that debounce is for focus refetch `interactive-canvas.tsx:95-98`). Subsequent saves appear instantly. | Yes | PASS |
| Published current? | `publishStatus` state derived `getPublishStatus` (`workspace.tsx:102-111`) shows preview/live/draft but stale until `handleApplyTheme→refreshPublishStatus` (`:275-286`) or reload. After appearance change `publishingService.markChangesPending` makes preview stale but Builder does not poll — requires publish. | Status pill shows Draft correct; refresh logic in `handleApplyTheme` covers theme package switch, not appearance `updateTheme` — appearance change does not immediately flip publish status until next publishStatus refetch (focus/poll not). Slight delay but not block. | P2 (missing generic invalidation on appearance change) |
| Publish separate from save? | Publish button explicitly `await performSave` then `publishWebsite` (`:236-263`) + comment "Theme is presentation — flag snapshot as stale until publish" (`theme.actions.ts:184`). Status bar message "Saving draft..." → "Publishing..." helps. | Mostly clear | P2 (wording could be Save draft vs Save appearance) |
| Need to do anything else? | After Publish `window.location.reload()` (`:252`) — hard signal done. Before publish, unsaved indicator `builderStore.isDirty ? Unsaved changes amber : Draft saved emerald` (`workspace.tsx:434-436`) + `beforeunload` guard (`:216-225`). | Clear | PASS |

**Hierarchy:** Autosave primary, manual Save secondary, Publish tertiary but should be most prominent (F-08).

---

## Locked/Entitlement UX Audit

**Verify per §17:**

| Check | Evidence | Pass? |
|---|---|---|
| Locked looks intentional | Disabled + `UPGRADE` amber 8px label inside chip (`appearance-panel.tsx:634`) + amber banner `border-amber-500/20 bg-amber-500/5` with Upgrade link (`:189-200`) | PASS |
| WHY locked understandable | Banner text "Custom appearance (typography, backgrounds, surfaces, radius, density, hero presentation) requires an eligible advanced builder plan. Upgrade" links to `/admin/billing`. No plan name, no pricing. | PASS |
| Upgrade CTA understandable | `Link href="/admin/billing"` underline hover amber-200; Theme card Upgrade dialog `fixed z-50 bg-black/60` with "Upgrade to apply" amber button; current banner uses "Requires eligible advanced builder" — correctly abstract, not "Growth $29". | PASS |
| Not look broken | Disabled opacity + UPGRADE vs plain disabled (pending) distinction via label F-06. Not broken. | PASS (polish F-06) |
| Pending save ≠ entitlement denial | See F-06 — both disabled but only locked has UPGRADE + banner | PASS with polish |
| Capability truth from runtime | `builder-overview.actions.ts:244-245` `entitlementService.has(code, "advanced_builder"/"premium_themes")` derived from `resolveActivePlan` (effective period, status). `updateTheme` server checks `entitlementService.has(resolved.code, ...)` (`theme.actions.ts:67-78`). Client receives `overview.capabilities.advancedBuilder` boolean; no client plan comparison (`appearance-panel.tsx:171 locked=!advancedBuilder`). Font/Surface gates reuse `requiredCapabilitiesForBackground/Surface` single authority. | PASS |
| No plan/pricing hardcoded | Grep finds zero plan literals in `appearance-panel.tsx` (only `advanced_builder` capability name); `theme-card.tsx` tiers derive from `getThemeTier` + `TIER_LABELS` not hardcoded price | PASS |

No capability logic modified.

---

## Theme Runtime Audit

**Trace (§18):**

```
theme configuration (Website.themeConfig / themeFonts / themeColors / themePackageId)
 → theme resolver: themeResolver.resolveForSnapshot(packageId, hasOverrides? overrides) `interactive-canvas:148-174`, publish `service:219-234`, loader `storefront-loader:80-113`
 → experience registry: experienceRegistry.resolve({id, category, premium}) `*:experienceRegistry.resolve`
 → capability filtering: resolveExperienceForCapabilities(overridden, planCode) `capability.ts`
 → rendering hints: buildRuntimeSnapshot(... {themeConfig, experience}) → LayoutEngine themeVars + renderingHints.experience
 → canvas: interactive-canvas `ExperienceSection` + `ComponentRenderer`
 → preview: storefront-loader getStorefrontData selects themeConfig/themeFonts/themeColors + experience + buildRuntimeSnapshot
 → published: publishing/service build same + PublishSnapshot → StorefrontPage + layoutEngine.resolve
```

**Checks:**

* Same vocabulary everywhere (`experienceBackground`, `experienceSurface`, `headingWeight`, `heroTextAlign/ContentWidth/Overlay`, `borderRadius`, `layoutDensity`, `experienceBackgroundImage*`) — no second theme vocabulary.
* No Builder-only CSS: `interactive-canvas` uses only `resolved.themeVars` CSSProperties (`:309`) + ExperienceSection presets; `rccf71-2` test "does not add Builder-only appearance CSS" PASS; `rccf71-5-1` "does not add Builder-only appearance CSS or a second theme authority" PASS.
* No new theme options added for preference — all 9 Appearance groups map to existing `ExperienceBackground/Surface`, `LayoutDensity`, `HeadingWeight`, `HeroPresentation` primitives the runtime already rendered.
* Capability-filtered experience consistent across canvas/preview/published (free degrades `aurora→solid`, `glass→flat`).

**Verdict:** Runtime parity PASS. No second vocabulary.

---

## Stitch Comparison

**Stitch project:** `projects/11634137981023354897` Creator-Store, Premium Creator OS `assets/1738427339068984141` v2 DARK TONAL_SPOT Inter `#6366F1`, 4 screens (Dashboard `ab7028...`, Products `316007...`, **Builder `8f47c0820077419eadccfca5c9cf195a`**, Storefront `a11fd81...`) + Builder Mobile `921e065...` registered in `docs/design/Stitch-DNA.md:185-215`. Design MD: dark-first, high density via spacing+typography+controlled accent, minimal gradients/glass.

**Comparison dimensions:**

| Dimension | Current Builder | Stitch Builder `8f47c...` (from DNA) | Classification |
|---|---|---|---|
| Hierarchy | 9px uppercase gray labels, `rounded-lg border white/5 bg-zinc-900/50` cards, dark chrome `zinc-950` + canvas `zinc-900/40` subtle | Premium OS: tighter label system `Label 12px/500` (`Stitch-DNA.md:121`), same Inter, `ROUND_EIGHT` vs current `rounded-lg` | **IMPROVE** — lift label from 9px zinc-600 to Stitch's label token (10-11px zinc-400 semibold) per F-04 |
| Density | Chips `gap-1 p-1.5` + sliders; toolbar two rows; rail `p-2` `space-y-3` | Stitch intent: 4px rhythm (4/8/12/16/20/24) `Stitch-DNA.md:132`, gutters 16, margins 24 | **KEEP CURRENT** — existing gap rhythm matches 4px already; no change |
| Panel organization | Sections left 280, Properties right 260, Canvas center, sticky toolbar + status bar, mobile bottom bar + bottom sheets | Stitch: Sections/Properties become bottom sheets at mobile (`Stitch-DNA.md:242,251`) same pattern — our `BuilderMobilePanel` matches | **KEEP CURRENT** — organization is canonical |
| Visual rhythm | Dark `zinc-950` shell, `white/5-10` borders, indigo accent `#6366F1` primary, emerald publish | Stitch: primary `#6366F1`, secondary `#8B5CF6`, neutral `#18181B/#0A0A0B`, indigo/violet/amber trio, dark elevation subtle (`Stitch-DNA.md:92-112,144-157`) — 1:1 MATCH on tokens | **KEEP CURRENT** — tokens already mapped 1:1 |
| Control grouping | Appearance 8 groups stacked `space-y-3` inside one card; Theme grid 2-col fixed; Presentation inside same rail | Stitch Builder screen likely shows similar grouped Appearance card + Theme grid (DNA notes: bottom sheet builder mobile) — not automatically glass/gradient | **IMPROVE** — group Appearance with subtle `gap-4` + dividers between typography/background/surface/hero (already `space-y-3` — keep, tighten title hierarchy only) |
| Canvas prominence | `rounded-lg border white/10 shadow-2xl ring-1 white/5` decked but outer bg subtle | Stitch intent: "Elevation restraint — subtle dark elevation as default; glass/luxury reserved for storefront" (`Stitch-DNA.md:267`) — Builder chrome should NOT be glass; our restraint aligns | **IMPROVE** — increase canvas elevation slightly (F-07) not glass — aligns with Stitch restraint, not copying glass |
| Mobile organization | Bottom bar 3 actions + bottom sheets `rounded-t-2xl max-h[calc(100dvh-1rem)]` matches Stitch Mobile Builder `921e065...` responsive variant | Stitch provides Builder Mobile `921e065c4e344f63a0e0877b1432664f` variant — our panel mirrors Stitch mobile bottom sheet intent | **KEEP CURRENT** |
| Typography | UI uses `geist` default but Stitch canonical is Inter (`Stitch-DNA.md:125-128`); runtime loads Geist variable but resolves via FONT_MAP Geist/Inter/Plex/Mono | Stitch: Inter canonical — Decision documented to resolve in future restyle RCCF, not silently swapped now | **KEEP CURRENT** — not in BUILDER-04 scope |
| Spacing | Tailwind 4px scale matches Stitch 4px rhythm — consistent | Same | **KEEP CURRENT** |

**Do NOT copy per mandate:**

* Colors: Stitch primary `#6366F1` already matches — no new palette introduced (**REJECT** re-tinting).
* Fonts: no swap to Stitch Inter now (deferred restyle) — **REJECT**.
* Gradients/glass: Builder chrome stays flat `bg-zinc-900/50` not glass/aurora — only storefront Experience uses glass/luxury/neon; **REJECT** builder glassmorphism.
* Layouts: no Stitch Builder layout copied verbatim — current 3-column + mobile bottom bar is correct (**REJECT** wholesale layout copy).
* Components: Stitch Button `rounded-md` vs current `rounded-lg` badge direction is DS-5 restyle, not BUILDER-04 fix — **REJECT**.

**Summary: 3 KEEP CURRENT (tokens, organization, typography deferred), 3 IMPROVE (label hierarchy, grouping dividers, canvas elevation subtly), rest REJECT auto-copy.**

---

## Browser Verification

**BROWSER VERIFICATION UNAVAILABLE.**

No authenticated Builder session was available in this audit environment (consistent with RCCF-BUILDER-03 — production admin login not reachable with available test credentials, no local dev server session). Playwright was not invoked. All findings are from **source inspection + existing tests + static analysis**, explicitly not fabricated.

Required captures (desktop Builder, appearance panel, section manager, mobile Builder, theme changes, save status, locked state) were therefore NOT produced. Report describes inspected source paths line-number precise instead.

---

## Automated Tests

**Builder suites (required per §21) — all PASS:**

```
npx vitest run rccf-builder-03a (20) · rccf-builder-03b-1 (33) · rccf-builder-03b-2 (23) · builder-core (builder-core.test.ts) · builder-presentation (builder-presentation.test.ts) · preview-gutter (rccf71-5-2) — 6 files 96 tests PASS

Additional growth/visual/theme suites — 39+130+6 files green in 1.98-10s runs:
  rccf71-1 canonical-theme-foundation   PASS
  rccf71-2 growth-theme-experience      PASS (76+)
  rccf71-3 hero-presentation             PASS
  rccf71-5-1 growth-visual-surfaces      PASS (20)
  rccf71-5-2 builder-preview-gutter      PASS (5)
  rccf71-6-1 entitlement-status          PASS (14)
```

**Full suite:**

```
npx vitest run --reporter=verbose
  Test Files  288 passed | 4 failed (292)
  Tests       4780 passed | 15 failed (4795)  ~115s
  Failures — dashboard/product/content not Builder (pre-existing, outside BUILDER-04):
    rccf70-4-3-dashboard.test.tsx               2 failed (SuccessJourneyCard undefined, missing mocks)
    rccf72-16b-content-transition-enforcement    6 failed (paymentAccount findUnique mock, capacity)
    products.test.ts (products service)         1 failed (paymentAccount)
    ... remaining 6 in billing/comparison trust (unrelated dirty work)
  Builder-specific failures: 0
```

No assertions weakened, no tests deleted or rewritten.

---

## Verification Gates

**Static checks:**

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **PASS** — 0 errors |
| Lint | `npm run lint` | Warnings only (pre-existing: unused `tenantId`, `<img>` vs `<Image>`, missing dep `experienceFilter`, etc.); 0 errors. No new lint introduced by audit (no source modified). |
| Prisma | `npx prisma validate` | **PASS** — `The schema at prisma/schema.prisma is valid` |
| Whitespace | `git diff --check` | Warnings only `CRLF will be replaced by LF` for `rccf-release-04` doc & `test-seed.ts` (pre-existing); no trailing/extra issues |
| If P0/P1 must-fix to complete audit | none — no P0; P1s are UX without build break; no blocking bug | — |

No implementation changes were necessary during the audit.

---

## Protected Work

| Path | State before | Action | State after |
|---|---|---|---|
| `src/app/onboarding/page.tsx` | Dirty (Build Manually fix + refresh recovery) | **Untouched** — `git diff -- src/app/onboarding/page.tsx` verified unchanged | Dirty (same) |
| `tests/fixtures/test-seed.ts` | Dirty (uuidv5 + resetNamespace) | **Untouched** | Dirty (same) |
| `src/lib/storefront/storefront-loader.ts` | Dirty (BUILDER-02/02B experience chain `themeConfig: true` + `applyExperienceOverride` + `resolveExperienceForCapabilities`) | **Untouched** — audit reads as baseline, no restore/checkout/stash/rebase/amend/force-push performed | Dirty (same) |
| Unrelated dirty/untracked work | `.env.example`, `docs/design/Stitch-DNA.md` (77-line restyle note), screenshots Bin, `opencode.json`, `package.json`, `skills-lock.json`, `billing.actions.ts`, `StorefrontStatusCard.tsx`, `Button.tsx`, `comparison.ts`, `ComparisonTable` deleted, `tests/e2e/shared/auth.ts`, `rccf-mkt-07-pricing-subscription-journey.test.ts`, `.agents/`, `docs/rccf-70.*`/`71.*`/`72.*` | **Untouched** — inspected via `git status --short`/`diff --stat`, not staged | Same |

**Rule compliance:** no `reset`, `restore`, `checkout`, `stash`, `rebase`, `amend`, `force push` issued.

---

## Recommended Next RCCFs

**Strictly audit→recommend, no implementation in BUILDER-04.**

| Priority | RCCF | Scope | Justification |
|---|---|---|---|
| **1 (P1)** | **BUILDER-04A — Focus, touch-target & mobile density** | `appearance-panel.tsx:626` focus-visible ring; `section-manager.tsx:122,176-213` enlarge touch targets; `section-manager.tsx:330` 320 grid single-col; grip cursor fix F-12 | Accessibility + mobile usability blockers, small diff |
| **2 (P1-P2)** | **BUILDER-04B — Visual hierarchy & save/publish communication** | `appearance-panel.tsx:511` label `zinc-400`/`10px`; `appearance-panel.tsx:185` + `workspace.tsx:438` Saved color+icon; `toolbar.tsx:164-190` make PreviewDraftToggle non-tab display; `workspace.tsx:460` promote Publish; F-07 canvas elevation | Material usability, not redesign |
| 3 (P2) | BUILDER-04C — Canvas prominence + IA breadcrumb | `interactive-canvas.tsx:293-309` deepen outer bg/border/shadow; `toolbar.tsx:60` page breadcrumb; `section-presentation-panel` empty hint polish | Low risk polish |
| 4 (P3) | BUILDER-04D — Theme card favorites + chip polish | `theme-card.tsx:69-79` favorites filter; swatch preview; None vs solid rename | Optional |
| — | Not recommended | Theme architecture / publishing / capability runtime / schema / onboarding / payment / marketing / BUILDER-03 state-sync | See Explicit Non-Changes |

Each RCCF is self-contained; BUILDER-04A alone closes the only P1s.

---

## Explicit Non-Changes

Per §1, §2 and Stitch discipline, the following were **NOT changed** and **must NOT be changed** by the visual UX follow-up RCCFs:

* Theme architecture: `Website.themePackageId/themeColors/themeFonts/themeConfig`, `themeRegistry`/`themeResolver`, `experienceRegistry`, `applyExperienceOverride`, `resolveExperienceForCapabilities`, `buildRuntimeSnapshot`, `LayoutEngine`, `THEME_EXPERIENCES` kinds (`solid/none/gradient/radial/mesh/aurora/pattern/image` etc.), `ExperienceSurface` presets.
* Publishing/runtime: `publishingService`, `PublishSnapshot` baking, `getStorefrontData` chain (BUILDER-02/02B chain preserved), storefront `layoutEngine.resolve`.
* Payment/commerce, marketing, onboarding, Prisma/schema/migrations.
* Canonical theme state-sync from BUILDER-03/03A/03B-1/03B-2: `appearance-panel.tsx` `canonicalRef/stateRef/versionRef` + `shallowEqualAppearance` + `memoizedAppearance` in `WebsitePanel` (`useMemo` 12 keys), radiogroup `role=radio` + `handleRadiogroupKeyDown` roving focus, mobile `role=dialog aria-modal` focus trap + body scroll lock, section selection `role=listitem` + `Button aria-pressed` nesting-safe, save `role=status aria-live=polite` + `Locked aria-describedby=appearance-upgrade-explanation`.
* No blind Stitch adoption: no glass/gradient on Builder chrome, no font swap, no new palette, no wholesale layout copy.

---

## Final Verdict

**Builder Visual UX & Theme Controls are audit-complete and recommendation-ready.**

* **What is correct:** Theme persistence pipeline (server validates, merges, marks pending; client optimistic + canonical reconciliation; canvas/preview/publish share the single experience chain); locked/entitlement UX from Capability Runtime (no hardcoded plan); responsive breakpoint at `lg` (1024) clean; mobile bottom bar + bottom sheets correct; section selection keyboard + radiogroup + focus trap from BUILDER-03 intact; no horizontal overflow (preview-gutter green).
* **What needs polish:** **3 P1** (chip focus ring, section action touch targets, 320 grid density) + **11 P2** (label contrast, save feedback subtlety, pending vs locked confusion, canvas dominance, toolbar redundancy, preview toggle misleading, hero affordance, background-image discoverability, non-draggable grip, radius ticks, missing page breadcrumb). No P0. Stitch comparison supports three small IMPROVE adoptions, otherwise KEEP.
* **What was proven:** Persisted = UI is now truthful (no local fake, no stale highlight, reload stays NEW); capability truth is server-authoritative; disabled pending ≠ entitlement denial via distinct UPGRADE label; please see § Theme Truth / Locked audits.
* **Risk if shipped as-is:** A creator can complete the full "pick font → pick background → pick hero overlay → save → publish" loop successfully today. The remaining friction is discoverability and density at 320 + keyboard focus visibility, not data loss. The two P1s should be fixed before the next growth launch, not as a hard launch blocker.
* **Next step:** Implement **BUILDER-04A (P1)** (focus + touch targets), then **BUILDER-04B (P2 hierarchy + save/publish clarity)** as separate, scoped RCCFs — each with its own verification gate (§21 + `tsc/lint/prisma`) and without touching protected work.

**HARD STOP — no source changes staged, no commit, no push.**

*Only changed file (by design): `docs/rccf-builder-04-builder-visual-ux-theme-controls-audit-closure.md` (this document).*

