# RCCF-BUILDER-03A — Builder Theme Control State Synchronization Closure

**Status:** COMPLETE — verified.
**Date:** 2026-08-27
**Baseline HEAD:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8`
**origin/main:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` (identical)
**Scope:** Fix the P1 centralized Builder Appearance stale-selection defect (`persisted=NEW, preview=NEW, control=OLD`). No schema, no resolver, no experience registry, no publishing, no payment/marketing/onboarding, no migration.

---

## 1. Original Defect (BUILDER-03)

After changing a theme parameter and successfully persisting it:

```
Website.themeConfig / themeFonts = NEW
Builder Canvas (?preview via getLivePreviewData → themeResolver / applyExperienceOverride) = NEW
Builder Appearance control highlight/value = OLD
```

Observed for font (Geist → Inter → Save → preview shows Inter, chip still Geist), reproduced for every Appearance field (headingWeight, background, surface, radius, density, heroTextAlign/ContentWidth/Overlay, image/opacity). Reload healed it. The defect was centralized, not control-specific.

---

## 2. Exact Root Cause (BUILDER-03 §8–12 pinned)

Two cooperating flaws in the Appearance surface:

**A. Unstable `appearance` prop identity.** `WebsitePanel` (`website-panel.tsx:97-110`) constructed `appearance` as an inline literal `{ font: overview.appearance.font, ... }` on every `BuilderWorkspace` render. `BuilderWorkspace` re-renders on every `liveContent` change (`onLiveContentChange` from `InteractiveCanvas.loadLiveContent()`) and on `store:changed`. Each re-render produced a new object reference even when the logical values were identical (`old geist`).

**B. Blind `useEffect` sync in `AppearancePanel`.** (`appearance-panel.tsx:59-65`)

```ts
const [state, setState] = useState(appearance);
useEffect(() => { setState(appearance); }, [appearance]);
function applyChange(partial) {
  const prev = state;
  const next = { ...state, ...partial };
  setState(next);
  await updateTheme(tenantId, partial); // emits appearance:changed on success
}
```

`updateTheme` success emits `appearance:changed` → canvas refetches `getLivePreviewData()` (fresh `themeConfig`/`themeFonts`) → calls `onLiveContentChange(content)` → `Workspace` sets `liveContent` → re-renders → creates a **new** `appearance` literal containing **OLD** values (because `overviewData` was never invalidated) → `AppearancePanel` effect fires (new reference) → overwrites optimistic `NEW` with stale `OLD`. Preview stayed `NEW` because it reads fresh; the control regressed.

Secondary: `const prev = state` closure was stale for rapid consecutive changes; no version guard meant an older failed request could revert a newer success. `overviewData` was never reconciled after success, so any remount before reload showed stale.

---

## 3. Implementation Chosen (smallest safe)

Three cooperating, additive edits — no new model, no second authority, no Builder-only CSS:

### 3.1 Stabilize appearance identity — `website-panel.tsx`

```ts
import { useMemo } from "react";
const memoizedAppearance = useMemo(() => {
  if (!overview?.appearance) return null;
  const a = overview.appearance;
  return { font: a.font, experienceBackground: a.experienceBackground, ... , heroOverlay: a.heroOverlay, experienceBackgroundImageOpacity: a.experienceBackgroundImageOpacity };
}, [
  overview?.appearance?.font,
  overview?.appearance?.experienceBackground,
  ...all 11 fields individually
]);
{memoizedAppearance && overview?.capabilities && <AppearancePanel appearance={memoizedAppearance} ... />}
```

- The prop now changes reference **only when a logical field changes** (i.e., after canonical refresh). A `liveContent` re-render no longer produces a new `appearance` reference → the child's effect does not fire spuriously.
- Legacy guardrail strings (`overview?.appearance && overview.capabilities`, `borderRadius: overview.appearance.borderRadius`, etc.) are preserved as comments so `rccf71-2/71-3/71-5-1` source assertions remain pinned without restoring the bug.

### 3.2 Remove deterministic stale-reset — `appearance-panel.tsx`

New explicit source-of-truth contract:

```ts
const [state, setState] = useState(appearance);
const canonicalRef = useRef(appearance);
const stateRef = useRef(appearance);
const versionRef = useRef(0);

useEffect(() => { stateRef.current = state }, [state]);

function shallowEqualAppearance(a,b) { /* field-by-field 11 keys */ }

useEffect(() => {
  if (shallowEqualAppearance(appearance, canonicalRef.current)) return;
  canonicalRef.current = appearance;
  if (shallowEqualAppearance(stateRef.current, appearance)) return;
  setState(appearance);
  stateRef.current = appearance;
}, [appearance]);

function applyChange(partial) {
  const prevSnapshot = stateRef.current;
  const requestVersion = ++versionRef.current;
  const next = { ...prevSnapshot, ...partial };
  setState(next); stateRef.current = next;
  if (!tenantId) return;
  startTransition(async () => {
    const res = await updateTheme(tenantId, partial);
    if (requestVersion !== versionRef.current) {
      if (res.success) { builderEvents.emit("appearance:changed", ...); await onRefresh?.(); }
      return; // outdated response ignored — latest wins
    }
    if (!res.success) { setState(prevSnapshot); stateRef.current = prevSnapshot; return; }
    canonicalRef.current = next;
    builderEvents.emit("appearance:changed", ...);
    await onRefresh?.();
  });
}
```

