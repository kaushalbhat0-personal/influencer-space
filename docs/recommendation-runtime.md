# Recommendation Runtime

RCCF-EPIC-06 — Launch Readiness Initiative, Phase 8.

A canonical **Recommendation Runtime** that continuously analyzes every
creator's business and determines the **highest-impact next action** using
existing platform intelligence only.

The runtime consumes:

- Knowledge Runtime (who are you?)
- Goals Runtime (what do you want?)
- Success Runtime (what have you achieved?)
- Commerce Runtime (what do you sell?)
- Experience Runtime (what stage are you at?)
- Storefront Quality Score (how good is the site?)
- Dashboard Metrics (what is happening?)

It **never calls AI**, **never invents recommendations**, and **never owns
data** — it computes.

```
Knowledge Runtime
        │
        ▼
Goals Runtime
        │
        ▼
Success Runtime
        │
        ▼
Storefront Score
        │
        ▼
Recommendation Runtime
        │
 ┌────────────┬─────────────┬─────────────┐
 ▼            ▼             ▼
Dashboard   Builder      Admin
Hints       Panel        Analytics
```

## Module

`src/modules/recommendation-runtime/` (DDD: domain / application /
infrastructure / presentation).

| Layer | File | Responsibility |
| --- | --- | --- |
| Domain | `domain/types.ts` | `RecommendationDefinition`, `RecommendationContext`, `Recommendation`, history/analytics types |
| Domain | `domain/registry.ts` | `RECOMMENDATION_REGISTRY` — 25 canonical recommendations |
| App | `application/scoring.ts` | Phase 2 — deterministic score |
| App | `application/categories.ts` | Phase 3 — grouping (Critical / High Impact / Quick Wins / Growth / Optimization / Advanced) |
| App | `application/impact.ts` | Phase 8 — expected impact |
| App | `application/engine.ts` | Pure evaluation (context + history → scored list) |
| App | `application/history.ts` | Phase 11 — recommendation history |
| App | `application/runtime.ts` | Phase 13 — public API + Phase 12 analytics |
| Infra | `infrastructure/context-source.ts` | Assembles the context from existing runtimes |
| Pres | `presentation/next-best-step-card.tsx` | Phase 4 — dashboard card |
| Pres | `presentation/recommended-improvements.tsx` | Phase 6 — knowledge dashboard |
| Pres | `presentation/builder-recommendation-panel.tsx` | Phase 5 — Builder |
| Pres | `presentation/recommendation-analytics.tsx` | Phase 12 — super admin |

## Integration points

- **Dashboard** (`/admin/dashboard`): "Today's Best Next Step" card — expected
  impact, estimated time, affected scores, Open Action, Mark done / Not now.
- **Knowledge Dashboard** (`/admin/knowledge`): Recommended Improvements
  (grouped by category, ordered by impact) replace the flat missing-fields list.
- **Builder** (`/builder`): "Recommended for this section" panel — shows
  recommendations for the currently selected section.
- **Super Admin** (`/super-admin/recommendations`): recommendation analytics.
- Server actions: `src/actions/recommendation.actions.ts` (`getRecommendations`,
  `getTopRecommendation`, `dismissRecommendation`, `completeRecommendation`,
  `refreshRecommendations`), re-exported from `src/actions/index.ts`.

## Persistence

`recommendation_history` Setting (per tenant): `{ [recommendationId]: {
status, shownAt, completedAt, dismissedAt, ignoredAt, completedScores } }`.

## Public API (Phase 13)

```
recommendationRuntime.getRecommendations(tenantId)
recommendationRuntime.getTopRecommendation(tenantId)
recommendationRuntime.dismiss(tenantId, id)
recommendationRuntime.complete(tenantId, id)
recommendationRuntime.refresh(tenantId)
recommendationRuntime.analytics()
```

Future AI consumes this runtime instead of generating its own recommendations.

## Constraints honoured

- **No AI calls** — fully deterministic.
- **Registry-driven, SOLID / DRY** — one registry; everything derives from it.
- **Recommendations derive only from existing runtimes** — the context is
  assembled from Knowledge / Goals / Success / Commerce / Experience /
  Storefront / Metrics.
- **Existing storefronts unchanged; existing dashboards unchanged when the
  runtime is disabled** — the dashboard card is additive.

## See also

- `docs/recommendation-registry.md` — the 25 recommendations.
- `docs/recommendation-engine.md` — how the engine consumes runtimes.
- `docs/recommendation-scoring.md` — the scoring formula.
- `docs/implementation-67-report.md` — verification report.
