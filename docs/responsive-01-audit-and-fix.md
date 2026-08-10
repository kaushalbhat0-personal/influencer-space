# RCCF-RESPONSIVE-01 — Application-Wide Responsive Architecture Audit & Fix

**Status:** AUDIT COMPLETE → ROOT CAUSE PROVEN → FIXED (same working tree as RCCF-AUDIT-10/10B; nothing committed/pushed).
**Result:** The `/admin/goals` desktop collapse (cards ~52px wide, sliders overflowing their cards, controls overlapping) was caused by **missing Tailwind `content` globs**: `src/features`, `src/modules`, `src/actions`, `src/config`, `src/hooks`, `src/services` and `src/types` were never scanned, so `lg:col-span-3` — used only inside `src/modules` — was silently dropped from the compiled CSS. That one defect, plus three secondary anti-patterns (no `grid-cols-1` base on `lg:grid-cols-5`, non-wrapping flex headers, non-scrolling tables), produced horizontal overflow on 8 admin routes. All 8 are now verified clean across 375→1440px.

---

## Executive verdict

| Route                    | Pre-fix (worst)            | Root cause                                     | Post-fix                     |
|--------------------------|----------------------------|------------------------------------------------|------------------------------|
| `/admin/goals` (desktop) | cards collapse to 3×52px at 1280; range sliders overflow cards | `lg:col-span-3` absent from compiled CSS | 3×183px at 1280; 3×209px at 1440+ |
| `/admin/goals` (mobile)  | docScrollWidth 466 on 375px (449px column) | `grid gap-6 lg:grid-cols-5` — no `grid-cols-1` base | clean 375/390/768 |
| `/admin/knowledge`       | same two defects (identical grid markup)   | same root causes                              | clean all viewports |
| `/admin/dashboard`       | overflow 1024 (1139) / 1280 (1310) | `KnowledgeScoreCard` header `sm:flex-row` non-wrapping inside a 304px grid column | clean all viewports |
| `/admin/services`        | docScrollWidth 673 on 375 | `CrudTable` table (`min-w-full` + `whitespace-nowrap` cells) with no `overflow-x-auto` | clean (scrolls inside card) |
| `/admin/media`           | docScrollWidth 616 on 375 | toolbar `flex items-center gap-3` (search + 2 selects + toggle + upload) never wraps | clean |
| `/admin/analytics`       | docScrollWidth 382 on 375 | `MetricCard` header `justify-between`; left text column has no `min-w-0` | clean |
| `/admin/billing`         | docScrollWidth 425 on 375 | `DashboardWidget` header row (`justify-between`) never wraps its fixed-width `actions` | clean |
| `/admin/notifications`   | docScrollWidth 488 on 375 | header toolbar inner div (`search + select + refresh`) never wraps | clean |

**All 8 routes re-verified at 375 / 390 / 768 / 1024 / 1280 / 1440 → zero horizontal overflow.**

---

## Root cause #1 — Tailwind content globs dropped `src/modules` (and friends)

`tailwind.config.ts` scanned only `./src/pages`, `./src/components`, `./src/app`, `./src/lib`. It omitted:

- `src/features/**` (99 files), `src/modules/**` (240 files), `src/actions/**`, `src/config/**`, `src/hooks/**`, `src/services/**`, `src/types/**`.

Any Tailwind utility used **only** inside those directories never made it into the CSS bundle.

**Proof (goals):** the class list on the goals page is `grid gap-6 lg:grid-cols-5` with children `lg:col-span-3` / `lg:col-span-2` (`goals-settings-page.tsx:30-34`) and `grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3` (`goal-profile-editor.tsx:128`). An audit of the compiled dev CSS found:

| Class                            | In compiled CSS? | First used only in |
|----------------------------------|------------------|--------------------|
| `.lg\:grid-cols-5`               | ✅               | `src/app`          |
| `.lg\:grid-cols-3`               | ✅               | `src/components`   |
| `.lg\:col-span-2`                | ✅               | `src/features` (scanned) |
| `.lg\:col-span-3`                | ❌ **MISSING**   | `src/modules/goals-runtime`, `src/modules/knowledge-runtime` |

**Consequence (measured pre-fix, 1280px):** outer grid renders 5 × 172.797px tracks (correct), but the editor div `lg:col-span-3` has no `grid-column: span 3`, so it occupies a single 172.8px track instead of 566px. The inner card grid `lg:grid-cols-3` therefore shrinks to 3 × ~52px columns; the range slider's ~129px min-width overflows the 52px card → the reported "sliders displaced, cards collapsed, text wrapping" corruption.

**CSS audit breadth:** 224 utilities were used only in unscanned dirs; 59 were absent from the compiled CSS (the rest of the 224 are scanned-elsewhere or regex false-positives). Real examples beyond `lg:col-span-3`: `-translate-x-1/2`, `w-1/2`, `aspect-[3/2]`, `border-0`, `p-1.5`.

### Fix (`tailwind.config.ts`)
Added the seven missing directories to `content`. `src/generated` is intentionally **excluded** (Prisma client — no UI classes). One-line, one-file, zero layout-logic change.

---

## Root cause #2 — `grid lg:grid-cols-N` without a base `grid-cols-1`

Both `goals-settings-page.tsx:30` and `knowledge-dashboard.tsx:39` wrote `grid gap-6 lg:grid-cols-5`. Below `lg` there is no `grid-template-columns`, so the grid uses an implicit `auto` column that sizes to the **max-content** of its widest item instead of clamping to the container.

