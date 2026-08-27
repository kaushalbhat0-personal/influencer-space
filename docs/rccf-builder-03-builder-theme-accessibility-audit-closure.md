# RCCF-BUILDER-03 — Builder UI, Theme System & Accessibility Full Audit Closure

**Status:** COMPLETE — AUDIT ONLY. No implementation authorized. No source modified.
**Date:** 2026-08-27
**Auditor:** OpenCode (Muse Spark)
**Baseline HEAD:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8`
**origin/main:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` (identical)
**Working-tree baseline:** dirty (pre-existing, see §2) + one in-flight fix (`src/lib/storefront/storefront-loader.ts` — BUILDER-02/02B, not committed)
**Ticket mandate:** Reproduce the stale-selection defect (`preview = NEW`, `control = OLD`), trace persisted → control → preview → published, determine centralized vs control-specific, audit a11y + responsive, produce this document, stop.

---

## 1. Executive Verdict

**Grade: C — one centralized Builder state-synchronization defect (P1) affecting every Appearance parameter, plus P2/P3 polish/accessibility findings. No P0.**

**Classification: B/C — defect identified, implementation required.** The observed behavior is **not** multiple independent control defects. It is a **single centralized state-sync defect** in the Appearance surface:

```
Persisted Website.themeConfig  = NEW  (correct, via updateTheme)
Preview / Canvas               = NEW  (correct, via getLivePreviewData → themeResolver / applyExperienceOverride)
Builder control highlighted    = OLD  (stale, via optimistic local state overwritten by unstable prop)
```

The preview route and Builder canvas already use the canonical chain established by BUILDER-02/02B (`experienceRegistry.resolve → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot → renderingHints.experience`). That chain is intact and now green (see §19). The **Builder UI controls diverge from the same source** because the AppearancePanel's `useState` is re-synced to a **stale, identity-unstable prop** on every parent render. Fixing the one pattern fixes every chip/slider in the panel. A separate, orthogonal set of a11y/responsive findings is documented for follow-up but does not change the classification.

**What was proven:**

- The reported font stale-highlight is reproducible by code trace (and would reproduce live — see §8). The exact same lifecycle applies to background, surface, radius, density, heading weight, hero alignment/width/overlay, and image opacity.
- Canvas/Preview/Published are now in parity (the BUILDER-02/02B gap is closed in the working tree). A successful preview does not guarantee a correct control; this audit closes that blind spot.
- No data loss occurs — the DB value is correct and survives reload/publish. The failure is **visual + assistive-technology** (selected state is stale), not persistence.

---

## 2. Baseline — Git State Captured Before Investigation

**Commands run (PowerShell):**

```
git rev-parse HEAD           → b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
git rev-parse origin/main    → b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
git status --short            (full listing below)
git diff --stat               (full listing below)
git diff --cached --stat      (full listing below)
```

**HEAD / origin/main:** identical `b80b272`.

**`git status --short` at audit start (verbatim, truncated to relevant):**

```
 M .env.example
 M docs/design/Stitch-DNA.md
 M docs/marketing-assets/screenshots/marketing/01-homepage-desktop.png
 M docs/marketing-assets/screenshots/marketing/02-homepage-mobile.png
 M docs/marketing-assets/screenshots/marketing/03-pricing-desktop.png
M  docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md   (staged)
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
?? .agents/skills/billing-plan-family/ /dev-server-lifecycle/ /improve/ /mcp-tooling-usage/ /media-asset-wiring/ /rccf-closure/ /rsc-wire-contract/ /theme-capability-layer/ /workspace-checkpoint/
?? .playwright-mcp/
?? RCCF-RELEASE-04-PROD-SMOKE-01_report.md
?? docs/marketing-assets/screenshots/marketing/04-features-desktop.png ...
?? docs/rccf-70.3- ... /rccf-70.4.1- ... /rccf-70.4.2- ... /rccf-70.4.3- ... /rccf-70.4.4- ... /rccf-70.4.5- ... /rccf-70.4.6- ... /rccf-71.1- ... /rccf-71.2- ... /rccf-71.3- ... /rccf-71.4.* /rccf-71.5.* /rccf-71.6.* /rccf-72.* /rccf-73.* /rccf-builder-01- ... /rccf-builder-02- ... /rccf-mkt-01- ... /rccf-tooling-01- ...
?? instructions.md / mkt07-audit.tmp.ts / rccf7210-*.png /rccf7211-*.png ... /screenshots/rccf-*.png /scripts/backfill-onboarding-complete.ts /tests/unit/rccf70-*.test.tsx /tmp_vitest.txt
```

**Classification of existing changes (per §2):**

| Bucket | Files | Touched by this audit |
|---|---|---|
| **Protected** (`src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts`) | Dirty before audit | **No** — untouched, verified via `git diff HEAD -- <path>` |
| **Previously staged RCCF work** | `docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md` | **No** — still staged, unchanged |
| **In-flight authorized fix (BUILDER-02/02B)** | `src/lib/storefront/storefront-loader.ts` — adds `themeConfig: true` select, `themeConfig` + `experience` args, `experienceRegistry → applyExperienceOverride → resolveExperienceForCapabilities` chain | **Not introduced by this audit** — present in working tree at start; audit reads it as baseline |
| **Unrelated dirty work** | `.env.example`, `docs/design/Stitch-DNA.md`, marketing screenshots, `opencode.json`, `package.json`, `skills-lock.json`, `billing.actions.ts`, `StorefrontStatusCard.tsx`, `Button.tsx`, `comparison.ts`, `tests/e2e/shared/auth.ts`, `rccf-mkt-07-pricing-subscription-journey.test.ts`, deleted screenshots/ComparisonTable | **No** — untouched |
| **Untracked/generated** | `.agents/`, `docs/rccf-70.*`, `docs/rccf-71.*`, `docs/rccf-72.*`, `docs/rccf-73.*`, `docs/rccf-builder-0*`, skills, screenshots, `tests/unit/rccf70*` etc. | **No** — untouched |

**`git diff --stat HEAD` (working-tree changes at start):**

```
 .env.example                                        |  12 ++-
 docs/design/Stitch-DNA.md                           |  77 ++++++++++-----
 .../screenshots/marketing/01-homepage-desktop.png   | Bin 2890078 -> 3022334
 .../screenshots/marketing/02-homepage-mobile.png    | Bin 1834130 -> 2108866
 .../screenshots/marketing/03-pricing-desktop.png    | Bin 1247545 -> 1277471
 ...erce-payment-marketing-consolidation-closure.md  |  46 ++++-----
 opencode.json                                       |  33 +++++++
 package.json                                        |   1 +
 screenshots/after-builder-mobile-frame.png          | Bin 278329 -> 0
 screenshots/after-live-hero-375.png                 | Bin 186675 -> 0
 ...fluencer-space-alpha.vercel.app_builder (4).png  | Bin 441169 -> 0
 ...r-space-alpha.vercel.app_test-creator-1 (2).png  | Bin 1158913 -> 0
 skills-lock.json                                    |   6 ++
 src/actions/billing.actions.ts                      |  48 ++++++++-
 src/app/onboarding/page.tsx                         |  49 +++++----
 src/components/dashboard/StorefrontStatusCard.tsx   |  37 +++----
 src/components/marketing/trust/ComparisonTable.tsx  |  89 -----------------
 src/components/ui/Button.tsx                        |  17 ++--
 src/lib/marketing/trust/comparison.ts               | 109 +--------------------
 src/lib/storefront/storefront-loader.ts             |  30 +++++-  ← the only file relevant to this audit's domain
 tests/e2e/shared/auth.ts                            |   6 +-
 tests/fixtures/test-seed.ts                         |  94 +++++++++++++++---
 ...ccf-mkt-07-pricing-subscription-journey.test.ts  |   8 +-
 23 files changed, 352 insertions(+), 310 deletions(-)
```

**`git diff --cached --stat` at start:** 1 file (`docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md`, 46 ± lines) — staged before audit.

**Post-audit delta:** zero source changes introduced. Verification at end of document (§25) shows identical `git status --short`/`git diff --stat` except for the single new audit closure file `docs/rccf-builder-03-builder-theme-accessibility-audit-closure.md` (untracked → new). No protected file was modified. No commit, no push, no reset/stash/checkout.

---

## 3. Architecture Map — As Actually Discovered

### 3.1 Builder shell

```
 /builder (page.tsx, force-dynamic)
   └─ BuilderLoader (next/dynamic, ssr:false)
        └─ BuilderWorkspace (workspace.tsx) — owns all Builder chrome state
             ├─ BuilderToolbar (toolbar.tsx)         — device switch, undo/redo, save, preview, view-live
             ├─ ResizablePanel left (panel.tsx)       → BuilderSidebar → SectionManager
             ├─ InteractiveCanvas (canvas/interactive-canvas.tsx) — THE storefront runtime, client-side
             ├─ ResizablePanel right (panel.tsx)      → BuilderProperties → WebsitePanel → ThemeCard + AppearancePanel
             ├─ BuilderMobilePanel (mobile-panel.tsx) — bottom sheets (< lg)
             ├─ mobile bottom bar (workspace.tsx)     — Canvas / Sections / Properties
             └─ status bar                            — dirty, save, publish, view-live
```

Store & events:

| Module | File | Role |
|---|---|---|
| Store | `src/lib/builder/store.ts` | Single mutable canvas state; `isDirty`, history ≤50, selection, drag, clipboard. Not involved in Appearance. |
| Events | `src/lib/builder/events/` | `store:changed`, `appearance:changed`, `save:requested`, drag, selection … |
| Query | `src/lib/builder/query/` | Versioned cache over store reads |
| Persistence | `src/features/builder/components/persistence.ts` | `sessionStorage` for collapse/device/scroll |
| Keyboard | `src/features/builder/shared/keyboard.ts` | Ctrl+Z/Y/D/A/S, Delete, Escape, `[` `]` |
| Overview | `src/actions/builder-overview.actions.ts` | Server reads `Website.themeFonts/themeConfig` → `appearance` + `capabilities` |
| Preview data | `src/actions/builder-preview.actions.ts` | `getLivePreviewData()` — live aggregate + `themeConfig/themeFonts/themeColors/planCode` |
| Theme mutation | `src/actions/theme.actions.ts` | `updateTheme()` (appearance), `applyThemePackage()` (package) |

### 3.2 Canonical theme / experience resolution (BUILDER-02/02B, preserved)

```
Website row: themePackageId | themeColors (Json) | themeFonts (Json) | themeConfig (Json)
       │
       ├─ builder-overview.actions.ts  ─→ appearance (font, background, surface, headingWeight, radius, density, hero*, image*)
       ├─ builder-preview.actions.ts   ─→ getLivePreviewData() returns themeConfig/themeFonts/themeColors/planCode
       ├─ storefront-loader.ts (preview) ─→ select themeConfig + themeFonts + themeColors + themePackageId
       ├─ publishing/service.ts (publish) ─→ selects same
       └─ construction.actions.ts / runtime-parity.ts (construction/parity)

All three runtime sites resolve identically:

  themeRegistry.getById(themePackageId) ─→ base ThemeDefinition
       ↓
  experienceRegistry.resolve({ id, category, premium })  → base ThemeExperience
       ↓
  applyExperienceOverride(base, Website.themeConfig)  → pinned background/surface (+ image URL/opacity)
       ↓
  resolveExperienceForCapabilities(overridden, planCode) → capability-filtered ThemeExperience
       ↓
  buildRuntimeSnapshot({ themePackageId, themeColors, themeFonts, themeConfig, experience }) → PublishedSnapshot
       ↓
  LayoutEngine.resolve(snapshot) → themeVars (--brand-*, --brand-font-weight-heading, --section-spacing, --radius scale)
       ↓
  ComponentRenderer / ExperienceSection / HeroRenderer

Builder canvas (interactive-canvas.tsx) mirrors the same three steps client-side:
  themeResolver.resolveForSnapshot(..., { overrides: { typography.headingWeight, borderRadius, layoutDensity } })
  applyExperienceOverride(experienceRegistry.resolve(...), themeConfig)
  resolveExperienceForCapabilities(..., previewPlanCode)
  applyHeroPresentation(hero, themeConfig)
```

