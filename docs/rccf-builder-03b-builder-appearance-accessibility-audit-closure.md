# RCCF-BUILDER-03B — Builder Appearance Accessibility Audit Closure

**Status:** COMPLETE — AUDIT ONLY. No implementation authorized. No source modified.
**Date:** 2026-08-27
**Auditor:** OpenCode (Muse Spark)
**Baseline HEAD:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8`
**origin/main:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` (identical)
**Baseline includes locally-implemented RCCF-BUILDER-03A** (4-file appearance state-sync fix — `appearance-panel.tsx`, `website-panel.tsx`, `workspace.tsx`, `properties.tsx` — plus `rccf-builder-03a` test & closure). Those 03A files are **the audited surface**; they are dirty but not committed. No commit/push was performed in this RCCF.

---

## 1. Executive Verdict

**Grade: B — Appearance surface is functionally correct after 03A, but has 2× P1 and 4× P2 material accessibility gaps; no P0.**

The stale-selection defect is closed. The remaining appearance-a11y gap is narrow and well-bounded. Of the five deferred items from BUILDER-03, **2 are confirmed P1 defects**, **1 is a P2**, **1 is P3 enhancement**, **1 is already-correct** — do **not** bulk-fix all five.

| Deferred item | Re-evaluation | New severity | Evidence |
|---|---|---|---|
| `aria-pressed` / `radiogroup` on chips | **Confirmed defect** — mutually exclusive selection has no programmatic selected state | **P1** | `appearance-panel.tsx:412-445` Chip is `<button>` with `active` visual only, no `aria-pressed`/`aria-checked`, no `radiogroup` |
| `aria-live` for save/pending | **Confirmed deficiency** — pending/success/failure not exposed to AT; not unusable but no announcement | **P2** | `appearance-panel.tsx:161` `<span>Saving…</span>`, `workspace.tsx:438` `statusMsg` plain span, no `aria-live` |
| Mobile focus trap | **Confirmed defect** — dialog lacks Tab confinement | **P1** | `mobile-panel.tsx:33-59` has focus-to-close + Escape + scroll lock + return, but **no Tab cycle** (contrast `admin-sidebar.tsx:62-85` which does) |
| SectionCard `<div onClick>` | **Confirmed P1** but with nesting nuance — card is mouse-only; naive `div → button` replacement would create invalid nested-button DOM | **P1** | `section-manager.tsx:111-120` `<div onClick>` no `tabIndex`/`role`/`onKeyDown`; 6 inner buttons |
| Slider `aria-valuetext` | **Already correct / P3** — native `<input type=range>` + `aria-label` + visible “8px”/“35%” label is sufficient; `aria-valuetext` is optional polish | **P3** | `appearance-panel.tsx:285-295,250-259` `type="range"` with `min/max/step/value/aria-label` |

Two additional medium findings and one polish are listed in §6 but do not change the grade. No P0 (nothing blocks create/edit/publish or traps focus irreversibly — sheets are dismissible via Escape/backdrop/close).

**Recommended next slices:**

- **RCCF-BUILDER-03B-1 (P1 a11y):** chips `radiogroup`/`aria-checked` (reuse `DateRangePicker` pattern) + mobile sheet Tab trap (reuse `AdminSidebar` pattern). Small, isolated, no resolver/publishing change.
- **RCCF-BUILDER-03B-2 (P2 polish, separate):** `aria-live="polite"` status region for save/pending/failure + section-card keyboard selection (with nesting-safe structure). Can ride with 03B-1 or follow.

---

## 2. Baseline

```
HEAD:        b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
origin/main: b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8

M  (modified, pre-existing dirty):
  .env.example, docs/design/Stitch-DNA.md, marketing screenshots,
  opencode.json, package.json, skills-lock.json,
  src/actions/billing.actions.ts,
  src/app/onboarding/page.tsx                 ← PROTECTED (untouched)
  src/components/dashboard/StorefrontStatusCard.tsx,
  src/components/ui/Button.tsx,
  src/lib/marketing/trust/comparison.ts,
  src/lib/storefront/storefront-loader.ts     ← BUILDER-02/02B (pre-existing dirty, not cleaned)
  tests/e2e/shared/auth.ts,
  tests/fixtures/test-seed.ts                 ← PROTECTED (untouched)
  tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts

M  (modified, RCCF-03A — the audited surface):
  src/features/builder/components/appearance-panel.tsx
  src/features/builder/components/website-panel.tsx
  src/features/builder/components/workspace.tsx
  src/features/builder/components/properties.tsx

D  (deleted, pre-existing):
  screenshots/after-builder-mobile-frame.png etc., src/components/marketing/trust/ComparisonTable.tsx

M  (staged):
  docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md

?? (untracked, pre-existing + 03A):
  .agents/, .playwright-mcp/, RCCF-RELEASE-04-PROD-SMOKE-01_report.md,
  docs/rccf-builder-03* (01/02/03/03a closures), docs/rccf-7* series,
  tests/unit/rccf-builder-03a-theme-control-state-sync.test.tsx (03A), skills, screenshots
```

`storefront-loader.ts` contains the BUILDER-02/02B preview-route `themeConfig` + `experienceRegistry → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot` work and was explicitly **not rewritten**.

No reset/stash/checkout/rebase/amend/force-push was performed before, during, or after this audit.

---

## 3. Scope

Appearance/Properties experience only — the surface touched by BUILDER-03/03A. Not a full-app a11y audit.

| In scope | Out of scope (not reinspected beyond parity check) |
|---|---|
| Appearance chips (font, heading weight, background, surface, density, hero alignment/width/overlay) | ThemeResolver / experienceRegistry / buildRuntimeSnapshot / publishing runtime |
| Range controls (border radius, image opacity) | Prisma schema / migrations / env vars |
| Save/pending/saving status | Payment / commerce / Razorpay |
| Mobile `BuilderMobilePanel` (Properties + Sections sheets) | Marketing / onboarding (`src/app/onboarding/page.tsx`) |
| Section selection affordance (`SectionCard`) | Media upload correctness (only a11y of `MediaField` checked) |

---

## 4. Exact Builder Surfaces Audited (with source evidence)

| Surface | File & Lines | Current Implementation |
|---|---|---|
| **Appearance chips** | `appearance-panel.tsx:174-187` (Font), `189-202` (Heading weight), `204-219` (Background), `265-280` (Surface), `299-312` (Density), `318-358` (Hero 3 groups), `Chip` at `412-445` | Each group: `<Field label>` + `<div class="flex flex-wrap gap-1">` + N× `<Chip active={state.x===v} disabled={locked||pending}>`. `Chip` is `<button type="button" onClick disabled title className>` with swatch `aria-hidden` and label `<span>{label}</span>`. No `aria-pressed`/`aria-checked`, no `radiogroup`. |
| **Save/pending status** | `appearance-panel.tsx:158-162` (`Saving…`), `workspace.tsx:432-447` (status bar) | Appearance: `{pending && <span class="text-[9px] text-zinc-600">Saving…</span>}` — plain span. Workspace: `{statusMsg && <span class="truncate">` + publish upgrade link — plain span. No `role="status"` or `aria-live`. Chips/ranges `disabled={pending}` with `disabled:opacity-50`. |
| **Mobile Properties sheet** | `mobile-panel.tsx:18-105`, consumed at `workspace.tsx:404-429` | `MotionDiv` with `role="dialog" aria-modal="true" aria-label={title}`, header `h2`, close `<button ref={closeRef} aria-label="Close {title}">`, content `overflow-y-auto`. `useEffect` on `open`: captures `document.activeElement`, `setTimeout 50ms closeRef.focus()`, `keydown Escape → onClose`, `body overflow hidden`, cleanup restores focus + removes listener + clears timer. Backdrop `aria-hidden`. No Tab trap, no `inert` on background. Uses `MotionSafe` (`prefers-reduced-motion` respected). |
| **Section selection** | `section-manager.tsx:89-204` `SectionCard` + `284-332` `SectionManager` | `SectionCard`: outer `<div onClick={() => onSelect(id)} data-testid ... className="cursor-pointer ...">` containing `GripVertical` (decorative, no handler), `Icon`, name, badges, and 6 inner `<button>`s (move up/down, visibility, duplicate, delete) + `<Link>` to `/admin/*`. No `role`, `tabIndex`, `aria-selected`, `onKeyDown`. Actions have correct `aria-label`/`disabled`. Manager subscribes to `store:changed` for refresh; selection via `builderStore.select/isSelected`. |
| **Range controls** | `appearance-panel.tsx:284-297` (radius), `249-259` (opacity) | Native `<input type="range" min max step value={clampedX} onChange disabled aria-label>` + sibling `<p>` showing value (`Image opacity (35%)`, `Border radius (8px)`). `w-full accent-indigo-400 disabled:opacity-50`. |
| **Media image field** | `appearance-panel.tsx:225-262` + `MediaField.tsx:132-233` | `MediaField` renders `<label>{label}</label>`, preview `img alt=""`, hidden file `<input class="hidden">` inside `<label>` (“Upload”/“Replace”), `<button>Choose from Library</button>`, `<button>Remove</button>`, progress bar, error `<p class="text-xs text-red-400">{error}</p>`. Dialog is `MediaPickerDialog.tsx:90` `role="dialog" aria-modal="true"`. |
| **Shared primitives** | `src/components/ui/*` (17 files), `globals.css` | `Button.tsx:29-44` is `forwardRef` native `<button>` with token classes. No `RadioGroup`, `Dialog`, or `Sheet` primitive found that Builder reuses. DateRangePicker (`analytics/DateRangePicker.tsx:13`) demonstrates the project's `radiogroup` pattern. AdminSidebar (`admin/_components/admin-sidebar.tsx:49-100`) demonstrates the project's focus-trap pattern. Global `*:focus-visible` ring (`globals.css:188`) and `prefers-reduced-motion` override are present. |

