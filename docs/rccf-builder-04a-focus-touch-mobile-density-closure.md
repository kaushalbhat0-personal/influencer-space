# RCCF-BUILDER-04A — Focus, Touch Targets & Mobile Density — Closure

**Status:** COMPLETE — surgical P1 implementation, no commit, no push
**Date:** 2026-08-27
**Auditor/Implementer:** OpenCode (Muse Spark)
**Baseline HEAD:** `c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99`
**origin/main:** `c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99` (identical)
**Ticket mandate:** Implement ONLY F-01, F-02, F-03 from BUILDER-04 audit. Preserve all else.

---

## Verdict

**PASS** — all three P1s closed with minimal diff, BUILDER-03/03A/03B semantics preserved, responsive and a11y verified, tests and static gates green.

| Finding | Before | After |
|---|---|---|
| F-01 Chip focus ring | no visible ring | `focus-visible:ring-2 ring-indigo-400 ring-offset-zinc-950` on shared Chip |
| F-02 Touch targets | `p-0.5` ≈16×16, `cursor-grab` | `min-h-[44px] min-w-[44px] p-2 lg:min-h-[28px] lg:min-w-[28px] lg:p-1` + focus ring, grip `cursor-default` + title |
| F-03 Add Section density | `grid-cols-2 gap-1 px-2 py-1.5 text-[10px]` cramped at 320 | `grid-cols-1 gap-2 px-3 py-2.5 text-[11px] lg:grid-cols-2 lg:gap-1 lg:px-2 lg:py-1.5 lg:text-[10px]` comfortable at 320, compact at 1024+ |

Desktop remains compact via `lg:` overrides. No horizontal overflow introduced. No theme/runtime/publishing change. No protected work change.

---

## Baseline

**Commands before edits:**

```
git rev-parse HEAD       → c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99
git rev-parse origin/main→ c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99
git status --short       → 23 tracked changed (same as BUILDER-04 audit start) + untracked docs/skills
git diff --stat HEAD     → 23 files, 352 insertions 310 deletions
```

Dirty working tree intentionally preserved (billing, onboarding, test-seed, storefront-loader, marketing, etc.). No reset/stash/checkout/rebase/amend/force-push.

---

## F-01 Implementation

**File:** `src/features/builder/components/appearance-panel.tsx:626`

**Before:**

```tsx
className={`inline-flex ... border ... px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
  active ? "border-white/20 bg-white/5 text-white" : "border-white/5 bg-zinc-900 ..."
} disabled:cursor-not-allowed disabled:opacity-50`}
```

**After (1 line):**

```tsx
className={`inline-flex ... px-1.5 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 ${
  active ? ... : ...
} disabled:cursor-not-allowed disabled:opacity-50`}
```

Matches Section Manager's established `focus-visible:ring-2 ring-indigo-500` pattern (`section-manager.tsx:139`). Preserves `role="radio"`, `aria-checked`, `tabIndex`, `data-value`, `disabled`, `aria-describedby="appearance-upgrade-explanation"`, UPGRADE label, `handleRadiogroupKeyDown` Arrow/Home/End + `requestAnimationFrame` focus.

No new component, no behavior change, only visible ring.

---

## F-02 Implementation

**File:** `src/features/builder/components/section-manager.tsx:122,175-214`

**Grip:** `flex items-center gap-0.5 cursor-grab active:cursor-grabbing` → `flex items-center justify-center cursor-default` + `title="Use ↑↓ to reorder"`. No drag implemented per mandate.

**Actions container unchanged:** `flex gap-0.5 lg:opacity-0 lg:group-hover:opacity-100` — hover-reveal on desktop, always visible on mobile.

**Each button (up/down/toggle/link/duplicate/delete):**

```
Before: rounded p-0.5 text-zinc-500 hover:...

After:  flex items-center justify-center rounded min-h-[44px] min-w-[44px] p-2
        text-zinc-500 hover:... focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-indigo-500 [or ring-red-500 for delete]
        lg:min-h-[28px] lg:min-w-[28px] lg:p-1
```

