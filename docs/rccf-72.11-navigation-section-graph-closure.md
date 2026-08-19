# RCCF-72.11 — Navigation / Section Graph Reconciliation (Closure)

**Status:** Complete (implementation + tests + browser QA — **no commit**)
**Date:** 2026-08-20
**Closes:** **S2** (one-shot stale auto-nav) and **S3** (unconditional dead Contact anchor)
**Predecessor audit:** `docs/rccf-72.11-navigation-section-graph-audit.md` (verdict B, product decisions locked)

---

## 1. Root cause

Creator navigation was generated independently from the canonical section graph and never
reconciled with it:

- `NavigationService.generateDefaults` keyed nav anchors off **content counts** (product/gallery/
  timeline/… row counts) and appended an **unconditional `#contact`** whenever a website existed.
- `getOrGenerate` returned the persisted `Setting["navigation"]` **forever** once non-empty —
  content additions never surfaced (S2).
- The storefront renders each section with `id = moduleId.split(".")[0]`
  (`StorefrontPage.tsx:202`), and hides empty/auto sections at render
  (`resolveRenderableSections`) — so a nav anchor whose base section is not actually rendered is
  a **dead anchor** (S3).

The graph that actually renders (Builder layout → snapshot → `LayoutEngine.resolve` →
`resolveRenderableSections`) was never consulted by navigation.

## 2. Product decision (locked)

- **Reconciliation Option A**: on publish, auto-reconcile navigation from the current renderable
  section graph.
- **Manual navigation is an intentional override** — never silently deleted.
- Auto-generated section anchors may be **added** when a new eligible section appears and
  **removed** when the generated section disappears.
- User-authored items (page / external / manual anchors / legacy-unclassified) are preserved.
- **No plan-code checks** in navigation; **no visual redesign**.

## 3. Architecture

Navigation now derives from the **same canonical graph** as the published storefront:

```
Builder persisted layout (builderPages)
        ↓ builderPagesToLayoutSnapshot (existing canonical flatten)
   resolved document (layoutEngine.resolve — existing canonical composition)
        ↓ resolveRenderableSections (existing render filter)
   renderableNavBases (dedupe → nav-generatable section bases)
        ↓
   reconcileNavigation(existing Setting, graphBases)
        ↓
   snapshot.navigation  ==  Setting["navigation"]  ==  live DOM nav
```

The publish pipeline builds the snapshot (with the current persisted nav), resolves the document
via the **existing** `layoutEngine.resolve`, derives `graphBases` from the renderable homepage
sections, reconciles the persisted setting against it, and bakes the reconciled nav into the
snapshot. **No LayoutEngine logic is duplicated** — publish reuses `buildRuntimeSnapshot` +
`layoutEngine.resolve` + `resolveRenderableSections` (the same chain the storefront uses), so
layout and navigation can never diverge.

## 4. Manual / generated distinction

`NavigationItem` gained one optional field: `generatedFromSection?: string` (schema-free — it
lives in the `Setting` JSON blob and the in-memory type, **no Prisma migration**).

- **Generated** section anchors carry `generatedFromSection` (or, for **legacy** items, match the
  exact deterministic generated signature: `type==="anchor"` AND `href==="#id"` AND label equals
  the known generated label). Only these may be removed when their base leaves the graph.
- **Manual** items (page / external / any anchor that does not match the generated signature —
  including renamed/custom anchors) are **always preserved**.

Legacy items that cannot be confidently classified as generated are **preserved** (never
heuristically deleted).

## 5. Reconciliation algorithm

`reconcileNavigation(existing, graphBases)`:

1. Preserve items in their **original relative order** (user reordering is never clobbered).
2. **Remove** generated anchors whose base is no longer in the graph (stale/dead).
3. **Append** generated anchors for graph bases not yet represented (and not already supplied by a
   user-authored anchor of the same base), in **graph order** (never alphabetical).
4. Reassign `order` sequentially (preserves RCCF-AUDIT-10B parity:
   persisted == snapshot == live DOM).

`generateDefaultNavigation(graphBases)` builds the initial/reset nav from the graph only —
Home/hero first, then graph order; **no Contact** unless `contact` renders; **no content-count
derivation**.

## 6. S2 closure

Navigation is regenerated from the current graph at each publish (`reconcileForPublish`).
Verified: Growth tenant had a rendering Games section absent from its stale `[Home, Contact]`
nav; after publish the reconciled nav became `[Home, Games]` — the new section surfaced (S2
closed) and is re-derived on every publish (no more one-shot staleness).