**Measured (mobile 375px):** outer grid track = 449.688px while the container (`main` content) is only 343px → docScrollWidth 466. At tablet 768 it survived only because the container (720px) happened to be wider than the max-content.

### Fix
`grid gap-6 lg:grid-cols-5` → `grid grid-cols-1 gap-6 lg:grid-cols-5` (goals + knowledge). The card grid inside was already `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` and never needed changing.

---

## Root cause #3 — non-wrapping flex headers / footers in shared + feature components

Three components forced horizontal overflow by giving `justify-between` (or a single-row toolbar) fixed-width children that cannot shrink:

1. **`knowledge-score-card.tsx:40`** — header `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`. At ≥640px viewport it goes horizontal, but inside the dashboard's 304px `lg:grid-cols-3` column (1280px → main 1024px → 3 × 304px) the left block ("Profile Knowledge" + badge + subtitle) plus the right block ("47%" text-4xl + "confidence: high") can't coexist → overflow past the card (measured right edge 1310 vs main right 1280). Fix: add `sm:flex-wrap`.
2. **`metric-card.tsx:76`** — `flex items-start justify-between`; the left text column had no `min-w-0`, so long values ("₹12,34,567") pushed the icon 7px past the card. Fix: `gap-3` + `min-w-0` on the text column.
3. **`dashboard-widget.tsx:59`** — header `flex items-center justify-between` with `actions` slot; fixed-width controls (e.g. `w-40` search + `w-28` filter select in `InvoiceCenter`) overflow narrow cards. Fix: `flex flex-wrap ... gap-3`.

Toolbars in `media-library.tsx:221` and `notifications-client.tsx:34` (search + selects + buttons) similarly needed `flex-wrap`.

---

## Root cause #4 — nowrap tables without an `overflow-x-auto` container

`CrudTable` (`crud-table.tsx:96`) rendered `min-w-full` tables with `whitespace-nowrap` cells directly inside a `GlassCard` with no horizontal-scroll wrapper — correct for desktop, but at 375px the 640px-wide services table overflowed the page (docScrollWidth 673). Fix: wrap the `<Table>` in `<div className="overflow-x-auto">`. This fixes services and every other CrudTable consumer at once.

---

## Verification

**Method (Playwright + next-auth cookie login, `page.request` / `api/auth/callback/credentials`):**
probe each route at each viewport, wait for `main` + hydration settle, then assert
`document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`.

| Viewport | goals | knowledge | dashboard | services | media | analytics | billing | notifications |
|----------|-------|-----------|-----------|----------|-------|-----------|---------|---------------|
| 375      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 390      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 768      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1024     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1280     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1440     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Goal geometry post-fix: card grid at 1280 = 3 × 183px (was 3 × 52px), at 1440/1920 = 3 × 209px; outer grid 5 × 172.797px → editor div now correctly spans 3 tracks (~566px).

**Full static suite:**
- `npx tsc --noEmit` ✅
- `npm run lint` ✅ (only pre-existing warnings; none in touched files)
- `npm run build` ✅
- `npx vitest run` ✅ 2148/2148
- `npx vitest run tests/architecture/` ✅ 13/13

---

## Codebase responsive sweep — classification (audit, no further changes)

- **Fixed-width anti-patterns:** none that are genuine bugs. Remaining `w-[…]`-style sizes are intentional and safe: `PreviewShell w-[300px] lg:w-[380px]`, truncation `max-w-[…]`, touch targets `min-w-[48px] min-h-[44px]`, table `whitespace-nowrap` (now scroll-contained). Treated as documented design constraints.
- **Fixed non-responsive grids** (`grid grid-cols-3/4/5`): exist in super-admin tooling, small icon chips (`SEOScoreCard grid-cols-5`, appearance-manager `grid-cols-4`, marketing `HowItWorks grid-cols-4`). All classify as SAFE (small fixed content; visual, not layout, grids) — documented, not changed.
- **`grid gap-* lg:grid-cols-N` without a `grid-cols-1` base** (the goals anti-pattern) appears ~30 more times across marketing / super-admin / agency. Those pages do **not** currently overflow because their card max-content is narrower than the mobile container — but they carry the same latent risk. Recommended follow-up (not part of this change set): add a `grid-cols-1` base to each.

---

## Files changed

- `tailwind.config.ts` — content globs + RCCF-RESPONSIVE-01 comment (root cause #1)
- `src/modules/goals-runtime/presentation/goals-settings-page.tsx` — `grid-cols-1` base (root cause #2)
- `src/modules/knowledge-runtime/presentation/knowledge-dashboard.tsx` — `grid-cols-1` base (root cause #2)
- `src/modules/knowledge-runtime/presentation/knowledge-score-card.tsx` — `sm:flex-wrap` (root cause #3)
- `src/components/data/MetricCard.tsx` — `gap-3` + `min-w-0` (root cause #3)
- `src/components/ui/DashboardWidget.tsx` — header `flex-wrap gap-3` (root cause #3)
- `src/app/admin/media/_components/media-library.tsx` — toolbar `flex-wrap`
- `src/app/admin/notifications/_components/notifications-client.tsx` — toolbar `flex-wrap`
- `src/features/_shared/components/crud-table.tsx` — `overflow-x-auto` wrapper (root cause #4)

## Git status

Modified: the 9 files above. Temp probe specs and the probe Playwright config were removed after verification. **Nothing committed or pushed** — consistent with the standing audit rule.
