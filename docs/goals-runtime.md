# Creator Goals Runtime

RCCF-EPIC-05 — Launch Readiness Initiative, Phase 7.

A canonical **Creator Goals Runtime** that understands **what a creator wants
to achieve** and adapts the generated website, navigation, Builder
recommendations, dashboard guidance, commerce ordering and future AI
suggestions around those goals.

Goals **compose with knowledge — never replace it**:

| | Answers | Example |
| --- | --- | --- |
| Knowledge | Who are you? | Fitness Coach · Offers Online Coaching · Has Products · Has Testimonials |
| Goals | What are you trying to achieve? | Primary: Get More Bookings · Secondary: Grow Newsletter · Tertiary: Sell Digital Programs |

```
Creator
  │
  ▼
Knowledge Runtime ──► Goals Runtime ──► Goal Registry
  │                                      │
  │                  ┌───────────────────┼───────────────────┐
  │                  ▼                   ▼                   ▼
  │            Website              Dashboard          Builder
  │            Composition          Recommendations    Hints
  │                  │
  │                  ▼
  │             Storefront
  └──────────────► (Goal Alignment Score)
```

## Core principle

Goals are **not a single selection** — they are a **weighted profile**.

| Goal | Weight |
| --- | --- |
| Get Bookings | 60% |
| Sell Products | 25% |
| Build Email List | 15% |

This gives every consumer of the runtime (homepage ordering, navigation,
Builder suggestions, and the future Recommendation Runtime) the ability to make
nuanced decisions — and lets creators **evolve** their business (coaching-first
→ digital-products-first) by changing weights, never by replacing the model.

## Module

`src/modules/goals-runtime/` (DDD: domain / application / infrastructure /
presentation).

| Layer | File | Responsibility |
| --- | --- | --- |
| Domain | `domain/types.ts` | `GoalDefinition`, `GoalProfile` (weighted), `GoalAlignment`, `GoalCounts`, milestone/suggestion types |
| Domain | `domain/registry.ts` | `GOAL_REGISTRY` — 14 canonical goals |
| Domain | `domain/goal-packs.ts` | Base goal weights per entity type |
| App | `application/recommendation-engine.ts` | Phase 3 — deterministic goal recommendation |
| App | `application/profile-service.ts` | Phase 2 — weighted profile + persistence |
| App | `application/composition.ts` | Phase 4 — homepage ordering |
| App | `application/navigation.ts` | Phase 5 — navigation ordering |
| App | `application/commerce.ts` | Phase 8 — commerce ordering |
| App | `application/builder-suggestions.ts` | Phase 7 — Builder goal suggestions |
| App | `application/milestones.ts` | Phase 9 — goal-aware milestones |
| App | `application/alignment.ts` | Phase 10 — Goal Alignment score |
| App | `application/dashboard.ts` | Phase 6 — dashboard goal card data |
| App | `application/goal-runtime.ts` | Orchestrator (Phase 11 contract) |
| Infra | `infrastructure/goal-source.ts` | Goal counts (snapshot + orders) |
| Pres | `presentation/goal-profile-editor.tsx` | `/admin/goals` weighted editor |
| Pres | `presentation/goal-dashboard-card.tsx` | Dashboard Business Goal card |
| Pres | `presentation/goal-alignment-card.tsx` | Goal Alignment display |
| Pres | `presentation/goal-builder-suggestions.tsx` | Builder recommendations panel |

## Integration points

- **Storefront** (`src/app/[domain]/page.tsx`): with a goal profile set,
  navigation and homepage sections are re-ordered at render time (hero first,
  footer last preserved). With no profile it is a strict no-op — existing
  storefronts behave identically.
- **Dashboard** (`/admin/dashboard`): `GoalDashboardCard` shows primary goal,
  progress (goal alignment), missing items and a CTA.
- **Goals page** (`/admin/goals`): weighted profile editor + recommendations +
  milestones. Added to the admin sidebar under **Profile**.
- **Builder** (`/builder`): `GoalBuilderSuggestions` panel in the Website side.
- **Knowledge Dashboard** (`/admin/knowledge`): Goal Alignment appears as an
  󠀠eighth storefront-quality dimension.
- Server actions: `src/actions/goals.actions.ts` (`getGoalsRuntime`,
  `saveGoalProfile`, `applyRecommendedGoals`, `clearGoalProfile`,
  `getGoalBuilderSuggestions`), re-exported from `src/actions/index.ts`.

## Persistence

`creator_goals` Setting: `{ weights, updatedAt, source, entityType }`.

## Constraints honoured

- **No AI calls** — fully deterministic.
- **No duplicate registries** — one `GOAL_REGISTRY`; everything derives from it.
- **No duplicate builder logic** — suggestions reuse knowledge-runtime missing
  fields; ordering is a read-only transform.
- **Preserve all existing runtimes** — Knowledge, Experience, Theme, Blueprint,
  Commerce and Success runtimes are untouched; the storefront score gains an
  optional Goal Alignment dimension with unchanged default behaviour.

## See also

- `docs/goal-registry.md` — the 14 goals.
- `docs/goal-composition.md` — how goals order the site.
- `docs/goal-alignment.md` — the alignment score.
- `docs/implementation-66-report.md` — verification report.
