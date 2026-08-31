# RCCF-71.1 — Canonical Theme Foundation (Phase 1) — Closure

## 1. Executive Verdict

**Grade: A** — Staged (no commit).

The persisted `Website.themeConfig` appearance values (`borderRadius`, `layoutDensity`) and the resolved heading/body fonts now flow through the **single canonical pipeline**: UI → server persistence → `buildRuntimeSnapshot` → `ThemeSnapshot` → `LayoutEngine` → CSS variables → registry renderers → published storefront. Builder preview, the `?preview=true` route and the published snapshot resolve identical values through the same resolver authority. No Prisma schema/migration, no capability/plan/billing change, no second theme authority, and no Builder-only CSS was introduced. Fully backward compatible with old snapshots (the new fields are optional; LayoutEngine defaults produce the exact current look).

## 2. Context

The theme audit (`docs/rccf-theme-hero-capability-audit.md`) found that `updateTheme` writes `borderRadius` and `layoutDensity` into `Website.themeConfig`, but the canonical runtime never read `themeConfig`:

- `buildRuntimeSnapshot` only accepted `themePackageId`/`themeColors`/`themeFonts` — `themeConfig` was dropped on the floor.
- `ThemeSnapshot` had no `borderRadius`/`layoutDensity` fields.
- `LayoutEngine` emitted `--brand-font-heading`/`--brand-font-body` but **nothing consumed them** — `globals.css` body hardcoded Inter and the renderers used no font-family classes.
- Renderers hardcoded Tailwind `rounded-lg`/`rounded-xl`/`rounded-md` and `py-12`, so radius/density had no published effect.
- `PreviewShell` emitted legacy `--accent/--primary/--secondary` (non-canonical names).
- The Builder canvas preview path (`getLivePreviewData` → `interactive-canvas`) also selected only `themePackageId`/`themeColors`/`themeFonts`, so Builder preview could not show radius/density at all.

Verdict was **READY FOR IMPLEMENTATION**. This ticket implements Phase 1 of the recommended order.

## 3. Architecture Invariant & Option Selection

**Invariant:** Theme/presentation authority must stay singular — the resolver (`ThemeResolver`) owns "what theme should this website receive", the snapshot is the transport, and `LayoutEngine` is the projection. Any value that affects published rendering must travel UI → persistence → snapshot → engine → renderer; **never** a Builder-only CSS value.

**Chosen option:** Thread `themeConfig` through the resolver's existing overrides path so `borderRadius`/`layoutDensity` resolve identically in `buildRuntimeSnapshot` (server) and `InteractiveCanvas` (client). Add the two fields to `ThemeSnapshot` as **optional** (additive — old snapshots remain valid). `LayoutEngine.buildAppearanceVars` derives the radius scale from the base px and section spacing from the density preset, always with safe fallbacks.

