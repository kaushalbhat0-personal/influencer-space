# Implementation Report — RCCF-IMPLEMENTATION-74

**Canonical Builder Sidebar Counts**

## What was delivered

| Phase | Deliverable | Where |
| --- | --- | --- |
| 1 | `SectionCountResolver` (consumes Website Aggregate only, never slots) | `src/lib/builder/section-counts.ts` |
| 2 | Canonical collection mapping (products/gallery/timeline/testimonials/faq/services/courses/games/contentFeed/links; milestones → timeline) | `section-counts.ts` |
| 3 | Static sections (`hero/about/navigation/nav/footer/contact`) show no count | `STATIC_SECTION_BASES` |
| 4 | Sidebar consumes the resolver; `slotCount` removed; sidebar is presentation-only | `section-manager.tsx` |
| 5 | Live updates: aggregate shared from canvas → workspace → sidebar (`onLiveContentChange`), refetches on focus; no manual refresh | `interactive-canvas.tsx`, `workspace.tsx`, `sidebar.tsx` |
| 6 | Preview + sidebar read the SAME aggregate payload → never diverge | — |
| 7 | Runtimes, publishing, aggregate, store untouched | — |
| 8 | 0 extra queries (reuses the canvas's `getLivePreviewData` payload) | — |
| 9 | Count badge only when count > 0 (no `(0)`) | `section-manager.tsx` |
| Extra | Status badges: no badge for permanent sections; count badge (repeatable, >0); draft dot for sections with presentation overrides | `section-manager.tsx` |
| 10 | Docs | `docs/builder-sidebar-counts.md` + this report |

## Files changed

- `src/lib/builder/section-counts.ts` — new `SectionCountResolver`.
- `src/features/builder/components/section-manager.tsx` — `itemCount`/`hasDraft`
  from resolver; badge rendered only when `count > 0`; draft dot; `slotCount` removed.
- `src/features/builder/components/sidebar.tsx` — passes `aggregate` through.
- `src/features/builder/components/workspace.tsx` — holds the shared aggregate
  (`liveContent`) and passes it to the sidebar.
- `src/features/builder/canvas/interactive-canvas.tsx` — `onLiveContentChange`
  callback shares the fetched aggregate (no extra fetch).
- Tests: `src/lib/builder/__tests__/section-counts.test.ts` (7 tests).

## Design notes

- **Counts come from the aggregate, not from count queries.** The canvas already
  builds the aggregate for the preview; the sidebar consumes the identical
  payload. This is exactly the "0 extra queries" target from the audit.
- **Draft dot interpretation:** the dot indicates a section whose draft carries
  presentation overrides (`config.presentation`) — the available per-section
  "unpublished change" signal without adding publish-diff infrastructure.
  Documented as a customization indicator.
- **Missing collections** (`bookings`, `downloads`, `resources`, `community`,
  `newsletter`) are not in the aggregate and correctly show **no** badge.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues (pre-existing warnings only).
- `npm run build` — succeeds.
- `npx vitest run` — **2094/2094** pass (7 new resolver tests).

## Regression safety

- Only the Builder sidebar data flow changed; the Website Aggregate, Layout
  Engine, store, and all runtimes are untouched.
- Counts degrade gracefully: no aggregate yet → no badge; empty collection →
  no badge; module failure → `[]` → no badge.
