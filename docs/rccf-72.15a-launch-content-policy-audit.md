# RCCF-72.15A — Creator Launch Content Policy Audit

**Status:** COMPLETE (AUDIT ONLY — no code, no DB, no migration, no test change, no commit, no push)
**Date:** 2026-08-20
**Scope:** Determine exactly how the current architecture models the Creator Launch
content-type capability vs. content limits, whether it supports the NEW product rule
("Launch can create all core content types, but only 3 active items total"), and the
smallest implementation path — without modifying anything.

---

## 1. Executive Summary

The NEW product decision is: **Creator Launch is a FREE but fully functional Creator plan** —
Launch users can create Products, Services, Courses, Games, Testimonials, and FAQ, gated only
by **quantity** (a maximum of 3 **active content items**, interpreted as a single Launch-wide
counter, not per type).

The audit finds:

- **The current canonical registry does NOT match the new policy.** `creator_launch` in
  `src/config/commerce/plans.ts` sets `max_courses: 0` and `max_games: 0` — these are
  **capability-disabled** (a limit of 0 means the feature is unavailable). This is the direct,
  canonical cause of the previously-reported "Launch Courses unavailable / Games restricted."
- **The limit model is strictly PER-CONTENT-TYPE.** `enforceContentLimit` counts each content
  family independently and checks it against its own feature key. There is **no global /
  cross-type counter**, so "3 total active items across all types" is **not** the current meaning.
- **Cross-type bypass is the default behavior today.** A Launch user can create 3 products +
  3 services + 3 courses + 3 games + 3 testimonials + 3 FAQs = 18 content items, because each
  type has its own independent limit of 3.
- **Usage counts ALL rows per type** — drafts, archived, and inactive records all consume slots
  (counts do not filter status/archivedAt). **Hard delete frees a slot** (row removed). Archive /
  deactivate does **not** free a slot.
- **The desired model requires a NEW shared "active content usage" primitive** that sums the
  active-item count across the core content types and enforces a single ceiling of 3. This is an
  **architecture-preserving extension** of the existing per-type enforcement — not a rewrite.
- Previous finding **72.1-F4 ("Builder catalog leaks plan-blocked sections")** is reclassified
  **OBSOLETE** (product policy changed): under the new policy, Courses/Games/Services must be
  AVAILABLE on Launch, so the catalog exposing them is no longer a leak. The catalog's lack of a
  *remaining-allowance* readout is a separate P3 gap.

**FINAL VERDICT: B — IMPLEMENTATION REQUIRED, ARCHITECTURE FITS.**

The current architecture is per-type, so it does not already support the global 3-item rule.
But the existing limit primitive (`enforceContentLimit` → `countContentUsage` → plan check →
`ContentMutationResult`) is exactly the right seam to extend with a shared Launch-wide active
counter, without touching Growth/Scale/billing/publish/storefront.

---

## 2. New Product Decision

- Creator Launch = free but fully functional Creator plan.
- All supported core Creator content types available: Products, Services, Courses, Games,
  Testimonials, FAQ.
- Launch must NOT capability-lock Courses, Services, or Games.
- Launch differentiator = QUANTITY, not content type.
- Product rule:
  - Creator Launch → all core content types available → **maximum 3 active content items**.
  - Creator Growth → existing policy unchanged.
  - Creator Scale → existing policy unchanged.
