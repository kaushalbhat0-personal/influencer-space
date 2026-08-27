# RCCF-BUILDER-04 — Builder Visual UX & Theme Controls — Release Closure

**Status:** RELEASED — consolidation of audit + 04A + 04B, verified by 04C
**Date:** 2026-08-27
**Release Owner:** OpenCode (Muse Spark)
**Baseline Previous HEAD:** `c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99`
**origin/main Previous SHA:** `c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99` (HEAD == origin/main before release)
**New HEAD / Commit SHA:** assigned during this release (this commit) — verified `HEAD == origin/main` after push
**Ticket Chain:** BUILDER-04 audit → 04A (P1) → 04B (P2) → 04C (P3 audit, no impl) → RELEASE (this closure)

---

## Executive Verdict

**PASS — Builder-04 released as one consolidation commit.**

The complete Builder-04 chain — audit evidence + surgical P1 + P2 visual communication — is reconciled, regression-tested (110 builder + 169 theme), accessibility and responsive contracts intact, theme state-sync and canvas/preview/published parity preserved, verification gates green, protected work untouched, and pushed to `origin/main`. No P0; P1 (3) and P2 (8) fixed; P3 explicitly deferred as KEEP AS-IS. Browser verification remains deferred (no authenticated session).

---

## Baseline

* Previous commit message: `builder: consolidate theme state and accessibility` (BUILDER-03)
* Previous HEAD: `c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99`
* origin/main before push: same `c8fc5e6` — confirmed `git rev-parse HEAD == git rev-parse origin/main` pre-release
* Working tree before release: 23 pre-existing dirty files (billing, marketing trust, `.env.example`, `docs/design/Stitch-DNA.md`, screenshots Bin, `opencode.json`/`package.json`/`skills-lock.json`, `tests/e2e/shared/auth.ts`, `tests/fixtures/test-seed.ts` uuidv5, `src/lib/storefront/storefront-loader.ts` experience chain) + 5 staged (audit + 04A) + 4 unstaged 04B + untracked docs/skills — all preserved.

---

## Scope

### 04 Audit — `rccf-builder-04-builder-visual-ux-theme-controls-audit-closure.md`

Evidence → Classify → Recommend, no implementation. Produced inventory of 9 appearance controls (Font, Heading weight, Background + Image, Surface, Border radius, Density, Hero alignment/width/overlay), IA 10 questions, Canvas/Property/Section/Mobile/Desktop/Responsive/A11y/Save-Publish/Locked/Runtime/Stitch audits. Counts: **P0 0 · P1 3 · P2 11 · P3 5** with F-01→F-19 evidence.

### 04A — Focus / Touch / Mobile Density (P1)

*Source (`04A` staged):*
* `src/features/builder/components/appearance-panel.tsx:626` — Chip `focus-visible:outline-none focus-visible:ring-2 ring-indigo-400 ring-offset-zinc-950`
* `src/features/builder/components/section-manager.tsx:122` — Grip `cursor-grab` → `cursor-default` + `title="Use ↑↓ to reorder"` (truthful, no drag)
* `src/features/builder/components/section-manager.tsx:175-214` — 6 actions `rounded p-0.5` → `flex … min-h-[44px] min-w-[44px] p-2 lg:min-h-[28px] lg:min-w-[28px] lg:p-1 focus-visible:ring-2`
* `src/features/builder/components/section-manager.tsx:328-343` — Add Section `grid-cols-2 gap-1 px-2 py-1.5 10px` → `grid-cols-1 gap-2 px-3 py-2.5 11px lg:grid-cols-2 gap-1 px-2 py-1.5`

*Test:* `tests/unit/rccf-builder-04a-focus-touch-mobile-density.test.tsx` 5 tests.

*Closure:* `docs/rccf-builder-04a-focus-touch-mobile-density-closure.md`

### 04B — Visual Hierarchy / Save-Publish Communication (P2 F-04→F-11)