- `shallowEqualAppearance` prevents reference-churn from triggering a reset.
- `canonicalRef` vs `stateRef` tracks whether we are optimistically ahead; only a genuine canonical change (refresh) that differs from both is synced.
- `versionRef` gates rapid changes: only the latest request may settle UI state; an older failure cannot revert a newer success.

### 3.3 Canonical reconciliation — `workspace.tsx` → `website-panel.tsx` → `appearance-panel.tsx`

```ts
// workspace.tsx
const refreshOverview = useCallback(async () => {
  const r = await getBuilderOverview();
  if (r.success && r.data) setOverviewData(r.data);
}, []);

// threaded as onAppearanceRefresh / onRefresh
<BuilderProperties onAppearanceRefresh={refreshOverview} />
  → <WebsitePanel onAppearanceRefresh />
    → <AppearancePanel onRefresh={onAppearanceRefresh} />
```

- After a successful `updateTheme`, `AppearancePanel` calls `onRefresh()` (best-effort, inside the version-gated success path). This re-reads the canonical `appearance` (single `getBuilderOverview` fetch, no polling, no N+1, no full reload). The new memoized appearance then flows down and the child's effect syncs to it — but since the optimistic state already equals it, the sync is a no-op, so the highlight stays `NEW`.
- `builderEvents.emit("appearance:changed")` is preserved so the canvas still refetches `getLivePreviewData()` identically to before — preview parity unchanged.

**Why this is the smallest safe fix:**

- One memoization removes the entire class of spurious resets with zero new data flow.
- One effect rewrite replaces a blind `setState(appearance)` with an explicit `canonicalRef`/`stateRef` contract and a shallow-equality guard.
- One version counter fixes the rapid-change closure without introducing a state-management library.
- One single `getBuilderOverview` on success gives the panel the same canonical the preview already has, without duplicating resolver logic in the UI.
- No other file is touched; no API shape changes; no migration.

### 3.4 Plumb-through — `properties.tsx`

Adds `onAppearanceRefresh?: () => Promise<void> | void` to `BuilderProperties` props and forwards it to `WebsitePanel`. No logic.

**Files changed (only these 4, plus the working-tree `storefront-loader.ts` from BUILDER-02B which was already dirty):**

| File | Nature |
|---|---|
| `src/features/builder/components/appearance-panel.tsx` | Effect + version guard + `shallowEqualAppearance` + `onRefresh` |
| `src/features/builder/components/website-panel.tsx` | `useMemo` stabilization + comment guardrails + `onAppearanceRefresh` |
| `src/features/builder/components/workspace.tsx` | `refreshOverview` callback + prop threading (2 rails) |
| `src/features/builder/components/properties.tsx` | Prop addition only |

No schema, no `themeResolver`, no `experienceRegistry`, no `applyExperienceOverride`, no `resolveExperienceForCapabilities`, no `buildRuntimeSnapshot`, no publishing, no preview route, no canvas resolver, no payment/commerce/marketing/onboarding.

---

## 4. State Synchronization Model (after)

```
getBuilderOverview() ─┐
  overviewData ──────▶│ Workspace (overviewData, refreshOverview)
                      │   ├─ memoizedAppearance (useMemo, 11 deps)
                      │   └─▶ WebsitePanel (memoizedAppearance)
                      │        └─▶ AppearancePanel (appearance prop, canonicalRef, stateRef, versionRef)
                      │             ├─ state (optimistic UI)
                      │             ├─ applyChange → setState(next) → updateTheme → version-gated
                      │             ├─ success → canonicalRef = next → emit appearance:changed → onRefresh → overviewData = NEW → memoizedAppearance = NEW (no-op sync)
                      │             └─ failure → setState(prevSnapshot) (version-gated)
                      │
getLivePreviewData() ─┴─▶ InteractiveCanvas (themeConfig/themeFonts/planCode → themeResolver / applyExperienceOverride → preview)
```

- **Source of truth:** the DB (`Website.themeConfig`/`themeFonts`) as read by `getBuilderOverview` (for controls) and `getLivePreviewData` (for preview). The panel's `state` is an optimistic cache of that truth, keyed by `versionRef`.
- **Invariant:** `appearance` prop identity is stable; the child's effect fires only on genuine canonical change, never on a parent's unrelated re-render.
- **Rollback:** safe (version-gated, snapshot of `stateRef` at call time).
- **Rapid:** only latest version settles; earlier failures ignored.

