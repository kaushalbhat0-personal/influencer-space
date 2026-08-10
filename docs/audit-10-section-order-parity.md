# RCCF-AUDIT-10 — Builder ↔ Live Section Ordering Mismatch (Section Order Parity)

**Status:** LAUNCH VALIDATION / AUDIT → BUG FOUND → FIXED.
**Result:** BUG FOUND. Root cause: **render-time goal section reordering in the storefront** (`applyGoalSectionOrder` in `StorefrontPage.tsx`). The published snapshot order was correct — the live storefront silently re-ordered sections by the creator's weighted goal profile on every request. The Builder canvas shows the persisted order; the storefront did not. Classification **B** (snapshot/storefront loader bug).

---

## Executive Verdict

| Layer                     | Section order (test-creator-1)                                           | Matches previous? |
|---------------------------|--------------------------------------------------------------------------|-------------------|
| Builder UI                | hero → products → gallery → services → courses → testimonials → faq → timeline → games → links → footer | — |
| Draft DB                  | hero → products → gallery → services → courses → testimonials → faq → timeline → games → links → footer | ✅ |
| Published snapshot        | hero → products → gallery → services → courses → testimonials → faq → timeline → games → links → footer | ✅ |
| Storefront loader         | same (only `content` replaced live; `layout` untouched)                  | ✅ |
| Page resolver             | target page chosen; sections returned as stored                          | ✅ |
| LayoutEngine              | same — `buildPages` maps/filters, never sorts                            | ✅ |
| StorefrontPage composition | **hero → products → links → testimonials → gallery → timeline → services → courses → faq → games → footer** | ❌ **DIVERGES** |
| Final DOM                 | hero → products → **links → testimonials → gallery → timeline → services → courses → faq → games** → footer | ❌ **DIVERGES** |

**First divergence:** position **3** — Builder/snapshot has `gallery`, live DOM shows `links`
(the "Connect With Me" social-links block, which visually resembles footer content) pulled up
directly beside Products.

**Classification:** **B — Snapshot/storefront loader bug.** The published snapshot is correct;
the storefront page-composition layer re-orders the sections after loading them.

---

## Reproduction

Affected tenant: **`test-creator-1`** — the only existing tenant with a saved goal profile
(`creator_goals` Setting, weights: MONETIZE_CONTENT 39, GROW_YOUTUBE 22, SHOW_PORTFOLIO 22,
BUILD_EMAIL_LIST 17). This matches the screenshots: the Builder shows the expected ordering
with the footer at the bottom, while the live storefront shows footer-like content
(`links` / "Connect With Me") appearing right after Products.

### Builder order (persisted draft, `page` → `section` → `block` order)

```
1.  hero.default
2.  products.grid
3.  gallery.grid
4.  services.default
5.  courses.default
6.  testimonials.default
7.  faq.default
8.  timeline.default
9.  games.default
10. links.default
11. footer.default
```

### Live storefront order (pre-fix, captured from the rendered DOM)

```
1.  hero.default
2.  products.grid
3.  links.default        ← footer-like content beside Products
4.  testimonials.default
5.  gallery.grid
6.  timeline.default
7.  services.default
8.  courses.default
9.  faq.default
10. games.default
11. footer.default
```

---

## Audit trail (per audit sections 4–18)

### Draft DB order — preserved (sections 4, 12, 13)

`BuilderService.load()` reads `page` (order asc) → `section` (order asc) → `block` (order asc).
The Builder store renders these in the same order. The draft persisted exactly matches the
Builder UI order. Not stale: publish snapshot version **28** (latest, 2026-08-10) matches the
current draft.

### Publish pipeline — preserved (section 5)

`buildRuntimeSnapshot` → `builderPagesToLayoutSnapshot` flattens each section's blocks in
order (`s.order * 100 + i`), and `publishSnapshot.snapshot.layout.pages[]` keeps that order.
Verified against the actual v28 snapshot: identical to the Builder order.

### Storefront loader — preserved (section 6)

`getStorefrontData` (published path) → `mergeLiveContentWithDiagnostics` replaces **only**
`snapshot.content` (the aggregate). `snapshot.layout` is untouched — no `sort`/`filter`/
`flatMap` on sections. Preview builds the same layout from `builderPages`.

### LayoutEngine — preserved (section 7)

`LayoutEngine.buildPages` maps each section through `composeSectionConfig` and filters
deprecated modules. It never sorts by `order`, registry, id, or renderer type. Section order
is passed through as-is.

### StorefrontPage — DIVERGES (sections 7, 10, 17)

`resolvePageBySlug(doc.pages, pageSlug)` selects **one** page (no flattening of all pages +
CMS sections + permanent sections — the 09B page architecture is sound). The divergence is
introduced immediately after, by:

```ts
const [orderedTarget] = applyGoalSectionOrder([target], goalProfile);
```

`applyGoalSectionOrder` re-orders the page's sections by the weighted goal profile
(`goalSectionScore`): each section is scored against each goal's `sectionOrderHint` and
sorted ascending. For test-creator-1 this pulled `links` (score 444) above `gallery` (473),
`timeline` (495), `services/courses/faq/games` (561), and `testimonials` (456).

- **Hero/footer handling (section 9):** the goal re-orderer special-cases hero (first) and
  footer (last) by re-assembling `[...hero, ...orderedMiddle, ...footer]`. Footer was **not**
  duplicated and is a normal persisted section — but the goal layer still moved every other
  section around it, and the *Links* block visually mimics footer content beside Products.
