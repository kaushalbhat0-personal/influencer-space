# RCCF-BUILDER-01 — Builder UI, Theme System & Accessibility Audit Closure

**Status:** COMPLETE — AUDIT ONLY. No implementation authorized.
**Date:** 2026-08-27
**Git HEAD:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8`
**origin/main:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` (identical)

---

## 1. Executive Verdict

**Grade: B — Architecturally sound, functionally coherent, with a small number of real defects.**

The Builder is **not** a candidate for redesign. It already runs the **same runtime** as the published storefront
(`buildRuntimeSnapshot` → `themeResolver.resolveForSnapshot` → `LayoutEngine` → `ComponentRenderer`), which is the
correct architectural shape. The Theme system is a single-authority pipeline (`ThemeDefinition → ThemeResolver →
LayoutEngine`) with 30+ built-in themes and a capability-gated appearance surface. The Builder UI is responsive
(side-rails below `lg` become bottom sheets), keyboard shortcuts exist, and ARIA usage is generally correct.

**The primary defect found is a runtime-fidelity gap:** the public `?preview=true` route
(`src/lib/storefront/storefront-loader.ts`) does **not** thread `Website.themeConfig` into the snapshot builder,
while the Builder canvas, the publish path, construction, and runtime-parity **all do**. Two existing guardrail
tests pin this behavior and are **currently failing**. Everything else is P2/P3 polish.

- **No P0** was found (nothing blocks create/edit/publish; no dangerous or destructive behavior; no tenant-isolation breach).
- **2× P1** — preview-route fidelity gap; mobile sheet without a focus trap; section-row selection is mouse-only.
- **~6× P2**, **~6× P3** — listed below with evidence.

No source changes were made. The only artifact produced is this document.

---

## 2. Baseline

| Item | Value |
|---|---|
| HEAD | `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` |
| origin/main | `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` |
| Staged | `docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md` (pre-existing, unrelated) |
| Dirty (pre-existing) | `.env.example`, `docs/design/Stitch-DNA.md`, marketing screenshots, `opencode.json`, `package.json`, `skills-lock.json`, `src/actions/billing.actions.ts`, `src/app/onboarding/page.tsx`, `src/components/dashboard/StorefrontStatusCard.tsx`, `src/components/marketing/trust/ComparisonTable.tsx` (deleted), `src/components/ui/Button.tsx`, `src/lib/marketing/trust/comparison.ts`, `tests/e2e/shared/auth.ts`, `tests/fixtures/test-seed.ts`, `tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts` + many untracked docs/screenshots/skills |
| **Audit-introduced source changes** | **NONE** |

The two protected files (`src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts`) were dirty **before** this
audit began and were **not touched** by it. Verified by diff before/after.

---

## 3. Builder Architecture (as actually discovered)

The real chain is **not** a monolithic editor. It is a client store driving a shared runtime:

```
/builder (page.tsx, force-dynamic)
  └─ BuilderLoader (next/dynamic, ssr:false)
       └─ BuilderWorkspace (workspace.tsx)
            ├─ BuilderToolbar (toolbar.tsx)          — device switch, undo/redo, save, preview, view-live
            ├─ ResizablePanel left (panel.tsx)        → BuilderSidebar → SectionManager
            ├─ InteractiveCanvas (interactive-canvas.tsx) — THE storefront runtime, client-side
            ├─ ResizablePanel right (panel.tsx)        → BuilderProperties → WebsitePanel
            ├─ BuilderMobilePanel (mobile-panel.tsx)  — bottom sheets (< lg)
            ├─ mobile bottom bar (workspace.tsx)      — Canvas / Sections / Properties
            └─ status bar                             — dirty state, save, publish, view-live
```

State & logic modules:

| Module | File | Role |
|---|---|---|
| Store | `src/lib/builder/store.ts` | Single mutable canvas state; `isDirty`, history (≤50), selection, drag, clipboard |
| Events | `src/lib/builder/events/` | Typed event bus (`store:changed`, `appearance:changed`, `save:requested`, `drag:*`, …) |
| Commands | `src/lib/builder/commands/` | `selectNode`, `deleteNode`, `insertNode`, `moveNode`, `save`, `publish`, zoom/device, … |
| Query | `src/lib/builder/query/` | Versioned cache + telemetry over store reads |
| Editor | `src/lib/builder/commands/editor.ts` | Section-level ops (`deleteSection`, `duplicateSection`) |
| Persistence | `src/features/builder/components/persistence.ts` | `sessionStorage` for collapse state / device / scroll |
| Keyboard | `src/features/builder/shared/keyboard.ts` | Ctrl+Z/Y/D/A/S, Delete, Escape, `[` `]` panel toggles |

Runtime/theme integration:

| Module | File | Role |
|---|---|---|
| Canvas | `src/features/builder/canvas/interactive-canvas.tsx` | `getLivePreviewData()` → live aggregate + theme; renders via `layoutEngine.resolve` + `ComponentRenderer` + `ExperienceSection` |
| Snapshot builder | `src/lib/storefront/build-snapshot.ts` | **Single** `buildRuntimeSnapshot()` shared by publish / preview route / parity |
| Resolver | `src/lib/theme/resolver-new.ts` | **Single** `themeResolver.resolveForSnapshot()` (theme + overrides) |
| Registry | `src/lib/theme/registry-new.ts` | 30+ built-in themes, tier/capability metadata |
| Theme actions | `src/actions/theme.actions.ts` | `updateTheme` (appearance), `applyThemePackage` (apply) — server-gated |
| Builder actions | `src/actions/builder.actions.ts` | `loadBuilderPages` / `saveBuilderPages` — session-scoped |
| Preview data | `src/actions/builder-preview.actions.ts` | `getLivePreviewData()` — session-scoped live aggregate + themeConfig |

