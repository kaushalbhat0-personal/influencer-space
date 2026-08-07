# Experience Intelligence

RCCF-EPIC-08 · Launch Readiness Initiative, Phase 10.

Transforms CreatorStore from generating **"correct" websites** into generating
**high-converting, goal-aware, visually adaptive experiences**. No AI. No
duplicate Experience Runtime — it extends the existing Experience System so
every section is aware of Business Health, Goals, Knowledge, Commerce, Trust,
Theme, Device and page context. Everything is deterministic.

## Philosophy

| | Controls |
| --- | --- |
| Experience (existing) | appearance |
| **Experience Intelligence** | appearance **+** behavior **+** section composition **+** conversion hierarchy |

## Architecture

```
Knowledge / Goals / Business Health / Recommendation
                          │
                          ▼
                  Runtime Context
                          │
                          ▼
               Experience Intelligence
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
        Builder      Generation    Storefront
```

## Module

`src/modules/experience-intelligence/` (DDD).

| Phase | Deliverable | Location |
| --- | --- | --- |
| 1 Section Intelligence Registry | 15 sections with priority, weights, prerequisites, preferred goals/industries, placement, collapse rules, mobile priority | `domain/section-registry.ts` |
| 2 Goal-aware homepage order | Registry-driven order (hero first, footer last, goal-preferred earlier) | `application/composition.ts` |
| 3 Adaptive visibility | "No empty sections" — conditional sections with empty content are hidden (only when a goal profile is set) | `application/composition.ts` + storefront |
| 4 Trust Runtime | Canonical trust profile from testimonials/achievements/timeline/social/community/health/recommendations | `domain/trust-runtime.ts` |
| 5 CTA Intelligence | Deterministic primary/secondary CTA per goal (Book Now, Buy Now, Start Learning, Contact Me…) | `domain/cta.ts` |
| 8 Conversion Score | Derived Conversion Readiness (CTA, Trust, Commerce, Content, Navigation, Speed, Contact, SEO) | `application/conversion-score.ts` |
| 9 Mobile | Every section declares mobile priority + collapse rules | `domain/section-registry.ts` |
| 11 Theme Intelligence | Theme × Experience × Goals emphasis directives | `domain/theme-intelligence.ts` |
| 7/12 Builder | Experience Intelligence panel — conversion, health, goal alignment, per-section impact, recommended CTA | `presentation/builder-experience-panel.tsx` |
| 13 Super Admin | `/super-admin/experience-intelligence` — experience/industry/goal distribution + health by experience | `application/analytics.ts` |

## Consumers

- **Storefront** (`src/app/[domain]/page.tsx`) — adaptive visibility (hidden
  empty conditional sections) applied on top of the existing goal-aware
  ordering. **No-op without a goal profile** — existing storefronts unchanged.
- **Builder** — `BuilderExperiencePanel` (conversion/health/goal + per-section
  impact) next to the existing Business Health badge.
- **Super Admin** — experience analytics page.

## Constraints honoured

- No AI, no duplicate Experience Runtime, no duplicate page composition.
- Registry-driven, configuration-driven, DDD, SOLID, DRY.
- Consumes RuntimeContext only; never rebuilds the WebsiteAggregate.
- Conversion Readiness does **not** change current Business Health calculations
  (feeds a future version).

## See also

- `docs/section-intelligence.md` — the section registry.
- `docs/conversion-readiness.md` — the derived score.
- `docs/experience-composition.md` — ordering + adaptive visibility.
- `docs/implementation-69-report.md` — verification report.