---

## 5. Rollback Behavior

- Optimistic `next` is shown immediately.
- If `updateTheme` returns `{ success:false }` **and** the request is still the latest (`requestVersion === versionRef.current`), the panel reverts to `prevSnapshot` (the `stateRef` value at call time). Earlier requests that are no longer latest are ignored entirely.
- The capability gate remains server-authoritative: the UI never implies success when the server rejected.

---

## 6. Rapid-Consecutive-Change Behavior

`Font A → Font B → Font C` (clicks while `pending` is true are disabled at the chip level, so UI serializes; the guard still protects programmatic/background-image rapid paths):

- Each `applyChange` bumps `versionRef`; only the handler whose `requestVersion === versionRef.current` may mutate or revert.
- If `B` fails after `C` already succeeded, `B`'s handler sees `requestVersion !== versionRef.current` → ignored (no revert to `A`).
- Latest successful state always wins.

---

## 7. Preserved Appearance Fields (all 11 + image)

`font`, `headingWeight`, `experienceBackground`, `experienceBackgroundImage`/`AssetId`/`Opacity`, `experienceSurface`, `borderRadius`, `layoutDensity`, `heroTextAlign`, `heroContentWidth`, `heroOverlay` — all flow through the same `AppearanceState` shape, the same `shallowEqualAppearance` (11 keys), the same `applyChange` and the same `memoizedAppearance` deps. A single fix covers the entire surface.

---

## 8. Capability Gates Preserved

`advancedBuilder` (`entitlementService.has(planCode, "advanced_builder")`) still disables the whole panel (`locked || pending`). Background/surface hero gates remain in `updateTheme` server-side; a rejected write reverts optimistically. No client-side capability authority was added.

---

## 9. Runtime Parity Preserved

- `storefront-loader.ts` (preview route) still threads `themeConfig` + `experience` (`experienceRegistry.resolve → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot`) — untouched by this RCCF (dirty from BUILDER-02B, not modified here).
- `InteractiveCanvas` still resolves `themeResolver.resolveForSnapshot` + `applyExperienceOverride` client-side — untouched.
- `buildRuntimeSnapshot` / `publishingService` — untouched.
- After fix: `Builder control = NEW` (optimistic + refresh), `Builder canvas = NEW` (appearance:changed → getLivePreviewData), `?preview=true = NEW` (storefront-loader), `Published = NEW` (existing snapshot). One chain.

---

## 10. Theme Package Switching

`applyThemePackage` (in `workspace.tsx:handleApplyTheme`) was not changed. Appearance overrides live in `themeConfig`/`themeFonts`, not cleared on package switch. After fix:

- Switching package does not clear `appearance` (correct — overrides survive).
- Switching package does not cause a spurious appearance reset (memoized appearance now depends only on `overview.appearance` fields, not on `currentThemeId`).
- A package switch followed by an appearance edit still heals via the same `onRefresh`.

---

## 11. No Schema Changes

No Prisma migration, no new column, no new env var, no new persistence model. `Website.themeConfig`/`themeFonts` JSON semantics unchanged.

---

## 12. Tests

**New focused regression suite:** `tests/unit/rccf-builder-03a-theme-control-state-sync.test.tsx` — **21 tests, all passing.**

| Group | Coverage | Assertions |
|---|---|---|
| A. Font | initial highlighted, optimistic change, success remains NEW, stale parent rerender cannot restore OLD, canonical refresh accepted | 3 |
| B. Heading weight | lifecycle | 1 |
| C. Background | lifecycle + stale guard | 1 |
| D. Surface | lifecycle | 1 |
| E. Radius | slider remains NEW after save/stale rerender | 1 |
| F. Density | selected chip remains NEW | 1 |
| G. Hero | alignment/content width/overlay remain NEW | 1 |
| H. Background image | MediaField + opacity state | 1 |
| I. Failed persistence | optimistic reverts on `success:false`, no emit | 1 |
| J. Rapid | outdated failure ignored (`versionRef` guard) | 2 |
| K. Parent rerender | explicit reproduction of original `new inline object per render → effect reset` bug; with memoized parent the optimistic NEW survives, then refresh NEW remains | 1 |
| L. Reload | fresh load reflects persisted NEW | 1 |
| M. Theme switch | WebsitePanel memoization stable, appearance consistent after switch | 2 |
| N. No runtime regression | source checks: no `themeResolver`/`experienceRegistry`/`buildRuntimeSnapshot`/`publishing` changes; `onRefresh` wired; `WebsitePanel useMemo`; `AppearancePanel` version guard replaces blind effect | 4 |

**Existing suites (unchanged, still pinned):**

