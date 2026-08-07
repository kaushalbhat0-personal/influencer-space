# Goal Composition

RCCF-EPIC-05 — Phase 4, Phase 5, Phase 8.

Goals influence **ordering only**. They never add, remove or duplicate
templates, and they never change which sections exist.

## Homepage ordering (Phase 4)

`src/modules/goals-runtime/application/composition.ts`

`applyGoalSectionOrder(pages, profile)` re-orders sections within each page:

1. **Hero** stays first and **Footer** stays last (the storefront's
   hero/footer variants depend on this).
2. Middle sections are scored by their goal affinity:

```
goalSectionScore(moduleId, profile) =
  Σ over weights of  weight × (index of moduleId in goal.sectionOrderHint + 1)
```

   Sections mentioned in a goal's hint move up proportionally to that goal's
   weight; sections in no hint sink below while keeping their relative order.
3. Without a profile the input array is returned **unchanged** — existing
   storefronts behave exactly as before.

Example — a Booking-first creator:

```
Hero → Pricing → Testimonials → FAQ → Contact
```

## Navigation ordering (Phase 5)

`src/modules/goals-runtime/application/navigation.ts`

`applyGoalNavigation(navigation, profile)` re-orders the storefront nav using
each goal's `navigationPriority`. Home stays first, Contact stays last.

Examples:

- Bookings goal → **Contact/Book** appears earlier.
- Products goal → **Products** becomes highlighted.
- Courses goal → **Courses** appears higher.
- Portfolio goal → **Gallery** moves higher for photographers.

## Commerce ordering (Phase 8)

`src/modules/goals-runtime/application/commerce.ts`

- `commercePriority(profile)` → which commerce surface the profile leads with
  (`products | bookings | courses | services | null`).
- `commerceRank(surface, profile)` + `applyCommerceOrder(items, profile, keyOf)`
  re-order commerce items so the primary surface comes first.

Products-first creators lead with Products; booking-first with Bookings;
courses-first with Courses.

## Applied where?

- **Storefront**: `src/app/[domain]/page.tsx` applies both navigation and
  section ordering at render time (read-only, no DB/publish mutation).
- **Dashboard / Builder / future Recommendation Runtime**: consume the pure
  functions (`applyCommerceOrder`, `commercePriority`, ordering hints).

No duplicate templates. Only ordering.
