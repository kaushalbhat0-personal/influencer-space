# RCCF-AUDIT-10B — Navigation Order Parity Audit

**Status:** BUG FOUND → FIXED (same working tree as RCCF-AUDIT-10; nothing committed/pushed).
**Result:** `applyGoalNavigation()` was wired into the live storefront render path
(`StorefrontPage.tsx`) and silently re-ordered the persisted/published navigation by the
creator's weighted goal profile on every request — the navigation equivalent of the section
ordering bug fixed in RCCF-AUDIT-10. The persisted order is now canonical and goal-based
reordering is removed from live rendering.

---

## Executive verdict

| Layer                     | Navigation order (goal-profile tenant)                                      | Matches persisted? |
|---------------------------|-----------------------------------------------------------------------------|--------------------|
| Admin/Builder             | persisted Setting `navigation` array (order preserved)                       | —                  |
| Draft DB                  | Setting key `navigation`: [hero, contact] (test-creator-1)                   | ✅ |
| Published snapshot        | v28 `snapshot.navigation` = same persisted order                             | ✅ |
| Storefront loader         | same (content replaced live; navigation untouched)                           | ✅ |
| Navigation resolver       | `resolveStorefrontNavigation` resolves hrefs only — never sorts              | ✅ |
| StorefrontNav input       | **post-fix:** persisted order · **pre-fix:** goal-reordered                  | ❌ (pre-fix) |
| Final DOM                 | post-fix = persisted order; pre-fix = goal-reordered                         | ✅ post-fix |