## 7. S3 closure

`generateDefaults`/`reconcileNavigation` no longer emit Contact unconditionally. Contact is only
a generated anchor when a `contact` section actually renders. Verified: Growth layout has no
contact section; the stale legacy `#contact` was removed on publish — the live storefront nav
shows **Home + Games**, no dead Contact.

## 8. Tenant isolation

- Admin nav load/persist uses the session tenant (`getServerSession` → `tenantId`).
- `Setting["navigation"]` is keyed `tenantId_key` (tenant-scoped).
- The storefront nav is read from the tenant's **own** published snapshot.
- Reconciliation uses only the current tenant's `builderPages`, `aggregate`, and `Setting`.
- Verified via tests: two tenants hold independent navigation (test 16).

## 9. Plan behavior

**No plan-code checks** added. Navigation keys off the resolved/renderable graph, which is itself
plan-constrained at construct time:

- Launch cannot construct courses (limit 0) → no courses section → no `#courses` anchor.
- Growth/Scale construct and render normally → anchors appear only for actually-rendered sections.

The nav layer contains no `partner_*` / `creator_launch` / `creator_grow` / `creator_scale`
comparisons.

## 10. Mobile behavior

Unchanged. `StorefrontNav` desktop/mobile layout, the mobile 5-item cap (`slice(0,5)`), touch
targets, and zero horizontal document overflow are preserved. Verified at 390 / 320 / 1440:
`scrollWidth === clientWidth` (no overflow), mobile bottom bar shows the items under the cap,
desktop nav renders the reconciled items. No visual redesign.

## 11. Exact files changed

In scope (RCCF-72.11):
- `src/lib/navigation/reconcile.ts` — **new**; pure reconciliation module:
  `NAV_GENERATABLE_BASES`, `GENERATED_ANCHOR_SIGNATURES`, `isGeneratedSectionAnchor`,
  `renderableNavBases`, `generateDefaultNavigation`, `reconcileNavigation`.
- `src/lib/navigation/service.ts` — `generateDefaults` now resolves the graph via
  `buildRuntimeSnapshot`+`layoutEngine.resolve`; added `reconcileForPublish(tenantId,
  graphBases, existing?)`; removed the old content-count/unconditional-Contact generation.
- `src/lib/publishing/service.ts` — publish now builds the snapshot with the current nav, resolves
  the document, derives `graphBases`, reconciles via `reconcileForPublish`, and bakes the
  reconciled nav into `snapshot.navigation`.
- `src/types/snapshot.ts` — `NavigationItem.generatedFromSection?: string`.
- `tests/unit/rccf72-11-navigation-reconcile.test.ts` — **new** (27 tests).

**Pre-existing mixed files (NOT authored by this ticket; already modified in the working tree):**
`src/lib/storefront/build-snapshot.ts` and the theme-related hunks in `src/lib/publishing/service.ts`
(RCCF-71.1/71.2 themeConfig/experience work). My nav wiring is layered on top; for a future commit
only the RCCF-72.11 hunks should be staged.

Not touched: `section-manager.tsx`, `ComponentRegistry`, renderers, Theme Experience, billing,
Partner plans, commission, preview security, settings identity, publish quota, Prisma schema.

## 12. Tests

`tests/unit/rccf72-11-navigation-reconcile.test.ts` — **27 tests / 27 pass**, covering the required
cases: initial nav with/without Contact (1-2); content-exists-but-section-absent → no anchor (3);
section added/removed/hidden → anchor add/remove (4-6); manual external/page/custom-anchor/renamed
preserved (7-10); generated order follows graph order (11); persisted==snapshot nav (12); Launch
cannot expose unavailable sections (14); Growth/Scale unaffected (15); tenant isolation (16);
legacy unclassified preserved (17); no duplicate generated anchors (18); repeated publish
idempotent (19); editor save/get functional (20). Plus `renderableNavBases` graph-derivation and
`isGeneratedSectionAnchor` classification coverage.

**Verification gate:**
- `npx tsc --noEmit` — clean.
- Focused 72.11 + publish/layout/section-pipeline/experience-intelligence/storefront-loader —
  **85/85 pass**.
- Full suite — **3703 passed / 7 failed**; all 7 failures are **pre-existing `rccf71-*` theme
  guardrail** content-snapshot assertions on files not touched by this ticket (Theme surface is
  frozen / out of scope). No new regressions from this change.
