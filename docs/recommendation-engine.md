# Recommendation Engine

RCCF-EPIC-06 — Phase 2, Phase 3.

`src/modules/recommendation-runtime/application/engine.ts`

The engine consumes the assembled `RecommendationContext` and a history map,
then produces the scored, sorted recommendation list. It is pure and
deterministic — no I/O, no AI.

## Context assembly

`infrastructure/context-source.ts` builds the context from existing runtimes:

| Source | Runtimes |
| --- | --- |
| `snapshot` | Knowledge Runtime (`knowledgeAggregateSource`) |
| `knowledgeScore` / `storefront` | Knowledge Runtime (+ Goal Alignment dimension) |
| `activeProfile` | Goals Runtime (persisted or deterministically recommended) |
| `success` | Success Runtime (`getCreatorSuccess`) |
| `counts` / `metrics` | Commerce counts + live metrics (publish state, analytics events) |

## Filtering

A recommendation is included only when:

1. not `dismissed` / `completed` / `ignored` in history,
2. `when(ctx)` is true,
3. `done(ctx)` is false (it is genuinely still open),
4. all `prerequisites` are complete.

## Goal integration (Phase 7)

`goalAffinity` on each recommendation drives the goal-alignment scoring term, so
booking creators rank booking improvements first, commerce creators rank
commerce improvements, and portfolio creators rank gallery improvements — with
no separate filtering logic.

## Knowledge integration (Phase 6)

`knowledgeDependencies` feed both the knowledge-gap term and the
"Missing: X" reasons. Recommendations are ordered by impact — the knowledge
dashboard shows them instead of a flat missing-fields list.

## Success integration (Phase 10)

Success milestones complete the underlying work; because the recommendation's
`done(ctx)` reads the same real data, milestones automatically complete
recommendations. No duplicate logic — the engine reads the Success Runtime
result, it never re-implements milestone checks.

## Commerce integration (Phase 9)

Commerce recommendations chain through prerequisites:

```
No products            → CREATE_FIRST_PRODUCT
Product exists, no
images/descriptions    → CREATE_DIGITAL_PRODUCT
Orders = 0             → ADD_TESTIMONIALS (proof to convert)
```

## Categories (Phase 3)

`application/categories.ts` groups recommendations into Critical · High Impact
· Quick Wins · Growth · Optimization · Advanced, each ordered by score.