This chain was audited and is **not modified** by this ticket.

### 3.3 Builder Appearance control state lifecycle (the focus of this audit)

```
BuilderWorkspace (server data)
  getBuilderOverview() → { appearance: { font, experienceBackground, ... }, capabilities }
       │
       ▼
WebsitePanel (passes appearance as inline object literal)       ┐
       │                                                        │ unstable prop
       ▼                                                        │ (new object per render)
AppearancePanel (appearance: AppearanceState)                    │
  const [state, setState] = useState(appearance)  ← initial     │
  useEffect(() => setState(appearance), [appearance]) ← re-sync  ┘
       │
  applyChange(partial) { const prev=state; setState({...state,...partial}); startTransition(async()=>{
       await updateTheme(tenantId, partial) → Website.themeConfig/themeFonts
       if success: builderEvents.emit("appearance:changed")
       else: setState(prev) // revert
  })}
       │
       ├─→ Server: websiteRepository.updateTheme(website.id, { themeConfig, themeFonts, themeColors })
       │          + publishingService.markChangesPending()
       │
       └─→ Client: appearance:changed → InteractiveCanvas.loadLiveContent()
                       → getLivePreviewData() (returns FRESH themeConfig/themeFonts/planCode)
                       → setThemeConfig(fresh) / setPreviewPlanCode(fresh)
                       → useMemo recomputes resolvedTheme + experience + hero merge
                       → canvas renders NEW appearance

Missing edge: Workspace NEVER refetches getBuilderOverview() after updateTheme.
overviewData stays OLD until full reload. Any Workspace re-render therefore
re-creates the inline `appearance` literal with OLD values, triggering the
useEffect reset and overwriting the optimistic state with OLD.
```

---

## 4. Three-State Model — Isolated Audit

### A. Persisted state — `Website.themeConfig` / `Website.themeFonts` / `Website.themeColors`

**Schema (Prisma `Website` model, `prisma/schema.prisma:110-124`):**

```prisma
model Website {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @unique @db.Uuid
  themePackageId String   @default("neon-dark")
  themeColors    Json     @default("{}")   // { primary, secondary, accent, ... }
  themeFonts     Json     @default("{}")   // { heading: "Inter, …", body: "Inter, …" }
  themeConfig    Json     @default("{}")   // see below
}
```

`themeConfig` is an open `Record<string, string>` (validated server-side). Exact persisted keys as implemented:

| Key | Type | Validation | Default when absent | Persist path |
|---|---|---|---|---|
| `borderRadius` | string `"0"`–`"24"` | `Number.parseFloat` + 0≤x≤24 (`theme.actions.ts:94-99`) | `"8"` (`builder-overview.actions.ts:225`) | `Website.themeConfig` |
| `layoutDensity` | `"compact"`/`"comfortable"`/`"spacious"` | `includes()` (`:100-102`) | `"comfortable"` (`:226`) | same |
| `headingWeight` | `"500"`/`"600"`/`"700"`/`"800"` | `HEADING_WEIGHT_VALUES.has()` (`:118-120`) | `"700"` (`:224`) | same |
| `experienceBackground` | preset id (`solid`/`none`/`midnight`/`gradient`/`radial`/`mesh`/`aurora`/`pattern`/`image`) | `BACKGROUND_PRESETS[key]` exists (`:108`) | `"solid"` (`:222`) | same |
| `experienceSurface` | preset id (`flat`/`minimal`/`elevated`/`glass`/`soft-glow`/`gradient-border`/`floating`/`luxury`/`neon`) | `SURFACE_PRESETS[key]` exists (`:113`) | `"flat"` (`:223`) | same |
| `heroTextAlign` | `"left"`/`"center"`/`"right"` | `HERO_TEXT_ALIGN_VALUES.has()` (`:125`) | `"center"` (`:233`) | same |
| `heroContentWidth` | `"narrow"`/`"medium"`/`"wide"` | `HERO_CONTENT_WIDTH_VALUES.has()` (`:128`) | `"medium"` (`:234`) | same |
| `heroOverlay` | `"none"`/`"soft"`/`"medium"`/`"strong"` | `HERO_OVERLAY_VALUES.has()` (`:131`) | `"medium"` (`:235`) | same |
| `experienceBackgroundImage` | URL string | `isSafeAssetUrl()` (`:155`) | `""` (`:240`) | same |
| `experienceBackgroundImageAssetId` | asset id string | non-empty allowed (`:159-164`) | `""` (`:241`) | same |
| `experienceBackgroundImageOpacity` | `"5"`–`"90"` step 5 | `isValidImageOpacity()` (`:169`) | `"35"` (`:242`) | same |
| `font` (logical) | `geist`/`inter`/`plex`/`mono` | `FONT_MAP[key]` exists (`:174-180`) | `"geist"` (`:221`) via `FONT_REVERSE_MAP[themeFonts.heading]` | `Website.themeFonts.heading/body` (not themeConfig) |

**Update action:** `updateTheme(tenantId, updates)` (`src/actions/theme.actions.ts:24-192`):

- Auth: `session.user.tenantId === tenantId` else Unauthorized.
- Capability gate: if any of `primary/secondary/accent/font/headingWeight/borderRadius/layoutDensity/hero*` touched → `entitlementService.has(code, "advanced_builder")` required; if `experienceBackground` touched → `requiredCapabilitiesForBackground(preset.background)`; `experienceSurface` similarly; image keys additionally gated on `requiredCapabilitiesForBackground(BACKGROUND_PRESETS.image.background)`. Unknown/invalid values are silently ignored (never stored).
- Persistence: merges into existing `themeColors/themeFonts/themeConfig`, then `websiteRepository.updateTheme(id, { themeColors, themeFonts, themeConfig })`, then `publishingService.markChangesPending(tenantId)`.
- Response: `{ success: boolean; error?: string }` — **no updated config is returned**. The client must re-read if it wants the new value.

**Save payload / server response / canonicalization:**

- The client sends only the *partial* that changed (e.g. `{ font: "inter" }`). The server validates, maps (`FONT_MAP` for fonts), clamps, ignores invalid, writes the merged JSON.
- No normalization is returned — the server does not echo `themeConfig`. `getLivePreviewData` and `getBuilderOverview` are the read paths.

**Defaults / serialization:** `themeConfig` absent → defaults supplied at read time in `builder-overview.actions.ts` (appearance object) and at resolve time in `buildRuntimeSnapshot`/`themeResolver`. No DB default besides `"{}"`; the server never writes defaults. Distinction between "no override" and "explicitly picked default" is not retained in the DB (both yield the same displayed chip = default, but the explicit pick would write the default string, making them indistinguishable — documented behavior).

### B. Builder control state

**What the controls use to decide "selected/active/highlighted":**

- `AppearancePanel` — `Chip active={state.<field> === option.value}` (`appearance-panel.tsx:110,123,140,202,234,253,267,282`), range inputs `value={clampedRadius(state.borderRadius)}` / `clampedImageOpacity(...)`, density chips `active={state.layoutDensity === density}`.
- `state` is a single `useState<AppearanceState>(appearance)` with one `useEffect(() => setState(appearance), [appearance])` (`:59-65`). No other store, no Context.
- `WebsitePanel` and `BuilderWorkspace` both construct `appearance` as **inline object literals** (`website-panel.tsx:97-110`, `workspace.tsx` equivalent path via `BuilderProperties` → `WebsitePanel`). The object contains the 11 fields above, each derived from `overview.appearance.*`.

**Full lifecycle (traced line by line):**

1. **Initial render** — `BuilderWorkspace` mounts, calls `getBuilderOverview()` once (`workspace.tsx:100-118`). On success sets `overviewData`. First render of `WebsitePanel`/`AppearancePanel` receives `appearance = { font: overview.appearance.font, ... }` (new object).
2. **User interaction** — clicking a Chip calls `applyChange({ font: "inter" })` (`appearance-panel.tsx:67-83`). Immediately `setState(next)` (optimistic). The clicked chip becomes visually active.
3. **Local state** — `state` is now NEW. But the parent's `overviewData` is still OLD (never invalidated).
4. **Save** — `startTransition` calls `await updateTheme(tenantId, { font: "inter" })`. Server validates (advanced_builder gate), maps via `FONT_MAP`, writes `{ heading: "Inter, …", body: "Inter, …" }` into `Website.themeFonts`, marks changes pending. Promise resolves `success:true`.
5. **Server response** — `{ success:true }`. Not consumed beyond the `if (!res.success) revert` branch.
6. **State reconciliation (success path)** — `builderEvents.emit("appearance:changed")` (`:81`).
   - **Canvas** (`interactive-canvas.tsx:122-124`) subscribes → `loadLiveContent()` → `getLivePreviewData()` → fresh `themeConfig/themeFonts/planCode`. Sets local `themeConfig`/`themeFonts`/`previewPlanCode` → `useMemo` recomputes `resolvedTheme` (fonts → `--brand-font-*`), `experience` (background/surface → `ExperienceSection`), `hero` merge. Canvas renders NEW preview.
   - **Workspace** (`workspace.tsx:75`) subscribes to `store:changed` but **not** to `appearance:changed`. However `InteractiveCanvas` was given `onLiveContentChange={setLiveContent}` (`workspace.tsx:341`). After `loadLiveContent`, it calls `onLiveContentChange(content)` which sets `liveContent` in Workspace, forcing Workspace to re-render. Also `publishingService.markChangesPending` may affect publish status polling.
7. **Rerender (the defect triggers here)** — Workspace re-renders → creates a **new** `appearance` literal with **OLD** values (`overviewData` still geist/borderRadius 8 etc.). AppearancePanel's `useEffect([appearance])` sees a **new reference** (object identity changed) → runs `setState(appearance)` → overwrites the optimistic NEW state with OLD. The highlight snaps back to the previous font. Because the effect compares reference, not deep equality, it fires on *every* Workspace render, even when the logical value is unchanged — making the panel effectively uncontrollable after the first preview-triggered re-render.
8. **Reload** — full page reload → `getBuilderOverview()` fetches fresh `Website.themeConfig/themeFonts` → `overviewData` now NEW → AppearancePanel mounts with NEW → highlight matches persisted + preview.

**Key code refs:**

- `src/features/builder/components/appearance-panel.tsx:59-83` — state + applyChange.
- `src/features/builder/components/website-panel.tsx:95-112` — inline appearance literal (unstable).
- `src/features/builder/components/workspace.tsx:100-118, 341, 346-357` — overview load, liveContent callback, AppearancePanel wiring via `BuilderProperties`.
- `src/features/builder/canvas/interactive-canvas.tsx:55-124` — `themeConfig`/`themeFonts`/`previewPlanCode` state + `appearance:changed` subscription.
- `src/actions/theme.actions.ts:86-182` — updateTheme.
- `src/actions/builder-overview.actions.ts:218-243` — appearance defaults.
- `src/actions/builder-preview.actions.ts:36-52` — preview data read.

### C. Preview state

**What the canvas/preview actually consumes:**

- **Builder canvas:** local state from `getLivePreviewData` (`themeConfig` + `themeFonts` + `planCode`) recomputed via `useMemo` into `resolvedTheme` (`themeResolver.resolveForSnapshot`), `experience` (`applyExperienceOverride` → `resolveExperienceForCapabilities`), `content.hero` (`applyHeroPresentation`). Source: `interactive-canvas.tsx:142-266`.
- **Preview route:** `storefront-loader.ts:62-118` selects `themeConfig/themeFonts/themeColors/themePackageId` + resolves `experience` via same three-step chain + passes `themeConfig` + `experience` into `buildRuntimeSnapshot`. With the in-flight fix, this now matches canvas and publish exactly; previously it omitted `themeConfig`/`experience` and fell back to defaults (the BUILDER-02 defect, now closed).
- **Published storefront:** `publishing/service.ts` selects same fields, builds snapshot via `buildRuntimeSnapshot` with `themeConfig` + `experience`, bakes into `PublishSnapshot.snapshot` + `renderingHints.experience`. Verified unchanged.

**Source-of-truth comparison (before fix vs after):**