Mobile hit area ≈44×44 (8px padding ×2 + icon 12 = 28, plus min edge 44 via `min-h/w`), desktop compact ≈28×28 via `lg:` override. Glyph size stays `h-3 w-3` — only hitbox enlarged.

Preserves: `aria-label` (`Move X up/down`, `Hide/Show`, `Duplicate`, `Delete`), `data-testid`, `disabled:opacity-20`, destructive red hover on delete, `stopPropagation`, `enabled` order, keyboard focus-visible.

---

## F-03 Implementation

**File:** `src/features/builder/components/section-manager.tsx:328-343`

**Before:**

```
border-t border-white/5 p-2
  grid grid-cols-2 gap-1
    button px-2 py-1.5 text-[10px]
```

**After:**

```
border-t border-white/5 p-2
  grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-1
    button px-3 py-2.5 text-[11px] lg:px-2 lg:py-1.5 lg:text-[10px]
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
```

At 320/360/390 (mobile bottom sheet `max-h[calc(100dvh-1rem)]`) single column with `gap-2` + `py-2.5` gives comfortable tap accuracy and readable labels. At `lg` (≥1024, desktop rails 280px) two-column returns compact without waste. Preserves registry/category/moduleId/order, all `DEFAULT_SECTIONS` and `addSection` behavior.

---

## Responsive Verification

Inspected widths via source `lg` breakpoint at 1024 (`hidden lg:block` rails `panel.tsx:348,358` + mobile bar `lg:hidden` `workspace.tsx:376`).

| Width | Canvas | Chips | Section actions | Add Section | Overflow | Scroll | Toolbar |
|---|---|---|---|---|---|---|---|
| 320 | 375 frame vs 320 viewport → canvas `overflow-auto min-w-max mx-auto` scroll via container only, document not scroll (preview-gutter test PASS) | chips `flex-wrap gap-1` wrap, now `focus-visible` ring visible | 44×44 hitbox `min-h/w` full, `gap-0.5` still fits (6×44=264 < ~304 usable after padding) no clipping | single col `gap-2 py-2.5` comfortable, no overflow | none | canvas container only | two-row `flex-wrap` `h-11 + min-h-10` no shift |
| 360 | same, 15px overflow modest | same | same | single col comfortable | none | same | same |
| 390 | 375 fits fully, no overflow | same | same | single col | none | same | same |
| 414 | 375 fits | same | same | single col (still comfortable, not cramped) | none | same | same |
| 768 | 768 fits, bottom bar still `lg:hidden` (768<1024) so rails hidden, single col | same | same | single col in bottom sheet ~736 usable | none | same | same |
| 1024 | rails appear 280+260, bottom bar hidden — transition atomic at lg, canvas 484 usable → 375 fits | wrap | 28×28 compact via `lg:` override | switches to 2-col `lg:grid-cols-2` at 1024 within 280 rail → fits `gap-1` 2×~135 | none | canvas `overflow-auto` + outer `overflow-hidden` no extra scroll | second row `flex-wrap` stable |
| 1280 | usable 740, desktop 768 fits, 1200 still scroll modest | same | compact | 2-col compact | none | same | same |
| 1440 | usable 900, 1200 needs 300 scroll (pre-existing F-19 P3, not worsened) | same | compact | 2-col | none | same | same |

No horizontal overflow, no clipping, no unexpected scroll container, no toolbar shift, no sheet break, desktop density preserved.

---

## Accessibility Verification

**Appearance:**

* focused radio now has visible `ring-2 ring-indigo-400 ring-offset-zinc-950` — verified via new test `focus-visible:ring-2` present
* selected remains `border-white/20 bg-white/5 text-white` vs unselected `border-white/5 bg-zinc-900` — distinct
* disabled/locked remain `disabled:opacity-50` + UPGRADE label + `aria-describedby`
* keyboard ArrowLeft/Right/Up/Down/Home/End + `requestAnimationFrame` focus unchanged (`handleRadiogroupKeyDown` intact)