**Rejected alternatives:**
- *Standalone appearance store / second theme module* — would create a second theme authority (violates the invariant and the ticket's "no second theme model").
- *Builder-only inline styles for radius/density* — would make the value work in the canvas but not in the preview route or published storefront (explicitly forbidden).
- *Prisma schema change / new persisted columns* — unnecessary; `themeConfig` JSON already exists and is the documented persistence point (frozen surface).
- *Full Appearance page redesign* — out of scope; `PreviewShell` was only aligned to canonical variable names (minimal, additive).

## 4. Implementation Changes

| File | Change |
| --- | --- |
| `src/types/snapshot.ts` | `ThemeSnapshot` gains optional `borderRadius?: string` and `layoutDensity?: "compact" \| "comfortable" \| "spacious"`. |
| `src/lib/theme/resolver-new.ts` | `ResolvedSnapshotTheme` gains optional `borderRadius`/`layoutDensity`, threaded through `applyOverrides` — the single authority for both theme-package and per-website appearance values. |
| `src/lib/storefront/build-snapshot.ts` | `RuntimeSnapshotInput` gains optional `themeConfig?: Record<string,string>`; `hasOverrides` includes it; overrides pass `borderRadius`/`layoutDensity`; snapshot.theme emits them when present. |
| `src/lib/storefront/layout-engine/LayoutEngine.ts` | New `buildAppearanceVars` emits `--radius-sm/md/lg/xl/2xl/3xl/full` (derived from base px, clamped 0–24, default 8 → current look) and `--section-spacing` (compact 2rem / comfortable 3rem / spacious 5rem). Fix: radius 0 is honored (previous `|| 8` coerced "0" to 8). |
| `src/lib/publishing/service.ts` | `websiteFull` select + `buildRuntimeSnapshot` call now include `themeConfig`. |
| `src/lib/storefront/storefront-loader.ts` | Preview path selects + passes `themeConfig`. |
| `src/actions/construction.actions.ts` | Construction preview selects + passes `themeConfig`. |
| `src/lib/observability/runtime-parity.ts` | Parity draft snapshot selects + passes `themeConfig`. |
| `src/actions/builder-preview.actions.ts` | `getLivePreviewData` returns `themeConfig` (select added) so the canvas resolves identical appearance. |
| `src/features/builder/canvas/interactive-canvas.tsx` | Reads `themeConfig`, passes `borderRadius`/`layoutDensity` through the SAME resolver overrides, emits them into the client `ThemeSnapshot`, adds `theme-root` class to the device frame. |
| `src/lib/registry/components/renderers.tsx` | Radius classes → `var(--radius-* ,<fallback>)`; section wrappers `py-12` → `var(--section-spacing,3rem)`. No Builder-only logic. |
| `src/app/globals.css` | `.theme-root` consumes `--brand-font-body` (root) + `--brand-font-heading` (headings) with Inter fallback; body default unchanged for admin. |
| `src/components/storefront/StorefrontPage.tsx` | `<main>` gains `theme-root`. |
| `src/components/admin/PreviewShell.tsx` | Emits canonical `--brand-primary/secondary/accent`, `--radius-*`, `--section-spacing`, `--brand-font-*`; legacy `--accent/--primary/--secondary` removed. |
| `tests/unit/rccf71-1-canonical-theme-foundation.test.ts` | **New** — 25 guardrail/behavior tests (below). |

## 5. Behavior Preservation

- **Old snapshots** without `borderRadius`/`layoutDensity` render exactly as before: LayoutEngine defaults → 8px scale (`--radius-lg: 8px` = current `rounded-lg`) and comfortable spacing (`--section-spacing: 3rem` = current `py-12`).
- **Admin surfaces** (no `.theme-root`) keep `Inter` body — the `.theme-root` font rules are scoped to the storefront `<main>` and the Builder device frame only.
- **Theme package/capability fallback** intact: unknown theme IDs still fall back to `com.creatos.neon-dark`; `premium_themes` entitlement gate in `updateTheme` unchanged; no plan/tier/quota logic added.
- **Publishing business logic** untouched (only the theme data threaded into the existing snapshot).
- **Preview never persists**: `performSave(currentThemeId, currentThemeId)` contract preserved; previewed themes remain non-persisted (guardrail-tested).
- Snapshot schema stays `CURRENT_SNAPSHOT_VERSION = 1` (additive fields only).

## 6. Regression Coverage

`tests/unit/rccf71-1-canonical-theme-foundation.test.ts` — 25 tests, source-level guardrail style:

- **borderRadius**: persists into `snapshot.theme.borderRadius`; LayoutEngine emits full scale from base px; radius 0 → flat scale (regression guard against the `|| 8` coercion).
- **layoutDensity**: each preset → expected `--section-spacing`; renderers consume `var(--section-spacing,3rem)` and contain no hardcoded `px-4 py-12`.
- **Old snapshots**: fields absent → defaults render safely; renderers keep `var(--radius-*,<fallback>)`.
- **Typography**: `--brand-font-heading/body` emitted; `.theme-root` consumes them; both storefront `<main>` and canvas frame carry `theme-root`.
- **Builder/published parity**: `build-snapshot` is the single server assembly threading `themeConfig`; canvas resolves through the SAME resolver overrides; `getLivePreviewData` returns `themeConfig`; all four server callers pass it.
- **Preview not persisted**: `workspace.tsx` always `performSave(currentThemeId, currentThemeId)`, never `performSave(previewThemeId`.
- **No second authority / no Builder-only CSS**: renderers contain no `rounded-lg`/`rounded-xl`/`rounded-md`; `PreviewShell` uses `--brand-*` (no legacy `--accent`); resolver owns appearance overrides; snapshot fields optional.
- **Capability boundaries**: `updateTheme` still gates on `premium_themes` (no `capabilityService` divergence); build-snapshot/LayoutEngine contain no plan/tier/quota logic; schema version stays 1.

## 7. Verification Results

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ Pass |
| Focused `npx vitest run tests/unit/rccf71-1-canonical-theme-foundation.test.ts` | ✅ 25/25 |
| Adjacent suites (`theme-actions`, `builder-presentation`, `layout-engine/theme-tokens`) | ✅ 17/17 |
| Full `npx vitest run` | ✅ 3342 passed / 1 failed — failure is pre-existing flaky `rccf68-retry-catalog-timeout.test.ts` (5s timeout under full-suite load; **passes in isolation**, unrelated to theme) |
| `npm run build` | ✅ Pass |
| `npx prisma validate` | ✅ Schema valid |
| `npx prisma generate` | ✅ Generated |
| `npx eslint` on all touched files | ✅ 0 errors (5 pre-existing warnings: unused vars in `interactive-canvas`, `runtime-parity`, `publishing/service`, `renderers`) |
| `git diff --check` | ✅ Clean (only a pre-existing CRLF→LF notice on `runtime-parity.ts`) |

## 8. Diff Discipline

**In-scope (modified by this ticket):** `src/types/snapshot.ts`, `src/lib/theme/resolver-new.ts`, `src/lib/storefront/build-snapshot.ts`, `src/lib/storefront/layout-engine/LayoutEngine.ts`, `src/lib/publishing/service.ts`, `src/lib/storefront/storefront-loader.ts`, `src/actions/construction.actions.ts`, `src/lib/observability/runtime-parity.ts`, `src/actions/builder-preview.actions.ts`, `src/features/builder/canvas/interactive-canvas.tsx`, `src/lib/registry/components/renderers.tsx`, `src/app/globals.css`, `src/components/storefront/StorefrontPage.tsx`, `src/components/admin/PreviewShell.tsx`, `tests/unit/rccf71-1-canonical-theme-foundation.test.ts` (new).

**Note on pre-existing working-tree changes:** `interactive-canvas.tsx`, `renderers.tsx`, `runtime-parity.ts`, `publishing/service.ts`, `globals.css`, `StorefrontPage.tsx`, `PreviewShell.tsx`, `builder-preview.actions.ts`, `construction.actions.ts`, `storefront-loader.ts` all had unrelated working-tree modifications from before this ticket; this ticket's edits layer on top of them (verified via `git diff` hunks). Untouched pre-existing modifications (e.g. `workspace.tsx`, `theme-card.tsx`, `section-manager.tsx`, `settings-*`, `products-*`, `website-aggregate.service.ts`, `dashboard-page.tsx`, `Stitch-DNA.md`, `package.json`, `lifecycle.test.ts`) remain as-is.

**Frozen surfaces (explicitly NOT touched):** Prisma schema/migrations, billing/Razorpay/plan definitions, `capabilityService`/capability authority, publishing business logic, auth/tenant resolution, Hero ownership, Builder content authority, `src/features/settings/components/settings-live-preview.tsx`, and the Appearance page redesign.

## 9. Risks & Edge Cases

- **Radius 0** now yields a flat (0px) scale — intended, previously coerced to 8. Tested.
- **Radius clamp** 0–24 mirrors the Appearance slider bounds; out-of-range persisted values are clamped at projection time (LayoutEngine) so the snapshot value is authoritative but the CSS output is safe.
- **Font consumption**: fonts apply via `.theme-root` on storefront `<main>` and canvas frame. Admin preview (`settings-live-preview`) renders `HeroRenderer` without the theme-root class → keeps Inter; documented as out of scope (its content preview does not carry theme vars).
- **Full-suite flake** `rccf68-retry-catalog-timeout.test.ts` (timeout-only under parallel load) is unrelated and passes in isolation; flagged, not modified.
- `git diff --check` CRLF notice on `runtime-parity.ts` is a pre-existing line-ending artifact, not a whitespace error.

## 10. Recommendation

**Proceed** to Phase 2 when authorized. Phase 1 closes the canonical theme data flow with a single authority and full backward compatibility; no migration or feature flag is required.

---

**RCCF-71.1 complete. Verdict: A — READY FOR NEXT PHASE (staged, not committed).**