Key architectural facts:

- **The Builder canvas is not a fake preview.** It renders the actual storefront runtime client-side: live CMS
  aggregate → `layoutEngine.resolve(snapshot)` → `ComponentRenderer`. Empty/hidden sections are removed exactly
  like the live site (`shouldRenderSection`).
- **The Builder never owns content.** Business content always lives in the live CMS; the draft only stores
  *layout + presentation metadata* (`updateBlockConfig` rejects non-`isPresentationKey` writes).
- **A runtime signature** (`computeRuntimeSignature` + `traceRuntime`) is emitted from the canvas so preview can be
  compared bit-for-bit against production.
- **Appearance edits** persist through the canonical `updateTheme` server action into `Website.themeConfig`, then
  emit `appearance:changed` → canvas refetches `getLivePreviewData()`. One write path, one read path.

---

## 4. Builder Route Inventory

| Route | Purpose | Auth | Primary components | State source | Save | Publish |
|---|---|---|---|---|---|---|
| `/builder` | Main visual builder | Creator session (`getServerSession`) | `BuilderLoader → BuilderWorkspace → InteractiveCanvas`, toolbar, sidebar, properties, mobile sheets | `builderStore` hydrate from `loadBuilderPages()`; live aggregate from `getLivePreviewData()` | `saveBuilderPages` (2s autosave debounce + Ctrl+S + toolbar) | `publishWebsite()` server action (draft first) |
| `/admin/create` | Theme selection after onboarding | Creator session | Onboarding/manual-creation flow | provisioning + `applyThemePackage` | — | — |
| `/admin/themes` | Theme marketplace | Creator session | `theme-marketplace-client.tsx` (marketplace, apply, "Open in Builder" → `/builder?theme=…`) | `themeRegistry` | — | apply marks changes-pending |
| `/admin/appearance` | Appearance settings page | Creator session | Appearance controls (Growth-gated) | `Website.themeConfig` | `updateTheme` | marks changes-pending |
| `/admin/settings` (+ `/content`) | Hero / section content editing | Creator session | `settings-form.tsx` | live CMS | content service | — |
| `/[domain]?preview=true` | Authorized draft preview route | `canPreviewTenant` (tenant ownership) | `storefront-loader.ts → getStorefrontData` → storefront page | `buildRuntimeSnapshot` (Draft Layout + Live Content) | — | — |
| `/[domain]` | Public published storefront | none | storefront page | persisted `PublishedSnapshot` only | — | read-only |

Device preview modes: desktop (1200px), tablet (768px), mobile (375px) — via `DEVICE_WIDTHS` in
`interactive-canvas.tsx`, framed as an `@container/main` boundary so container-query breakpoints respond to the
frame width, not the browser window.

---

## 5. Builder UX Audit

Evaluated against the mission's interaction matrix (discoverability, selection clarity, feedback, active state,
destructive protection, undo, breakpoint clarity, context, noise, hierarchy, grouping, labels, icons).

| Interaction | Verdict | Evidence |
|---|---|---|
| Add section | GOOD | Grid of labeled buttons in sidebar; each maps to a registered component; canvas renders immediately |
| Section selection | **DEFECT (P1)** | `SectionCard` root is a clickable `<div onClick>` with **no role, no tabIndex, no keyboard handler** — mouse-only selection (`section-manager.tsx:111-120`) |
| Reorder section | GOOD (keyboard alt) | Up/Down arrow buttons always visible on mobile, hover-revealed on desktop (`lg:opacity-0 lg:group-hover:opacity-100`), **never hover-only** |
| Visibility toggle | GOOD | Eye/EyeOff button with `aria-label` (`Show/Hide X`) and `aria-pressed`-equivalent active state |
| Duplicate / Delete | GOOD | Buttons with `aria-label`; Delete is **not** behind a confirm, but history (Ctrl+Z) restores — acceptable |
| Undo / Redo | GOOD | Toolbar buttons (disabled state) + Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y; history is store-backed |
| Device switch | GOOD | Desktop/Tablet/Mobile buttons with `aria-pressed` + `aria-label`; active state is visual (indigo) |
| Breakpoint clarity | GOOD | Canvas frame shows `375px / 768px / 1200px` in the device chrome; non-desktop adds a floating `px · zoom%` pill |
| Save feedback | PARTIAL | Status bar shows "Draft saved"/"Unsaved changes" + transient `statusMsg` (green/red). **Not** an `aria-live` region → screen readers get no announcement (P2) |
| Publish feedback | GOOD | "Publishing…" spinner, success reload, failure presentation via `getPublishFailurePresentation` incl. upgrade CTA |
| Dirty-state guard | GOOD | `beforeunload` warning when dirty; autosave re-arms after failure (`saveAttempt`) |
| Preview vs apply theme | GOOD | `/builder?theme=` previews only; apply persists + strips the query param (no stale-preview resurrection) |
| Drag handle | **DEFECT (P2)** | `GripVertical` on each section is **decorative** — no `onDragStart`/`drag:*` wiring in the sidebar. Store has `startDrag/updateDragTarget/endDrag` but nothing calls them from the UI |
| Hierarchy/grouping | GOOD | Sections rail, canvas, properties rail map to clear zones; mobile bottom bar (Canvas/Sections/Properties) is coherent |
| Icons/labels | GOOD | Icon-only controls carry `aria-label`; text labels present where ambiguous |
| Visual noise | GOOD | Dense but controlled; no gratuitous decoration in the builder shell |