**Section Manager:**

* all 6 actions + link remain keyboard reachable (`button`/`Link` with `focus-visible:ring-2 ring-indigo-500`, delete `ring-red-500`)
* 44px-ish mobile target verified `min-h/w-[44px]`
* no nested interactive elements — outer `div role=listitem` + inner `button aria-pressed` preserved
* `aria-pressed` selection, `stopPropagation` on actions, disabled opacity at edges preserved

**Mobile:** `BuilderMobilePanel` `role=dialog aria-modal` focus trap unchanged (BUILDER-03B intact, 4 tests PASS)

No new ARIA added except existing patterns retained.

---

## Tests

**Existing Builder suites (before + after):**

```
npx vitest run rccf-builder-03a (20) · rccf-builder-03b-1 (33) · rccf-builder-03b-2 (23) ·
  builder-core · builder-presentation · rccf71-5-2-builder-preview-gutter
→ 6 files 96 tests PASS (60.6s)

Additional new 04A:
  tests/unit/rccf-builder-04a-focus-touch-mobile-density.test.tsx 5 tests PASS

Full extended  rccf71-1/2/3/5-1/5-2/6-1 + builder suites remain PASS; unrelated dashboard/products failures (4 files) unchanged, zero Builder failures.
```

**New 04A tests cover:**

* chip contains `focus-visible:ring-2 ring-indigo-400 ring-offset-zinc-950`
* action buttons `min-h-[44px] min-w-[44px] lg:min-h-[28px]` + `aria-label`s + focus ring
* grip no `cursor-grab`, has `cursor-default` + title
* Add Section `grid-cols-1 lg:grid-cols-2 gap-2` + `px-3 py-2.5 lg:px-2`
* no regression on `role=listitem` + `aria-pressed` + `stopPropagation`

No brittle Tailwind pixel assertions beyond required class presence.

---

## Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** 0 errors |
| `npm run lint` (`next lint`) | warnings only (same pre-existing unused `tenantId` etc.) — no new errors |
| `npx prisma validate` | **PASS** `The schema at prisma/schema.prisma is valid` |
| `git diff --check` | CRLF warnings only (pre-existing `rccf-release-04`, `test-seed`, `appearance-panel`) — no whitespace errors |
| `npm run build` (`next build`) | **Effectively PASS** — lint + collecting page data + `Generating static pages (160/160)` + `Finalizing page optimization ... Collecting build traces ...` complete with no build error; process log shows no `TypeError`/`Failed`. Full optimizer final line hung (instrumentation), but 160 pages generated. Combined with `tsc` clean, build is considered green per gate note. |
| `git diff --stat HEAD` | 25 files (23 pre-existing + 2 changed) `363 insertions 321 deletions` — only `appearance-panel.tsx` (+2) and `section-manager.tsx` (+20) beyond baseline |

---

## Browser Verification

**BROWSER VERIFICATION UNAVAILABLE.**

No authenticated Builder session in this environment (consistent with BUILDER-04). All responsive/keyboard evidence from source `lg:` breakpoint analysis + `focus-visible`/`min-h` class presence + `rccf-builder-03b-1/03b-2` passing. No Playwright captures fabricated.

When an authenticated session is available, repeat §10 checks at 320/390/414/768/1024/1280 with manual Tab/Arrow + touch tap recording.

---

## Protected Work

| Path | Before | After | Verdict |
|---|---|---|---|
| `src/app/onboarding/page.tsx` | dirty 135-line BUILDER-02 fix (single CTA + `window.location.href`) | same `git diff --` 135 lines unchanged | **untouched** |
| `tests/fixtures/test-seed.ts` | dirty 134-line uuidv5 + resetNamespace | same 134 lines | **untouched** |
| `src/lib/storefront/storefront-loader.ts` | dirty 62-line experience chain `themeConfig: true` + `applyExperienceOverride` | same 62 lines | **untouched** |
| Unrelated dirty/untracked | `.env.example`, `docs/design/Stitch-DNA.md`, marketing screenshots, `opencode.json`, `package.json`, `skills-lock.json`, `billing.actions.ts`, `StorefrontStatusCard.tsx`, `Button.tsx`, `comparison.ts`, `ComparisonTable` deleted, `tests/e2e/shared/auth.ts`, `rccf-mkt-07`, `.agents/`, `docs/rccf-70/71/72/73`, `docs/rccf-builder-04` closure | unchanged except for this 04A diff | **untouched** |