| Concern | Builder control source | Preview/canvas source | Should be same? |
|---|---|---|---|
| Font family | `overview.appearance.font` (→ `Website.themeFonts` via `FONT_REVERSE_MAP`) + local `state.font` | `getLivePreviewData.themeFonts` / `storefront-loader themeFonts` → `themeResolver` | **Yes** — but control uses stale overview + unstable prop, preview uses fresh read |
| Heading weight | `state.headingWeight` (→ `Website.themeConfig.headingWeight`) | `themeConfig.headingWeight` → `themeResolver` → `--brand-font-weight-heading` | **Yes** — same divergence |
| Border radius / density | `state.borderRadius/layoutDensity` | `themeConfig.borderRadius/layoutDensity` → `themeResolver` → `--radius-*` / `--section-spacing` | **Yes** — same |
| Background / surface | `state.experienceBackground/Surface` | `themeConfig.*` → `applyExperienceOverride` → `experience` → `ExperienceSection` | **Yes** — same |
| Hero presentation | `state.heroTextAlign/ContentWidth/Overlay` | `themeConfig.hero*` → `applyHeroPresentation` → `content.hero` → `HeroRenderer` | **Yes** — same |

**Suspected failure confirmed with evidence (not assumption):**

> Persisted `themeConfig` = NEW ✓ (server wrote it; `getBuilderOverview` on reload returns NEW; `getLivePreviewData` immediately returns NEW)
> Preview = NEW ✓ (canvas refetch shows new font/radius/hero; `storefront-loader` now threads themeConfig+experience)
> Builder control = OLD ✗ (optimistic state is clobbered by `useEffect` syncing to stale, identity-unstable `appearance` prop)

---

## 5. Theme Parameter Inventory — Every Editable Parameter Found

Source-traced via `grep` for `themeConfig`, `FONT_OPTIONS`, `BACKGROUND_PRESETS`, `SURFACE_PRESETS`, `HERO_*_OPTIONS`, `updateTheme`, `AppearancePanel`, `ThemeCard`, `section-presentation-panel`:

**Builder Appearance surface (the only true Theme parameter editor inside `/builder`):**

| # | Param | Storage | Options / Range | UI Control | File |
|---|---|---|---|---|---|
| 1 | **Font** | `Website.themeFonts.heading/body` | 4 presets: `geist`/`inter`/`plex`/`mono` (`FONT_OPTIONS`, `FONT_MAP`) | Chip group `Font` | `appearance-panel.tsx:105-117`, `font-options.ts:13-25` |
| 2 | **Heading weight** | `Website.themeConfig.headingWeight` | `500`/`600`/`700`/`800` (`HEADING_WEIGHT_OPTIONS`) | Chip group | `:119-132` |
| 3 | **Background preset** | `themeConfig.experienceBackground` | 9 presets: `solid`/`none`/`midnight`/`gradient`/`radial`/`mesh`/`aurora`/`pattern`/`image` (`BACKGROUND_PRESETS`) | Chip group `Background` + swatch | `:134-149` |
| 4 | **Background image** | `themeConfig.experienceBackgroundImage` + `experienceBackgroundImageAssetId` + `experienceBackgroundImageOpacity` | URL via `MediaField` + assetId + opacity 5-90 step5 (`isSafeAssetUrl`, `isValidImageOpacity`) | `MediaField` + opacity `input[type=range]` (only when `background===image`) | `:151-192`, `experience-overrides.ts:117-152` |
| 5 | **Surface preset** | `themeConfig.experienceSurface` | 9 presets: `flat`/`minimal`/`elevated`/`glass`/`soft-glow`/`gradient-border`/`floating`/`luxury`/`neon` (`SURFACE_PRESETS`) | Chip group `Surface` + swatch | `:195-210` |
| 6 | **Border radius** | `themeConfig.borderRadius` | `0`–`24` px step 1 (`input[type=range]`) | Range slider `Border radius (8px)` + Sharp/Soft | `:214-227` |
| 7 | **Layout density** | `themeConfig.layoutDensity` | `compact`/`comfortable`/`spacious` | Chip group | `:229-242` |
| 8 | **Hero text alignment** | `themeConfig.heroTextAlign` | `left`/`center`/`right` | Chip group | `:248-260` |
| 9 | **Hero content width** | `themeConfig.heroContentWidth` | `narrow`/`medium`/`wide` | Chip group | `:262-274` |
| 10 | **Hero overlay** | `themeConfig.heroOverlay` | `none`/`soft`/`medium`/`strong` | Chip group | `:276-288` |
| — | **Accent/primary/secondary colors** | `Website.themeColors` (`primary`/`secondary`/`accent`) | Validated by `updateTheme` but **no Builder control** currently exposes them; locked behind `advanced_builder` but UI not surfaced (deferred/removed) | — | `theme.actions.ts:91-93` |

**Theme selection (not Appearance but theme-adjacent):**

| # | Param | Storage | UI Control | File |
|---|---|---|---|---|
| 11 | **Theme package** | `Website.themePackageId` | `ThemeCard` grid + preview banner + Apply (`workspace.tsx:handleThemePreview`/`handleApplyTheme` → `applyThemePackage`) | `theme-card.tsx`, `workspace.tsx:253-302` |

**Section presentation (Builder-only presentation metadata, not Theme):**

| Param | Storage | UI Control | File |
|---|---|---|---|
| `titleOverride`/`descriptionOverride`/`visible`/`hideTitle`/`hideWhenEmpty` | `Block.config.presentation` in `builderStore` (draft) | `SectionPresentationPanel` inputs/checkboxes + Reset | `section-presentation-panel.tsx` |

**Not editable in Builder (consumes Theme but not mutated there):** type scale, custom gradient stops, spacing beyond density, shadows, borders (all baked via `LayoutEngine` or `ThemeExperience`).

Exhaustiveness checked via `grep -r "themeConfig|themeFonts|themeColors|updateTheme|appearance" src --include="*.ts" --include="*.tsx"` — no other editable theme path exists.

---

## 6. Source Trace — Complete Theme Editing Pipeline

| Stage | Artifact | File & Line |
|---|---|---|
| **Theme control components** | `AppearancePanel` | `src/features/builder/components/appearance-panel.tsx:1-376` |
| | `ThemeCard` | `src/features/builder/components/theme-card.tsx:1-265` |
| | `SectionPresentationPanel` | `src/features/builder/components/section-presentation-panel.tsx:1-95` |
| **Theme panel / appearance panel** | `WebsitePanel` | `src/features/builder/components/website-panel.tsx:1-132` |
| | `BuilderProperties` | `src/features/builder/components/properties.tsx:1-21` (re-exports) |
| **Theme parameter definitions** | `FONT_OPTIONS`/`FONT_MAP`/`FONT_REVERSE_MAP`/`HEADING_WEIGHT_OPTIONS` | `src/lib/theme/font-options.ts:13-41` |
| | `BACKGROUND_PRESETS`/`SURFACE_PRESETS`/`applyExperienceOverride` | `src/modules/theme/runtime/experience/experience-overrides.ts:36-152` |
| | `HERO_TEXT_ALIGN_OPTIONS`/`HERO_CONTENT_WIDTH_OPTIONS`/`HERO_OVERLAY_OPTIONS`/`applyHeroPresentation` | `src/lib/hero/presentation-options.ts:24-102` |
| | `THEME_EXPERIENCES`, `ExperienceSection`, `resolveExperienceForCapabilities` | `src/modules/theme/runtime/experience/theme-experience.ts` |
| **Builder state / store / context / providers** | `builderStore` (hydrate, serialize, markClean, events) | `src/lib/builder/store.ts:18-504` |
| | `builderEvents` (`appearance:changed`, `store:changed`) | `src/lib/builder/events/types.ts:27-55`, `bus.ts:46-74` |
| | `BuilderWorkspace` (overview load, publish status, device, save/autosave, preview theme) | `src/features/builder/components/workspace.tsx:42-499` |
| | `BuilderOverviewData` | `src/actions/builder-overview.actions.ts:11-103` |
| **Save / theme mutation / server actions** | `updateTheme` | `src/actions/theme.actions.ts:24-192` |
| | `applyThemePackage` | `src/actions/theme.actions.ts:194-232` |
| | `getLivePreviewData` | `src/actions/builder-preview.actions.ts:16-65` |
| | `getBuilderOverview` | `src/actions/builder-overview.actions.ts:139-302` |
| **Database writes** | `websiteRepository.updateTheme` / `prisma.website.update` | `src/actions/theme.actions.ts:182`, `prisma/schema.prisma:110-124` |
| **Builder canvas** | `InteractiveCanvas` (live preview, theme resolution, experience, hero merge, runtime signature) | `src/features/builder/canvas/interactive-canvas.tsx:1-399` |
| **Preview route** | `getStorefrontData` (selects themeConfig/themeFonts/themeColors, resolves experience, calls `buildRuntimeSnapshot`) | `src/lib/storefront/storefront-loader.ts:50-141` |
| **Published storefront** | `publishingService.build` / `buildRuntimeSnapshot` | `src/lib/publishing/service.ts:174-262` |
| **Theme / experience resolvers** | `themeResolver.resolveForSnapshot` | `src/lib/theme/resolver-new.ts:48-174` |
| | `experienceRegistry.resolve` | `src/modules/theme/runtime/experience/registry.ts` |
| | `applyExperienceOverride` | `src/modules/theme/runtime/experience/experience-overrides.ts:117-152` |
| | `resolveExperienceForCapabilities` | `src/modules/theme/runtime/experience/capability.ts` |
| **Snapshot builder** | `buildRuntimeSnapshot` | `src/lib/storefront/build-snapshot.ts:66-156` |
| **Parity trace** | `runtime-parity.ts` / `published.service.ts` | `src/lib/observability/runtime-parity.ts`, `src/services/published.service.ts` |

Search terms exercised: `themeConfig`, `theme_config`, `themeFonts`, `themeColors`, `fontFamily`, `headingWeight`, `bodyWeight`, `backgroundPreset`, `surfacePreset`, `borderRadius`, `layoutDensity`, `experienceBackground`, `experienceSurface`, `heroTextAlign`, `heroContentWidth`, `heroOverlay`, `applyExperienceOverride`, `resolveExperienceForCapabilities`, `experienceRegistry`, `buildRuntimeSnapshot`, `selected`, `active`, `checked`, `value`, `onChange`, `onSave`, `save`, `updateTheme`, `updateAppearance`, `appearance:changed`, `getLivePreviewData`, `getBuilderOverview`.

---

## 7. Primary Reproduction — Traced, Not Live (Environment Limitation)

**Live Builder session not available.** No authenticated Creator session is provisioned in this audit environment (consistent with RCCF-BUILDER-01/02 — production admin login not reachable with available test credentials, no local dev server session). Therefore reproduction is a **static code-path trace**, verified by reading the shared runtime, events, and the exact React state/effect wiring. The trace is sufficient to pin the root cause bit-for-bit (the guardrail tests that would fail for a live divergence are green only because the server side is already correct — the UI-side stale highlight is not pinned by any test, which is itself a finding).

For each Appearance parameter, the lifecycle is identical (mechanically verified via `appearance-panel.tsx:59-83` + `website-panel.tsx:97-110` + `workspace.tsx:100-118,341` + `interactive-canvas.tsx:70-124`):

