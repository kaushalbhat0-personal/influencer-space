# Design System Audit — RCCF-LAUNCH-TRACK-01

## Canonical primitives (exist)

`src/components/ui/`: `Button` (4 variants/3 sizes), `Card`, `Badge` (7
variants), `Input`, `Textarea`, `Table`, `LoadingSpinner`, `EmptyState`,
`Progress`, `GlassCard`, `DashboardWidget` (+`DashboardWidgetEmpty`), `TiltCard`,
`SocialIcon`, `MotionSafe`, `ErrorBoundary`. `PageHeader` in
`src/components/layout/`. Design tokens live in `src/app/globals.css:9-51`
(surfaces, text, border, brand, radius, elevation, focus ring).

## Issues found

| # | Severity | Issue | Fix |
| --- | --- | --- | --- |
| DS-1 | HIGH | **Three competing button systems**: `ui/Button` (solid indigo), `.btn-primary` (indigo→violet gradient), ~90 inline `bg-indigo-500` clones with varying radius/size | Consolidate on one primary variant; marketing keeps the gradient as the single marketing primary |
| DS-2 | HIGH | `ui/Table.tsx` used the **light gray palette** (`bg-gray-50`, `bg-white`, `text-gray-700`) on the dark admin — the biggest visible mismatch | **FIXED** — aligned to the dark token palette (`divide-white/10`, `bg-white/[0.02]`, `text-zinc-300`) |
| DS-3 | MEDIUM | No canonical **Skeleton**, **Toast**, **Dialog**, **Tabs**, **StatCard** — 4 toast + 8 modal + 3 tab ad-hoc implementations | Create primitives (roadmap); adopt `EmptyState`/`LoadingSpinner`/`Progress` where present |
| DS-4 | MEDIUM | `Button.tsx`/`.btn-primary` hardcode `indigo-*` instead of `var(--brand-primary)` | Use brand tokens |
| DS-5 | MEDIUM | `rounded-md` (Button) vs `rounded-lg` (btn-primary/inputs) vs `rounded-xl` (cards) vs `rounded-2xl/3xl` (marketing) — `--radius-*` tokens unused | Adopt tokens in new code |
| DS-6 | LOW | Misleading color aliases: `s8ul.cyan → #6366F1` (indigo), `s8ul.pink → #F59E0B` (amber) | Rename tokens (roadmap) |
| DS-7 | LOW | Body font is Google Inter while `next/font` Geist vars are loaded | Pick one font system |
| DS-8 | LOW | 100+ `text-zinc-400/500` + `border-white/10` + `bg-zinc-900/50` inline card clones instead of `Card`/tokens | Adopt `Card` in admin/super-admin |

## Applied this sprint

- `Table` aligned to the dark token palette (DS-2) — the shared table now matches
  the zinc/indigo admin everywhere it's used.
- Builder dynamic-load fallback (no blank screen) — see `docs/builder-polish.md`.

## Roadmap (consistency, no redesign)

1. Unify the button system → one `Button` with a marketing/gradient variant.
2. Add `Skeleton`, `Toast`, `Dialog`, `Tabs`, `StatCard` primitives; migrate the
   ad-hoc implementations.
3. Standardize the ~15 bare-text empty states on `EmptyState` (CTA + guidance).
4. Move brand colors + radius onto the token system.