**First divergence (pre-fix, full nav + test-creator-1's goal profile):** index 1 —
persisted `products` was replaced by `links`; products moved #2 → #6, links #8 → #2.

**Goal profile effect (deterministic, `goalNavScore` with MONETIZE_CONTENT 39 / GROW_YOUTUBE
22 / SHOW_PORTFOLIO 22 / BUILD_EMAIL_LIST 17):**

```
PERSISTED:    hero → products → gallery → timeline → testimonials → faq → games → links → contact
PRE-FIX LIVE: hero → links → gallery → timeline → testimonials → products → faq → games → contact
POST-FIX:     hero → products → gallery → timeline → testimonials → faq → games → links → contact
```

Note: test-creator-1's *current* persisted nav is only `[hero, contact]`, so its live DOM nav
was already unchanged by the goal layer (hero/contact are pinned first/last). The architectural
defect is real and confirmed — any goal-profile tenant with a fuller persisted nav would render
goal-reordered. The same parity rule established for sections in RCCF-AUDIT-10 applies here.

---

## Navigation architecture

```
Admin navigation actions (src/actions/navigation.actions.ts)
  → navigationService.save()   → Setting key "navigation" (persisted order)
  → publishingService          → publishSnapshot.snapshot.navigation (same order)
  → storefront-loader          → getPublishedPageData / buildRuntimeSnapshot (nav unchanged)
  → StorefrontPage             → [PRE-FIX applyGoalNavigation → re-ordered]  [POST-FIX removed]
  → resolveStorefrontNavigation → page-type hrefs resolved (products → /products) — never sorts
  → StorefrontNav              → renders in received order (desktop full, mobile slice(0,5))
  → DOM
```

- Navigation has **no dedicated DB table** — it is the `navigation` Setting, an ordered
  `NavigationItem[]` array. `navigationService.getOrGenerate` = `get()` (Setting) → fallback
  `generateDefaults()`. Publish copies the same array into the snapshot untouched.
- `generateDefaults()` builds a content-driven default order (hero, …, contact) and persists
  it. Nothing in generation applies goal hints — `navigationPriority` was consumed **only** by
  `applyGoalNavigation` in the live storefront.
- `resolveNavHrefs` (RCCF-IMPLEMENTATION-09B) maps `type: "page"` hrefs to real storefront
  routes. It is a `.map`, never a sort — href resolution and ordering are separate
  responsibilities (audit §7).

## Root cause

`applyGoalNavigation(doc.navigation, goalProfile)` in `StorefrontPage.tsx` re-scored and
sorted the persisted nav by the creator's goal `navigationPriority` hints on every render.
There is **no documented product contract** for live adaptive navigation ordering — no caller
outside the live storefront, and no generation-time use. It silently mutated the live
presentation order, the navigation twin of the RCCF-AUDIT-10 section bug.

## Fix applied (no-fix alternative rejected)

Alternative considered and rejected: *keep* live goal nav reordering. This would violate the
canonical-order principle — persisted/published order is canonical for the live storefront,
and no explicit product contract exists for live adaptive nav ordering.

Adopted — smallest safe fix, mirrors RCCF-AUDIT-10:

1. **`src/lib/storefront/page-resolver.ts`** — added `resolveStorefrontNavigation(navigation,
   hrefFor, goalProfile)`: resolves page-type hrefs via `resolveNavHrefs` AND preserves the
   persisted order exactly. It accepts the goal profile structurally for signature symmetry
   with the section pipeline, but never applies it to ordering.
2. **`src/components/storefront/StorefrontPage.tsx`** — removed `applyGoalNavigation`;
   navigation now flows `doc.navigation → resolveStorefrontNavigation → StorefrontNav`. Goal
   profile is still fetched and used for adaptive section visibility only.
3. **`src/modules/goals-runtime/application/navigation.ts`** — documented `applyGoalNavigation`
   as generation / preview tooling only, not live rendering. Kept as a pure utility with its
   tests; goal-aware nav generation can call it at build time in the future (goals generate;
   persisted configuration controls the live storefront).
4. **`tests/unit/storefront-loader.test.ts`** — added 5 RCCF-AUDIT-10B regression tests:
   persisted order preserved with a real goal profile that WOULD reorder (test-creator-1's
   weights); order preserved without a profile; page-type hrefs resolve without reorder;
   anchor/external items untouched; independent-page roots (`/`, `/products`, `/gallery`,
   `/custom-page`) resolve identically.

No snapshot schema change. No migration. No second navigation system. No CSS changes.

## Runtime verification (post-fix)

Dev server, `test-creator-1` (goal-profile tenant). Extracted the actual desktop nav DOM
order from the rendered HTML.

- **Live homepage nav** (`/test-creator-1`): `Home → Contact` — the persisted order.
- **Full-nav preview proof**: temporarily saved the full persisted nav `[hero, products,
  gallery, timeline, testimonials, faq, games, links, contact]`, fetched
  `?preview=true`, and extracted the nav DOM order:
  `Hero → Products → Gallery → Timeline → Testimonials → Faq → Games → Links → Contact` —
  **exactly the persisted order** (pre-fix it would have been `Hero → Links → Gallery →
  Timeline → Testimonials → Products → Faq → Games → Contact`).
- Temp nav restored to the original `[hero, contact]`; verified in the Setting afterwards.

## Verification suite

- `npx vitest run` — **2148/2148 pass** (storefront-loader +57)
- `npx vitest run tests/architecture/` — 13/13 ✅
- `npx tsc --noEmit` ✅
- `npm run lint` ✅ (only pre-existing warnings in untouched files)
- `npm run build` ✅

## Remaining risks

- `applyGoalNavigation` remains exported as a pure utility; a future generation/preview path
  may use it, which is the intended contract. If it is ever re-wired into live rendering,
  that re-introduces this bug — the doc comments and this audit guard against it.
- Anchor links (`#products`, `#gallery`) depend on the corresponding section actually
  rendering on the page. Adaptive visibility can hide an empty section, leaving a dangling
  anchor — a pre-existing behavior, independent of ordering.

## Relationship to RCCF-AUDIT-10

Same defect class, same fix pattern. RCCF-AUDIT-10 removed render-time **section** reordering;
RCCF-AUDIT-10B removes render-time **navigation** reordering. Together they establish the
parity boundary: **goals generate/recommend; persisted configuration controls the live
storefront** — for both sections and navigation, in preview and live routes.

## Git status (uncommitted — awaiting approval)

```
 M src/components/storefront/StorefrontPage.tsx
 M src/lib/storefront/page-resolver.ts
 M src/modules/goals-runtime/application/composition.ts
 M src/modules/goals-runtime/application/navigation.ts
 M tests/unit/storefront-loader.test.ts
?? docs/audit-10-section-order-parity.md
?? docs/audit-10b-navigation-order-parity.md
?? src/lib/storefront/section-pipeline.ts
?? tests/unit/section-pipeline.test.ts
```