Searches exercised: `aria-pressed`, `aria-checked`, `aria-selected`, `role="radio"`, `role="radiogroup"`, `role="tab"`, `aria-live`, `aria-busy`, `aria-controls`, `aria-labelledby`, `tabIndex`, `onKeyDown`, `role="dialog"`, `aria-modal`, `focus()`, `document.activeElement`, `autoFocus`, `type="range"` — listed above; builder code contributed no match for `aria-live`/`tabIndex`/`onKeyDown` in the appearance surface.

---

## 5. Appearance Chips — Semantic Audit

**Is it mutually exclusive?** Yes. `FONT_OPTIONS` (geist/inter/plex/mono), `HEADING_WEIGHT_OPTIONS` (500/600/700/800), `BACKGROUND_PRESETS` (9), `SURFACE_PRESETS` (9), `LAYOUT_DENSITY_OPTIONS` (3), `HERO_TEXT_ALIGN/CONTENT_WIDTH/OVERLAY` — each group allows exactly one `active` at a time (`active={state.x===value}`). This is a single-select choice.

**Native radio appropriate?** Conceptually yes — each chip is a radio option. The project's own analytics surface already uses the correct pattern: `DateRangePicker.tsx:13-22` → `<div role="radiogroup" aria-label="Date range">` + `<button role="radio" aria-checked>`. Appearance chips could follow that exact shape with zero new dependency. A native `<input type="radio">` with hidden input + styled label would also work but would require visual rework of the swatch-bearing Chip; ARIA radio on the existing button shape is the smallest change.

**Button + `aria-pressed` appropriate?** Also acceptable if the group is not announced as a radiogroup — `aria-pressed` on a toggle button is valid for “pressed/not pressed” when the control is not in a radiogroup. However when the group is exclusive and a label `Font` already exists, the radiogroup communicates “one of N” more precisely than N independent toggles. `aria-pressed` would at least make selected state discoverable (current: none), but `radiogroup`+`radio`+`aria-checked` is the stronger signal and matches the precedent.

**Does an existing primitive provide this?** No. `src/components/ui` has `Button`, `Badge`, `Card`, `Input`, etc., but no `RadioGroup` or `ToggleGroup`. DateRangePicker is a standalone local pattern, not a shared primitive. So the appearance surface must add the semantics directly.

**Containing label/group:** Each `Chip` group is wrapped in `Field` (`appearance-panel.tsx:363-370`):

```tsx
function Field({ label, children }) {
  return (<div className="space-y-1">
    <p className="text-[9px] uppercase tracking-wider text-zinc-600">{label}</p>
    {children}
  </div>);
}
```

The `<p>` is a visual label only — no `id`, not referenced by `aria-labelledby`, and the sibling `<div class="flex flex-wrap">` has no `role`/`aria-label`. AT hears “Font” as loose text, not as a group label.

**Accessible name:** The `Chip`’s name is its visible `label` string (`{label}` text node) — meaningful (e.g., “Inter”, “Aurora”). No `aria-label` override needed.

### Verdict

| Aspect | Status | Evidence |
|---|---|---|
| **Selected state exposed** | **FAIL** — no `aria-pressed`/`aria-checked` | `Chip` at `432` has only `disabled`/`title`; `active` drives `className` alone (`435-439`). No selection attribute. |
| **Group announced** | **FAIL** — no `radiogroup`/`group` + label | `Field` label is `<p>` without `id`; chip container is plain `<div class="flex flex-wrap">` (`176`, `191`, `206`, `267`, `301`, `320`, `334`, `348`). |
| **Keyboard focus distinguishes selected** | **FAIL** — focus and selection are orthogonal (native button focus goes to whichever chip was last Tabbed to, not the selected one), and selected is not announced, so `focused + selected` vs `focused + not selected` are indistinguishable. |
| **Interaction parity** | PASS — `Chip` is a native `<button>` so Tab/Enter/Space all work (see §9). |

**Decision:** Confirmed **P1** defect. Previously deferred `aria-pressed`/`radiogroup` is **not** a false alarm. Smallest fix is `radiogroup` on the wrapper (`role="radiogroup" aria-label={label}`) and `role="radio" aria-checked={active}` on each `Chip`, reusing `DateRangePicker`’s 6-line pattern, without changing visual design or introducing a new component.

---

## 6. Save / Pending / Error Status — Audit

**Lifecycle (03A):** `applyChange` → optimistic `setState(next)` → `startTransition(async () => await updateTheme(tenantId, partial))` → on success `canonicalRef=next` → `builderEvents.emit("appearance:changed")` → `onRefresh()` (single `getBuilderOverview` re-read). `pending` from `useTransition` disables chips/ranges during the request. Failure path reverts to `prevSnapshot` (version-gated).

**What AT receives today:**

| Moment | Visual | Semantic exposure |
|---|---|---|
| Idle | no status | — |
| Saving started | `Saving…` appears at `appearance-panel.tsx:161` `<span class="text-[9px] text-zinc-600">Saving…</span>` | **Not exposed** — plain span, no `role="status"`/`aria-live`/`aria-busy`. Announced only if focus happens to be inside the region (not the case). |
| Saving in progress | chips `disabled={locked||pending}` + `disabled:opacity-50`, range `disabled={pending}` | **Partially exposed** — `disabled` attribute is correctly set (AT announces “dimmed/disabled”). No busy announcement. |
| Saved successfully | `Saving…` disappears; `onRefresh` heals canonical; no success text in Appearance panel (success is implied by `pending→false`). Workspace status bar may show `Saved` at `workspace.tsx:438` `<span class="truncate">` — also plain. | **Not announced** — disappearance is silent; the `Saved` in the status bar is plain text, no live region. |
| Save failed | optimistic reverts; no error text shown in Appearance panel (only console-level). `pending` clears, chip reverts. | **Not announced** — revert is visual only. No error `role="alert"` or `aria-live`. |
| Latest wins | `versionRef` gates; only latest request settles. | No announcement needed (disabled prevents concurrent). Behavior is correct but invisible to AT. |

**Inspection of status text:**

| Text | Visible | Semantically associated | Exposed to AT | Repeatedly announced? |
|---|---|---|---|---|
| `Saving…` (Appearance panel) | yes, `9px` in header row | no — sibling of label, not `aria-labelledby`/`aria-describedby` of any control | no live region | appears once per save, would be announced once if live |
| `Draft saved` / `Unsaved changes` (Workspace status bar `432-436`) | yes | no | no | — |
| `Saved` / `Save failed` (statusMsg) | yes | no | no | — |
| Publish error `*` | via `getPublishFailurePresentation` link | link is focusable, but error text itself not `role="alert"` | — | — |

**Is `aria-live="polite"` appropriate?** For the transient save status (Saving→Saved/Failed) — **yes**, but scoped. Adding `role="status" aria-live="polite"` (or `aria-live="polite"` alone) to the status container that renders `Saving…` and later `Saved`/`Failed` is correct. It should be `polite` (not `assertive`), should wrap the **single** status region (not one per chip), and should be empty when idle to avoid ghost announcements. The chip group itself should not be live.