- "3 maximum" must follow the canonical content-limit model. This audit determines that the
  current model is **per-type** and that the desired rule is a **Launch-wide 3-active-item
  counter** (Product #1 + Course #1 + Service #1 = 3 total; Product #2 rejected).

---

## 3. Current Launch Policy

Source of truth: `src/config/commerce/plans.ts` `creator_launch` `featureOverrides`
(merged over `BASE_FEATURES` in `src/lib/capabilities/plans.ts`).

| Feature key | Launch value | Meaning |
|---|---|---|
| `max_products` | **3** | 3 products allowed |
| `max_services` | **3** | 3 services (Offering type=coaching) allowed |
| `max_courses` | **0** | **Courses DISABLED (capability)** |
| `max_games` | **0** | **Games DISABLED (capability)** |
| `max_testimonials` | **3** | 3 testimonials allowed |
| `max_faq` | **3** | 3 FAQ items allowed |
| `max_gallery` | 3 | 3 gallery images |
| `max_timeline` | 3 | 3 timeline events |
| `max_links` | 3 | 3 links |
| `max_feed` | 3 | 3 feed posts |
| `max_bookings` | 0 | Bookings disabled (out of scope for this ticket) |

Interpretation: the registry currently treats **Courses and Games as capability-disabled on
Launch** (limit 0 ⇒ `capabilityService.can("creator_launch","max_courses").allowed === false`).
This is a real capability restriction at the canonical source of truth — NOT merely a UI artifact.

---

## 4. Current Growth Policy

Source: `creator_grow` `featureOverrides`:

- `max_products`, `max_services`, `max_courses`, `max_testimonials`, `max_faq`, `max_timeline`,
  `max_links`, `max_feed` = **`-1` (UNLIMITED)**
- `max_games` = **10**
- `max_bookings` = 20
- `max_orders` = 100
- `storage_mb` = 100

Growth: all core content types unlimited except Games (10). **Must remain unchanged.**

---

## 5. Current Scale Policy

Source: `creator_scale` `featureOverrides`:

- `max_products`, `max_services`, `max_courses`, `max_testimonials`, `max_faq`, `max_timeline`,
  `max_links`, `max_feed`, `max_games`, `max_orders` = **`-1` (UNLIMITED)**
- `max_bookings` = 100
- `storage_mb` = 300

Scale: all core content types unlimited. **Must remain unchanged.**

---

## 6. Capability Matrix

Legend: L = limit value; `-1` = unlimited; `0` = disabled (capability-denied).

| Capability / Limit | Launch | Growth | Scale | Source of truth | Runtime enforcement | UI enforcement |
|---|---|---|---|---|---|---|
| `max_products` | 3 | -1 | -1 | `plans.ts` | `enforceContentLimit` (`product.count`) | nav visible (3>0); QUICK_CARDS ungated |
| `max_services` | 3 | -1 | -1 | `plans.ts` | `enforceContentLimit` (`offering type=coaching`) | nav visible; QUICK_CARDS ungated |
| `max_courses` | **0 (disabled)** | -1 | -1 | `plans.ts` | `enforceContentLimit` (`offering type=course`) | nav HIDDEN (0); QUICK_CARDS + SECTION_CATALOG ungated |
| `max_games` | **0 (disabled)** | 10 | -1 | `plans.ts` | `enforceContentLimit` (`game.count`) | nav HIDDEN (0); QUICK_CARDS + SECTION_CATALOG ungated |
| `max_testimonials` | 3 | -1 | -1 | `plans.ts` | `enforceContentLimit` (Tenant settings array) | nav visible; QUICK_CARDS ungated |
| `max_faq` | 3 | -1 | -1 | `plans.ts` | `enforceContentLimit` (Tenant settings array) | nav visible; QUICK_CARDS ungated |

**Capability vs Content Limit separation:**
- **Capability** = whether the type can be used at all. In this model a `limit === 0` means the
  feature is *disabled* (see `capabilityEngine.can` at `engine.ts:22`: `value === -1 || value > 0`).
  Courses and Games on Launch are currently **capability-disabled** (limit 0).
- **Content limit** = how many of an *enabled* type may be created. Products/Services/
  Testimonials/FAQ are enabled with a numeric limit.

This is the exact conflation the new policy must fix: **Courses/Games should become enabled
(subject to a quantity limit), not capability-locked.**

---

## 7. Content Limit Architecture

The complete per-content-type limit flow:

```
Server action (create)
  └─ enforceContentLimit({ tenantId, featureKey })
       ├─ countContentUsage(tenantId, featureKey)      // counts rows in the type's table
       ├─ resolveActivePlan(undefined, tenantId)        // DB-authoritative plan (v2 → legacy → none)
       ├─ capabilityService.checkLimit(planCode, featureKey, used)
       │     └─ getEffectiveLimit → plan.features[featureKey]
       └─ returns ContentLimitDecision { ok, used, limit, reason, suggestedUpgrade }
            └─ action returns ContentLimitRejection (structured) or throws (older surfaces)
```

Files:
- **Server actions:** `src/actions/games.actions.ts`, `src/features/{products,courses,services,testimonials,faq}/actions.ts`
- **Limit resolver:** `src/modules/billing/application/content-limit.enforcement.ts` (`enforceContentLimit`, `countContentUsage`)
- **Result primitive:** `src/modules/billing/application/content-limit.result.ts` (`ContentMutationResult`, `contentLimitRejection`)
- **Plan policy:** `src/config/commerce/plans.ts` + `src/lib/capabilities/plans.ts` + `src/lib/capabilities/limits.ts`
- **Effective-plan resolution:** `src/modules/billing/application/plan-source.ts` (`resolveActivePlan`), `src/lib/capabilities/plan-resolution.ts`, `src/lib/capabilities/entitlements.ts`
- **Persistence:** Prisma `Product`, `Offering` (services=coaching / courses=course), `Game`, `TimelineEvent`, `AffiliateLink`, `GalleryImage`, `ContentFeedItem`, `Booking`, Tenant `Setting` (testimonials/faq)

Answers to the audit questions:
1. **Is there a common content-limit primitive?** Yes — `enforceContentLimit` + `ContentLimitDecision`/`ContentMutationResult` is the shared seam. But it is always invoked with **one** featureKey.
2. **Are limits per content type?** Yes — each feature key maps to its own count and limit.
3. **Is there a global Creator content limit?** **No.** No primitive sums across content types.
4. **Is usage counted by content type?** Yes (`countContentUsage` switch).
5. **Is usage counted across all content?** No — strictly per-type.
6. **Are active/deleted/archived treated differently?** No — counts are unfiltered. All rows count.
7. **Are drafts counted?** Yes — `Offering` count ignores `status` (draft/published/archived all count); `Product` count ignores `status`/`archivedAt`; `Game` count ignores `isActive`.
8. **Are published items counted?** Yes — but so are drafts/archived.
9. **Is the limit checked before persistence?** Yes — `enforceContentLimit` runs before `create`.
10. **Is the limit enforced transactionally?** **No** — it is a read-then-write without a transaction/lock. Concurrent creates can exceed the limit by a race.
11. **Can different content types bypass each other's limit?** **Yes — by default.** Each type is independent.

---

## 8. Exact Meaning of Current Limits

**Current meaning is strictly per-content-type:**

```
Launch allowed today (each type independent):
  Products 3 · Services 3 · Courses 0 · Games 0 · Testimonials 3 · FAQ 3
```

So the current architecture supports **neither** desired reading:
- It does NOT mean "3 total across all types" (no global counter).
- It does NOT mean "3 per type for ALL types" (Courses/Games are 0, not 3).

**Desired meaning:** a single Launch-wide counter of **active content items = 3**. Example:

```
Product #1 ✓   Course #1 ✓   Service #1 ✓   (3 total)   Product #2 ✗ REJECTED
```

To reach the desired model, the per-type enforcement must be augmented with a **global
Launch active-content usage** that sums the active count across the core content types and
enforces a ceiling of 3. The per-type `max_*` values for Launch would be superseded (for the
core content types) by this single ceiling.

---

## 9. Current Builder Behavior

- **SECTION_CATALOG** (`src/features/builder/components/section-manager.tsx:60-74`) contains 13
  entries including Courses, Services, Games, Testimonials, FAQ — **ungated for all plans**.
  On Launch these are **addable** in the Builder canvas regardless of plan. (This is what the old
  F4 finding flagged.)
- **Dashboard QUICK_CARDS** (`src/features/dashboard/components/dashboard-page.tsx:36-51`)
  statically show Products, Bookings, Services, Courses, Gallery, Testimonials, etc. — **ungated**.
- **Admin sidebar nav** (`src/config/admin-nav.ts` + `src/lib/capabilities/nav-visibility.ts`):
  **gated** — Courses and Games items are **hidden on Launch** because `limit === 0`
  (`isNavItemVisible` returns false when `limit === 0`). Services/Products/Testimonials/FAQ visible.
- **Admin pages** (`src/app/admin/{courses,games,services,products}/page.tsx`) have **no server
  capability gate** — they render for any authenticated tenant. The actual block is at the create
  server action (`enforceContentLimit`).

Per content type — current vs desired:

| Type | Current Builder/page behavior | Current condition | Canonical capability | Desired |
|---|---|---|---|---|
| Products | nav visible; catalog addable; page reachable; create allowed up to 3 | limit 3 | enabled | AVAILABLE, part of 3-total |
| Services | nav visible; catalog addable; create allowed up to 3 | limit 3 | enabled | AVAILABLE, part of 3-total |
| Courses | **nav hidden**; catalog addable; page reachable; **create rejected "not available"** | limit 0 | **disabled** | **AVAILABLE**, part of 3-total |
| Games | **nav hidden**; catalog addable; page reachable; **create rejected "not available"** | limit 0 | **disabled** | **AVAILABLE**, part of 3-total |
| Testimonials | nav visible; create allowed up to 3 | limit 3 | enabled | AVAILABLE, part of 3-total if counted |
| FAQ | nav visible; create allowed up to 3 | limit 3 | enabled | AVAILABLE, part of 3-total if counted |

**Upgrade UI:** The phrase "Upgrade to Growth" does not appear in the content-type admin UIs as
an upsell. The rejection surfaces the generic `enforceContentLimit` message ("Courses is not
available on your current plan." or "limit reached (x/y)"). `suggestedUpgrade` is returned by the
server action but **not rendered** by the current content managers (courses-manager only shows
`error`).

**Remaining-allowance readout:** No UI currently displays a remaining "3-item" allowance. Under
the desired model, this should come from the same global usage primitive (sum of active core
content items) the server enforces — not a hardcoded number.

---

## 10. Current Server Enforcement

For each content type, the create server action resolves plan server-side (never from the client)
and enforces via `enforceContentLimit`:

| Action | Gate | Launch behavior today |
|---|---|---|
| `createProduct` | `max_products` | allowed while count < 3; rejects at 3 |
| `createService` | `max_services` | allowed while count < 3; rejects at 3 |
| `createCourse` | `max_courses` (=0) | **rejected — "Courses is not available on your current plan."** |
| `createGame` | `max_games` (=0) | **rejected — "Games is not available on your current plan."** |
| `createTestimonial` | `max_testimonials` | allowed while count < 3; rejects at 3 |
| `createFAQItem` | `max_faq` | allowed while count < 3; rejects at 3 |

**Conclusion:** Courses and Games are rejected on Launch **because of a canonical capability
(limit 0)** — not an implementation bug and not merely a UI restriction. Under the new policy
this must change so that **capability permits** the type and **content limit determines** creation.

**Conceptual target:**

```
Launch → capability permits content type  ✓   (Courses/Games enabled)
Launch → content limit (3 active total) decides whether creation is allowed
```

NOT:

```
Launch → capability denies content type  ✗   (current Courses/Games = 0)
```

---

## 11. Cross-Type Bypass Analysis

**Yes — a Launch user can currently exceed the intended 3-item total by spreading across types.**

```
Products = 3 ✓
Services = 3 ✓
Courses  = 3 (once enabled / or 0 today)
Games    = 3 (once enabled / or 0 today)
Testimonials = 3 ✓
FAQ      = 3 ✓
Total ≈ 18 active content items
```

**Why:** `enforceContentLimit` is invoked independently per feature key with a per-type count and
per-type limit. There is no aggregate counter spanning content types, so the per-type ceiling
never combines.

**Enforcement gap:** the canonical limit engine (`capabilityService.checkLimit`) and the usage
counter (`countContentUsage`) are strictly keyed to a single feature at a time. To close the gap,
a global "active content items" usage must be computed and enforced for Launch core types.

(Not fixed in this audit — documented only.)

---

## 12. Active Content Semantics

"Active content" has **no unified definition** today; each model differs:

| Model | "active" flags | countContentUsage filter | Meaning |
|---|---|---|---|
| `Product` | `isActive`, `status`, `archivedAt` | **none** | all rows count (incl. archived/inactive) |
| `Offering` (service/course) | `status` (draft/published/archived) | **none** | all rows count (incl. drafts/archived) |
| `Game` | `isActive` | **none** | all rows count (incl. inactive) |
| Testimonials/FAQ | Tenant `Setting` JSON array | **none** | all array entries count |

**Desired semantics:** "3 active content items" — the counter should count only **active**
published/non-archived items, so that:

```
3 active  →  no fourth
delete/deactivate one  →  one slot becomes available
```

The current counters do **not** implement this: drafts, archived, and inactive records all consume
slots. Implementing the desired rule requires defining "active" per content family (e.g.
Product: `archivedAt IS NULL`; Offering: `status = 'published'`; Game: `isActive = true`) in the
global usage counter.

---

## 13. Deletion / Deactivation Semantics

- **Hard delete frees a slot:**
  - Product: `productService.delete` → `prisma.product.delete` (row removed → count drops).
  - Course/Service: `courseService.delete` → `prisma.offering.delete` (row removed → count drops).
  - Game: `deleteGame` → `prisma.game.delete` (row removed → count drops).
- **Archive / deactivate does NOT free a slot** (counts are unfiltered):
  - Archiving a product (`archivedAt`) does not reduce `product.count`.
  - Setting an Offering to `archived` or `draft` does not reduce `offering.count`.
  - Setting a Game `isActive=false` does not reduce `game.count`.

**Desired:** "3 active items" implies that deactivating/archiving one item should free a slot.
The current per-type unfiltered counts **do not** provide this. The global active counter must
filter by the active predicate so delete/deactivate releases a slot.

---

## 14. Security Analysis

- **Plan forging:** Not possible via these server actions. `enforceContentLimit` resolves the plan
  from the DB (`resolveActivePlan` → BillingSubscription/BillingPlan with legacy fallback) and
  never accepts a plan code or limit from the client. A malicious client cannot forge plan/limit.
- **Direct server-action calls:** The server actions call `requireAuth()` / session tenant check
  and scope every query to the session tenant. Direct invocation cannot bypass the plan gate
  because the gate is server-side and DB-backed.
- **Capability-bypass:** No client-supplied capability is trusted. UI visibility (nav, catalog,
  quick cards) is cosmetic; the authoritative check is `enforceContentLimit` in each create action.
- **Cross-type bypass:** The current per-type model allows exceeding a would-be global 3-item
  ceiling by distributing across types (see §11). This is a **policy** gap, not a tenant-isolation
  or forgery hole — the server remains authoritative; it just enforces the wrong (per-type) rule.
- **Bypass via another endpoint:** Each content type is created through its own gated action. No
  un-gated alternative create path for these types was found in the audited surface. (Confirm any
  provisioning/import/seed path that inserts content without `enforceContentLimit` in the
  implementation ticket.)

**Recommendation:** Server remains the authority. The global 3-active counter must be implemented
server-side (in `enforceContentLimit`/`countContentUsage`), not in the Builder.

---

## 15. Growth / Scale Regression Risk

**Changing Launch semantics must not touch Growth/Scale.** Analysis of the seams:

- `countContentUsage` / `enforceContentLimit` resolve the **active plan per tenant**; adding a
  Launch-specific global counter branched on `planCode === creator_launch` (or on a "launch-tier"
  marker) will not run for Growth/Scale tenants.
- Growth/Scale `max_*` values are `-1`/unlimited or explicit high numbers and are read only for
  the resolved plan. A global counter would only apply when the plan is Launch.
- Publish quota (`src/lib/publishing/*`), billing (`usage-engine`, `revenue-service`),
  storefront rendering, and `max_orders` are **independent feature keys** — unaffected by a
  content-type counter change.
- Tenant isolation (`tenantId` scoping) is orthogonal and preserved.

**Verification required during implementation:** Growth/Scale tenants must still be able to create
beyond 3 of any type, and their `max_games`/`max_bookings` limits must be untouched.

---

## 16. Previous F4 Reclassification

Previous finding **72.1-F4 (P2): "Builder catalog leaks plan-blocked sections"** —
`SECTION_CATALOG` ungated; Courses/Games addable on Launch.

**Reclassification: OBSOLETE — product policy changed.**

Rationale:
- The finding's premise was that Courses/Games are "plan-blocked" and the catalog leaking them is
  a defect. Under the NEW product policy, Courses/Games/Services **must be AVAILABLE** on Launch.
  The catalog exposing them is therefore no longer a leak.
- The actual defect to carry forward is different: **the capability registry disables Courses and
  Games on Launch (`max_courses: 0`, `max_games: 0`)** — that is the canonical source of the
  blocking, and it now violates the new policy. This becomes an **OPEN implementation-gap**
  finding (not the old F4 wording).
- The catalog also provides **no remaining-allowance readout** for the 3-item cap — a new P3 gap
  for the Launch 3-item allowance (§9, §17).

Related finding **72.1-F5 (P2) "Dashboard CTAs to locked pages"** (ungated QUICK_CARDS) is also
affected by the policy change: Courses/Services/Games should now be reachable, so the "locked"
premise dissolves for those types. It remains relevant only as: the dashboard shows links to types
regardless of plan and provides no 3-item allowance indication. Reclassify **PARTIAL / OBSOLETE**
pending the global-counter design.

---

## 17. Required Implementation

(Design only — not implemented. Required to satisfy the new policy.)

1. **Canonical registry** (`src/config/commerce/plans.ts` `creator_launch`):
   - Change `max_courses` from `0` → available (e.g. match the other core types' effective cap).
   - Change `max_games` from `0` → available.
   - Add (or derive) a Launch-wide marker / cap representing **3 active content items total**.
2. **Global active-content usage** (extend `src/modules/billing/application/content-limit.enforcement.ts`):
   - Add a function that sums **active** core content items (products, services, courses, games,
     + testimonials/FAQ if decided) for the tenant.
   - Define "active" per family (e.g. Product `archivedAt IS NULL`, Offering `status='published'`,
     Game `isActive=true`, settings-array items).
3. **Enforcement branch:** in `enforceContentLimit` (or a wrapper) for Launch, enforce the global
   active ceiling (3) instead of per-type for the core content types; keep per-type limits for
   Growth/Scale unchanged.
4. **Result contract** (`content-limit.result.ts`): reuse `ContentMutationResult` /
   `contentLimitRejection` unchanged so client managers keep working.
5. **UI** (out of scope for this audit's redesign, but required): surface the remaining 3-item
   allowance (from the server usage primitive, not hardcoded); ensure no "not available" copy for
   Courses/Games; unblock QUICK_CARDS/section catalog appropriately; keep nav visible for enabled
   types.
6. **Test updates:** the existing test `content-limit.enforcement.test.ts:48-54` asserts
   `max_courses=0 on Launch → rejected`. This test encodes the OLD policy and must be updated to
   reflect Courses being available-but-capped (a guardrail change in the implementation ticket).

---

## 18. Minimal Architecture

Preferred conceptual model:

```
Creator Launch
   ├── core content capabilities → ALLOWED   (Products, Services, Courses, Games, Testimonials, FAQ)
   └── global active-content usage
              └── max = 3   (Launch-wide ceiling)
```

Because the current architecture is per-type, the minimal architecture-preserving change is to add
a **single shared "active content usage" counter** reused by the existing `enforceContentLimit`
seam — no new capabilities service, no new plan engine, no schema change, no new server actions:

- Extend `countContentUsage`/add `countActiveContentUsage(tenantId)` that returns the sum of
  active core content items.
- In `enforceContentLimit`, when the resolved plan is `creator_launch` (and the feature is one of
  the core content types), check the **global** count against **3**; otherwise fall through to the
  existing per-type logic (preserving Growth/Scale exactly).
- Keep the single `ContentMutationResult` contract so all create actions and client managers are
  unchanged.

Preserves (unchanged): Growth limits, Scale limits, billing, publish quotas, tenant isolation,
content-mutation result contract, storefront rendering.

---

## 19. Required Tests

Guardrail regression tests for the implementation ticket (per `tests/unit/rccf{N}-*` convention):

1. **Launch global cap:** Launch with 3 active items across types → a 4th create (any type)
   rejected; e.g. Product#1 + Course#1 + Service#1 = 3, then createProduct → rejected.
2. **Launch capability-enabled:** `enforceContentLimit({ featureKey: max_courses })` and
   `max_games` return `ok:true` when global usage < 3 (no longer "not available").
3. **Cross-type bypass closed:** a Launch user cannot reach >3 total by mixing types.
4. **Active filtering:** archived product / draft offering / inactive game do NOT consume the
   3-item allowance; delete/deactivate frees a slot.
5. **Growth/Scale untouched:** Growth tenant can create >3 of a type; Scale unlimited;
   `max_games` (Growth=10) still enforced.
6. **Plan authority:** no subscription → defaults to Launch global cap; plan from DB (not client).
7. **Result contract:** rejection returns `ContentMutationResult` with `success:false`, friendly
   error, `used`/`limit` (3), suggestedUpgrade.
8. Update the OLD guardrail `content-limit.enforcement.test.ts:48-54` (Courses "not available")
   to the new expected behavior.

---

## 20. Browser QA Plan

1. Launch user: `/admin/courses` and `/admin/games` pages render (no "not available"); create one
   course and one game successfully.
2. Create 3 total active items across types (e.g. 1 product + 1 course + 1 service); attempt a 4th
   → friendly rejection with remaining-allowance context, no "Upgrade to Growth" for core types.
3. Deactivate/delete one item → slot frees → create a replacement succeeds.
4. Builder `SECTION_CATALOG`: Courses/Services/Games addable and editable on Launch.
5. Dashboard QUICK_CARDS link to reachable pages; no dead/blocked CTAs for core types.
6. Nav sidebar: Courses/Games visible on Launch (limit > 0).
7. Growth/Scale regression: a Growth tenant creates 5+ of a type; Scale creates many; games limit
   (Growth=10) still blocks at 11.
8. Server-authority check: crafted client that posts without limit data still gated; plan cannot
   be forged (plan resolved server-side from DB).

---

## 21. Open Product Decisions

1. **Do Testimonials and FAQ count toward the same 3-item ceiling as Products/Services/Courses/
   Games?**
   - The phrase "content item" is ambiguous in the current architecture. Products/Services/Courses/
     Games are row-backed models; Testimonials/FAQ are Tenant-`Setting` JSON arrays.
   - **Decision required:** include Testimonials and FAQ in the global 3-active counter, or scope
     "3 active content items" to the four row-backed commerce/content types only (Products,
     Services, Courses, Games).
2. **Definition of "active" per type** (which statuses free a slot): recommend archived/deleted
   are non-active; draft treatment needs a product decision (do drafts consume a slot?). Draft
   currently counts; desired semantics may want published+active only.
3. **Whether the 3-item ceiling replaces Launch's per-type limits entirely** or only adds a global
   ceiling on top of per-type limits (the new policy implies the former: any combination up to 3
   total).

---

## 22. Final Verdict

**B — IMPLEMENTATION REQUIRED, ARCHITECTURE FITS.**

- The current architecture **does not** already support the new policy (Courses/Games are
  capability-disabled at the canonical registry; limits are per-type, so there is no global
  3-item counter).
- However, the existing `enforceContentLimit` / `countContentUsage` / `ContentMutationResult`
  seam is the correct, minimal place to introduce a Launch-wide **active-content usage counter**.
- The change is localized (canonical plan values + one shared usage/enforcement branch) and can be
  made **without** touching Growth, Scale, billing, publish quotas, tenant isolation, the result
  contract, or storefront rendering.
- Previous **F4 → OBSOLETE** (product policy changed). The real defect to fix is the canonical
  registry disabling Courses/Games on Launch, plus adding the global active-content ceiling.

**No code, database, migration, test, or commit changes were made in this audit.**