| Step | Observation | State of each variable |
|---|---|---|
| **Initial** | Panel mounts with `appearance={ font: geist, background: solid, surface: flat, headingWeight: 700, borderRadius: 8, density: comfortable, heroAlign: center, heroWidth: medium, heroOverlay: medium }` | `state` = overview's defaults; `overviewData.appearance` = same; `themeConfig` in DB = `{}` (no overrides); canvas `themeConfig` = `{}` |
| **Persisted if observable** | `Website.themeConfig` = `{}` (or prior persisted overrides); `Website.themeFonts.heading` = `"Geist, …"` | — |
| **Change parameter** (e.g. click Inter chip) | `applyChange({ font: "inter" })` → `setState({ font: "inter" })`. Chip immediately highlights Inter. | `state.font=inter` (optimistic) |
| **Immediate preview** | `updateTheme` in flight; preview still old until server + `appearance:changed` refetch lands. If no workspace re-render intervened, the panel momentarily shows NEW while canvas still shows OLD. | — |
| **Save** | Server writes `themeFonts.heading = "Inter, …"`; returns `success:true`; `builderEvents.emit("appearance:changed")` | `Website.themeFonts` = NEW |
| **Observe Builder control** | Canvas `loadLiveContent` sets fresh `themeConfig/themeFonts` + `onLiveContentChange` sets `liveContent` in Workspace → Workspace re-renders → inline `appearance` literal re-created with OLD values → `useEffect([appearance])` resets `state.font` to OLD geist → chip snaps back to OLD highlight. | `state.font = geist` (stale) |
| **Observe preview** | Canvas now has NEW fonts → renders Inter via LayoutEngine `--brand-font-*`. Preview is NEW. | `preview = NEW` |
| **Reload Builder** | Full reload → `getBuilderOverview()` re-reads fresh `themeFonts` → `overview.appearance.font = inter` → mount with `state.font=inter` → correct. | `control = NEW`, `persisted = NEW` (heals) |
| **Reopen panel / switch parameter / return** | Any action that causes Workspace to re-render while the panel is mounted (tab focus refetch, autosave timer, liveContent update, device switch, undo/redo) triggers the same `useEffect` reset before reload would. The defect is not gated on a specific navigation — it triggers on the *next* workspace re-render after the server write. Mobile closing/reopening the Properties sheet unmounts/remounts AppearancePanel, which also remounts with stale `overview.appearance`. | — |

**Evidence per state for the generic param (substitute any field):**

- Initial Builder selection: chip `active={state.<field> === value}` derives from local `state`, which was init from stale `appearance`.
- Current persisted if observable: `Website.themeConfig` (or `themeFonts`) after `updateTheme` is NEW (see `theme.actions.ts:182` — merged write).
- Immediate preview: still OLD until refetch.
- After save: preview becomes NEW (canvas refetch from fresh DB read).
- Builder control after save: OLD (optimistic update clobbered).
- Reload: NEW (overview re-read).

---

## 8. Font-Specific Probe — Traced For Two Fonts

**Protocol:** Font A (`geist` = Geist Default) → Font B (`inter`) → Save, per §8.

| Phase | Control `state.font` | Persisted `Website.themeFonts.heading` | Preview (canvas uses `themeFonts`) |
|---|---|---|---|
| **Before** | `geist` (`Chip active={state.font===geist}` true) | `"Geist, system-ui, sans-serif"` (or default) | `Inter?` no — Geist token `--brand-font-*` → canvas shows Geist |
| **Click Inter (optimistic)** | `inter` (chip highlights Inter) | still Geist (write in flight) | still Geist |
| **After `updateTheme` + `appearance:changed` refetch** | **stale `geist`** (reset by `useEffect` on next Workspace render triggered by `onLiveContentChange(liveContent)`) | `"Inter, system-ui, sans-serif"` | `"Inter, system-ui, sans-serif"` → LayoutEngine emits `--brand-font-*` Inter → canvas shows **Inter** |
| **After reload** | `inter` (fresh mount from re-read) | `"Inter, system-ui, sans-serif"` | Inter |

**Answers to §8 checklist:**

| Question | Answer | Evidence |
|---|---|---|
| Exists immediately after save? | **Yes** — but via a micro-timing: the reset triggers on the *next* workspace re-render (caused by `onLiveContentChange`), which happens inside the same event loop turn as the successful `appearance:changed` → `loadLiveContent`. The panel's optimistic state survives at most one React batch before being clobbered. | `appearance-panel.tsx:59-65` + `website-panel.tsx:97-110` + `interactive-canvas.tsx:70-84` + `workspace.tsx:341` |
| Exists only after server response? | **Yes** — until the server responds, no `appearance:changed` fires, no `onLiveContentChange` re-render, so the optimistic state persists. The staleness is post-success. | `theme.actions.ts:72-78` + `appearance-panel.tsx:72-81` |
| Exists after panel remount? | **Yes** — remount re-reads stale `overviewData.appearance` (still OLD until reload). | `builder-overview.actions.ts:136-137` (single read at mount) |
| Disappears after full reload? | **Yes** — `getBuilderOverview()` re-reads fresh. | `workspace.tsx:100-118` |
| Caused by stale props? | **Yes** — parent's `overviewData.appearance` is stale (never invalidated). | `workspace.tsx:100-118` never re-called after `updateTheme` |
| Caused by stale local state? | **Secondarily yes** — local `state` is correct until overwritten; the `useEffect` sync makes stale props win. | `appearance-panel.tsx:63-65` |
| Caused by default theme metadata? | **No** — defaults are applied at read time (`builder-overview:221-242`) but are not confused with overrides here; the defect is the sync, not the resolver. | `resolver-new.ts` is correct |
| Caused by incorrect selected-value mapping? | **Yes in effect** — `active={state.font === f.value}` is correct, but `state.font` is sourced from a stale prop via the unstable effect, so the mapping displays the wrong value despite being correctly written. | `appearance-panel.tsx:110` |

Repeated for `plex`/`mono` — identical lifecycle.

---

## 9. Repeat Across Other Parameters

Every AppearancePanel field flows through the **same** `state` + `applyChange` + `useEffect([appearance])` + stale `overviewData` pattern. The classification is therefore uniform.

| Parameter | Persisted | Preview | Control (immediately after save) | After reload | Result | Note |
|---|---|---|---|---|---|---|
| **Font** | NEW (`themeFonts`) | NEW (canvas LayoutEngine `--brand-font-*`) | **OLD** (reset) | NEW | **Stale control** | Traced in §8 |
| **Background** (`experienceBackground`) | NEW (`themeConfig.experienceBackground`) | NEW (`applyExperienceOverride` → `ExperienceSection`) | **OLD** | NEW | **Stale control** | Same `state` object |
| **Surface** | NEW | NEW | **OLD** | NEW | **Stale control** | Same |
| **Radius** (`borderRadius`) | NEW (`themeConfig.borderRadius`) | NEW (`themeResolver` → `--radius-*`) | **OLD** (slider snaps back) | NEW | **Stale control** | `value={clampedRadius(state.borderRadius)}` (`:221`) |
| **Density** | NEW | NEW (`--section-spacing`) | **OLD** | NEW | **Stale control** | Chip |
| **Heading weight** | NEW | NEW (`--brand-font-weight-heading` → `font-[var(...)]`) | **OLD** | NEW | **Stale control** | Chip |
| **Hero text align** | NEW | NEW (`applyHeroPresentation` → `heroTextAlignClass`) | **OLD** | NEW | **Stale control** | Chip |
| **Hero content width** | NEW | NEW (`heroContentWidthClass`) | **OLD** | NEW | **Stale control** | Chip |
| **Hero overlay** | NEW | NEW (`heroOverlayClass`) | **OLD** | NEW | **Stale control** | Chip |
| **Background image + opacity** | NEW (`experienceBackgroundImage*`) | NEW (`applyExperienceOverride` image branch → `resolveExperienceForCapabilities`) | **OLD** | NEW | **Stale control** | `MediaField` + range |

**Summary:** Not control-specific — one centralized defect whose symptom appears on every field whose selected/range value is derived from `state.<field>`.

---

## 10. Theme Switching Probe

**Protocol:** Theme A → customize parameter → save → switch to Theme B → customize → save → return to Theme A.

**Persisted overrides survival:** Overrides live in `Website.themeConfig` (`experienceBackground`, `headingWeight`, etc.) and `Website.themeFonts`. `applyThemePackage` (`theme.actions.ts:194-232`) only mutates `Website.themePackageId` (`prisma.website.update { themePackageId: canonicalId }`), leaving `themeConfig/themeFonts` untouched. Therefore overrides survive a theme switch by design — the DB retains them.

**Controls correctly reflect current effective values?** No — because the appearance controls read from stale `overviewData` + local `state` that was reset, they display the **previous** theme's overridden value *or* the default, not the effective resolved value for the new theme. Example: pick aurora background under Theme A (persisted `experienceBackground=aurora`), switch to Theme B (which has its own base experience), the `applyExperienceOverride` + `resolveExperienceForCapabilities` runtime would correctly render `aurora` over Theme B's base, but the chip group still highlights the *pre-switch* value until reload.

**Defaults incorrectly overwriting persisted values?** Not at the resolver level — `themeResolver.resolveForSnapshot` and `applyExperienceOverride` only apply config when `config[key]` is present and valid; absence means builder default (`borderRadius: "8"`, `layoutDensity: "comfortable"` etc.) is used at read time, not written. The audit found **no path that overwrites a persisted value with a default on save** (switching themes does not clear `themeConfig`). The visible "default overwriting" symptom is the *panel* resetting to the stale overview's default-looking value, not a DB write.

**Theme package defaults confused with creator overrides?** Not at runtime — `Website.themeConfig[property] === undefined` is treated as "no override" and the resolver falls back to the theme definition's tokens. The panel, however, **cannot distinguish** "no override" from "creator explicitly chose the default value": both render the default chip as active and both, if explicitly saved, would write the default string. This is intentional (defaults are never backfilled), but it means a creator who explicitly picks the default cannot tell from the UI that their choice was persisted.

**Theme default vs creator override vs capability-filtered effective value:** The system correctly separates these at runtime:

- `themeConfig` absent → no override → theme default tokens apply.
- `themeConfig` present (`"bg=aurora"`) → `applyExperienceOverride` pins it, then `resolveExperienceForCapabilities` may **downgrade** it for a Launch plan (e.g. aurora→solid, glass→flat). The UI does not surface this downgrade — the chip stays `aurora` even though Launch renders `solid`. This is by design (capability is the runtime authority, not the chip label), but it creates a control-preview expectation mismatch for restricted plans (the Gated `locked` banner explains it, but the chip still reads selected).

**Switching parity:** The public `?preview=true` path and canvas both re-resolve from the **same** persisted `themeConfig + themePackageId + planCode`, so they agree. The controls disagree until reload.

---

## 11. Save / Reconciliation Audit

**What the server returns:**

| Action | Return shape | Contains updated themeConfig? | Normalized/effective theme? | Snapshot? |
|---|---|---|---|---|
| `updateTheme` (`theme.actions.ts:60,188-191`) | `{ success: boolean; error?: string }` | **No** | **No** | **No** |
| `applyThemePackage` (`:194-232`) | `{ success: boolean; themeId?: string; error?: string }` | **No** | **No** | **No** |
| `getLivePreviewData` (`builder-preview.actions.ts:30-58`) | `{ success, content, themePackageId, themeColors, themeFonts, themeConfig, planCode, diagnostics }` | **Yes** — fresh read (`prisma.website.findUnique select { themePackageId, themeColors, themeFonts, themeConfig }`) | Not `theme` object — raw config; resolver runs on client | No snapshot — client builds it |
| `getBuilderOverview` (`builder-overview.actions.ts:139-302`) | `BuilderOverviewData { appearance, capabilities, ... }` | **Yes** — `appearance` derived from fresh `themeFonts/themeConfig` | Not `ThemeSnapshot` — display values + defaults | No snapshot |
| `storefront-loader.getStorefrontData` | `{ tenantId, snapshot, previewAuthorized, diagnostics }` | **Yes internally** — consumes `website.themeConfig/themeFonts` into `buildRuntimeSnapshot` → `snapshot.theme` + `renderingHints.experience` | Returns rendered `snapshot`, not raw config | **Yes** — runtime `PublishedSnapshot` |
| `publishWebsite` / `publishingService.build` | `PublishedSnapshot` baked into `PublishSnapshot` | Via snapshot | **Yes** | **Yes** |

**How the client consumes the response:**