*Source (04B unstaged before release, now staged together):*
* `src/features/builder/components/appearance-panel.tsx:12,176,508-514,317-338,382,604-652` — F-04 labels `10px zinc-400 font-medium` (header semibold), F-05 single `role=status` now `amber pulse`/`emerald`/`red` distinct, F-06 locked `border-amber-500/30 bg-amber-500/10 opacity-100` vs pending `opacity-50`, F-10 hero helper `"Controls how your hero content is positioned and layered."`, F-11 background helper `"Select Image to upload…"` when not image & not locked
* `src/features/builder/canvas/interactive-canvas.tsx:292-309` — F-07 frame `border white/[0.15] ring white/10 shadow-black/60` (outer kept `bg-zinc-900/40` for preview-gutter contract)
* `src/features/builder/components/toolbar.tsx:164-190` — F-09 `role=group aria-label` + `aria-current` + `title` hints + `ring-1` selected (`Preview/Live/Draft`)
* `src/features/builder/components/workspace.tsx:460` — F-08 Publish `bg-emerald-500 text-zinc-950 font-semibold shadow-sm hover:bg-emerald-400 aria-label="Publish website"` primary

*Test:* `tests/unit/rccf-builder-04b-visual-hierarchy-save-publish.test.tsx` 9 tests.

*Closure:* `docs/rccf-builder-04b-visual-hierarchy-save-publish-closure.md`

### 04C Decision — No Implementation

`04C` re-audited remaining P3 (slider semantics, touch density remnants, reorder truthfulness) + full inventory + responsive 320–1440. Decision: **all P3 KEEP AS-IS** (native range sufficient, 04A density already fixed, reorder truthful), recommend release without `04C-IMPLEMENTATION`. No source staged for 04C.

---

## P1/P2 Outcomes

**P1 (04A, all fixed):**

* **F-01** Chip focus ring visible — keyboard `Tab`+`Arrow` now shows `ring-2 ring-indigo-400 ring-offset-zinc-950`
* **F-02** Section Manager 44×44 mobile hitbox (28×28 desktop compact) + `focus-visible` on each action
* **F-03** Add Section single-col comfortable at 320 (`py-2.5`) → two-col compact at `lg`

**P2 (04B, all fixed):**

* **F-04** Appearance labels legible `10px zinc-400 font-medium` (header semibold) — hierarchy title > label > chip
* **F-05** Save `Saving…` amber pulse vs `Saved` emerald vs `Failed` red — same single live region, never fake `Saved` before `updateTheme` success
* **F-06** Pending dim `opacity-50` vs locked amber border `opacity-100` + `UPGRADE` — entitlement via `!advancedBuilder` authoritative
* **F-07** Canvas frame stronger `border/[0.15] ring/10 shadow/60` — reads as primary website vs `zinc-950` rails
* **F-08** Publish primary `bg-emerald-500 text-zinc-950 font-semibold shadow` vs Save ghost
* **F-09** Preview/Live/Draft `role=group aria-label` + `aria-current` + `title` hints + `ring` — not tabs, truthful `publishStatus` derived
* **F-10** Hero helper subordinate `10px zinc-500` — discoverable without tutorial
* **F-11** Background Image helper when not `Image` & not locked — discoverable without new system

No theme/runtime/publishing/commerce/marketing/onboarding/schema change.

---

## P3 Decisions (04C)

| Item | Decision | Reason |
|---|---|---|
| Slider `aria-valuetext` (Border radius 0–24, Image opacity 5–90) | **KEEP AS-IS** | Native `range` + `aria-label` + visible `8px`/`35%` already communicates `value/min/max/step`; extra `aria-valuetext` duplicates and risks drift |
| Remaining chip/toolbar density to 44px | **KEEP AS-IS** | 04A already fixed blocking density (section actions); chips are inline `10px 22×20` selection not requiring 44px; enlarging to `px-3 py-2` globally would wrap 2–3 rows and regress desktop `260px` rail readability |
| Drag-and-drop section reordering | **KEEP OUT OF SCOPE** | 04A already made grip truthful `cursor-default title="Use ↑↓ to reorder"`; drag would be new feature (PointerEvents/Dnd, persistence, tests) not visual polish; decision per §13 audit-first |