---

## 6. Builder Responsive Audit

**Widths reviewed** (from code + container-query framing): 320 / 360 / 375 / 390 / 414 / 768 / 1024 / 1280 / 1440.

Two distinct concerns:

### A. Builder application UI
- Desktop (`lg+`): three-column workspace with **resizable** rails (`panel.tsx`, Pointer Events, `touch-action:none`
  on handle — one mouse/touch path). Rails are `hidden lg:block`.
- Below `lg`: rails hidden; `BuilderMobilePanel` renders Sections/Properties as **bottom sheets**; a persistent
  bottom bar (Canvas/Sections/Properties) replaces the rails. Canvas is full-width.
- Toolbar wraps (`flex-wrap`) on narrow screens; the second row (device switch + preview + view-live + save) is
  `flex-wrap` with `gap-y-1`.
- Canvas frame is `mx-auto shrink-0` so it centers when it fits and keeps its **left edge reachable** when wider
  than the viewport (left overflow clip is avoided by design — RCCF-71.4.3). No blanket `overflow-x:hidden` hack.
- Touch targets: bottom-bar buttons are full-flex-height (~48px); section action buttons are small (`p-0.5`, ~20px)
  but always visible on mobile (hover-free). Resize handles are `w-1` (thin) but pointer-captured.

### B. Storefront editing viewport
- The **device frame is the `@container/main` boundary**, so `@sm/main:` / `@lg/main:` container-query variants in
  renderers respond to the frame (375/768/1200) — the mobile frame renders the same base classes as the live
  storefront at 375px. This is the correct approach and is already pinned by `rccf71-5-2-builder-preview-gutter.test.ts`.

**No overflow defect was found.** No `overflow-x:hidden` masking was needed. The one residual is that on
very narrow Builder viewports the desktop canvas frame can exceed the viewport width by design (correctly
scrollable, left edge reachable).

---

## 7. Theme Architecture (actual runtime chain)

Single-authority pipeline:

```
ThemeDefinition (registry-new / providers/built-in, 30+ themes, tier+capabilities)
   │
   ▼
themeResolver.resolveForSnapshot(themeId, mode, overrides)
   │   (variant light/dark → tokens → DEFAULT_LIGHT/DARK_TOKENS fallbacks)
   ▼
ResolvedSnapshotTheme { packageId, colors{}, typography{heading,body,mono,display,headingWeight?}, borderRadius?, layoutDensity? }
   │
   ▼
LayoutEngine.resolve(snapshot) → themeVars → rendered as CSS variables on `.theme-root`
   │
   ▼
Storefront renderers consume `--brand-*` variables
```

Appearance overrides persist on **`Website.themeConfig`** (JSON): `borderRadius`, `layoutDensity`, `headingWeight`,
`heroTextAlign`, `heroContentWidth`, `heroOverlay`, `experienceBackground(+Image/AssetId/Opacity)`,
`experienceSurface`, `font`. `themeColors`/`themeFonts` are separate columns.

### Theme concern source-of-truth table

| Theme concern | Source of truth | Builder editable? | Snapshot persisted? | Runtime applied? |
|---|---|---|---|---|
| Colors | `ThemeDefinition.variants[].tokens.colors` + `Website.themeColors` overrides | Yes (primary/secondary/accent via AppearancePanel; advanced_builder gated) | Yes (`ThemeSnapshot.colors`) | Yes (CSS vars via LayoutEngine) |
| Typography (fonts) | `ThemeDefinition.tokens.typography` + `Website.themeFonts` | Yes (Font chips) | Yes (`ThemeSnapshot.typography`) | Yes |
| Heading weight | `Website.themeConfig.headingWeight` (validated against `HEADING_WEIGHT_VALUES`) | Yes (chips, gated) | Yes (`typography.headingWeight`) | Yes (renderer 700 fallback for old snapshots) |
| Border radius | `Website.themeConfig.borderRadius` (0–24) | Yes (range slider) | Yes (`ThemeSnapshot.borderRadius`) | Yes (LayoutEngine) |
| Layout density | `Website.themeConfig.layoutDensity` | Yes (chips) | Yes (`ThemeSnapshot.layoutDensity`) | Yes (LayoutEngine) |
| Spacing | Tailwind 4px scale + `LayoutEngine` density | Indirect (via density) | Baked via layout | Yes |
| Buttons / Cards / Sections | Registry renderers consuming `--brand-*` | No (rendered from theme + presentation) | Via snapshot | Yes |
| Hero presentation | `Website.themeConfig.hero*` → `applyHeroPresentation` | Yes (chips, gated) | Merged onto `content.hero` | Yes (publish + canvas; **NOT preview route — see P1-1**) |
| Experience (bg/surface/effects) | `theme-experience.ts` registry + `applyExperienceOverride` | Yes (presets, capability-gated) | Baked into `renderingHints.experience` | Yes |
| Responsive behavior | `@container/main` + container-query variants | No | N/A | Yes |