**Do not add live regions merely because possible:** The panel should not mark every chip container live, nor mark the progress badge live, nor add `aria-busy` to the whole panel (that would hide the group's children from AT). A single live region for the save status satisfies the “did it save?” use case with minimal noise.

**Verdict:** **P2** — meaningful deficiency; a keyboard user sees disabled chips but gets no programmatic save confirmation/denial. Usable (disabled + visual revert conveys failure), but no AT confirmation. Not P1 because the control remains operable and the disabled state is correctly exposed.

---

## 7. Mobile Properties Sheet — Focus Audit

| Property | Actual | Pass/Fail |
|---|---|---|
| Real dialog? | Yes — `BuilderMobilePanel` renders `MotionDiv` with `role="dialog"` (`81`), `aria-modal="true"` (`82`), `aria-label={title}` (`83`), header `h2` + close `aria-label` (`91`) — inside a `fixed inset-0` overlay (`64`). | PASS |
| `aria-modal` | `aria-modal="true"` present (`82`). | PASS |
| Accessible name | `aria-label={title}` where `title` is `"Sections"` or `"Properties"` (`83`, driven by `workspace.tsx:392/408`). | PASS (could also be `aria-labelledby` to the `h2`, but `aria-label` is acceptable). |
| Focus moved into sheet | Yes — `useEffect` captures `previouslyFocused`, `setTimeout 50ms closeRef.current?.focus()` (`40-42`). | PASS |
| Focus returned | Yes — effect cleanup `previouslyFocused?.focus?.()` (`57`) and `body overflow` restore (`55`). | PASS |
| Tab confinement | **No** — effect only listens for `Escape` (`44-46`), not `Tab`. Pressing Tab on the last focusable (or Shift+Tab on the first) moves focus to the page behind the fixed overlay (the canvas + status bar remain in the DOM and are `Tab`-reachable, even though pointer is blocked by the `bg-black/70` backdrop). | **FAIL — P1** |
| `Shift+Tab` | Same — not trapped. | **FAIL** |
| Escape | Yes — `Escape → onClose` (`44-46`), plus click on backdrop (`72`) and close button (`90`). | PASS |
| Inert / background blocked | No. Content behind is not `inert`, not `aria-hidden`, not removed from tab order. `aria-modal="true"` is a hint but does not inert the page by itself without a focus trap; virtual navigation (VO browse mode) can still reach canvas sections behind. | **FAIL — P1 (same root cause as Tab escape)** |
| Screen-reader virtual cursor | Background remains in the accessibility tree. | **FAIL (inert)** |
| Nested dialog | No — `MediaPickerDialog` is not rendered inside the sheet on mobile; `MediaField`'s picker is a separate `fixed` dialog. If it were opened while the sheet is open, two `role="dialog"` would be stacked — not currently the case but worth keeping as non-goal. | N/A |
| Existing primitive | **No shared Sheet primitive** is used. Builder uses its own `BuilderMobilePanel`; the project’s `AdminSidebar` (`admin/_components/admin-sidebar.tsx:49-100`) implements the exact **simple Tab trap** that is missing here (see `onKeyDown Tab` cycling `first`/`last`). `Gallery` `Lightbox` (`components/gallery/Lightbox.tsx:29-46`) implements a similar 3-element trap. No library (`focus-trap-react`) is present — the project prefers the 20-line local pattern. | — |

**Smallest fix (reuse, not new abstraction):** Copy the `AdminSidebar` Tab-trap (query `a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]` inside `asideRef`/`sheetRef`, `first`/`last` cycle, `preventDefault`) into `BuilderMobilePanel`’s `onKeyDown`, adding the `Tab` branch next to the existing `Escape` branch. Optionally add `inert` or `aria-hidden` to `#main` behind when `open`, but the Tab trap alone closes the P1.

---

## 8. Section Manager / Section Card — Audit

**Current DOM (`section-manager.tsx:110-203`):**

```tsx
<div
  onClick={() => onSelect(section.id)}
  data-testid={`builder-section-${tid}`}
  className="group flex items-center ... cursor-pointer"
>
  <div class="cursor-grab"><GripVertical /></div>  // decorative, no drag wiring
  <Icon /><div><span>{name}</span> {count} {draftDot}</div>
  <div class="actions"> // 6 controls, visible on touch, hover-revealed on desktop
    <button aria-label="Move up" disabled={index===0}>
    <button aria-label="Move down" disabled={index===total-1}>
    <button aria-label="Hide/Show">
    <Link href={editHref}> // external edit
    <button aria-label="Duplicate">
    <button aria-label="Delete">
  </div>
</div>
```

| Question | Answer | Evidence |
|---|---|---|
| Is the div actually interactive? | Yes — `onClick` → `builderStore.select(id)` → `store:changed` → canvas ring + sidebar `isSelected` (`294`). | `111-112` |
| Role/button semantics? | **None** — no `role="button"`, no `tabIndex`, no `aria-selected`/`aria-pressed`/`aria-current`. | `111` |
| Keyboard focusable? | **No** — native `<div>` is not in Tab order; no `tabIndex` → skipped by Tab. | — |
| Enter/Space activate? | **No handler** — only `onClick`. | `112` |
| Nested interactive? | **Yes — 6 inner `button`/`a`**. | `163-201` |
| Would outer `<button>` create invalid nested content? | **Yes.** `<button>` cannot contain `<button>` or `<a>` descendants per HTML. Replacing outer `<div>` with `<button>` would produce invalid DOM and broken focus (inner buttons would be unreachable or would activate outer). | Spec: interactive content model |
| Would `role="button" tabIndex=0` be inferior to native `<button>`? | Functionally equivalent for this card **except** nesting remains: a `div role="button"` containing buttons is technically allowed (role does not change HTML content model), but still semantically odd — AT will announce “button” with nested buttons inside, which is confusing (“How Home page, button, Move up button”). The clean structure is to keep the card as a **group/listitem**, not a button. | ARIA in HTML; prior audit’s “make it a button” recommendation was oversimplified |
| Selection state exposed? | **No** — `isSelected` only toggles `bg-indigo-500/10 ring` (`114-118`), not `aria-selected`/`aria-current`/`aria-pressed`. | `114` |
| `aria-current`/`aria-selected` for section? | Neither present. | — |
| Drag/drop conflict? | No functional drag — `GripVertical` at `121-123` is `cursor-grab` with no `onDragStart`/`drag:*` wiring; reordering is via Up/Down buttons only. So keyboard handling would not conflict. | `121-123`, store drag API unused by sidebar |

**Correct semantic structure (minimal, no redesign):**

- The list of sections is a **list** (or `role="list"` inside the scroll container) where each `SectionCard` is a `role="listitem"` or `role="group"` — **not** a button.
- Provide **one** keyboard-reachable affordance for selection that is not the whole card: make the section name an explicit button (`<button onClick={() => onSelect} aria-pressed={isSelected} aria-label="Select Hero">Hero</button>`) or add `tabIndex=0 role="button" aria-pressed` to the name region — the outer card stays a non-interactive container, and the actions remain siblings.
- Alternatively, keep the outer div as `tabIndex=0 role="button" aria-selected` but move the actions outside the clickable region (sibling flex row). The current DOM cannot be fixed by merely adding attributes to the outer div without addressing the nested-button concern; that would be a half-fix.

**Verdict:** **P1** — keyboard users cannot select a section. The prior closure’s suggested fix (“add `role='button' tabIndex=0` + Enter/Space” or “make it a button”) is **directionally correct** that the card must be keyboard-reachable, but **structurally incomplete** because it ignores the 6 nested controls. This audit refines the recommendation to a nesting-safe pattern.

---

## 9. Slider / Range — Accessibility Audit

| Control | Markup | Accessible name | Value exposure |
|---|---|---|---|
| Border radius | `appearance-panel.tsx:285-295` `<input type="range" min="0" max="24" step="1" value={clampedRadius(state.borderRadius)} onChange disabled aria-label="Border radius" class="w-full accent-indigo-400">` + sibling `<Field label="Border radius (8px)">` + `<div><span>Sharp</span><span>Soft</span></div>` | `aria-label="Border radius"` — meaningful, associated (no need for `aria-labelledby` since `Field` label is visual sibling; `aria-label` suffices). | Native `aria-valuenow`/`aria-valuemin`/`aria-valuemax` automatically exposed by the UA for `type="range"`. Screen reader announces “Border radius, slider, 8”. |
| Image opacity | `appearance-panel.tsx:249-259` `<input type="range" min="5" max="90" step="5" value={clampedImageOpacity} aria-label="Background image opacity">` + `<p>Image opacity (35%)</p>` | `aria-label="Background image opacity"` — correct. | Same native exposure; announces “Background image opacity, slider, 35”. |
| Displayed value vs raw | Label shows `Border radius (8px)` and `Image opacity (35%)`; step for opacity is 5, so values 35→40→45. | Native value is `8` and `35`; visual adds unit. The unit adds developer meaning but AT already conveys the label, so the unit is inferable (“opacity” implies percent). `aria-valuetext="8 pixels"` / `"35 percent"` would be more explicit but not required for operability. The `Field` label text itself already follows the thumb (`Border radius (8px)`) and is not programmatically linked, but the range’s own name+value are sufficient for a11y. | No `aria-valuetext` needed for correctness; adding it would be **P3**. |

**Is `aria-valuetext` necessary?** No — `type="range"` is **not** `aria-controls`/`aria-valuetext` territory when the numeric value is meaningful without a unit mapping. The displayed `8px` vs `8` difference is polish (`aria-valuetext="8 pixels"`), not a defect. The spec says native semantics plus `aria-label` already provide sufficient info.

**Is `aria-describedby` appropriate for the visible value?** Could link the `<Field>` label or the `<span>Sharp/Soft</span>` but the range already has a name; adding `aria-describedby` pointing at `id="radius-hint"` would be redundant. No.

**Disabled while pending:** Both ranges render `disabled={locked || pending}` / `disabled={pending}` with `disabled:opacity-50` and `disabled:cursor-not-allowed` — correctly exposed as disabled.

**Verdict:** **Already correct** (native control, labeled, valuemin/max/now exposed, `disabled` propagated). Previously deferred as “slider aria-valuetext” — reclassified to **P3 enhancement** (optional `aria-valuetext` with unit, not a material defect).

---

## 10. Focus Management — Audit

| Interaction | Focus today | Any loss/jump/trap | Verdict |
|---|---|---|---|
| Opening Appearance (desktop property rail) | Properties rail is persistent; no focus move. | No. | PASS |
| Changing a chip | Focus stays on the clicked chip (`Chip` is the `event.target`); `setState` does not move focus. | No. | PASS — 03A preserved this |
| Changing a slider | Focus stays on the range thumb; value change does not re-focus. | No. | PASS |
| Selecting an image (`MediaField`) | File picker: `<label><input type=file hidden>` keeps focus on label; `MediaPickerDialog` opens as `role="dialog"` but has no focus management (no `autoFocus`, no return) — **out of Builder scope** but noted. | No builder-level loss. | PASS (panel-level) |
| Saving (chip/opacity/radius) | Focus stays on the just-activated chip/slider while `pending` disables siblings; success refresh does not move focus (re-render is of `overviewData`, not of focus). | No. | PASS |
| Save failure (revert) | Optimistic reverts to `prevSnapshot`; focused chip reverts highlight but **focus itself stays on the same chip element** (now appearing un-selected). No focus loss — but selected state and focus are now on a stale-looking chip (the intended failure signal). | No loss, but visual+focus mismatch (acceptable). | PASS with note |
| Closing mobile Properties | `BuilderMobilePanel` captures `previouslyFocused` before open and `previouslyFocused?.focus?.()` on cleanup (`52-58`). So focus returns to the mobile bar button that opened it (`MobileBarButton` at `workspace.tsx:379/387`). | Correct. | PASS |
| Reopening Properties | `setTimeout 50ms closeRef.current?.focus()` (`40-42`) moves focus to the close button — consistent with dialog pattern; the trip focus → close is deliberate. | Correct. | PASS |
| Switching Builder sections (selecting a section) | Mouse click selects; no focus move is issued. Keyboard will, after the fix, move focus to the selection affordance. Today (without fix) there is no focus because card is not focusable. | No current focus because unreachable — but **no jump**. | PASS (today) but blocked (selection unreachable) |
| Switching theme packages (`ThemeCard` apply) | `handleApplyTheme` calls `performSave` then `setCurrentThemeId` — no focus move. The applied card gains `Current` badge but focus stays on Apply button if one was used. | No loss. | PASS |
| Canvas live-content refresh | `InteractiveCanvas` `loadLiveContent` sets `themeConfig`/`liveContent`; no focus call. | No. | PASS |
| Rapid consecutive changes | `versionRef` gate ensures only latest settles; no focus churn. | No. | PASS |
| Overall trap | Only the mobile sheet should trap; it does not (see §7). No other Builder sheet traps (admin sidebar does, but it is not the Properties surface). | Sheet escape is P1, not a global trap defect. | — |

**Global focus ring:** `globals.css:55-64` respects `prefers-reduced-motion` and `*:focus-visible` at `188-192` gives the chip/range/dialog a visible ring — not clipped in the panel context.

No focus disappearance or unexpected jump was traced.

---

## 11. Keyboard Navigation — Matrix

| Surface | Tab | Shift+Tab | Enter | Space | ArrowLeft/Right | ArrowUp/Down | Home/End | Escape | Notes |
|---|---|---|---|---|---|---|---|
| **Appearance chips** (`Font`, `Heading weight`, `Background`, `Surface`, `Density`, `Hero` ×3) — 8 groups, 4–9 chips each | ✅ each chip is `Tab`-reachable (native `<button>`) | ✅ | ✅ `onClick` (native) | ✅ | ❌ no roving (stays in Tab order; APG radiogroup would expect arrows) | ❌ | ❌ (not applicable) | N/A | **P1** absence of group semantics/arrow & Home/End is expected if chips remain as independent buttons, but **will require arrow/Home/End once converted to `radiogroup`** — do not add arrow handling without first adding the role. |
| **Range sliders** (border radius, image opacity) | ✅ (`<input type=range>` is Tab-reachable) | ✅ | ✅ (native activates thumb) | ✅ | ✅ native steps (1 / 5) | ✅ (also) | ✅ native Home→min / End→max | N/A | **PASS** — native `<input type=range>` already handles all per-keyboard spec; no custom `onKeyDown` needed. |
| **Media image field** | ✅ Upload label (hidden file input + label), Choose/Remove buttons, opacity slider | ✅ | ✅ | ✅ | — | — | — | — | `MediaField` (“Replace”/“Choose from Library” etc.) are buttons; picker dialog must be audited separately when it becomes in-builder (today it is on-demand). |
| **Mobile Properties sheet** (`BuilderMobilePanel`) | ✅ close `X` + appearance chips + ranges + media buttons are Tab-reachable | ✅ | ✅ Enter on close/choose | ✅ Space on same | — | — | — | ✅ Escape closes sheet (`44-46`) | **P1** Tab escapes to canvas behind — see §7. Backdrop click also closes. |
| **Section cards** (`SectionCard` outer) | ❌ outer `<div>` not in Tab order | ❌ | ❌ no `onKeyDown` | ❌ | — | — | — | N/A | **P1** — card is mouse-only. Inner action buttons (`Move up/down`, `Hide/Show`, `Duplicate`, `Delete`, `ExternalLink`) are each Tab/Enter/Space operable with correct `aria-label`/`disabled`. The outer selection remains unreachable. |
| **Section actions** (6 buttons + link inside each card) | ✅ each has `aria-label` | ✅ | ✅ `onClick` + `stopPropagation` | ✅ | — | — | — | N/A | PASS — never hover-only: `lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100` with `lg:` hidden only on desktop when not focused; touch (`<lg`) always visible (`162`). |
| **Close buttons** (panel rails, mobile bar, dialog) | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ Escape for sheets/dialogs | PASS — `aria-label` present (`website-panel.tsx:90/115`, `mobile-panel.tsx:91`, `toolbar.tsx` etc.). |

**Prescribed keyboard behavior only where justified:**

- For chip groups: **no arrow/Home/End until the groups become `radiogroup`** — at that point APG radios expect `ArrowLeft/Right/Up/Down` to rove, `Home→first`, `End→last`, and `Space/Enter` to select. The current plain-button pattern correctly uses only Tab/Enter/Space; adding arrow handling without changing the role would be non-standard.
- For sliders: already native — do not add custom `onKeyDown`.
- For mobile sheet: **do** add Tab confinement (trap) to prevent page-behind reach.
- For section cards: **do** add reachability — but as a nesting-safe pattern, not a blind `div→button` swap.

---

## 12. Screen Reader / ARIA — Audit

| Item | Role / name / state today | Correct? | Evidence |
|---|---|---|---|
| **Appearance chip group** | Plain `<div class="flex flex-wrap">` with no `role`, no `aria-label`/`aria-labelledby`; label is a sibling `<p>` | **No** — not exposed as a group | `appearance-panel.tsx:175-187`, `Field:363-370` `<p>` not associated |
| **Appearance chip (button)** | `<button type="button" onClick disabled>` with visible label e.g. “Inter” | **No selected state** — missing `aria-pressed` or `role="radio" aria-checked` | `412-445` `active` drives only `className` (`435-439`) |
| **Chip group label association** | `<p>{label}</p>` + `<div>` children | Should be `aria-label` or `aria-labelledby` on the `radiogroup` | — |
| **Correct `aria-*` for single-select** | None | Should be either `aria-pressed` per toggle button or `aria-checked` per radio (with enclosing `radiogroup`) — not `aria-selected` (which is for `grid`/`listbox`/`tablist`, not button/radio) | No `aria-selected` in builder appearance surface (search confirmed) |
| **Redundant/incorrect roles** | None added in appearance surface | No redundant `role="button"` on an already-`<button>`, no incorrect `role="tab"` | — |
| **Disabled** | `disabled={locked||pending}` with `disabled:opacity-50`, `cursor-not-allowed` | Correct — native `disabled` is announced (“dimmed”) | `181-182`, `211`, etc. |
| **Locked / UPGRADE** | Locked banner `<div class="border-amber...">Custom appearance… requires eligible plan. Upgrade</div>` (`164-172`) with link to `/admin/billing`; chips carry `<span class="text-[8px] text-amber-400">UPGRADE</span>` with `aria-label="Requires an eligible advanced builder plan"` (`373`). | **Partial** — upgrade text is visible and the UPGRADE badge has an `aria-label`, but the **group itself** is not marked as `aria-disabled` with an `aria-describedby` pointing at the banner, so AT does not announce *why* the disabled chips are disabled when focused. A `aria-describedby` from each disabled chip to the locked-banner `id` would make the Gate relationship explicit. | `373`, `164` |
| **Live/refresh** | No `aria-live` on any builder status | Should be for transient status (see §6) | `appearance-panel.tsx:161` |
| **Range `aria-*`** | `aria-label` present, `aria-valuetext` absent — correct per native range, no `aria-controls`/`aria-labelledby` misuse | **Correct** | `293`, `257` |
| **SectionCard** | No role, no state (`aria-selected`/`aria-pressed`) | Should expose `aria-selected` or `aria-current` or `aria-pressed` for the selected card once keyboard-reachable | `111-112` |
| **Mobile sheet** | `role="dialog" aria-modal="true" aria-label={title}` with `h2` title sibling | Correct; ideally `aria-labelledby` to the `h2` id, but `aria-label={title}` is acceptable | `81-83` |
| **Drag handle** | `GripVertical` in `<div class="cursor-grab ... text-zinc-700">` with no role/`aria-label`/`aria-hidden` | Decorative grab handle for disabled drag — should be `aria-hidden` (it is visual only) or removed. Today it has no label and is inside the non-focusable card, so not AT-reachable — not a violation but affordance is misleading. | `121-123` |
| **Background behind dialog** | Not inert / not `aria-hidden` | Virtual cursor still reaches canvas | see §7 |
| **Loading / error** | No `aria-busy` on appearance panel while `pending`; error on failure is silent (no `role="alert"`) | Adding `aria-busy` to the group during `pending` could hide the radio children (not recommended). Live region for errors is better. | — |
| **Native HTML first** | Chips and ranges and action buttons are native elements; no custom ARIA where native suffices except the group/selected state | Principally correct — only group semantics are missing. | — |
| **Existing primitives before custom infra** | `DateRangePicker` radiogroup pattern and `AdminSidebar` focus-trap pattern exist — not yet reused for builder appearance/mobile sheet. | Should reuse, not invent. | `analytics/DateRangePicker.tsx:13`, `admin/_components/admin-sidebar.tsx:49-100` |

No `aria-selected` vs `aria-pressed` confusion was found in the builder appearance surface — the bug is **absence**, not confusion. No `aria-controls` pointing at nonexistent IDs.

---

## 13. Responsive + Accessibility Interaction (320–1440)

Audit is **source-level** (no authenticated browser session available — consistent with BUILDER-03/03A environment; see §16).

| Surface | 320 | 360 | 390 | 414 | 768 | 1024 | 1280 | 1440 | Finding |
|---|---|---|---|---|---|---|---|---|---|
| **Appearance chip groups** | 4-font chips wrap 2×2; 9-preset background wraps 3 rows; density 3 chips wrap 2+1 | same | same | same | same | rail `280px` wide, wraps gracefully | no overflow | no overflow | **Responsive PASS**, **a11y PASS** — `flex flex-wrap gap-1`, chip `inline-flex`, no fixed width. |
| **Range sliders** | `w-full accent-indigo-400` stays within rail, thumb `44px` touch target via UA | same | same | same | same | same | same | same | **PASS** — full-width, native `44px` minimum on touch. |
| **Properties sheet** (`BuilderMobilePanel`) | Bottom sheet `max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]` scrolls (not clipped) | same | same | same | still sheet | desktop rail visible, sheet `lg:hidden` | desktop only | desktop | **PASS** responsive; **FAIL** a11y Tab trap (see §7) — focus can leave sheet behind the backdrop even though scroll is locked. |
| **Focus visibility** | `*:focus-visible` ring (`globals.css:188-192` `box-shadow: var(--focus-ring)`) visible on chip/range/dialog close | same | same | same | same | same | same | same | **PASS** — global ring, not clipped by `overflow-hidden` on sheet (`max-h overflow-y-auto` inner, not clip of ring). `prefers-reduced-motion` respected (`globals.css:55-64`). |
| **Focus order** | Mobile bar (3 buttons) → canvas → sheet when open → sheet close → appearance chips/ranges → media buttons. Order is DOM order; no `tabIndex>0`. | — | — | — | — | — | — | — | **PASS** — linear, predictable. No positive `tabIndex`. |
| **Touch targets** | Chips `px-1.5 py-0.5 text-[10px]` ≈ 26px tall — **below 44px WCAG 2.5.8 minimum**. Swatch `h-3 w-5` extra. Bottom bar `h-12` ~48px — passes. Section actions `p-0.5` ~20px but always visible on touch, spaced 6 buttons across card — tight. | same | same | same | same | — | — | — | **Gap (P2)** — not blocking (chips remain operable), but small targets on dense chip grid. Raising to `py-1.5` or `min-h-[44px]` would improve without overflow due to wrapping. Not in the five deferred items; classify as **P3 → P2**? Keep as **P3** per audit’s severity discipline (workaround exists — tap precisely). The spec’s “Do not manufacture severity” applies — keep **P3**. |
| **Horizontal scroll / overflow** | Builder shell is `hidden lg:block` rails + `flex-1 overflow-hidden` + canvas `overflow-auto` — no `overflow-x:hidden` hack. | — | — | — | — | — | — | — | **PASS** — no global `overflow-x:hidden` workaround. |

No controls become unreachable, no focus ring clipped, no sheet clipping.

---

## 14. Existing Design System / Primitive Audit

| Primitive | Found? | Location | Builder relevance | Recommendation |
|---|---|---|---|---|
| **Button** | Yes | `src/components/ui/Button.tsx:29-44` `forwardRef` native `<button>` with token classes | Builder chips are handmade `<button>` (correct — swatch+label variant not covered by `Button`). No need to replace with `Button`. | No change. |
| **Dialog / Sheet** | **No shared dialog primitive used by Builder** | Builder uses its own `BuilderMobilePanel`; admin sidebar is a custom `fixed`+`aside role="dialog"`; media picker is own dialog; product/gallery editors each have own dialog markup. No Radix `Dialog` or similar. | Mobile sheet `role="dialog"` semantics are hand-rolled. The Tab trap already exists in `AdminSidebar` and `Lightbox` but is not shared. | **Reuse the 20-line local Tab-trap pattern**, do not introduce a library. |
| **Radio / Radiogroup** | No shared `RadioGroup` primitive, but **pattern exists** | `analytics/DateRangePicker.tsx:13-28` → `<div role="radiogroup" aria-label> + <button role="radio" aria-checked>` | Appearance chips are the exact same kind: single-select among labeled options. Copy this pattern + add arrow/Home/End roving. | Reuse that 6-line shape. |
| **Toggle / ToggleGroup** | No | — | Not needed. | — |
| **Tabs** | No Tab primitive in admin — marketing pricing tabs hand-rolled | — | Not relevant. | — |
| **visually-hidden / sr-only** | Yes | `globals.css:66-76` `.sr-only` | Could be used for hidden status text but a styled live region is fine. | No need. |
| **focus-ring** | Yes | `globals.css:50` `--focus-ring` + `*:focus-visible` | Chips/ranges/dialog close all get it — verified. | No change. |
| **focus-trap utility** | **No utility**, but two local implementations exist | `AdminSidebar:62-85` (drawer) and `Lightbox:30-46` (lightbox) — both query `a[href], button:not([disabled]), input:not([disabled]), [tabindex]` and cycle `first`/`last`. | BuilderMobilePanel should **reuse** that 15-line utility, not import `focus-trap-react`. | Copy & adapt. |
| **Tooltip** | Yes (`components/ui`) but irrelevant | — | Upgrade badge `aria-label` suffices. | — |

No new abstraction should be introduced. The smallest fix is direct attribute addition plus a small local `useEffect` branch for the Tab trap.

---

## 15. Existing Test Coverage (before proposing new)

| Suite | Files | What it pins (a11y-relevant) | Gap for this audit |
|---|---|---|---|
| `rccf71-1` | `rccf71-1-canonical-theme-foundation` (25) | Snapshot threading (`themeConfig` → resolver → LayoutEngine/css vars). No a11y. | None for appearance a11y. |
| `rccf71-2` | `rccf71-2-growth-theme-experience` (61) | Background/surface/font/heading-weight runtime; checks that `website-panel.tsx` contains `overview?.appearance && overview.capabilities` and that `appearance-panel.tsx` wires `updateTheme` + `appearance:changed`. | Pins appearance wiring, not chip semantics. |
| `rccf71-3` | `rccf71-3-hero-presentation` (44) | Hero presentation presets; checks `website-panel.tsx` contains `heroTextAlign: overview.appearance.heroTextAlign` etc. | Same — pins wiring, not ARIA. |
| `rccf71-5-1` | `rccf71-5-1-growth-visual-surfaces` (19) | Radius/density swatches, rail width, wrapping. Checks `borderRadius: overview.appearance.borderRadius` etc. | Wrapping pinned, not semantics. |
| `rccf71-6-1` | `rccf71-6-1-entitlement-status` (15) | Entitlement gates | No a11y. |
| `rccf71-5-2` etc. | `builder-core` (18), `builder-presentation` (8), `builder-preview-gutter` (9) | Store / presentation / gutter | No a11y. |
| `rccf-builder-03a` | `rccf-builder-03a-theme-control-state-sync` (21) | **State sync**: optimistic highlight, stale-rerender guard, slider remains NEW, failure revert, rapid version gate, parent rerender repro, reload/theme-switch, no runtime regression. | Pins the **state** contract, not the **semantic** contract. No `aria-*` assertion, no keyboard, no focus-trap. |
| `rccf70-4-5` etc. | `rccf70-4-5-builder` (many) | Shell rendering, mobile bar, publish — checks `button[aria-label]` exists on toolbar/mobile bar but does **not** assert chip `aria-pressed`/`radiogroup`. | Not pinning appearance chip a11y. |

**Conclusion:** No existing builder test pins appearance chip selection semantics, save-status live region, mobile Tab trap, section-card keyboard, or slider `aria-valuetext`. All current suites are **state/runtime/wiring** guardrails. A future fix must add **component-level interaction tests** (Tab, Space/Enter, arrow roving, `aria-checked`, range value, dialog Tab confinement) **and** keep the existing source-contract `toContain` assertions (the 71.2/71.3/71.5-1 ones are brittle to refactor — 03A already added a compatibility comment for them; any new ARIA refactor should preserve those literal probes or update them with intent).

---

## 16. P0–P3 Classification (complete)

### P0 — none

Nothing makes Builder appearance unusable with no workaround: all appearance fields have a keyboard-reachable `Tab` → `Enter/Space` path (chips are buttons), sliders are native, dialogs are dismissible via Escape/backdrop/close, publish is not blocked, canvas remains editable. No irreversible focus loss.

### P1 — Confirmed Material Defects (must fix)

| ID | Surface | Current code | Evidence | Behavioral consequence | Why P1, not P2 |
|---|---|---|---|---|---|
| **P1-A1** | Appearance chips — group & selected state | `appearance-panel.tsx:174-358` chip groups + `Chip:412-445` vs `DateRangePicker.tsx:13` precedent | `<div class="flex flex-wrap">` without `role="radiogroup"`, `<button>` without `role="radio"`/`aria-checked` or `aria-pressed`; `Field` label is loose `<p class="text-[9px]">` (`363-370`) not associated | Screen reader enumerates “Inter, button” / “Geist, button”… with **no “selected / not selected”**; user cannot tell which font/background/surface/weight/density/hero option is chosen without sight. Keyboard focus ≠ selection distinction invisible to AT. | Common, repeated (8 chip groups, 45+ chips), blocks non-sighted selection verification — material, not just polish. |
| **P1-A2** | Mobile `BuilderMobilePanel` — Tab behind dialog | `mobile-panel.tsx:33-59` | `role="dialog" aria-modal="true"` present (`81-82`), `closeRef.focus()` + `Escape` (`40-46`), **no `Tab` branch** (contrast `admin-sidebar.tsx:62-85` trap). Background not `inert`/`aria-hidden`; canvas buttons/links/ranges remain Tab-reachable behind the fixed overlay. | Keyboard user opens Properties on mobile, presses Tab repeatedly — focus leaves the sheet, goes to canvas sections, toolbar Save, even status bar, while the backdrop still blocks pointer. Dialog ceases to be modal for keyboard. | Breaks modal dialog contract (WCAG 2.4.3 Focus Order, 2.4.7 Focus Visible behind overlay). Frequent on 320-414. |
| **P1-A3** | Section selection — card not keyboard reachable | `section-manager.tsx:111-120` `<div onClick>` with 6 inner buttons | No `tabIndex`, `role`, `aria-selected`, `onKeyDown`; only mouse path. Keyboard user cannot select a section → `SectionPresentationPanel` never appears (it guards `if (!slot) return null`), so that entire inspector is unreachable. | Primary canvas–sidebar interaction is mouse-only — the most common Builder operation after add-section. | Blocks task-level workflow, not just cosmetic. |

> Note on P1-A3 nesting: naive `<div → button>` would create invalid `<button>` containing 6 `<button>`/`<a>` descendants. The correct minimal pattern is to keep the card as a non-button container (or `role="listitem"`) and expose selection via a dedicated reachable affordance (e.g., the title becomes a `<button aria-pressed={isSelected}>Hero</button>` or the card gets `tabIndex=0 role="button" aria-selected` and actions are moved to a sibling row). The P1 is not downgraded for nesting difficulty.

### P2 — Meaningful Deficiencies (usable workaround, should fix with P1 or immediately after)

| ID | Surface | Evidence | Consequence | Why not P1 |
|---|---|---|---|---|
| **P2-S1** | Save/pending status not live-announced | `appearance-panel.tsx:158-162` (`Saving…` plain), `workspace.tsx:438` (`statusMsg` plain) — no `aria-live`/`role="status"` anywhere in builder search (`aria-live` occurrences are in stepper/gallery/AIDemo, not builder) | Keyboard/SR user clicks Inter — chip disables (`disabled`), but no “Saving” / “Saved” / “Failed” announcement; success is only implied by `pending`→`false` and chip staying selected. Failure revert is visual only. | Control remains operable; `disabled` is announced; user can Tab to another chip — workaround exists but SR misses confirmation. |
| **P2-S2** | Appearance locked gate not programmatically linked | Banner `164-172` + per-`Chip` `disabled={locked||pending}` + `373` `<span aria-label="Requires…">UPGRADE</span>` but no `aria-describedby` from chip to banner `id`, and banner itself is not associated as the group’s `aria-describedby` | AT on a disabled Launch chip hears “Inter, button, dimmed” but not “requires eligible advanced builder plan — Upgrade link” unless the user explores away. | Disabled is announced; upgrade link is reachable; gate message is reachable — just not linked. |
| **P2-S3** | `MediaField` error not live | `MediaField.tsx:222` `<p class="text-xs text-red-400">{error}</p>` without `role="alert"`/`aria-live` | After failed upload/picker error, visual red text appears but AT does not announce. | Error is visible on next Tab into the field; fix is small (`role="alert"`). |
| **P2-S4** | `SectionCard` has no selection announcement even if focusable | Same `111-120` — `isSelected` only drives `bg-indigo-500/10 ring` (`114-118`) | When selection becomes keyboard-reachable, AT still won’t hear “selected”. | Covered by P1-A3 but the `aria-selected` part is logically a P2 polish on top of the P1 reachability fix. |

### P3 — Enhancement / Polish

| ID | Surface | Evidence | Why P3 |
|---|---|---|---|
| **P3-R1** | Slider `aria-valuetext` with unit | `appearance-panel.tsx:285-295` `value={clampedRadius}` label `Border radius (8px)`; `246-259` `value={clampedImageOpacity}` label `Image opacity (35%)` — native `type="range"` already exposes `valuenow/min/max/name` | Adding `aria-valuetext="8 pixels"` / `"35 percent"` makes the unit explicit, but the current “Border radius, slider, 8” + visible label “8px” is already sufficient. Do not add blindly; evaluate if the extra string truly adds value. |
| **P3-R2** | Chip group arrow/Home/End roving | Requires first converting groups to `radiogroup` (P1-A1). APG radios expect `ArrowLeft/Right/Up/Down` to rove within group, `Home→first`, `End→last`. | Not needed when chips are plain buttons (Tab-only is correct). Becomes appropriate only as part of the P1-A1 radiogroup fix — when that ships, add arrow/Home/End as part of same RCCF (not a separate P3 ticket). |
| **P3-R3** | Touch target size | Chips `px-1.5 py-0.5 text-[10px]` ≈ 26px tall; WCAG 2.5.8 expects 24×24 minimum (passes) but 44×44 recommended; range thumbs are UA default `44px` (pass). | Dense chip grid remains operable at 320 on touch; increasing to `py-1.5` would improve but risks rail overflow — intentional P3, not manufactured. |
| **P3-R4** | Drag handle affordance | `section-manager.tsx:121-123` `GripVertical` with `cursor-grab` but no `aria-hidden` or `aria-label` — inside a non-focusable div, so not AT-reachable today; after P1-A3 it would be inside a focusable group and should be `aria-hidden` or a proper `button aria-label="Drag to reorder"` (but drag is currently disabled) | Cosmetic; drag is not wired — mark decorative. |
| **P3-R5** | SectionCard `GripVertical` + `section.selected` live announcement | No `aria-live` needed here — selection ring is sufficient once reachable; adding a live region for “Hero selected” would be noisy. | Not recommended. |

---

## 17. Detailed Deferred-Item Re-evaluation (required)

| Deferred from BUILDER-03 | BUILDER-03B finding | Class | Reason |
|---|---|---|---|
| `aria-pressed` / `radiogroup` | **Confirmed P1** — 8 chip groups have no selection semantics | **P1** | Single-select among 4–9 labeled options must expose selected; button+pressed or radio+checked, with group label. Precedent `DateRangePicker` exists. |
| `aria-live` (save status) | **Confirmed P2**, not P0/P1 | **P2** | No live announcement, but `disabled` is exposed and visual revert conveys failure; single `polite` region for save status is the correct remedy, not per-chip liveness. |
| Mobile focus trap | **Confirmed P1** — `BuilderMobilePanel` lacks Tab cycle, background remains tabbable | **P1** | Existing 20-line AdminSidebar pattern directly reusable; no new dependency. |
| SectionCard `div onClick` | **Confirmed P1** but recommendation refined — naive `div→button` invalid due to 6 nested buttons; needs nesting-safe affordance | **P1** | Outer card must become keyboard-reachable without nesting violation; section selection is primary workflow. |
| Slider `aria-valuetext` | **Already correct** — native range + `aria-label` + visible “8px”/“35%” label is sufficient; unit-bearing `aria-valuetext` is optional polish | **Already correct / P3** | Do not add blindly; current exposure satisfies WCAG. |

---

## 18. Proposed Smallest Fixes (not implemented in this audit)

### Next RCCF — `RCCF-BUILDER-03B-1` (P1 a11y, no runtime change, no Stitch redesign)

**Scope: 2 files + shared pattern reuse, ≤ 40 lines.**

**A. Chips — `appearance-panel.tsx` + `Chip`**

- Wrap each `Field`’s flex row in `<div role="radiogroup" aria-label={label}>` (or `aria-labelledby` to `id` on the `<p>`). Reuse `DateRangePicker.tsx:13` shape.
- Change `Chip` from plain button to **radio**: `<button role="radio" aria-checked={active} aria-label={label}>` (or keep `<button aria-pressed={active}>` if the group is not converted — but prefer `radio`). Keep native `<button>` element, `disabled`, `onClick`, swatch `aria-hidden`.
- No arrow/Home/End handling in this first slice **if** the fix is shipped as `aria-pressed` on buttons — Tab-only remains valid. If shipped as `radiogroup`+`radio`, add in the same slice a 15-line `onKeyDown` roving: `ArrowLeft/Right/Up/Down` → move to next/prev radio, `Home→first`, `End→last`, focus the target and fire `applyChange(value)`. The roving can be a small local handler (no library), mirroring the existing non-builder precedent once it exists.

Expected diff shape (illustrative, not literal):

```tsx
<div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
  {FONT_OPTIONS.map(f => (
    <button
      key={f.value}
      role="radio"
      aria-checked={state.font===f.value}
      onClick={() => applyChange({font:f.value})}
      // optional onKeyDown roving
    >{f.label}</button>
  ))}
</div>
```

Source-contract guard: update any `read("website-panel.tsx")` or `read("appearance-panel.tsx")` assertion that checks for `appearance` wiring to also assert `role="radiogroup"`/`aria-checked` rather than weakening the old `borderRadius:` probes.

**B. Mobile sheet Tab trap — `mobile-panel.tsx`**

Insert the `AdminSidebar` Tab trap next to the existing `Escape` handler:

```ts
if (e.key === "Tab") {
  const sheet = sheetRef.current; // add ref to MotionDiv
  const focusables = Array.from(sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.hasAttribute("disabled") && el.getClientRects().length>0);
  if (!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length-1];
  if (e.shiftKey && document.activeElement===first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
}
```

Add `ref={sheetRef}` to the dialog `MotionDiv`. No `inert` needed for the P1; optional `inert` on `#main` behind can follow.

**Estimated impact:** 8 `radiogroup` wrappers + 40 chip attributes + 15-line trap. No resolver/publishing/theme/migration change.

### Follow-on RCCF — `RCCF-BUILDER-03B-2` (P2 polish, can bundle with 03B-1)

- Add a single live region for appearance save status:

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {pending ? "Saving appearance" : statusAnnouncement}
</div>
```

where `statusAnnouncement` is `"Appearance saved"` / `"Appearance save failed — ${error}"` set alongside `setState` revert. Keep `Saving…` visual as is; link it with `aria-describedby` if desired.

- Link locked banner to disabled chips: give the banner `id="appearance-locked-hint"` and add `aria-describedby="appearance-locked-hint"` to each disabled `Chip` (and `aria-describedby` to the `radiogroup`).

- Add `role="alert" aria-live="assertive"` or `role="status"` to `MediaField` error `<p>` (line 222) and to `uploadError`/`loadError` in `MediaPickerDialog` (lines 128-129).

- Fix `SectionCard` nesting-safe reachability: keep outer `<div>` as `role="listitem"` (inside `role="list"` on the scroll container) and render the section title as `<button onClick={() => onSelect} aria-pressed={isSelected} class="text-left">Hero</button>` (or `aria-selected`). Apply `ring` + `bg-indigo` on the card when `isSelected`, not on the button. Copy `Field`’s `text-[11px]` sizing to the button. This avoids nested-button invalid DOM and keeps the 6 action buttons as siblings.

---

## 19. Explicit Non-Goals (BUILDER-03B will not)

- Introduce `focus-trap-react` or any new a11y library (reuse the local 20-line trap).
- Create a shared `RadioGroup` primitive (reuse the inline `DateRangePicker` pattern; extracting a primitive can be a later refactor).
- Add global `overflow-x:hidden` as a responsive workaround.
- Redesign the Builder UI, change chip density/grouping, or regenerate Stitch screens for appearance.
- Modify `themeResolver`, `experienceRegistry`, `applyExperienceOverride`, `resolveExperienceForCapabilities`, `buildRuntimeSnapshot`, `publishingService`, `storefront-loader.ts`, Prisma schema, or onboarding.
- Weaken the existing 71.x source-contract tests (update them with intent if the new `role="radiogroup"` shape requires it, rather than deleting their probes).

---

## 20. Browser Verification Status

**No authenticated Builder session available** in this audit environment — consistent with BUILDER-03/03A (production admin login not reachable with available test credentials; no local dev-server session provisioned). No Playwright session was started, no authenticated Canvas/Properties interaction was exercised.

Therefore:

- **SOURCE VERIFIED:** all chip semantics, `aria-live` absence, mobile sheet lack-of-trap, section-card `div onClick`, range native semantics, focus ring, locked banner, `MediaField` error, and responsive wrapping — verified by reading the shared source (line numbers above).
- **BROWSER VERIFIED:** none (environment limitation).
- **NOT VERIFIABLE IN CURRENT ENVIRONMENT:** actual VO/NVDA announcement of chip selection, live-region politeness under repeated saves, mobile sheet Tab cycle on-device, section-card focus order with a keyboard, and range thumb announcements — require a live Builder session. The recommended implementation RCCF should include a Playwright keyboard + axe-core scan on the fixed code.

---

## 21. Existing Primitive / Design-System Audit

See §14 table. Relevant globals:

- `Button` (`src/components/ui/Button.tsx:29-44`) — correct native `<button>` primitive; not reused for chips (chips need swatch variant, so a local `Chip` is justified).
- `AdminSidebar` focus trap (`admin/_components/admin-sidebar.tsx:49-100`) — the 20-line pattern to reuse for `BuilderMobilePanel`.
- `DateRangePicker` radiogroup (`analytics/DateRangePicker.tsx:13-28`) — the project’s reference `radiogroup`+`radio`+`aria-checked` implementation.
- No shared `Dialog`/`Sheet`/`RadioGroup` component is used by Builder; introducing one is unnecessary for the P1 fix.

---

## 22. Existing Test Coverage (a11y-relevant)

- `rccf71-1/71-2/71-3/71-5-1/71-6-1` — wiring/persistence→snapshot→LayoutEngine parity; they assert `website-panel.tsx` contains appearance field literals (`overview?.appearance` etc.) as source probes, but **do not assert** chip `role`/`aria-checked` or `aria-live` or focus-trap.
- `rccf-builder-03a` (21 tests) — state-sync guard (optimistic highlight, stale-rerender guard, slider remains NEW, failure revert, version-gated rapid, parent-rerender repro, reload/theme-switch). **No a11y assertions**.
- `rccf70-4-5-builder` + other builder-qa suites — check that toolbar/mobile bar buttons have `aria-label` and that section actions have `aria-label`, but not that appearance chips have selection semantics or that the mobile sheet traps.

**Gap:** no builder test today pins `role="radiogroup"`/`aria-checked`, `aria-live="polite"` save status, `Tab` confinement in `BuilderMobilePanel`, or keyboard activation of `SectionCard`. The fix RCCF should add **component-level DOM tests** (Tab, Enter/Space, Arrow roving) for chips, a **focus-trap test** for the mobile sheet (Tab on last → first), and a **keyboard-selection test** for sections — alongside the existing source-contract assertions (which should be updated, not deleted).

---

## 23. Protected / Architecture Protection

Verified that this audit introduced **no need** to modify:

- Payment / commerce / Razorpay (`src/actions/billing.actions.ts`, Razorpay provider, `ProductOrder` ledger) — not referenced by appearance.
- Marketing frontend (`src/components/marketing`, pricing/benchmark) — untouched.
- Onboarding (`src/app/onboarding/page.tsx`) — protected, dirty pre-existing, **untouched** in this audit.
- Publishing / preview / experience runtime (`themeResolver`, `experienceRegistry`, `applyExperienceOverride`, `resolveExperienceForCapabilities`, `buildRuntimeSnapshot`, `storefront-loader.ts`) — explicitly checked; fixes are builder-chrome only.
- Prisma schema / migrations / env vars — no builder a11y fix requires them.

---

## 24. Git / Staging State (end of audit)

```
HEAD:       b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
origin/main:b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8

No source was modified by this audit.
No commit, no push, no reset/stash/checkout/rebase/amend.

Modified (pre-existing, outside this audit, unchanged):
  .env.example, docs/design/Stitch-DNA.md, marketing screenshots,
  opencode.json, package.json, skills-lock.json,
  src/actions/billing.actions.ts, src/components/dashboard/StorefrontStatusCard.tsx,
  src/components/ui/Button.tsx, src/lib/marketing/trust/comparison.ts,
  src/lib/storefront/storefront-loader.ts   ← BUILDER-02/02B, preserved
  src/app/onboarding/page.tsx               ← PROTECTED dirty, untouched
  tests/e2e/shared/auth.ts, tests/fixtures/test-seed.ts ← PROTECTED dirty, untouched
  tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts
  + 4 locally-implemented but uncommitted 03A files (the audited surface):
    src/features/builder/components/appearance-panel.tsx
    src/features/builder/components/website-panel.tsx
    src/features/builder/components/workspace.tsx
    src/features/builder/components/properties.tsx

Staged (pre-existing):
  docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md

Untracked (pre-existing + 03A):
  .agents/, .playwright-mcp/, docs/rccf-*/ docs/rccf-builder-03a*, skills,
  tests/unit/rccf-builder-03a-theme-control-state-sync.test.tsx,
  screenshots, tmp_vitest.txt, etc.

This audit intends to add exactly one file:
  docs/rccf-builder-03b-builder-appearance-accessibility-audit-closure.md (this file)
```

`git diff --check` remains clean aside from the pre-existing CRLF notice on `tests/fixtures/test-seed.ts`.

---

## 25. Next RCCF Recommendation

### Primary — `RCCF-BUILDER-03B-1 — Builder Appearance Chip Semantics + Mobile Sheet Focus Trap`

**Goal:** close the 3 P1 defects without touching runtime.

- **Chips:** `appearance-panel.tsx` — add `role="radiogroup" aria-label` wrappers (reusing `DateRangePicker` shape) and `role="radio" aria-checked={active}` on each `Chip` (keep native `<button>` for Tab/focus). Add arrow/Home/End roving in same change.
- **Mobile sheet:** `mobile-panel.tsx` — add Tab trap (copy `AdminSidebar:62-85` pattern) + `sheetRef`.
- **Section card:** nested-safe keyboard selection (title-as-button with `aria-pressed`, or card `tabIndex`+`aria-selected` with actions outside button).

**Files:** `appearance-panel.tsx`, `mobile-panel.tsx`, `section-manager.tsx` — no `workspace.tsx` runtime change, no Stitch regeneration.

**Tests:** add component interaction tests: `chip aria-checked` toggles, `Space/Enter` selects, `ArrowRight` moves within group, `Tab` cycles inside sheet, `Enter` selects section via keyboard.

### Follow-on — `RCCF-BUILDER-03B-2 — Builder Save-Status Live Region + Gate Announcement`

- `appearance-panel.tsx` / `workspace.tsx` status area: single `role="status" aria-live="polite"` (or `sr-only` live) for “Saving/Saved/Failed”; `aria-describedby` from disabled chips to locked banner; `role="alert"` on `MediaField` error.

This split keeps the P1 slice small and reviewable.

---

## 26. Hard Stop

This audit was **AUDIT ONLY**. No fix was implemented. No source was modified. No commit, push, reset, stash, checkout, rebase, amend, or protected-file write was performed. No Stitch regeneration, no builder redesign, and no BUILDER-03C/04 was started. The above file is the sole deliverable beyond the baseline.

---

# RCCF-BUILDER-03B — FINAL AUDIT REPORT (per spec §Final output format)

**Verdict:** B — appearance state-sync is fixed; 3× P1 and 3× P2 a11y gaps remain, no P0.

| Severity | Count |
|---|---|
| P0 | 0 |
| P1 | 3 (A1 chips group/selected, A2 mobile Tab trap, A3 section-card keyboard) |
| P2 | 3 (S1 save live region, S2 locked gate link, S3 MediaField error) |
| P3 | 4 (R1 slider valuetttext, R2 chip arrow/Home/End, R3 touch target, R4 drag handle) + 1 Already Correct (slider native) |

**Confirmed Findings:** P1-A1 chip `aria-pressed`/`radiogroup` absence (`appearance-panel.tsx:412-445`), P1-A2 `BuilderMobilePanel` Tab escape (`mobile-panel.tsx:33-59` vs `admin-sidebar.tsx:62-85` precedent), P1-A3 `SectionCard` `<div onClick>` not focusable (`section-manager.tsx:111-120` with 6 nested buttons — naive `div→button` invalid, needs nesting-safe affordance), P2-S1 `Saving…`/`statusMsg` not `aria-live` (`appearance-panel.tsx:161`, `workspace.tsx:438`), P2-S2 locked banner not linked via `aria-describedby`, P2-S3 `MediaField` error `text-red-400` without `role="alert"`.

**Already Correct:** sliders — native `<input type=range>` with `aria-label`, `min/max/step/value` (`appearance-panel.tsx:285-295,249-259`) already expose sufficient semantics; `aria-valuetext` is optional P3, not a defect. Focus remains on chips/sliders after change (no loss). `*:focus-visible` ring and `prefers-reduced-motion` global respected.

**Proposed Fixes:** `RCCF-BUILDER-03B-1` — `appearance-panel.tsx` radiogroup/radio+arrow/Home/End (reuse `DateRangePicker` pattern) + `mobile-panel.tsx` Tab trap (reuse `AdminSidebar` pattern) + `section-manager.tsx` nesting-safe selection (title `button aria-pressed`). `RCCF-BUILDER-03B-2` — single `role="status" aria-live="polite"` save region + `aria-describedby` to locked banner + `MediaField` `role="alert"`. No new library, no runtime change.

**Browser Verification:** *Not available* — no authenticated Builder session (consistent with 03/03A). All findings **SOURCE VERIFIED** (line numbers above). Browser/VoiceOver Playwright verification explicitly deferred to the implementation RCCF.

**Tests:** Existing builder/test suites (`rccf71-1/71-2/71-3/71-5-1/71-6-1` + `rccf-builder-03a` 21 tests) pin state-sync but not a11y semantics. New fix must add component-level `radiogroup`/`aria-checked`, `Tab`-trap, and section keyboard tests without weakening the `toContain` probes.

**Protected Work:** `src/app/onboarding/page.tsx` and `tests/fixtures/test-seed.ts` untouched (pre-existing dirty, byte-identical to baseline). No payment/commerce/marketing/publishing/themeResolver/experienceRegistry/buildRuntimeSnapshot/schema change proposed.

**Git State:** `HEAD b80b272 == origin/main b80b272`; 4-file 03A implementation remains dirty but uncommitted (the audited baseline); `storefront-loader.ts` BUILDER-02/02B preserved; no commit/push/reset/stash/checkout/rebase/amend; this audit adds only this closure file.

**Next RCCF:** `RCCF-BUILDER-03B-1 — Builder Appearance Chip Semantics + Mobile Sheet Focus Trap` (P1), followed by `RCCF-BUILDER-03B-2 — Builder Save-Status Live Region + Gate Announcement` (P2).

**STOP.**