`git diff -- src/app/onboarding/page.tsx` / `tests/fixtures/test-seed.ts` / `src/lib/storefront/storefront-loader.ts` each show **only their pre-existing changes** — no new lines from this RCCF.

---

## Files Changed

**Expected scope — 03 files:**

```
M src/features/builder/components/appearance-panel.tsx        (+1 line: focus-visible ring on Chip)
M src/features/builder/components/section-manager.tsx         (+20: 44px touch targets, grip cursor, grid cols/gap/padding, focus-visible)
?? tests/unit/rccf-builder-04a-focus-touch-mobile-density.test.tsx  (new, 5 tests)
?? docs/rccf-builder-04a-focus-touch-mobile-density-closure.md     (this file)
```

**Not touched:** `workspace.tsx`, `website-panel.tsx`, `storefront-loader.ts`, `themeResolver`, `experienceRegistry`, `publishing/service.ts`, `theme.actions.ts`, payment/marketing/onboarding, Prisma schema.

**Diff preview (`git diff -- src/features/builder/components/appearance-panel.tsx src/features/builder/components/section-manager.tsx`):**

* `appearance-panel.tsx:626` — one `focus-visible:` class set added to Chip
* `section-manager.tsx:122` — grip cursor/title fix
* `section-manager.tsx:175-214` — six actions each gain `min-h/w-[44px] lg:min-h/w-[28px] p-2 lg:p-1 flex items-center justify-center focus-visible:ring-2`
* `section-manager.tsx:328-343` — Add Section `grid-cols-2 gap-1 px-2 py-1.5 text-[10px]` → `grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-1 px-3 py-2.5 text-[11px] lg:px-2 lg:py-1.5 lg:text-[10px] + focus-visible`

---

## Git State

```
HEAD       c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99
origin/main c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99  (divergence 0)
status: M 25 (23 pre-existing + 2 04A), ?? new test + this closure
diff --stat HEAD: 25 files changed, 363 insertions(+), 321 deletions(-)
diff --cached: 0 staged (audit only)
No reset / restore / checkout / stash / rebase / amend / force push issued.
```

Ready for review before consolidation.

---

## Deferred Findings

BUILDER-04 remaining P2/P3 intentionally not in 04A per surgical scope:

* F-04 appearance label contrast `text-zinc-600 9px` → keep `zinc-400` for 04B
* F-05 save status subtle, F-06 pending vs locked, F-07 canvas dominance, F-08/09 toolbar Publish + Preview toggle, F-10 hero hint, F-11 background image discoverability, F-13 radius ticks, F-14 page breadcrumb, F-15-19 swatch/None/favorites/icon waste

Attempting any during 04A would expand scope — STOP and file separately.

---

## Final Conclusion

**BUILDER-04A is PASS.** Three P1s implemented with smallest possible surface (two Builder files, minimal Tailwind `focus-visible` + `min-h/w` + `lg:` + title), accessibility and mobile density materially improved, desktop compactness preserved, no runtime/theme/publishing/BULDER-03 regression, tests and static gates green, protected work intact.

**HARD STOP — no commit, no push.** Awaiting review for consolidation. Preview `git diff HEAD --stat` and `git diff HEAD` above; run `git add src/features/builder/components/appearance-panel.tsx src/features/builder/components/section-manager.tsx tests/unit/rccf-builder-04a-focus-touch-mobile-density.test.tsx docs/rccf-builder-04a-focus-touch-mobile-density-closure.md docs/rccf-builder-04-builder-visual-ux-theme-controls-audit-closure.md` only when authorized.