---

## 8. Builder → Snapshot → Runtime Fidelity

Traced one property (`borderRadius` + `layoutDensity` + `headingWeight` + hero presentation) end to end:

| Stage | Builder canvas | Preview route (`?preview=true`) | Publish |
|---|---|---|---|
| Reads `Website.themeConfig` | ✅ `getLivePreviewData()` selects + returns it (`builder-preview.actions.ts:40,51`) | ❌ `storefront-loader.ts:62` **does not select it** | ✅ `publishing/service.ts:174,239,258` |
| Passes into `buildRuntimeSnapshot` | ✅ client mirrors overrides in canvas resolver | ❌ omitted at `storefront-loader.ts:81-90` | ✅ |
| Resolves overrides | ✅ `interactive-canvas.tsx` (`borderRadius`, `layoutDensity`, `headingWeight`, hero presentation, experience) | ❌ falls back to theme defaults | ✅ |
| Result | appearance applied | **appearance NOT applied** | appearance applied |

**This is the core fidelity defect (P1-1).** A creator who customizes radius/density/heading-weight/hero
presentation/experience sees it in the Builder canvas and in the published site, but the **public preview route
shows the un-customized default**. The stated invariant ("Builder preview == preview route == publish") is broken
**only** at the preview route.

Two guardrail tests pin this and are **failing** (see §14):
- `tests/unit/rccf71-1-canonical-theme-foundation.test.ts` — "every buildRuntimeSnapshot caller threads themeConfig (publish/preview/construction/parity)" expects `storefront-loader.ts` to contain `themeConfig: (website.themeConfig`.
- `tests/unit/rccf71-3-hero-presentation.test.ts` — "the preview route threads Website.themeConfig into the snapshot builder" expects the same.

No second theme interpretation exists anywhere else; `buildRuntimeSnapshot` is the single assembly rule and the
resolver is the single authority — the gap is purely that one caller forgets to pass the input.

---

## 9. Theme Switching Audit

- **Preview vs apply is correctly separated**: `?theme=` previews (never persists, never marks dirty, never autosaves);
  Apply persists via `applyThemePackage` (entitlement-gated server-side), then strips the query param.
- **No theme-state leakage found**: preview state lives in a separate `previewThemeId`; the applied theme is
  `currentThemeId`. Autosave persists the applied theme only (never the previewed one).
- **Fallbacks are safe**: unknown theme ids resolve via `normalizeThemeId` → default `com.creatos.neon-dark`;
  old snapshots missing `borderRadius`/`layoutDensity`/`headingWeight` render via LayoutEngine/renderer defaults
  (8px radius scale / comfortable density / 700 weight). No crash path found.
- Stale-token/`unsupported value` handling: `updateTheme` validates every value against canonical registries before
  persisting; unknown values are ignored, never stored.

---

## 10. Theme Accessibility Audit (contrast)

Themes are dark-first. The baseline contrast posture is documented in `docs/accessibility-audit.md`:

