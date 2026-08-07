# Experience Composition

RCCF-EPIC-08 · Phase 2, Phase 3, Phase 5, Phase 6, Phase 11.

How the Experience Intelligence composes the storefront from goals.

## Goal-aware homepage order (Phase 2)

`application/composition.ts` — `resolveHomepageOrder(profile, presentBases)`:

```
Bookings → Hero → Trust → Booking → Testimonials → FAQ → Footer
Commerce → Hero → Products → Bundles → Testimonials → FAQ
Portfolio → Hero → Gallery → Projects → Testimonials → Contact
```

Hero stays first, footer last; goal-preferred sections move earlier. The
storefront applies the actual order via the Goals Runtime's
`applyGoalSectionOrder` (canonical runtime ordering); the registry model feeds
previews and the builder.

## Adaptive visibility (Phase 3)

`resolveAdaptiveVisibility(content, goalProfilePresent)` — **no empty sections**:

- No products → hide Products
- No testimonials → hidden (trust surfaces swap to milestones)
- No gallery → hidden (About carries the load)
- No bookings → hide booking CTAs

Conditional sections with empty content are hidden **only when a goal profile
is set**, so existing storefronts render identically without goals.

## CTA intelligence (Phase 5)

`domain/cta.ts` — every goal maps to a deterministic primary/secondary CTA:

| Goal | Primary | Secondary |
| --- | --- | --- |
| GET_BOOKINGS | Book Now | View Availability |
| SELL_PRODUCTS | Buy Now | Browse Products |
| SELL_COURSES | Start Learning | View Courses |
| SELL_SERVICES | Get a Quote | Book a Call |
| BUILD_EMAIL_LIST | Subscribe | Get the Newsletter |
| GROW_YOUTUBE | Subscribe | Watch Latest |
| BUILD_COMMUNITY | Join Community | Connect |
| SHOW_PORTFOLIO | Contact Me | View Portfolio |
| FIND_CLIENTS | Hire Me | View Work |

No hardcoded CTAs elsewhere; the registry is canonical.

## Navigation intelligence (Phase 6)

Goal-aware navigation is the Goals Runtime's `applyGoalNavigation` (already
applied in the storefront) — Commerce → Products first, Bookings → Book first,
Portfolio → Gallery first. No duplicate navigation logic.

## Theme intelligence (Phase 11)

`domain/theme-intelligence.ts` — Theme × Experience × Goals combine
deterministically:

- Luxury / Build Brand → high whitespace + high trust emphasis
- Creator / Grow YouTube → high media emphasis
- Restaurant / Get Bookings → menu first (booking emphasis)
- Fitness / Get Bookings → transformations first (trust emphasis)

Returned as `ThemeEmphasis { whitespace, mediaEmphasis, trustEmphasis, contentEmphasis }` — never hardcoded visual combinations.