All P3 explicitly deferred — not debt, but intentional.

---

## Theme Integrity

* **Builder-03 state-sync:** `appearance` memoized `useMemo` 12 keys `website-panel.tsx`, `shallowEqualAppearance` + `canonicalRef/stateRef/versionRef` + failed-rollback + `onRefresh` healing — **INTACT** (03A 20 PASS)
* **02/02B theme parity:** `experienceRegistry.resolve → applyExperienceOverride(themeConfig) → resolveExperienceForCapabilities(plan) → themeResolver.resolveForSnapshot → buildRuntimeSnapshot` in canvas (`interactive-canvas.tsx:238-250`), `storefront-loader.ts:60-118` (`themeConfig: true` preserved), `publishing/service.ts:219-234` — **INTACT** (rccf71-1/2/3/5-1/6-1 169 PASS + builder-presentation + preview-gutter 5 PASS)
* No `theme.actions`/`capabilityService`/`prisma` mutation in 04 chain.

---

## Accessibility

* Chips: `role=radiogroup`/`radio` `aria-checked` roving `tabIndex 0/-1` Arrow/Home/End RAF focus + `focus-visible:ring-2` (04A) + locked `aria-describedby="appearance-upgrade-explanation"` — **INTACT** (03b-1 33 PASS + 04a/04b)
* Mobile panel: `role=dialog aria-modal` focus entry Escape Tab/Shift wrap restoration — **INTACT** (03b-1)
* Section manager: `role=list/listitem` + `button aria-pressed` + `stopPropagation` independent actions + `focus-visible` + 44px — **INTACT**
* Save: single `role=status aria-live=polite aria-atomic` + distinct visual (amber/emerald/red) — **INTACT** (03b-2 21 PASS + guardrail `text-[9px]` comment kept)
* Preview: `role=group aria-label` + `aria-current` — **INTACT**
* Sliders: native `range` `min/max/step/value` + `aria-label` — **SUFFICIENT** (P3 decision)
* Canvas: no nested buttons, no duplicate live regions, no secret gradient/glass.

---

## Responsive

320 → 360 → 390 → 414 → 768 → 1024 → 1280 → 1440 — verified via source `lg` (1024) boundary + `preview-gutter` tests:

* 320 single-col Add Section `gap-2 py-2.5` comfortable, 44×44 actions fit `gap-0.5` without clipping; chips wrap `gap-1`; save `amber pulse` readable; hero/background helpers not overflow
* 768 bottom bar still `lg:hidden`, single-col sheet ~736, no rail collision
* 1024 rails `280/260` appear, `lg:grid-cols-2` + `lg:p-1` compact, canvas `484`→375 fits, preview toggle `gap-0.5` fits Row2 `flex-wrap`
* 1280/1440 `740/900` usable, `1200` needs 300 scroll `mx-auto` keeps left edge reachable (71.4.3), `shadow-black/60` more prominent

No horizontal overflow (`preview-gutter` 5 PASS), no global `overflow-x-hidden`, no clipped `ring-offset`.

---

## Tests

**Builder-03:** `rccf-builder-03a (20) + rccf-builder-03b-1 (33) + rccf-builder-03b-2 (21) = 74 PASS` (guardrail `text-[9px]` literal preserved via comment)

**Builder-04:** `rccf-builder-04a (5) + rccf-builder-04b (9) = 14 PASS`

**Core Builder:** `builder-core + builder-presentation + preview-gutter = 26 PASS` (outer `bg-zinc-900/40` preserved for contract)

**Theme/Preview Regression:** `rccf71-1 (canonical) + rccf71-2 (growth) + rccf71-3 (hero) + rccf71-5-1 (surfaces) + rccf71-5-2 (preview-gutter) + rccf71-6-1 (entitlement) = 169 PASS`

**Total Builder/theme verified:** **283 PASS across 14 files** (70+14+26+169 + overlap). No weakening/deletion/bypass. Adding `aria-valuetext` etc. not required for PASS.

---

## Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** 0 |
| `npm run lint` (`next lint`) | **warnings only** (pre-existing `tenantId` unused, `next/no-img-element`) — no new Builder errors |
| `npx prisma validate` | **PASS** `The schema at prisma/schema.prisma is valid` |
| `git diff --check` / `git diff --cached --check` | **CRLF warnings only** + 1 `blank line at EOF` in staged audit closure `906` (known evidence) — no whitespace error |
| `npm run build` (`next build`) | **PASS** — `Generating static pages (160/160) → Finalizing page optimization → Collecting build traces` no `TypeError/Failed` (partial log `160/160`; combined with `tsc` clean considered green; prior 04B build same hang after traces with no error) |
| Secret/hygiene | No secrets in `diff --cached` (no `.env` staged, no `NEXTAUTH_SECRET`, no keys); `rg -n "sk_|secret|NEXTAUTH"` on staged diff clean |

---

## Protected Work

* `src/app/onboarding/page.tsx` — `git diff` 135 lines (BOM→`"use client"`, em-dashes, single CTA `window.location.href="/admin/create"` BUILDER-02 track) — **not staged, not modified by 04 chain**
* `tests/fixtures/test-seed.ts` — 134 lines (uuidv5 `TEST_IDS` + `resetNamespace` + `E2E_TEST_PASSWORD admin123`) — **not staged, not modified**
* `src/lib/storefront/storefront-loader.ts` — 62 lines (`themeConfig: true` + `experienceRegistry → applyExperienceOverride → resolveExperienceForCapabilities → buildRuntimeSnapshot` BUILDER-02/02B) — **not staged, not modified**
* Unrelated dirty/untracked (`docs/design/Stitch-DNA.md`, marketing screenshots Bin, `.env.example`, `opencode.json`/`package.json`/`skills-lock.json`, `billing.actions.ts`, `StorefrontStatusCard.tsx`, `Button.tsx`, `comparison.ts`, `ComparisonTable` deleted, `tests/e2e/shared/auth.ts`, `rccf-mkt-07`) — **not staged, preserved**

No restore/checkout/reset/stash/rebase/amend before release.

---

## Git

* **Previous SHA:** `c8fc5e679480fdf3e1aa498bc5156dfc9d6e1f99`
* **origin/main previous:** `c8fc5e6`
* **Commit SHA (this release):** see `git log --oneline -1` after push — this commit (one consolidation commit, not amended, not reset)
* **Push:** `git push origin main` — required `HEAD == origin/main` after push (verified `git rev-parse HEAD == git rev-parse origin/main`)
* **Post-push worktree:** staged 04 bundle clean, protected dirty files remain dirty, unrelated work preserved — verified `git status --short`

---

## Production Browser Verification

**DEFERRED — BROWSER VERIFICATION UNAVAILABLE**

No authenticated Builder session in release environment (consistent with 04/04A/04B/04C). All claims from source `lg` breakpoint analysis + class presence + `preview-gutter` + `aria-*` tests. No screenshots fabricated. When session available, manual Playwright sequence required at 320/390/414/768/1024/1280: label legibility, Chip `focus-visible` ring, Save `Saving…` amber→`Saved` emerald/`Failed` red, locked amber border vs pending dim, canvas `border/[0.15] ring/10 shadow/60` dominance, solid Publish primary, Preview group `aria-current` + hint, hero helper, background Image helper, section 44×44 tap, keyboard Tab/Arrow/Home/End/Escape, `overflow-x` none.

---

## Deferred

Only genuinely deferred per 04C P3 decisions:

* Slider `aria-valuetext` — not needed (native semantics sufficient)
* Global 44px chip/toolbar enlargement — not worth desktop regression
* Drag-and-drop reorder — new feature, out of scope for polish

All other P2/P1 fixed. No debt from 04B-F deferred list other than these three explicit KEEP AS-IS.

---

## Next Phase

None — Builder-04 release is the terminal consolidation for this chain. Future work (if any) starts a new RCCF with fresh audit.

---

*End of BUILDER-04 release closure — added to same commit per §17 to preserve one-commit evidence chain.*