- `text-zinc-400/500` on near-black (#0A0A0B) ≈ 4.6:1 — AA at the larger sizes used (OK for body/labels at ≥14px).
- **`text-zinc-600` on near-black is below AA** (~3:1) and is used for: Builder status-bar secondary text
  (`workspace.tsx:417` `text-zinc-600`), field labels, `text-zinc-700` version/separators, collapsed-rail labels.
  Reserved for non-essential text; flagged as a roadmap QA sweep in the existing audit.
- Focus indicators: global `:focus-visible` ring (`--focus-ring`) is present; interactive controls add
  `focus-visible` styles. No failing focus-visibility combination found.
- Interactive-control contrast: primary actions (Save indigo, Publish emerald) use tinted backgrounds with
  adequate text contrast on dark.

**Specific failing combination to record:** `text-zinc-600`/`text-zinc-700` at `text-[10px]` on `#0A0A0B` (status
bar, version/separator chrome, field labels) — fails WCAG 1.4.3 for normal text. P2.

---

## 11. Builder Keyboard Accessibility

| Concern | Verdict | Evidence |
|---|---|---|
| Shortcuts | GOOD | Ctrl+Z/Y/D/A/S, Delete, Escape (deselect), `[`/`]` panel toggles — skipped while typing in inputs |
| Toolbar / side rails / add-section | GOOD | All `<button>`/`<Link>`; focusable; `aria-label` on icon-only |
| Device switch | GOOD | Buttons with `aria-pressed` + `aria-label` |
| Section selection | **FAIL (P1)** | Row is a `<div onClick>` — not focusable, no role, no Enter/Space handler. Keyboard users **cannot select a section** (inner action buttons are reachable, but selection is not) |
| Section actions (move/toggle/dup/delete) | GOOD | Buttons with `aria-label`, disabled correctly at boundaries |
| Inspector / appearance | GOOD | Chips are buttons; sliders have `aria-label`; radio-like chips expose `aria-pressed`-style active state |
| Mobile sheets | PARTIAL (P1-2) | `role="dialog" aria-modal="true"`, Escape closes, focus moves to close on open, returns to trigger on close, body scroll locked — **but no Tab focus trap** (see §13) |
| Undo/redo reachability | GOOD | Toolbar buttons + shortcuts |
| No keyboard trap | PASS | No trap found outside the sheets' missing-trap issue |
| Disabled controls exposed | GOOD | `disabled` attributes used (arrow up/down at ends, save while saving) |
| Active tab semantics | N/A | No role="tab" usage in Builder; device switch uses `aria-pressed` (correct for a toggle group) |

---

## 12. ARIA / Semantic Audit

| Check | Verdict | Evidence |
|---|---|---|
| Buttons are buttons | PASS | All interactive actions use `<button>`/`<Link>` except section selection (P1-1 covers) |
| Icon-only accessible names | PASS | `aria-label` on undo/redo, panel toggles, device switch, mobile bar buttons, section actions, close |
| Inputs labelled | PASS | Appearance sliders have `aria-label`; email flow labels text explicitly |
| Dialogs | PARTIAL | `BuilderMobilePanel` uses `role="dialog" aria-modal="true" aria-label` but no focus trap (P1-2) |
| Tabs | N/A | No tablist in Builder shell |
| Menus | N/A | No listbox/menu misuse found |
| Heading hierarchy | PASS | Sheet header is `h2` under the shell; canvas empty states use `h2`; no skipped levels found in Builder |
| Landmarks | PASS | `main` + nav present; canvas is a `main`-adjacent region; footer status bar is a plain div (acceptable) |
| Live regions | **GAP (P2)** | Save/status/dirty announcements are plain text — not `aria-live`; screen readers don't announce save result |
| `aria-hidden` misuse | PASS | Used only on decorative elements (backdrop, swatches) |
| `aria-pressed` misuse | PASS | Used on real toggles; the one lint warning (`StrategyCard.tsx aria-pressed on role=radio`) is outside the Builder |

---

## 13. Focus Management

| Scenario | Behavior | Verdict |
|---|---|---|
| Mobile sheet open | Focus moves to the close button after 50ms; Escape closes; **focus returns to the trigger on close**; body scroll locked | GOOD except trap |
| Tab inside modal sheet | **No focus trap.** `Tab` can leave the sheet onto hidden canvas/background (the fixed backdrop blocks pointer, not keyboard). | **P1-2** |
| Builder selection | Clicking a canvas section does not steal focus to the canvas; the canvas is not focus-managed; selection ring reflects `builderStore.isSelected` | GOOD (no focus jump found) |
| Theme preview | `?theme=` does not move focus; preview is visual only | GOOD |
| Publish/save | No focus disruption; `beforeunload` guard on dirty | GOOD |

---

## 14. Screen Reader / Accessible Name Audit

| Control | Accessible name | Verdict |
|---|---|---|
| Undo / Redo | `aria-label="Undo"` / `"Redo"` | PASS |
| Device preview buttons | `aria-label="Desktop/Tablet/Mobile preview"` + `aria-pressed` | PASS |
| Mobile bar (Canvas/Sections/Properties) | `aria-label` + `aria-pressed` | PASS |
| Add-section grid | Visible text label on `<button>` | PASS |
| Section action buttons | `aria-label` on each (Move up/down, Hide/Show, Duplicate, Delete) | PASS |
| Drag handle | **No accessible name / no role** — and it does nothing (P2-2) | FAIL (decorative) |
| Status messages | No `aria-live` → not announced | GAP (P2) |
| Collapse/expand rails | `aria-label` + `aria-expanded` on toggle; resize handle is `role="separator" aria-orientation="vertical" aria-label` | PASS |

**Drag-and-drop is not the only path**: reordering is available via arrow buttons (keyboard-accessible), so the
"critical action pointer-only" rule is satisfied — this downgrades the grip-handle issue to P2, not P1.

---

## 15. Motion / Reduced Motion

- The mobile sheet uses `MotionDiv` from `@/components/ui/MotionSafe`. **`MotionSafe` is the reduced-motion-aware
  primitive** (spring sheet transitions, backdrop fade). `prefers-reduced-motion: reduce` is honored globally
  (`docs/accessibility-audit.md` records the global override).
- Canvas device-frame transition is a CSS `transition-all` (non-essential, duration-0 in reduced motion via global
  override).
- No loading animation was found to break under reduced motion (spinners degrade gracefully).

Verdict: PASS — motion already routes through the reduced-motion-safe primitive.

---

## 16. Touch / Pointer Accessibility

| Control | Verdict | Evidence |
|---|---|---|
| Bottom bar targets | PASS | Full-height flex buttons (~44–48px) |
| Section action buttons | PARTIAL | ~20px targets but always visible on touch (no hover dependency) and spaced |
| Resize handles | PASS | Pointer Events + `touch-action:none` + pointer capture — touch drag works and doesn't hijack scroll |
| Appearance chips | PASS | Chips are ~26px tall, `gap-1`, no hover dependency for state (active = border+bg) |
| Range sliders | PASS | Native range with `aria-label`; accent-indigo; 5-step/1-step increments |
| Drag handle | FAIL (P2) | Decorative; no pointer/touch drag wired; reordering is button-based |
| Sheet dismissal | PASS | Backdrop tap closes + Escape + close button |

---

## 17. Error / Loading / Empty States

| State | What happens | Verdict |
|---|---|---|
| Builder load | Spinner + "Loading your editor…" (loader + workspace) | PASS |
| Canvas data load | In-frame spinner "Loading live preview…" | PASS |
| No sections | Empty-state card "Add sections from the left sidebar" | PASS |
| Data ready but 0 visible sections | "Preview data is still loading… refresh" guidance | PASS |
| Save pending | "Saving…" button state + status bar | PASS |
| Save failure | `statusMsg` red, autosave re-arms (`saveAttempt`) | PASS |
| Publish pending/failure | "Publishing…" / `getPublishFailurePresentation` (message + optional upgrade CTA) | PASS |
| Theme apply failure | "Theme save failed" status | PASS |
| Missing theme | `FALLBACK_THEME_ID` default; theme name shows "No theme" | PASS |
| Preview failure | Inert preview; storefront `?preview=true` unauthorized degrades to published snapshot | PASS |
| Unknown component | Dashed red "Unknown component" box (renderer) — visible, not silent | PASS |

Verdict: no missing critical state; every path answers "what happened / current state / what to do next".

---

## 18. Builder → Storefront Fidelity (sample check)

Representative configurations reviewed against the same runtime chain:

1. **Simple/default theme** (`com.creatos.neon-dark`) — canvas, preview route, publish all resolve identically.
2. **Customized typography/colors** — colors/fonts are threaded by all three paths (colors/fonts are columns
   selected everywhere, including `storefront-loader.ts`). Matches.
3. **Appearance config (radius/density/heading/hero/experience)** — **diverges** only on the preview route (P1-1);
   canvas and publish match.

No other discrepancy found in section order, visibility, responsive behavior, buttons, images, or cards (all render
through the same `ComponentRenderer` + layout engine).

---

## 19. Performance Audit

| Item | Evidence | Verdict |
|---|---|---|
| Shared runtime | Canvas, preview, publish share one `buildRuntimeSnapshot`/resolver — no duplicated theme resolution | GOOD |
| Focus refetch | Debounced 1500ms (RCCF-LAUNCH-01) — no refetch storm | GOOD |
| Autosave | 2s debounce, re-arms on failure, `beforeunload` guard — no storm | GOOD |
| Per-render serialization | `interactive-canvas.tsx:133-140` runs `builderStore.serialize()` + `JSON.stringify` of the full layout signature **every render** to key the memo — O(n) per render | P3 (smell; acceptable at current page sizes) |
| Event bus | `store:changed` triggers workspace forceRender + canvas forceRender + sidebar refresh per mutation — broad but bounded | P3 |
| Query cache | Versioned cache; `JSON.parse(JSON.stringify())` deep-clone on misses | PASS |
| Builder bundle | `/builder` route: 1.47 kB route, **89.6 kB first-load JS** (lazy `next/dynamic`) — small | PASS |

No measured network/polling/autosave pathology found.

---

## 20. Security / Tenant Isolation

| Boundary | Evidence | Verdict |
|---|---|---|
| Builder read | `loadBuilderPages` → `getWebsiteId()` derives website from `session.user.tenantId` (server) | PASS |
| Builder save | `saveBuilderPages` → workspace context + `workspacePolicy.assertCanEdit` + session tenant | PASS |
| Preview data | `getLivePreviewData` → server session tenant | PASS |
| Theme update | `updateTheme(tenantId,…)` verifies `session.user.tenantId === tenantId`; values validated against registries; unsafe image URLs rejected | PASS |
| Theme apply | `applyThemePackage(tenantId,…)` verifies session tenant; entitlement gate server-side | PASS |
| Storefront preview | `?preview=true` gated by `canPreviewTenant` (tenant ownership); unauthorized degrades to published snapshot | PASS |
| Client-chosen tenant | Client cannot select another tenant ID — every action re-derives/re-validates against the session | PASS |
| Publish | `publishWebsite` runs through the same server-action authorization (session-scoped) | PASS |

No tenant-isolation defect found.

---

## 21. Stitch Exploration

**Not executed as a screen-generation pass.** Rationale: this RCCF is audit-first, and the existing canonical
Stitch project already contains the four validated screens (dashboard, products, **builder**
`8f47c0820077419eadccfca5c9cf195a`, storefront) under the **Premium Creator OS** design system
(`assets/1738427339068984141`) per `docs/design/Stitch-DNA.md`. Regenerating screens now would duplicate work the
audit already covered and risks importing fabricated data.

**Adoption assessment against the existing Builder:**

| Stitch exploration target | Useful? | Conflict with current Builder | Adopt later? |
|---|---|---|---|
| Desktop Builder shell (existing canonical screen) | Yes — reference for density/grouping | None; current shell already matches the dark-first, indigo-accent DNA | No changes needed |
| Mobile/tablet Builder | Yes — bottom-sheet pattern already implemented (`BuilderMobilePanel`) | None | No changes needed |
| Theme customization panel | Yes — the AppearancePanel already implements the target controls | None | Polish (grouping/labels) only |
| Accessible section insertion flow | Yes — current add-section grid is close; would benefit from focus + selection semantics | Section-row keyboard selection (P1-3) must be fixed in code, not Stitch | P1-3 fix first, then Stitch polish |

**Rule applied:** reject any Stitch idea that requires design-system drift (e.g. new breakpoints, glass-everywhere,
new component primitives not in the DNA). **No Stitch code is adopted in this audit.**

---

## 22. Existing Design DNA

`docs/design/Stitch-DNA.md` is intact and is the design reference. Its key mapping (dark-first, Inter canonical,
4px spacing rhythm, `#6366F1` primary, radius md/lg direction, restrained elevation, premium_themes/advanced_builder
capability language) is already consistent with the Builder shell and the theme token system. The only latent
inconsistency it flags — the unused Geist variable font vs canonical Inter — is a restyle-RCCF item, not a Builder
defect.

---

## 23. Accessibility Scorecard

| Area | Status | Evidence |
|---|---|---|
| Keyboard navigation | **FAIL** | Section selection is mouse-only (P1-3); everything else reachable |
| Focus visibility | PASS | Global `:focus-visible` ring + per-control focus styles |
| Focus restoration | PASS | Mobile sheet returns focus to trigger; no focus jumps on selection |
| Dialogs | PARTIAL | Correct semantics but no focus trap in `BuilderMobilePanel` (P1-2) |
| Drawers | PARTIAL | Same sheet; trap missing |
| Tabs | N/A | No tablist in Builder |
| Forms | PASS | Sliders/inputs labelled; appearance chips are buttons |
| Icon controls | PASS | `aria-label` on all icon-only controls |
| ARIA | PARTIAL | Correct usage; no `aria-live` on status; section row lacks role |
| Headings | PASS | Correct hierarchy |
| Contrast | PARTIAL | `text-zinc-600/700` @10px below AA (P2) |
| Reduced motion | PASS | `MotionSafe` + global `prefers-reduced-motion` |
| Touch targets | PARTIAL | Bottom bar good; section actions ~20px |
| Screen reader naming | PARTIAL | Good names; status not announced; grip handle unnamed |
| Drag/drop alternatives | PASS | Arrow-button reordering exists (drag is not the only path) |

---

## 24. Findings Classification

### P0 — none
No finding blocks create/edit/publish or creates dangerous/destructive behavior.

### P1

| ID | Area | Route/Component | Evidence | Impact | Root cause | Recommended direction | Risk |
|---|---|---|---|---|---|---|---|
| **P1-1** | Theme→runtime fidelity | `?preview=true` — `src/lib/storefront/storefront-loader.ts` | `prisma.website.findUnique` select omits `themeConfig` (line 62); `buildRuntimeSnapshot` call omits it (lines 81–90). Publish/construction/parity/canvas all thread it. **2 guardrail tests failing** (`rccf71-1`, `rccf71-3`) | Preview route shows default appearance while canvas + publish show the creator's radius/density/heading/hero/experience overrides — the stated "preview == publish" invariant is broken for appearance | Preview loader never threads `Website.themeConfig` | Add `themeConfig: true` to the select and `themeConfig: (website.themeConfig ?? {})` to the `buildRuntimeSnapshot` input | Low — one file, one select, one arg; existing tests already pin the expected shape |
| **P1-2** | Focus management / modal | `BuilderMobilePanel` (`mobile-panel.tsx`) | `role="dialog" aria-modal="true"` but no Tab focus trap; backdrop blocks pointer only | Keyboard users can Tab out of the modal onto hidden canvas/background | No focus-trap implemented | Add a focus trap (cycle Tab within the sheet) reusing the existing dialog primitive direction | Low-Medium |
| **P1-3** | Keyboard selection | `SectionManager` → `SectionCard` (`section-manager.tsx:111-120`) | Clickable `<div onClick>` — no role/tabIndex/keyboard handler | Keyboard users cannot select a section; selection is the primary canvas interaction | Row is a div, not a button | Make the row a `<button>` (or add `role="button" tabIndex=0` + Enter/Space) | Low |

### P2

| ID | Area | Evidence | Impact |
|---|---|---|---|
| P2-1 | Status announcements | Status bar save/dirty messages are plain text (no `aria-live`) | Screen readers don't announce save/publish result |
| P2-2 | Drag handle | `GripVertical` on section rows is decorative; store drag API is unused by the sidebar | Misleading affordance; touch drag not available (buttons are the accessible alternative) |
| P2-3 | Contrast | `text-zinc-600/700` @ 10px on `#0A0A0B` in status bar / separators / field labels | Fails WCAG 1.4.3 for normal text |
| P2-4 | Section-row semantics | Row lacks `aria-current`/selected-state announcement | Selection state is visual-only |
| P2-5 | Mobile sheet focus target | Focus lands on the close button, not the panel content | Minor; acceptable but could land on the title/backdrop instead |

### P3

| ID | Area | Evidence |
|---|---|---|
| P3-1 | Lint | `interactive-canvas.tsx:22` unused `LayoutSnapshot` import |
| P3-2 | Lint/hooks | `workspace.tsx:199` unnecessary dep `builderStore.isDirty`; `workspace.tsx:251` unnecessary dep `previewThemeId` |
| P3-3 | Lint | `theme-card.tsx` unused `CheckCircle2`, `RECENT_KEY` |
| P3-4 | Perf | `interactive-canvas.tsx:133-140` full `serialize()` + `JSON.stringify` layout signature per render |
| P3-5 | Perf | `store:changed` fans out to workspace + canvas + sidebar per mutation |
| P3-6 | UX | Add-section does not auto-select/scroll to the newly inserted section |

---

## 25. Not Fixed (per mandate)

No Builder redesign, theme redesign, new themes/components, schema/snapshot migration, commerce/payment/pricing/
marketing/onboarding change, or broad accessibility refactor was implemented. Only this audit document was created.

---

## 26. Existing Guardrails

**Ran:** `npx vitest run tests/unit/builder-core.test.ts tests/unit/builder-presentation.test.ts
tests/unit/rccf71-1-canonical-theme-foundation.test.ts tests/unit/rccf71-5-2-builder-preview-gutter.test.ts
tests/unit/rccf71-3-hero-presentation.test.ts`

| Suite | Result | Classification |
|---|---|---|
| `builder-core.test.ts` | PASS | passing |
| `builder-presentation.test.ts` | PASS | passing |
| `rccf71-5-2-builder-preview-gutter.test.ts` | PASS | passing |
| `rccf71-1-canonical-theme-foundation.test.ts` | **1 FAILED** (themeConfig threading) | **failing — pins P1-1** |
| `rccf71-3-hero-presentation.test.ts` | **1 FAILED** (preview-route themeConfig) | **failing — pins P1-1** |

93 passed / 2 failed across the 5 suites. The remaining builder/theme suites (rccf71-2/3/4.x/5.x/6.x,
rccf70-4-5/4-6 builder, `rccf-mkt-10` accessibility) were not run — full-suite execution was not practical in this
audit; the two failing tests are the direct evidence for P1-1 and are **not** rewritten.

---

## 27. Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (clean) |
| `npm run lint` | **PASS** (warnings only, no errors; builder warnings listed in P3) |
| `npm run build` | **PASS** — 160 static pages; `/builder` dynamic, 1.47 kB route / 89.6 kB first-load JS |
| `npx prisma validate` | **PASS** (schema valid) |
| Responsive browser checks | Static code audit at 320–1440 (Section 6) — no browser session available in this environment |
| Keyboard checks | Static code audit (Sections 11–14) |
| `git diff --check` / `git diff --cached --check` | **PASS** (only pre-existing CRLF notice on `tests/fixtures/test-seed.ts`) |

Disclosure: browser-based keyboard/responsive verification was performed as a code audit, not a live Playwright
session; the runtime chain was verified by reading the shared snapshot builder/resolver.

---

## 28. Git Discipline

| Check | Result |
|---|---|
| `git status --short` | Identical to pre-audit baseline; no new modified/untracked source files |
| `git diff --stat` | 21 files, all pre-existing (300 insertions / 286 deletions) — none from this audit |
| `git diff --cached --stat` | 1 file (pre-existing staged closure) |
| `git diff --check` | PASS |
| `git diff --cached --check` | PASS |
| Source changes introduced | NONE |
| Protected work touched | NONE (`onboarding/page.tsx`, `test-seed.ts` were pre-existing dirty and untouched) |
| Commit / push | NONE |

---

## 29. Recommended Next RCCFs (prioritized)

1. **RCCF-BUILDER-02 — Preview-route themeConfig fidelity fix (P1-1).** Thread `Website.themeConfig` into
   `buildRuntimeSnapshot` in `storefront-loader.ts`; green the two failing guardrail tests. Small, surgical.
2. **RCCF-BUILDER-03 — Builder keyboard/modal accessibility (P1-2, P1-3, P2-1).** Focus trap for the mobile sheet;
   make section rows keyboard-selectable; add `aria-live` to the status bar.
3. **RCCF-BUILDER-04 — Builder polish (P2-2…P2-5, P3-1…P3-6).** Wire or remove the decorative grip handle; fix
   low-contrast 10px text; announce selection; auto-select on add-section; lint cleanups; memo the layout signature.
4. **RCCF-THEME-01 — Contrast sweep across themes.** Audit all 30+ theme palettes for `text-zinc-600`-style
   combinations against WCAG 1.4.3 before exposing more appearance controls.
5. **RCCF-RESTYLE-01 (separate, out of Builder scope).** Resolve the Geist-vs-Inter latent inconsistency flagged by
   Stitch-DNA §11.

---

## 30. Deferred Items

- Full-stack Playwright keyboard/responsive session (environment had no live builder auth; code audit used instead).
- Theme-contrast sweep across all 30+ palettes (requires the theme registry data pass).
- Stitch screen regeneration (deferred deliberately — canonical screens already exist; see §21).
- All P1/P2/P3 fixes (authorized by a future RCCF).

---

## 31. Final Verdict

**Grade B.** The Builder and Theme system are architecturally sound — one runtime, one resolver, one snapshot
builder, correct tenant isolation, responsive shell, reduced-motion-safe motion, and strong ARIA hygiene. The
release-blocking issue for the stated fidelity invariant is **P1-1** (preview route does not thread `themeConfig`),
which is small and already pinned by two failing tests. Everything else is P2/P3 polish.

**Stop condition met:** audit complete; no implementation performed; no commit/push; only this document created.
The next RCCF will be authorized separately.