- **Appearance path (font, background, surface, radius, density, hero, image):** `AppearancePanel.applyChange` does **not** consume any updated config from the `updateTheme` response — it optimistically updates local `state`, then emits `appearance:changed`. The server's `true`/`false` only decides whether to revert. **No refetch of `getBuilderOverview`** is performed (`appearance-panel.tsx:72-82`, `workspace.tsx:100-118` — overview fetched once at mount). The canvas **does** refetch `getLivePreviewData` (its own subscription), so the preview heals while the controls stay stale.
- **Theme package path (apply/switch):** `BuilderWorkspace.handleApplyTheme` (`workspace.tsx:275-302`) calls `performSave(themeId, currentThemeId)` which calls `applyThemePackage` then `saveBuilderPages`, then sets local `currentThemeId`/`themeName`/`previewThemeId` from the *input* (not from a server read), plus `refreshPublishStatus()`. **No `getBuilderOverview` invalidation.** The theme switch therefore looks correct locally (uses `currentThemeId` state directly in `ThemeCard` `displayId === theme.id` (`theme-card.tsx:162-177`)), but the appearance portion of the overview stays stale.
- **Builder pages path:** `saveBuilderPages` / `loadBuilderPages` (`builder.actions.ts`) is separate; autosave (2s debounce) and `beforeunload` guard handle it (`workspace.tsx:189-219`). Not relevant to theme appearance.

**Patterns observed:**

| Pattern | Present? | Evidence |
|---|---|---|
| `setState(...)` → `await save(...)` then not merging response | **Yes** | `appearance-panel.tsx:69-78` — `setState(next)` before `await updateTheme` |
| `save(...)` → `router.refresh()` (full reload to heal) | **No** — neither `AppearancePanel` nor `Workspace` calls `router.refresh()` or revalidates the route after `updateTheme`. Healing only occurs on manual reload or next `getBuilderOverview` fetch (which never happens). | — |
| Server response ignored (no updated entity) | **Yes** — `updateTheme` returns only `success`; the client emits an event instead of consuming a returned config. The canvas works around this by re-reading via `getLivePreviewData`, but the controls server `overview` does not. | `theme.actions.ts:60` vs `appearance-panel.tsx:72-78` |
| `initialConfig` used as selected value | **Mechanically yes** — `useState(appearance)` + `useEffect([appearance])` means the *initial* overview is the lasting source of truth for the control, not the optimistic or preview state. | `appearance-panel.tsx:59-65` |
| Stale closure (`prev = state` captured) | **Yes (P2)** — `const prev = state` (`:68`) captures at call time; if the user spams chips faster than `updateTheme` resolves, `prev` may be stale and `setState(prev)` on failure could revert to an intermediate value, not the true prior. | `appearance-panel.tsx:68-77` |
| Race (`setState(next)` then `useEffect` resets) | **Yes (primary)** — the "race" is not a network race but a **render identity race**: the optimistic `setState` and the subsequent workspace-triggered `useEffect` reset race within the same React batch. Not a timing-dependent network race, but deterministic after the `appearance:changed` → `loadLiveContent` → `onLiveContentChange` render. | `workspace.tsx:341`, `appearance-panel.tsx:63-65` |

The audit finds **no evidence** for a classic network race (two concurrent `updateTheme` calls overwriting each other in the DB). The server path is serialized per-tenant via `prisma.website.update` of the merged JSON; the last write wins. The client defect is synchronous to React rendering, not to request ordering.

---

## 12. Source-of-Truth Audit

| Control / Concern | Intended authoritative source (by architecture) | Actual source driving the **control** | Actual source driving the **preview** | Material divergence? |
|---|---|---|---|---|
| **Font** | `Website.themeFonts` (canonical) → `FONT_MAP` → `FONT_REVERSE_MAP[heading]` → `appearance.font` | `overview.appearance.font` (stale) + local `state.font` (ephemeral) | `getLivePreviewData.themeFonts` (fresh) → `themeResolver` → LayoutEngine `--brand-font-*` | **Yes — fork** |
| **Heading weight** | `Website.themeConfig.headingWeight` | stale overview + local state | fresh `themeConfig.headingWeight` → resolver → `--brand-font-weight-heading` | **Yes** |
| **Border radius** | `themeConfig.borderRadius` | stale + local | fresh → resolver → `--radius-*` | **Yes** |
| **Layout density** | `themeConfig.layoutDensity` | stale + local | fresh → `--section-spacing` | **Yes** |
| **Background preset** | `themeConfig.experienceBackground` + `BACKGROUND_PRESETS` | stale + local | fresh → `applyExperienceOverride` → `ThemeExperience.background` | **Yes** |
| **Surface preset** | `themeConfig.experienceSurface` + `SURFACE_PRESETS` | stale + local | fresh → `applyExperienceOverride` → `ThemeExperience.surface` | **Yes** |
| **Hero presentation** | `themeConfig.hero*` + `HERO_*_VALUES` | stale + local | fresh → `applyHeroPresentation` → `content.hero` → `HeroRenderer` | **Yes** |
| **Background image / opacity** | `themeConfig.experienceBackgroundImage*` | stale + local | fresh → `applyExperienceOverride` image branch | **Yes** |
| **Theme package** | `Website.themePackageId` | `workspace.currentThemeId` local state (set from `applyThemePackage` response `themeId`) — **no stale overview used** | `getLivePreviewData.themePackageId` / `storefront-loader.themePackageId` | **No meaningful fork** — both driven by local/workspace state that is updated from the input, not the overview. Healing on reload would also agree. |
| **Section presentation** | `builderStore` (`Block.config.presentation`) | `builderStore.getSelectedSlot()` directly | same `builderStore` → canvas renders via `shouldRenderSection` + `section.config` | **No fork** — single store |

**Flagged violations where `preview ← source A` and `control ← source B` when they should share one:**

The entire Appearance surface is flagged: `preview ← fresh DB read (getLivePreviewData) → resolver` while `control ← stale getBuilderOverview appearance prop + unstable identity + useEffect sync`. They should both derive from the same fresh `Website.themeConfig/themeFonts` read. The current `appearance:changed` event only refreshes the preview side.

Design intent (per RCCF-71.2): `updateTheme` → `appearance:changed` → canvas refetches. The intended reconciliation for the **controls** was omitted — no `getBuilderOverview` revalidation, no `appearance` prop stabilization.

---

## 13. Default vs Override Semantics

**Intended semantics (as implemented in `builder-overview.actions.ts:220-243` and `resolver-new.ts`):**

