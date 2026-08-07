# Goal Registry

RCCF-EPIC-05 — Phase 1.

`src/modules/goals-runtime/domain/registry.ts`

One canonical registry of creator goals. Every goal declares:

- `id` — e.g. `GET_BOOKINGS`
- `label` + `description`
- `icon` — lucide icon key (mapped in presentation)
- `category` — `conversion | revenue | audience | brand | engagement`
- `priority` — default recommendation priority
- `applicableTypes` — entity types (knowledge packs) the goal suits (empty = all)
- `supportedSections` — blueprint section base ids the goal surfaces
- `sectionOrderHint` — preferred homepage order (most → least important)
- `navigationPriority` — preferred nav order
- `dashboardRecommendations` — recommended dashboard actions
- `commercePriority` — `products | bookings | courses | services | null`
- `seoPriority` — `local | commerce | content | portfolio | trust`
- `supportingKnowledge` — knowledge-runtime field ids that build this goal
- `milestonePath` — goal-aware milestone plan
- `suggestions` — contextual Builder suggestion templates

## The 14 goals

| id | label | commerce | category |
| --- | --- | --- | --- |
| `GET_BOOKINGS` | Get Bookings | bookings | conversion |
| `SELL_PRODUCTS` | Sell Products | products | revenue |
| `SELL_COURSES` | Sell Courses | courses | revenue |
| `SELL_SERVICES` | Sell Services | services | revenue |
| `BUILD_EMAIL_LIST` | Build Email List | — | audience |
| `GROW_YOUTUBE` | Grow YouTube | — | audience |
| `BUILD_COMMUNITY` | Build Community | — | engagement |
| `SHOW_PORTFOLIO` | Show Portfolio | — | brand |
| `GENERATE_LEADS` | Generate Leads | services | conversion |
| `PROMOTE_EVENTS` | Promote Events | products | conversion |
| `FIND_CLIENTS` | Find Clients | services | conversion |
| `BUILD_BRAND` | Build Brand | — | brand |
| `INCREASE_TRUST` | Increase Trust | — | brand |
| `MONETIZE_CONTENT` | Monetize Content | products | revenue |

## Weighted profile

Goals are not a single selection — they are a weighted profile stored in the
`creator_goals` Setting:

```ts
interface GoalProfile {
  weights: GoalWeight[];   // { goalId, weight } — sum ≤ 100
  updatedAt: string;
  source: "recommended" | "manual";
  entityType: string;
}
```

`primaryGoal(profile)` returns the highest-weight goal. Creators evolve by
changing weights, never by replacing the model.

## Derivation

- **Recommendation engine** starts from `domain/goal-packs.ts` base weights and
  adjusts with live knowledge signals (see `docs/goals-runtime.md`).
- **Composition / navigation / builder hints / milestones / alignment** all read
  only this registry — there is no goal knowledge anywhere else in the UI.