- **No CSS displacement (section 8):** `ExperienceSection` is a plain `<section>` wrapper
  (relative, overflow-hidden). No absolute/fixed positioning, negative margins, or portals
  move content. The DOM itself was re-ordered — this is **Case A (actual DOM order problem)**,
  not a CSS issue.

### Goal composition contract (section 17)

Homepage *curation* (`featuredPick`, homepage caps) curates content **inside** a collection
section only — it never touches section order. The only layer that re-ordered actual sections
was the goal section-order composition, which the audit explicitly requires to be removed:
*"The 09B homepage curation layer must NOT reorder actual sections."*

---

## Root cause

**Render-time goal section reordering** in `StorefrontPage.tsx` (RCCF-EPIC-05). The goals
runtime is a *content-intelligence* layer; wiring its `applyGoalSectionOrder` into the live
render path created a **second, conflicting ordering system** layered on top of the canonical
persisted order. With no goal profile the behavior was identical (no-op), which is why only
goal-profile tenants (existing creators who set goals) showed the mismatch.

Goal *generation* ordering (`applyGoalSectionPriority` in onboarding) is fine — it shapes the
generated artifact **once**, then that order is persisted and shown everywhere.

## Fix

Smallest safe fix — remove the render-time reorder; keep the canonical persisted order as the
single source of truth.

1. **`src/components/storefront/StorefrontPage.tsx`** — removed `applyGoalSectionOrder`; the
   target page's sections are now rendered in their persisted order. Goal composition is
   retained for navigation (`applyGoalNavigation`) and for *hiding* empty conditional sections
   (adaptive visibility) — both of which are filters, never reorders.
2. **`src/lib/storefront/section-pipeline.ts`** (new) — `resolveRenderableSections()` is the
   single render-time filter chain (visible flag → goal-adaptive visibility → section
   presentation `shouldRenderSection`). Order preservation is guaranteed by construction (it
   only filters). Extracted so the parity contract is unit-testable.
3. **`src/modules/goals-runtime/application/composition.ts`** — documented that
   `applyGoalSectionOrder`/`goalSectionScore` must **not** be wired into live rendering; kept
   as pure utilities for generation/preview tooling and tests. `applyGoalSectionPriority`
   (onboarding generation) is unchanged.

No CSS changes. No changes to LayoutEngine, the snapshot format, the loader, or the Builder.
No migration. Backward compatible — a no-op for tenants without a goal profile.

## Regression tests — `tests/unit/section-pipeline.test.ts` (7 tests)

- Ordering preserved exactly with a goal profile present (test-creator-1's real profile + real
  persisted order; asserts `links` is NOT pulled to position 3).
- Ordering preserved without a goal profile.
- Hero first / footer last when a middle section is hidden.
- `visible === false` sections dropped, relative order preserved.
- Empty `auto` sections (section presentation) dropped, relative order preserved.
- Goal-adaptive visibility hides an empty conditional section only with a profile.
- Per-page independence: home filtering never changes an independent page's order.

## Verification (post-fix)

- **Runtime (dev server, live + preview):**
  - Homepage `test-creator-1` DOM: `hero → products → gallery → services → courses →
    testimonials → faq → timeline → games → links → footer` — **matches Builder + snapshot exactly**.
  - Independent `/gallery` page (temp, preview): `gallery → links` — persisted order; goal
    reorder (which would have produced `links → gallery`) no longer applies. Temp page removed.
- `npx prisma generate` — clean.
- `npx tsc --noEmit` — clean.
- `npm run lint` (changed files) — clean.
- `npx vitest run` — **2143/2143 pass** (was 2136; +7 new).
- `npx vitest run tests/architecture/` — 13/13 pass.
- `npm run build` — succeeds; `/[domain]`, `/[domain]/[slug]`, `/admin/website/sections`,
  `/sitemap.xml` all emitted. (One pre-existing `captureError` unused-var lint warning,
  unrelated to this change.)

## Existing creator compatibility

- `test-creator-1` (goal profile): live homepage now renders the persisted Builder order —
  the verified fix path.
- `test-creator-2`, `cristiano-ronaldo`, `3-all-day`, `test-creator-4` (no goal profile):
  unchanged — the reorder was already a no-op for them; the parity contract now holds
  universally.
- No legacy data shape differences found; all tenants use the same `page`/`section`/`block`
  representation (classification **F** not applicable).

## Multi-page compatibility

The fix is per-page by construction: `resolvePageBySlug` selects one page, and
`resolveRenderableSections` preserves that page's own order. Homepage and independent pages
(`/products`, `/gallery`, `/games`, …) each render their own persisted order. Verified on a
temp `/gallery` page. The 09B `/[domain]` + `/[domain]/[slug]` architecture is untouched.

## Remaining risks

- **Navigation ordering:** `applyGoalNavigation` still re-orders the persisted navigation by
  the goal profile at render time. This was out of scope for the reported section-order bug,
  but the same parity concern applies to nav items. If a Builder↔Storefront nav-order
  mismatch is reported, apply the same treatment (persisted nav is the source of truth;
  goals may curate/prioritize but not silently re-order the nav used by the storefront).
- **Goal-intelligence expectations:** dashboards and the Experience Intelligence runtime
  (`resolveHomepageOrder`) still *report* a goal-preferred order for insights; the live DOM
  intentionally renders the persisted order. No product-facing display claims the DOM is
  goal-reordered.