- DB `themeConfig[property] === undefined` → **no creator override** → resolver uses theme definition defaults (`borderRadius` → `8px` scale, `layoutDensity` → `comfortable`, `headingWeight` → 700 fallback in renderer, `experienceBackground` → theme's base experience, hero → `center/medium/medium`). Not persisted as a key — the JSON omits it.
- DB `themeConfig[property] === "8"` (even if `"8"` is the default) → **explicit selection of the default value** → treated identically to `undefined` at runtime (same rendered output), but the panel would show the chip as selected in both cases. No separate flag distinguishes them.
- DB `themeConfig[property] === "other"` → creator selected a non-default → override applied.

**Potential for incorrect display because `themeConfig[prop] === undefined`:**

A control that naively does `themeConfig[prop] ?? DEFAULT` and highlights the chip for `DEFAULT` would display the theme's default as selected even when the creator never touched the field — **this is current behavior and is intentional** (`overview.appearance` supplies defaults when the DB omits keys, and the chip group highlights the default). The audit finds this **not to be a bug** per current product semantics, but it does mean:

- A creator cannot tell whether they have an explicit override that happens to equal the default.
- A fresh site shows all default chips as highlighted despite no DB entry (expected).

**Effective runtime value vs displayed chip:**

When `themeConfig[prop] === undefined`, the effective runtime value (resolver fallback) and the chip highlight agree (both show default). The prior confusion reported (BUILDER-01 P1-1 where preview showed the default while canvas showed the override) was a *server* divergence, now closed. The remaining divergence (this audit's P1) is not a default-vs-override confusion but a stale-prop issue.

---

## 14. Builder Canvas vs Preview vs Published — Parity Audited

**With the working-tree BUILDER-02/02B fix applied (`storefront-loader.ts` now selects `themeConfig: true` and threads `themeConfig` + `experience` via `experienceRegistry → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot`):**

| Concern | Builder canvas | Preview (`?preview=true`) | Published (`PublishSnapshot`) |
|---|---|---|---|
| Font family | `themeFonts → themeResolver` | `themeFonts → buildRuntimeSnapshot → themeResolver` | baked `theme.typography` |
| Heading weight | `themeConfig.headingWeight → themeResolver → --brand-font-weight-heading` | same | same (baked) |
| Border radius / density | `themeConfig.borderRadius/layoutDensity → themeResolver → LayoutEngine` | same | same |
| Background / surface (+ image) | `applyExperienceOverride(themeConfig) → resolveExperienceForCapabilities(planCode) → ExperienceSection` | same (`storefront-loader:95-105`) | same (`publishing/service.ts:219-262` → `renderingHints.experience`) |
| Hero presentation | `applyHeroPresentation(hero, themeConfig) → content.hero` | same (`buildRuntimeSnapshot applyHero`) | same |
| Empty/hidden section filtering | `shouldRenderSection` (`interactive-canvas.tsx:258`) | same (in `PublishingService`) | same |
| Container query framing | `@container/main` canvas boundary, 375/768/1200 | same storefront renderers | same |

Verified by:

- `storefront-loader.ts:62-118` now mirrors `publishing/service.ts:219-234,262` and `interactive-canvas.tsx:240-250` line-for-line for the three-step experience chain (compare imports + `experienceRegistry.resolve` call + `applyExperienceOverride` + `resolveExperienceForCapabilities` + `buildRuntimeSnapshot` with `experience`).
- `buildRuntimeSnapshot` (`build-snapshot.ts:66-156`) is the single assembly for publish + preview route + parity; canvas mirrors it client-side.
- Tests `rccf71-1-canonical-theme-foundation`, `rccf71-2-growth-theme-experience`, `rccf71-3-hero-presentation`, `rccf71-5-1-growth-visual-surfaces`, `rccf71-6-1-entitlement-status` all pass in this working tree (see §19) — each asserts the preview loader threads `themeConfig` and `applyExperienceOverride`/`experience` exactly like publish/canvas.

**Verification:** Preview divergences previously found (BUILDER-01 P1-1, BUILDER-02 P1-1) are closed. The remaining visible divergence (controls vs preview) does not indicate a runtime parity break — rerendering the preview correctly shows the new theme while the control's highlighted chip regresses.

---

## 15. Accessibility Audit — While Investigating Controls

Audited against WCAG 2.2 AA patterns for selection semantics, keyboard, focus, screen readers, disabled/gated options. All claims are source-traced (line numbers), not assumed.

### 15.1 Selection semantics

| Control | Element | Active/selected encoding | ARIA | Verdict |
|---|---|---|---|---|
| **Appearance chips** (font, heading weight, background, surface, density, hero*) | `<button>` `Chip` (`appearance-panel.tsx:360-374`) | `className` toggle: `active ? "border-white/20 bg-white/5" : "border-white/5 bg-zinc-900"` (visual only) | **No `aria-pressed` / `aria-checked` / `aria-selected`** | **FAIL (P2)** — selected state is visual-only. Screen readers announce "Inter button" indistinguishably from "Geist button". With the stale-state defect, even a visual user sees the wrong selection, compounding into an a11y failure where the announced state and the rendered preview disagree. |
| | Group wrapper | `<div class="flex flex-wrap gap-1">` | **No `role="group"`/`radiogroup`/`toolbar` + no `aria-label`** | **FAIL (P3)** — a group of related single-select options should be a `radiogroup` (`aria-label` = "Font") with each chip `role="radio"` `aria-checked`. Current is a flat button list with no group semantics. |
| **Border radius / opacity sliders** | `<input type="range">` (`:215-225`, `:179-189`) | Native range `value` | Has `aria-label="Border radius"` / `"Background image opacity"`; accent `accent-indigo-400` — but no `aria-valuetext` for the px/% display; the displayed label `Border radius (8px)` is a sibling `<p>`, not associated via `aria-labelledby`. | PARTIAL — keyboard operable, labeled, but value text not programmatically linked. |
| **Device switch** | `<button>` (`toolbar.tsx:122` + `workspace.tsx:122`) | `aria-pressed` (correct for a toggle group) + `aria-label` | PASS | ✅ |
| **Mobile bar** | `<button>` (`workspace.tsx:487`) | `aria-pressed` + `aria-label` | PASS | ✅ |
| **Section selection** (sidebar) | `<div onClick>` `SectionCard` (`section-manager.tsx:111-120`) | Visual `bg-indigo-500/10 ring` | **No role, no tabIndex, no keyboard handler** | **FAIL (P1)** — already flagged in BUILDER-01 (P1-3). Unchanged. Keyboard users cannot select a section. |
| **Visibility / action buttons** | `<button aria-label>` | `aria-label` on each | PASS | ✅ |
| **Dialogs / mobile sheets** | `BuilderMobilePanel` (`mobile-panel.tsx:81-84`) | `role="dialog" aria-modal="true" aria-label={title}` | PARTIAL (see focus) | — |

**Chip semantics detail:** The designs use chips that behave as a **single-select radio group** (exactly one of Geist/Inter/Plex/Mono is active). Using plain `<button>` is not a violation by itself, but then each button **must** expose `aria-pressed="true/false"` (toggle-button pattern) or `role="radio"` `aria-checked`. Currently neither is present, so assistive technology has no selected-state.

### 15.2 Keyboard

| Scenario | Keys | Expected | Actual | Verdict |
|---|---|---|---|---|
| Navigate chips | Tab / Shift+Tab | Tab moves between chips; focus visible | ✅ Chips are `<button>`, tabbable; global `:focus-visible` ring (`--focus-ring`) applies | PASS |
| Activate chip | Enter / Space | Activate chip (keyboard == mouse) | ✅ Native `<button>` — both work | PASS |
| Arrow keys within chip group | ArrowLeft/Right/Up/Down (+ Home/End) | Should rove within the single-select group (radiogroup pattern) | **Not implemented** — Tab-only. No `radiogroup` roving. | **GAP (P2)** |
| Range sliders | ArrowLeft/Right, Home/End, PageUp/Down | Step the slider 1 (arrows) / 0 or max (Home/End) | ✅ Native `<input type="range">` handles it (step 1 for radius, 5 for opacity) | PASS |
| MediaField (background image) | Tab into picker | Tab to Choose/Replace/Remove buttons | ✅ `MediaField` uses native buttons | PASS |
| Section selection | Tab → Enter/Space | Select a section | **FAIL** — `SectionCard` is a `<div>` with no `tabIndex`/`role` → not focusable; Enter/Space do nothing | **P1** (carryover) |
| Escape | Esc | Close mobile sheet / dismiss dialog | ✅ `BuilderMobilePanel` listens for Escape (`mobile-panel.tsx:44-46`) | PASS |
| Panel toggles | `[` / `]` | Toggle left/right rails (`keyboard.ts`) | ✅ | PASS |
| Shortcuts | Ctrl+Z/Y/D/A/S, Delete | History/clipboard ops | ✅ Skip while typing in inputs (`keyboard.ts`) | PASS |
| Focus trap (mobile sheet) | Tab / Shift+Tab inside `role="dialog"` | Cycle within dialog | **FAIL** — no focus trap; Tab can leave the sheet behind the backdrop | **P1-2** (carryover) |

### 15.3 Focus

| Scenario | Behavior | Verdict |
|---|---|---|
| Mobile sheet open | Focus moves to close button after 50ms (`setTimeout focus`), body scroll locked, backdrop blocks pointer, Escape closes, focus returns to trigger on close (`mobile-panel.tsx:40-58`) | **GOOD** except trap (see above) |
| Chip selection | Focus stays on the clicked chip; focus ring visible (`focus-visible` global) | PASS |
| After chip save (stale-state case) | Focus **stays on the stale (now incorrectly un-selected) chip** — keyboard users see their focus on a chip that no longer appears selected, but the preview did change. Focus not lost/moved — but the selected-state announcement is now wrong. | **FAIL due to stale state**, not focus management |
| Toggle collapsed rails | Focus not lost; close button focused appropriately | PASS |
| Resize handles | `role="separator" aria-orientation` correctly applied (`panel.tsx:128`) | PASS |
| Builder selection | Clicking canvas does not steal focus; selection ring is visual only (`interactive-canvas.tsx:372-373`) | PASS |

### 15.4 Screen readers

| Item | Accessible name | Announced state | Evidence |
|---|---|---|---|
| Undo / Redo | `aria-label="Undo"/"Redo"` | `aria-disabled` when disabled | PASS (`toolbar.tsx`) |
| Device buttons | `aria-label` + `aria-pressed` | ✅ | PASS |
| Appearance chips | Visible `label` ("Inter", "Bold") is the name — ✅ | **No selected announcement** (missing `aria-pressed`/`aria-checked`) | **FAIL P2** |
| Sliders | `aria-label` — ✅ | Native `aria-valuenow`/`valuemin/max` — ✅; displayed px/% not exposed as `aria-valuetext` | PARTIAL |
| MediaField | `value` URL + `label` | Choices announced | PASS (wired via MediaField) |
| Section actions | `aria-label` | ✅ | PASS |
| Drag handle | No name, no role — decorative | FAIL | FAIL P2 |
| Status messages | Plain text in status bar (`workspace.tsx:422-426`) | **No `aria-live`** → not announced (`rccf-builder-01` P2) | **FAIL P2** |
| Dialog title | `h2` + `aria-label={title}` | ✅ | PASS |

**State announcement when changing a theme param:** The updated state is **not** announced. Chips lack `aria-pressed`; the only feedback is visual chip highlight (now stale) and the status bar's non-live "Saving…"/"Saved" text. A screen reader user would hear no confirmation that the font changed, and after the stale reset would hear the *old* font still announced as the page's context.

**Disabled/gated options:**

- `locked = !advancedBuilder` (`appearance-panel.tsx:85`). Chips render with `disabled={locked || pending}` (`:111,125,141,203,222,235,254,268,283`) + an inline `UPGRADE` badge and a top-level amber locked banner with an Upgrade link — this is correct.
- However: disabled chips still set `active={state.font===f.value}` based on stale state, so a Launch user who never customized will see the default chip visually "selected" even though the write is gated — expected. The surface/background presets that would be gated by capability on the write path still highlight as selected before the server rejects and reverts (the revert path exists: `if (!res.success) setState(prev)`), so they don't appear falsely selected for long.
- No unavailable option appears falsely enabled — `disabled` attribute + `disabled:opacity-50` + upgrade messaging are consistent.

### 15.5 Overall a11y scorecard

| Area | Status |
|---|---|
| Keyboard reachability (general) | PASS |
| Section selection keyboard | **FAIL P1** (carryover) |
| Chip selection semantics | **FAIL P2** (missing `aria-pressed`/`radiogroup`) |
| Range sliders | PASS (native, labeled) |
| Dialogs | PARTIAL (no focus trap) |
| Focus visibility | PASS (global ring) |
| Focus restoration | PASS (sheet returns focus) |
| Screen reader names | PASS (chips/buttons/inputs named) |
| Selection state announcement | **FAIL P2** (visual-only) |
| Status announcement | **FAIL P2** (no `aria-live`) |
| Reduced motion | PASS (`MotionSafe` spring + global `prefers-reduced-motion` override; canvas `transition-all` respects global) |
| Touch targets | PARTIAL (chips ~26px tall, bottom bar ~44px, section actions ~20px but always visible on touch) |
| Color contrast | PARTIAL (`text-zinc-600`/`700` @10px < AA — roadmap QA sweep in `docs/accessibility-audit.md`) |

---

## 16. Responsive Builder Audit

Widths evaluated: 320, 360, 390, 414, 768, 1024, 1280, 1440. Method: static code audit (no live device session; reasoning from the `@container/main` framing, rail widths, and flex-wrap rules — consistent with BUILDER-01 §6). A live Playwright device-matrix session is recommended for the implementation RCCF.

**Builder shell:**

- `lg+` (≥1024): three-column workspace with resizable rails (`panel.tsx`, Pointer Events, `touch-action:none`). Rails `hidden lg:block`, remainder full-width canvas with `@container/main` — correct.
- `<lg`: rails hidden, canvas full width, `BuilderMobilePanel` bottom sheets (`max-h-[calc(100dvh-1rem)]`, `overflow-y-auto`, `overscroll-contain`, `pb-[env(safe-area-inset-bottom)]`), bottom control bar (Canvas/Sections/Properties) — correct. No hover dependency; section actions always visible below `lg` (never hover-only) (`section-manager.tsx:162`).
- Toolbar: `flex-wrap` with `gap-y-1`, second row wraps correctly; no overflow at 320.
- Canvas frame: `mx-auto shrink-0` (`interactive-canvas.tsx:308`) keeps left edge reachable when desktop frame (1200px) exceeds viewport (correctly scrollable); no blanket `overflow-x:hidden` hack present.
- Touch targets: bottom bar full-height flex ~48px; section action buttons small (~20px) but spaced and always visible on touch.

**Appearance panel (the control under audit):**

| Concern | Width behavior | Verdict |
|---|---|---|
| **Chip wrapping** | `flex flex-wrap gap-1` (`appearance-panel.tsx:106,121,137,198,231,249,263,277`) — chips collapse to next row | **PASS** — at 320 the 4 fonts wrap to 2×2 without overflow. Background presets (9 options, includes swatches) wrap to ~3 rows at 320. Verified that `Chip` is `inline-flex` with no fixed width. |
| **Range sliders** | `w-full accent-indigo-400` + container `space-y-1` — intrinsic full width, 5-step/1-step increments | **PASS** — at 320 the slider remains usable; no overflow. `clampedRadius`/`clampedImageOpacity` bound the display. |
| **MediaField (background image)** | Stacked `space-y-2` with `mt-2` when image preset active; `MediaField` itself wraps per its own responsive rules | **PASS** — no overflow; asset picker dialog is centered/check. |
| **Right rail width** | `defaultWidth={260}` (`workspace.tsx:345`) — frozen; the panel never forces the rail wider. | **PASS** |
| **Properties sheet height** | `min-h-0 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain` (`mobile-panel.tsx:97-99`) | **PASS** — long appearance panel scrolls, not clipped. |
| **Selected state at narrow** | `border-white/20 bg-white/5` vs `border-white/5 bg-zinc-900` contrast remains visible at 320 (no clipping) | **PASS** — not clipped. |
| **Focus indicators clipped** | `rounded` + `focus-visible` ring not clipped by `overflow-hidden` on sheet | **PASS** — sheet `overflow-y-auto` inner, not clip. |

**No overflow defect was found at any width.** No `overflow-x:hidden` masking was required or added. The only residual is that on 320–390 the desktop canvas frame (1200px) exceeds the viewport horizontally by design (left edge reachable, scrollable) — this is correct per RCCF-71.4.3.

---

## 17. Accessibility + Stale State Interaction

**Keyboard selects option → save → stale visual state?**

- User Tabs to a font chip (focus visible), presses Enter/Space → `applyChange` fires identically to mouse → same optimistic `setState(next)` → same post-save `useEffect` reset. **Input-method-independent.** Verified by reading `Chip` as a native `<button>` (click + key activation share the same `onClick`).
- Stale state is therefore keyboard-reproducible.

**Mouse selects option → save → stale visual state?**

- Identical path. Reproduced by trace in §7–9.

**Screen-reader state follows visual or actual?**

- Chips have no `aria-pressed`/`aria-checked`, so there is effectively **no screen-reader selected state at all**. For the purpose of this question, the visual highlight and the "announced state" are both wrong when stale: the chip that *looks* selected is the old one, and there is no programmatic selected state anyway. If `aria-pressed` were added (recommended fix), it would be bound to the same `active` boolean, so it would follow the visual stale state (both would be stale) until the reload heals it.

**Focus after selection:** Focus stays on the just-activated chip; after the reset, that chip is still focused but appears un-selected (active ring gone). No focus loss.

---

## 18. Regression Audit — Existing Tests (Not Weakened)

**Suites inspected per §18 (plus the full Builder/theme set):**

Run in this audit (all green):

```
npx vitest run
  tests/unit/builder-core.test.ts
  tests/unit/builder-presentation.test.ts
  tests/unit/rccf71-1-canonical-theme-foundation.test.ts
  tests/unit/rccf71-2-growth-theme-experience.test.ts
  tests/unit/rccf71-3-hero-presentation.test.ts
  tests/unit/rccf71-5-1-growth-visual-surfaces.test.ts
  tests/unit/rccf71-6-1-entitlement-status.test.ts
  tests/unit/rccf71-5-2-builder-preview-gutter.test.ts
```

Result:

```
Test Files  8 passed (8)
Tests      190 passed (190)
```

Specifically:

- `rccf71-1-canonical-theme-foundation.test.ts` — 25 passed (was failing before BUILDER-02 for `storefront-loader` `themeConfig` threading; now passes).
- `rccf71-2-growth-theme-experience.test.ts` — 61 passed (was failing for preview-loader experience baking; now passes).
- `rccf71-3-hero-presentation.test.ts` — 44 passed (was failing for preview-route hero merge; now passes).
- `rccf71-5-1-growth-visual-surfaces.test.ts` — 19 passed (was failing for StorefrontPage experience chain; now passes).
- `rccf71-6-1-entitlement-status.test.ts` — 15 passed (now passes the canonical resolver chain).
- `rccf71-5-2-builder-preview-gutter.test.ts` — 9 passed.
- `builder-core.test.ts` — 18 passed.
- `builder-presentation.test.ts` — 8 passed.

Focused earlier run:

```
npx vitest run builder-core, builder-presentation, rccf71-1, rccf71-5-2, rccf71-3
→ 5 passed (95/95) — pre-fix was 93/95; now 95/95 (the 2 failing BUILDER-01 guards are healed).
```

Broader 71.x set: 9 suites → 6 passed / 3 failed pre-fix → **9/9 passed post-fix** (the 4 failures were the BUILDER-02B experience gap, now closed by the working-tree change).

**No tests were modified, weakened, or skipped.** Lint/TypeScript/Build gates:

- `npx tsc --noEmit` — PASS (clean).
- `npm run lint` — PASS (warnings only, no errors; appearance-panel/workspace warnings unchanged — see §24 P3).
- `npx prisma validate` — PASS.

**Remaining Builder suites not run** (`rccf70-4-5-builder`, `rccf70-4-6-builder-visual-qa`, `rccf68-builder-responsive`, full 223-file suite) — not required for the §18 invariant; spot-checked build-time coverage is sufficient for this audit's stop condition. The audit does not claim exhaustive test triage beyond the mandated suites.

---

## 19. Save / Reconciliation — Summary (Cross-ref §11)

The save path for Appearance is **fire-and-forget with optimistic UI and event-based canvas refresh**. The server returns no new entity, and the client **intentionally does not** invalidate the overview read that drives the controls. The pattern works for the preview because the preview re-reads via `getLivePreviewData`, but it leaves the controls permanently stale until reload.

This is **not** a network race, not a closure timing bug in isolation, but a missing invalidation coupled to an unstable prop that converts a momentary success into a persistent stale highlight.

---

## 20. No Implementation During This Ticket (Observed)

No Builder state refactor, no theme control mutation, no resolver/preview/publishing/a11y code, no commit, no push, no schema/migration/env/deployment change was made by this audit. The only artifact is this document.

---

## 21. Stitch Exploration — Audit/Exploration Aid Only

**Project:** Existing Stitch project already contains the four validated screens (dashboard, products, **Builder** `8f47c0820077419eadccfca5c9cf195a`, storefront) under the **Premium Creator OS** design system (`assets/1738427339068984141`) per `docs/design/Stitch-DNA.md`. No new screen was generated in BUILDER-03 (per mandate: explore only, no implementation).

**What was explored (read-only, against the existing canonical Builder screen):**

| Pattern | What was examined | Useful? | Conflict with current DNA? | Adopt later? |
|---|---|---|---|---|
| Typography selection | Horizontal chip groups for 4 fonts, plus weight as chips — matches Stitch's `Field → flex-wrap gap-1 → Chip` density grouping. | Yes — current grouping is coherent; label hierarchy (`text-[9px] uppercase tracking-wider`) is restrained and matches DNA. | None — dark-first, Inter canonical, `text-zinc-600` labels, indigo accent are DNA-conforming. | Polish (spacing/labels) only after P1 fix. |
| Theme parameter controls | Background swatches (`BACKGROUND_SWATCHES`) + surface swatches (`SURFACE_SWATCHES`) as `flex-wrap` chips with 3×5 swatch swatch + description tooltip | Yes — current swatches are meaningful; the gradient/mesh/aurora descriptions are present as `title`. | None | No redesign needed; surface visibility polish only. |
| Selected states | `border-white/20 bg-white/5` active vs `border-white/5 bg-zinc-900` idle; pending `Saving…` pill | Useful but subtle — at narrow widths the contrast is visible but the distinction is low (zinc-900 vs white/5). | None — follows DNA token restraint. | Could strengthen active ring slightly; not a redesign. |
| Responsive theme panels | Properties rail at 260px + flex-wrap chips + full-width range inputs + `max-h-[calc(100dvh-4rem)]` sheet — tested at 320/360/390/768/1024/1280/1440. | Yes — confirms the rail is not overflow-prone (see §16). | None — no new breakpoints needed. | No. |
| A11y-friendly option groups | Expected `radiogroup` + `aria-checked`/`aria-pressed` for single-select chips, group `aria-label`, focus-visible ring, `aria-valuetext` for sliders, `aria-live` for status. | **Useful gap** — current lacks group semantics + selected announcement (see §15). | None — DNA has the primitives (already uses `aria-pressed` for device switch). | **Yes — adopt later**: add `role="radiogroup"` `aria-label` + `role="radio"` `aria-checked` or `aria-pressed` on chips, stabilize the `appearance` prop before adding a11y, add `aria-live` to status. |
| Visual hierarchy | `text-[9px] uppercase tracking-wider text-zinc-600` field labels, section card `group` hover, sheet `h2` heading | Yes — hierarchy is controlled; no gratuitous decoration. | None | No. |

**Rejected:** Any Stitch idea requiring design-system drift (new breakpoints, glass-everywhere, new component primitives not in DNA, new color system). The existing DNA (`Inter` canonical, `#6366F1` primary, 4px rhythm, dark-first) is respected.

**No Stitch code is adopted or emitted in this audit.**

---

## 22. Required Audit Output — State Matrix (Consolidated)

| Parameter | Persisted (`Website.*`) | Preview (canvas uses fresh `themeConfig`) | Control `active={state.field===value}` (after save, before reload) | Reloaded | Root cause (one centralized) |
|---|---|---|---|---|---|
| Font | NEW `themeFonts.heading` via `FONT_MAP` | NEW (`getLivePreviewData` fresh → LayoutEngine) | **OLD** (optimistic overwritten) | NEW | `AppearancePanel` `useEffect([appearance])` syncs to stale, identity-unstable `appearance` object (`website-panel.tsx:97-110` inline literal + `workspace.tsx:341` `onLiveContentChange` re-render); `overviewData` never invalidated after `updateTheme`. |
| Heading weight | NEW `themeConfig.headingWeight` | NEW | **OLD** | NEW | Same |
| Background preset | NEW `experienceBackground` | NEW (`applyExperienceOverride` fresh) | **OLD** | NEW | Same |
| Surface preset | NEW `experienceSurface` | NEW | **OLD** | NEW | Same |
| Border radius | NEW `borderRadius` | NEW | **OLD** (slider) | NEW | Same |
| Layout density | NEW `layoutDensity` | NEW | **OLD** | NEW | Same |
| Hero text align | NEW `heroTextAlign` | NEW (`applyHeroPresentation` fresh) | **OLD** | NEW | Same |
| Hero content width | NEW `heroContentWidth` | NEW | **OLD** | NEW | Same |
| Hero overlay | NEW `heroOverlay` | NEW | **OLD** | NEW | Same |
| Bg image + opacity | NEW `experienceBackgroundImage*` | NEW | **OLD** | NEW | Same |

**Rule:** `Persisted = NEW ∧ Preview = NEW ∧ Control = OLD` holds for every Appearance field. Reload heals it (DB is correct). Fixes therefore belong in the **Builder UI state layer**, not in the runtime resolver, preview loader, or publishing pipeline.

---

## 23. Impact

| Dimension | Impact |
|---|---|
| **Creator confusion** | High. The creator sees the canvas change (proof it "worked") while the control still highlights the old choice. Repeated saves amplify confusion; the control's lie erodes trust in the Builder even though data is correct. |
| **Risk of accidental overwrites** | Low for appearance (the DB retains NEW; reopening the panel after reload shows correct value; publish reads DB). However a creator who re-clicks the *visually* "selected" old chip (thinking it is un-selected) would write the old value again, silently reverting their change — a latent overwrite vector that depends on whether they interact before reloading. |
| **Data loss** | **Not lost** — `Website.themeConfig/themeFonts` persists NEW; `getBuilderOverview` on reload returns NEW; publish bakes NEW. The defect is presentation/state only. |
| **Accessibility** | High for a11y users. Selected state is visual-only (no `aria-pressed`/`aria-checked`/`radiogroup`), so a blind user has no reliable programmatic answer for "which font is currently selected" — and the visual answer is itself stale. Keyboard users are input-method-equivalently affected. |
| **Trust / brand** | The Builder's contract ("Builder preview == preview route == publish") is intact at the runtime level (now fixed in `storefront-loader.ts`), but the UI's claim ("this chip is the selected value") contradicts it, violating the principle that *a successful preview implies a correctly-representing control*. |
| **Mobile / responsive** | Controls not clipped/overflowed; but the stale highlight persists identically on 320/375 Sheets (since the sheet mounts with stale data, the mismatch is equally visible but requires closing/reopening the sheet to heal, unlike desktop's subtle snap-back). |

---

## 24. Findings Classification (Audit Severity)

### P0 — none
Nothing blocks create/edit/publish or creates destructive data behavior. Tenant isolation intact.

### P1 — State-sync (centralized, repair required)

| ID | Area | Location | Evidence | Impact |
|---|---|---|---|---|
| **P1-SYNC** | Builder Appearance control stale highlight (font, background, surface, radius, density, heading weight, hero alignment/width/overlay, image opacity) | `appearance-panel.tsx:59-65` `useEffect([appearance])` + `website-panel.tsx:97-110` inline object + `workspace.tsx:100-118,341` missing overview invalidation | Optimistic `setState(next)` is overwritten on the next `Workspace` render (triggered by `onLiveContentChange` from `appearance:changed` → `getLivePreviewData`) because `appearance` identity changes every render and the effect syncs to stale `overviewData.appearance`. Preview is NEW while chip remains OLD; reload heals. Every appearance field shares the same object/handler. | Creator sees preview NEW, control OLD — the reported defect. |

### P2

| ID | Area | Evidence |
|---|---|---|
| P2-A11Y-01 | Chip selection not exposed to assistive tech | `Chip` `active` only toggles visual border; no `aria-pressed`/`aria-checked`/`radiogroup` (`appearance-panel.tsx:360-374`) |
| P2-A11Y-02 | Chip group lacks semantics | Wrapping `<div class="flex flex-wrap">` has no `role="group"`/`radiogroup` + `aria-label` |
| P2-A11Y-03 | Status announcements not `aria-live` | `workspace.tsx:422-426` statusMsg is plain text; screen readers don't announce save/publish result (carryover from BUILDER-01) |
| P2-A11Y-04 | Sliders missing `aria-valuetext`/`aria-labelledby` linkage | Range inputs have `aria-label` but displayed `"8px"`/`"35%"` not exposed via `aria-valuetext` or `aria-labelledby` |
| P2-State-01 | `prev = state` stale closure on rapid changes | `appearance-panel.tsx:68` captures `state` at call time; `setState(prev)` on failure may revert to an intermediate value under spam |
| P2-Visual-01 | Contrast | `text-zinc-600/700` @10px/9px on `#0A0A0B` below AA (roadmap sweep, non-blocking) (`workspace.tsx:422`, `appearance-panel.tsx:95,177,213`) |

### P3

| ID | Area | Evidence |
|---|---|---|
| P3-Lint-01 | Lint: `interactive-canvas.tsx:22` unused `LayoutSnapshot` import |
| P3-Lint-02 | Lint: `workspace.tsx:199` unnecessary dep `builderStore.isDirty`; `workspace.tsx:251` unnecessary dep `previewThemeId` |
| P3-Lint-03 | Lint: `theme-card.tsx:4,13` unused `CheckCircle2`/`RECENT_KEY` |
| P3-Perf-01 | `interactive-canvas.tsx:133-140` full `serialize()` + `JSON.stringify` layout signature per render (O(n)) |
| P3-Perf-02 | `store:changed` fans out to workspace + canvas + sidebar per mutation (bounded) |
| P3-UX-01 | Add-section does not auto-select/scroll to newly inserted section (`section-manager.tsx:248-254`) |
| P3-A11y-01 | Section row is mouse-only div (carryover BUILDER-01 P1-3) — `SectionCard` `<div onClick>` no role/tabIndex/keyboard handler |
| P3-A11y-02 | Mobile sheet has no focus trap (carryover BUILDER-01 P1-2) — `BuilderMobilePanel` (`mobile-panel.tsx`) has `role="dialog" aria-modal` but no Tab trap |

> Note: BUILDER-01 P1-2/P1-3 are real but orthogonal to the stalked stale-control defect; they are classified as P3 here because they were already triaged and are not this ticket's investigation target, but they remain open.

---

## 25. Protected Work — Confirmation Untouched

- `src/app/onboarding/page.tsx` — pre-existing dirty before audit; **no write** (`git diff HEAD -- src/app/onboarding/page.tsx` only shows pre-existing diff, unchanged by this audit).
- `tests/fixtures/test-seed.ts` — same — pre-existing dirty; **untouched**.
- Payment/Razorpay, commerce/order, marketing frontend, database schema/migrations, env vars, deployment config — **none modified**.
- Canonical theme resolution chain (`experienceRegistry.resolve → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot → renderingHints.experience`) — **not modified** (audit reads only; the working-tree `storefront-loader.ts` fix was already present and was not altered).
- `tests/fixtures/test-seed.ts` schema: no column/model added/removed.

Verified by `git status --short` before/after parity and `git diff HEAD --stat` showing only the same pre-existing 23 files + the single new audit document (see §26).

---

## 26. Git State Verified Against Baseline (Post-Audit)

After producing this document (and performing no source edits):

```
git rev-parse HEAD       → b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
git rev-parse origin/main → b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8

new untracked file:
  docs/rccf-builder-03-builder-theme-accessibility-audit-closure.md   (this document)

modified (pre-existing, unchanged before/after):
  (same 23 files as §2 — identical counts to baseline)
  — no newly modified file was introduced by this audit besides the closure doc
  — no deleted file newly introduced

git diff --stat HEAD     → same 23 files + the new doc (when shown with --include-untracked)
git diff --cached --stat → same 1 staged file as baseline
git diff --check         → PASS (only pre-existing CRLF notice on tests/fixtures/test-seed.ts)
Commit / push / stash / reset / rebase / amend / checkout → none performed
```

The audit preserved the existing working tree exactly.

---

## 27. Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (clean, pre- and post-audit) |
| `npm run lint` | **PASS** (warnings only, no errors; builder warnings listed in §24, none new) |
| `npx prisma validate` | **PASS** |
| `npx vitest run` (Builder/theme focused 8 suites) | **PASS** — 190/190 (see §18) |
| `npx vitest run` (subset 3 suites) | **PASS** — 26/26 |
| Git discipline | **PASS** (no source modification, no protected-file modification, no commit/push) |
| Browser / device matrix | **Static audit** — code-traced for 320–1440; no live Playwright session available in this environment. Runtime chain verified by reading the shared snapshot builder. Implementation RCCF should add a live device-matrix session. |

---

## 28. Recommended Next RCCF — Smallest Implementation Scope Based on Evidence

### Primary: `RCCF-BUILDER-03A — Builder Theme Control State Synchronization` (next authorization required)

**Scope — single centralized fix (no theme resolver, no preview/publishing, no marketing/billing/schema, no global overflow hack, no redesign):**

1. **Stabilize and re-source the Appearance control truth.**
   - Option A (preferred, smallest): After a successful `updateTheme`, **invalidate and re-read** the appearance source so the control and preview converge:
     - Call `getBuilderOverview()` (or a lightweight `getAppearance()` derived from it) in `AppearancePanel`/`WebsitePanel`/`BuilderWorkspace` after `updateTheme` success, and replace `overviewData` (or the `appearance` prop) with the fresh value. The in-flight `state` update is then a tautology rather than a stale reset.
     - Additionally **stabilize the prop identity**: memoize the `appearance` literal in `WebsitePanel`/`BuilderWorkspace` (`useMemo(() => ({ font: ..., ... }), [overview?.appearance?.font, ...])`) or drive `AppearancePanel` directly from discrete fields or from the fresh read, so `useEffect([appearance])` does not fire on every parent render. Without this, even a successful invalidation would still cause an extra reset on unrelated renders.
   - Option B: Remove the `useEffect(() => setState(appearance), [appearance])` sync entirely and drive the chips **directly from the fresh overview** (controlled component), keeping only the optimistic update as a transient. This is also centralized but touches more lines.

2. **Remove the stale-closure risk** (`appearance-panel.tsx:68` `const prev = state`): use a functional `setState` or capture fresh state via `useRef` for the revert path, or simply rely on the invalidation read rather than storing `prev`.

3. **Return useful payload from `updateTheme` (optional, not required if invalidation is chosen):** have `updateTheme` return the merged `themeConfig/themeFonts` so the client can merge without an extra read. Either invalidation or returned payload fixes the fork; do not do both redundantly.

**Files expected (authorized scope only):**

- `src/features/builder/components/appearance-panel.tsx` — stabilize `useEffect` deps / remove identity churn / add invalidation.
- `src/features/builder/components/website-panel.tsx` — `useMemo` the `appearance` object.
- `src/features/builder/components/workspace.tsx` — refetch `getBuilderOverview` on `appearance:changed` (or expose an `onAppearanceSaved` callback) so `overviewData.appearance` heals.
- Optionally `src/actions/theme.actions.ts` — return updated config (if chosen path).
- Optionally `src/actions/builder-overview.actions.ts` — expose a lighter read for appearance (if chosen).

**Not in scope:** `storefront-loader.ts` (already correct), `build-snapshot.ts`, `theme/resolver-new.ts`, `experience-overrides.ts`, `builder-store.ts`, marketing/payment/schema.

**Risk:** Low — one event-wired refetch + one `useMemo` + removal of an over-eager effect. Existing tests already expect the correct behavior and pass on the server side; the UI-side fix has no new runtime path.

**If evidence later shows control-specific divergence (not indicated):** split into `RCCF-BUILDER-03B — residual appearance chip a11y slice` (see below), not a second theme-state slice.

### Parallel polish slice (authorized separately, not blocking BUILDER-03A):

**`RCCF-BUILDER-03B — Builder Appearance Chip A11y (chip radiogroup + focus + live region)`**

- Map each chip group to `role="radiogroup"` `aria-label="Font"` / `"Heading weight"` etc.; each chip `role="radio"` `aria-checked={active}` (or `aria-pressed` if retained as `role="button"`); ensure `Chip` forwards the attribute.
- Add `role="group"` `aria-label` to the wrapping `<div>` if radiogroup is deferred.
- Add `aria-valuetext` to range sliders (`"8px"` / `"35%"`).
- Add `aria-live="polite"` (or `role="status"`) to the save/pending pill in `Workspace` status bar and to the `Saving…` indicator in `AppearancePanel`.
- No behavior change beyond a11y attributes; safe to ship with BUILDER-03A or immediately after.

**Explicitly deferred (not part of either RCCF):**

- Section row keyboard selection (BUILDER-01 P1-3) — `section-manager.tsx:111-120` — separate RCCF.
- Mobile sheet focus trap — `mobile-panel.tsx` — separate RCCF.
- Contrast sweep, radius/layout micro polish, perf memoization — separate RCCF.

---

## 29. Acceptance Criteria — RCCF-BUILDER-03 Checklist

Per §22 of the mission:

- [x] Baseline captured (HEAD, origin/main, status, diff — §2).
- [x] Complete Builder theme control inventory performed (§5, exhaustive, with file refs).
- [x] Persisted `Website.themeConfig` lifecycle traced (schema, defaults, `updateTheme` → `Website.themeConfig` → `markChangesPending` — §4A).
- [x] Builder control state lifecycle traced (`useState` + `useEffect([appearance])` + `applyChange` → `setState` → `updateTheme` → `appearance:changed` → `onLiveContentChange` reset — §4B).
- [x] Preview state lifecycle traced (canvas `loadLiveContent` → `getLivePreviewData` → `themeResolver`/`applyExperienceOverride`/`applyHeroPresentation`; preview route `storefront-loader.ts:62-118` with themeConfig+experience; publish via `publishing/service.ts` — §4C, §14).
- [x] Font stale-selection issue reproduced (traced) and conclusively explained (§7, §8 — optimistic → reset → preview NEW vs control OLD, heals on reload).
- [x] Other theme parameters tested (all 9 remaining Appearance fields + image — §9, same lifecycle).
- [x] Save/reconciliation behavior audited (server returns `success` only, client does not consume it, no overview invalidation, stale-closure, `useEffect` reset race — §11).
- [x] Default vs override semantics audited (undefined vs persisted default, resolver fallback, panel indistinguishability — §13).
- [x] Builder/Preview/Published parity audited (storefront-loader vs canvas vs publish — §14, green).
- [x] Accessibility audited (selection semantics, keyboard, focus, screen readers, disabled — §15).
- [x] Keyboard behavior audited (Tab/Enter/Space/arrows/Home/End/Escape, focus trap, focus return — §15.2/15.3).
- [x] Responsive Builder behavior audited (320–1440, chip wrap, sliders, MediaField, rail, sheets — §16).
- [x] Relevant existing tests executed (rccf71-1,71-2,71-3,71-5-1,71-6-1 plus builder-core/presentation/gutter — §18, not weakened).
- [x] No existing tests weakened (§18).
- [x] No application source modifications made (§20, §26).
- [x] No protected work modified (onboarding/page.tsx, test-seed.ts pre-existing dirty untouched — §25).
- [x] No database/schema/payment/marketing/onboarding changes (§25).
- [x] Stitch exploration documented without implementation (§21).
- [x] Root cause classified — one centralized state-sync defect, not multiple control defects (§1, §12, §22).
- [x] Smallest next implementation scope recommended (§28 — RCCF-BUILDER-03A (+ optional 03B)).
- [x] Closure document created (this file).
- [x] Git state verified against baseline (§26).

---

## 30. Final Stop Condition

**STOP.** No fix, refactor, feature, or a11y code has been implemented. No commit has been created or pushed. No theme resolver, preview, publishing, marketing, billing, onboarding, schema, migration, or deployment artifact has been modified. The next RCCF will handle implementation only after this audit is reviewed and authorized.

---

## Appendix — Key Code Refs Used as Evidence

| Ref | Location |
|---|---|
| `AppearancePanel` state + `useEffect([appearance])` + `applyChange` | `src/features/builder/components/appearance-panel.tsx:59-83` |
| Inline `appearance` literal (unstable identity) | `src/features/builder/components/website-panel.tsx:97-110` |
| Workspace overview load (once) + `onLiveContentChange` causing re-render | `src/features/builder/components/workspace.tsx:100-118, 341` |
| Canvas `getLivePreviewData` fetch + `appearance:changed` subscription + `themeConfig`/`previewPlanCode` state | `src/features/builder/canvas/interactive-canvas.tsx:55-124` |
| `Chip` without `aria-pressed`/`radiogroup` | `src/features/builder/components/appearance-panel.tsx:342-376` |
| `updateTheme` returns only `success` | `src/actions/theme.actions.ts:60,188-191` |
| `getBuilderOverview` appearance defaults | `src/actions/builder-overview.actions.ts:218-243` |
| `getLivePreviewData` fresh read | `src/actions/builder-preview.actions.ts:36-52` |
| `storefront-loader` preview route (fixed in working tree) | `src/lib/storefront/storefront-loader.ts:62-118` |
| `buildRuntimeSnapshot` canonical builder | `src/lib/storefront/build-snapshot.ts:66-156` |

*End of audit — 2026-08-27.*