- `npm run build` — clean.
- eslint on touched files — 0 errors (1 pre-existing `runWorkflow` unused-var warning in
  publishing/service.ts, not introduced here).
- `git diff --check` — clean.

## 13. Browser QA

Real accounts, dev server `localhost:3000`.

- **Growth** (`rccf7151-growth@example.com`): pre-publish stale nav `[Home, Contact]` with a
  rendering Games section → **published v9** → nav editor + live storefront show **`[Home, Games]`**
  (dead Contact removed = S3; Games surfaced = S2). Verified `#games` target exists in the DOM and
  `#contact` does not (the removed Contact was correctly dead).
- **Manual override**: added a manual external item "QA External" → **published v10** → the manual
  item survived reconciliation and rendered as a real `<a href>` in the storefront nav (`[Home,
  Games, QA External]`) — INV-04 confirmed. Then removed the QA item (nav restored to `[Home,
  Games]`).
- **Scale** (`rccf7164-scale-...@example.com`) and **Launch** storefronts render cleanly (0 console
  errors); their published snapshots still carry the pre-fix nav and will reconcile on their next
  publish (no publish performed to avoid consuming their quota).
- **Responsive**: 390 / 320 / 1440 — no horizontal document overflow; mobile bottom bar items under
  the 5-item cap; desktop nav renders the reconciled items.
- **Tenant isolation**: Growth's nav differs from Scale/Launch (each reads its own Setting +
  snapshot); no cross-tenant data observed.

Evidence screenshot (untracked): `rccf7211-growth-reconciled-nav.png`.

**QA side effect — Growth publish quota:** Growth was at 8/10 monthly before this QA; the two
required reconciliation publishes consumed it to **10/10 (exhausted, resets 2026-08-31)**. Per the
test-user policy, an exhausted publish test user should be **deleted and recreated** as a fresh
test user; this is flagged as a follow-up (see §14) rather than executed mid-ticket.

## 14. Known deferred findings

- **Growth test user publish-exhausted** (10/10). Per policy, delete and recreate a fresh test
  user for future publish-based QA. Also, because Growth can no longer republish, its live
  storefront (v10) still shows the QA External item that was removed from the Setting afterwards —
  a normal "unpublished changes pending" state, not corruption.
- **Preview path** (`storefront-loader.ts`) still uses `getOrGenerate` (returns the persisted
  setting). It benefits from the last-published reconciled nav but is not independently reconciled
  per draft. Draft-preview nav parity is a possible follow-up; out of scope here.
- **Legacy tenants** with unclassified nav anchors (e.g. Scale/Launch published snapshots) keep
  their stale anchors until their next publish, at which point reconciliation applies. This honors
  "never silently destroy creator-authored navigation".
- **S5** (nav anchors are JS-only, `href=undefined`) and **S7** (legacy `themeConfig.navigation`
  dead config) remain open (separate concerns, not part of S2/S3 reconciliation).
- **S4** (footer legal links root-relative) — separate, unrelated to navigation reconciliation.

## 15. Final verdict

**CLOSED (S2 + S3).**

- INV-01/02/03/07/08 — navigation exposes only intentionally reachable rendered sections; no
  generated dead anchors; no stale generated nav after publish; Contact only when it renders;
  content count alone cannot create nav. **Verified** (Growth publish: Contact removed, Games
  added; `#contact` absent when no contact section).
- INV-04 — manual navigation never silently deleted. **Verified** (manual external survived two
  publishes).
- INV-05/06 — generated anchors follow graph order; persisted == snapshot == live DOM. **Verified**
  by algorithm + tests + live DOM.
- INV-09 — repeated publish idempotent. **Verified** by test 19.
- INV-10/11/12/13/14/15 — no plan-code checks; tenant isolation; mobile unchanged; no visual
  redesign; no renderer/registry duplication; no unrelated working-tree changes absorbed.

**No commit made** (per instructions). Awaiting approval before committing. The in-scope files for a
surgical commit are: `src/lib/navigation/reconcile.ts`, `src/lib/navigation/service.ts`,
`src/lib/publishing/service.ts` (RCCF-72.11 hunks only), `src/types/snapshot.ts`,
`tests/unit/rccf72-11-navigation-reconcile.test.ts`, and this closure doc. The pre-existing
theme hunks in `publishing/service.ts` and `build-snapshot.ts` are unrelated and must not be staged.