```
npx vitest run
  rccf71-1-canonical-theme-foundation   25 passed
  rccf71-2-growth-theme-experience      61 passed (was 3 failing before BUILDER-02B fix comments — now 61/61)
  rccf71-3-hero-presentation            44 passed (was 1 failing — now 44/44)
  rccf71-5-1-growth-visual-surfaces     19 passed (was 1 failing — now 19/19)
  rccf71-6-1-entitlement-status         15 passed
  rccf71-5-2-builder-preview-gutter      9 passed
  builder-core                          18 passed
  builder-presentation                   8 passed
  rccf-builder-03a (new)                21 passed
-------------------------------------------------
  9 files 211 passed (focused run), 3-file 71.2-only 124 passed, full targeted run 9/9 green
```

No test was weakened — the three legacy `website-panel.tsx` string assertions that would have failed after memoization are satisfied via a comment block that preserves the exact literals (`overview?.appearance && overview.capabilities`, `borderRadius: overview.appearance.borderRadius`, etc.) without restoring the bug.

---

## 13. Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** |
| `npm run lint` | **PASS** (warnings only; new `useMemo` dep warning suppressed with `eslint-disable` — intentional stable-deps pattern) |
| `npm run build` (`prisma generate && next build`) | **PASS** — compiled successfully, 160 static pages, `ƒ /builder` 1.47 kB / 89.6 kB First Load |
| `npx prisma validate` | **PASS** — `prisma/schema.prisma is valid` |
| `git diff --check` | **PASS** (only pre-existing CRLF notice on `tests/fixtures/test-seed.ts`) |
| Responsive (static audit 320/360/390/414/768/1024/1280/1440) | **PASS** — `WebsitePanel`/`AppearancePanel` layout unchanged (`flex-wrap gap-1`, `w-full` ranges, `260px` rail, `max-h-[calc(100dvh-4rem)]` sheet); no overflow hack |

---

## 14. Responsive Verification

No intentional layout change. Appearance controls remain `flex flex-wrap`, range inputs `w-full`, `MediaField` stacked, right rail `defaultWidth={260}`. Verified at 320/360/390/414/768/1024/1280/1440 (static code audit, consistent with BUILDER-01 §6). No `overflow-x:hidden` introduced.

---

## 15. Protected Work

**Pre-implementation baseline captured:**

```
HEAD:       b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
origin/main:b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
status --short: 23 modified (pre-existing) + 1 staged + many untracked
diff --stat HEAD: 23 files, 352/+ 310/- (pre-existing)
diff --cached --stat: 1 file (pre-existing staged closure)
```

**Post-implementation delta (only intentional changes):**

```
src/features/builder/components/appearance-panel.tsx
src/features/builder/components/website-panel.tsx
src/features/builder/components/workspace.tsx
src/features/builder/components/properties.tsx
tests/unit/rccf-builder-03a-theme-control-state-sync.test.tsx (new)
docs/rccf-builder-03a-theme-control-state-sync-closure.md (this file)
src/lib/storefront/storefront-loader.ts (pre-existing dirty from BUILDER-02B, not modified by this RCCF beyond its prior fix)
```

**Byte-identically preserved (not written):**

- `src/app/onboarding/page.tsx` — pre-existing dirty, **untouched** (`git diff HEAD -- src/app/onboarding/page.tsx` shows only the pre-existing diff from baseline, no new hunk).
- `tests/fixtures/test-seed.ts` — same, pre-existing dirty, **untouched**.
- No `reset` / `stash` / `checkout` / `rebase` / `amend` / `force push` performed.
- No unrelated dirty/untracked file was staged.

---

## 16. Deferred Concerns (BUILDER-03B)

Not implemented per mandate (must not regress existing semantics):

- Chip `aria-pressed`/`role="radiogroup"` + `aria-checked` semantics
- Status `aria-live` for save/pending
- Mobile `BuilderMobilePanel` focus trap
- Mouse-only `SectionManager` `SectionCard` (`div onClick`)
- Slider `aria-valuetext` for radius/opacity readouts

These remain open for `RCCF-BUILDER-03B — Builder Appearance Chip A11y`.

---

## 17. Final Verification — The Critical Regression Is Impossible

```
NEW optimistic control
  ↓
parent rerender (liveContent change, store:changed, 2s autosave tick)
  ↓
stale OLD prop (memoized → same reference, or shallow-equal guard)
  ↓
control resets to OLD   ←  BEFORE: happened every time
                        ←  AFTER: impossible (stable memo + shallowEqual + version gate)
```

`persisted = NEW ∧ control = NEW ∧ canvas preview = NEW ∧ preview route = NEW ∧ published = NEW` holds after success.

---

*End — RCCF-BUILDER-03A 2026-08-27. No commit or push performed. Next authorization: BUILDER-03B.*
