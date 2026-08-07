# Evolution Registry

RCCF-EPIC-09 · Phase 1.

`src/modules/website-evolution/domain/registry.ts`

Every improvement declares:

- `id` + `title` + `reason`
- `expectedLift` — predicted Business Health, Conversion, Knowledge, Trust,
  Goal Alignment (no AI, registry-driven)
- `estimatedEffort` (minutes)
- `applicableGoals`
- `requiredKnowledge` / `requiredCommerce` / `requiredTrust`
- `change` — the concrete manifest (summary, section order / CTA / config,
  href)
- `when(ctx)` — the growth trigger

## The 10 evolutions

| id | Trigger | Change |
| --- | --- | --- |
| PRODUCT_COLLECTIONS | products > 10 | Group products into collections |
| GALLERY_MASONRY | gallery > 30 | Switch gallery to masonry |
| FEATURED_REVIEWS | testimonials > 20 | Highlight featured reviews |
| BOOKING_SECTION_UP | bookings > 3 + GET_BOOKINGS goal | Move booking section higher |
| FAQ_ACCORDION | FAQ > 10 | Convert FAQ to accordion |
| FEATURED_PRODUCTS | products > 5 + SELL_PRODUCTS goal | Feature best products |
| PORTFOLIO_FIRST | gallery > 20 + SHOW_PORTFOLIO goal | Show portfolio first |
| COURSE_SECTION_UP | courses > 5 + SELL_COURSES goal | Raise courses |
| CONTACT_PROMINENT | published + lead goals | Make contact prominent |
| TRUST_STRIP | testimonials ≥ 5 + timeline ≥ 2 | Show a trust strip |

## Expected lift (Phase 7)

Each evolution predicts its impact, e.g.:

```
FEATURED_REVIEWS → Health +2 · Conversion +4 · Knowledge +1 · Trust +6 · Goal Alignment +3
BOOKING_SECTION_UP → Health +3 · Conversion +5 · Knowledge +1 · Trust +1 · Goal Alignment +8
```

The detector computes the creator's **current** Business Health / Conversion /
Trust once per detection and derives `after = before + expectedLift` (capped at
100) — no duplicate calculations.

## ROI ordering

`roi = (health lift + conversion lift) / estimated effort` — the feed orders
opportunities by ROI so the highest-value, lowest-effort improvements appear
first.
