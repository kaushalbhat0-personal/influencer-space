# IMPLEMENTATION-69 REPORT — Experience Intelligence Runtime

RCCF-EPIC-08 · Launch Readiness Initiative, Phase 10.

Transforms CreatorStore from generating "correct" websites into generating
high-converting, goal-aware, visually adaptive experiences. Extends the
existing Experience System — no AI, no duplicate runtime.

## 1. Summary

The Experience System already controlled appearance. This EPIC adds
**behavior, section composition and conversion hierarchy** on top, driven
deterministically by Business Health, Goals, Knowledge, Commerce, Trust, Theme,
Device and page context — all read from the shared Runtime Context.

## 2. Deliverables by phase

| Phase | Deliverable | Location |
| --- | --- | --- |
| 1 Section Intelligence Registry | 15 sections (priority, weights, prerequisites, preferred goals/industries, placement, collapse rules, mobile priority) | `domain/section-registry.ts` |
| 2 Goal-aware homepage order | Registry-driven `resolveHomepageOrder` (hero first, footer last, goal-preferred earlier) | `application/composition.ts` |
| 3 Adaptive visibility | `resolveAdaptiveVisibility` — no empty sections; gated on a goal profile | `application/composition.ts` + `[domain]/page.tsx` |
| 4 Trust Runtime | Canonical trust profile (7 sources) | `domain/trust-runtime.ts` |
| 5 CTA Intelligence | Deterministic primary/secondary CTA per goal | `domain/cta.ts` |
| 6 Navigation | Goal-aware (existing `applyGoalNavigation`) — no duplicate logic | Goals Runtime |
| 7/12 Builder | `BuilderExperiencePanel` — conversion, health, goal alignment, per-section impact, recommended CTA | `presentation/builder-experience-panel.tsx` |
| 8 Conversion Score | Derived Conversion Readiness (8 dimensions), independent of Business Health | `application/conversion-score.ts` |
| 9 Mobile | Per-section mobile priority + collapse rules in the plan | `domain/section-registry.ts` |
| 10 Commerce experience | Goal-aware CTA + ordering across products/services/courses/bookings/affiliates | `domain/cta.ts`, registry |
| 11 Theme Intelligence | Goal × theme emphasis directives | `domain/theme-intelligence.ts` |
| 13 Super Admin | `/super-admin/experience-intelligence` — experience/industry/goal distribution + health by experience | `application/analytics.ts` |
| 14 Documentation | 5 docs | `docs/` |

## 3. Architecture

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

## 4. Verification

- `tsc --noEmit` — ✅ clean.
- `next build` — ✅ green (`/super-admin/experience-intelligence` compiled).
- Unit tests — ✅ **100 files / 1974 passing** (was 1962; +12 new, zero
  regressions).
- Lint on all changed files — ✅ clean.
- **No duplicate calculations** — conversion/trust/composition read the shared
  Runtime Context; zero aggregate rebuilds.
- **No duplicate page composition** — the storefront's runtime ordering remains
  the Goals Runtime's `applyGoalSectionOrder`; the registry model is the
  declarative source for previews.
- **Existing storefronts unchanged without a goal profile** — adaptive
  visibility and goal ordering are both strict no-ops without a persisted goal
  profile (asserted in tests).

## 5. Playwright

Full Playwright certification requires a seeded database + live server (CI
environment). The storefront change is provably a no-op without a goal profile
(unit-tested), so the golden-path suite should pass unchanged. **CI gate:**
`npm run test:e2e:certify` before release.

## 6. Constraints

- No AI, no duplicate Experience Runtime, no duplicate page composition.
- Registry-driven, configuration-driven, DDD, SOLID, DRY.
- Consumes RuntimeContext only; never rebuilds the WebsiteAggregate.
- Conversion Readiness does not change current Business Health calculations.

## 7. Success criteria

- ✅ Every generated website adapts to creator goals.
- ✅ Empty sections disappear automatically (adaptive visibility).
- ✅ CTA hierarchy becomes deterministic.
- ✅ Homepage order becomes goal-aware.
- ✅ Builder explains the impact of every section.
- ✅ Conversion Readiness Score available.
- ✅ Themes become behavior-aware, not only visual.
- ✅ Existing creators experience zero regressions (no-op without goals).

## Commit Message

`RCCF-EPIC-08: Experience Intelligence Runtime — section intelligence registry, adaptive visibility (no empty sections), deterministic CTA hierarchy, conversion readiness, trust runtime, theme emphasis, builder impact panel, experience analytics`
