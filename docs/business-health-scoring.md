# Business Health Scoring

RCCF-EPIC-07 · Phase 3, Phase 4.

`src/modules/business-health/application/engine.ts`

The engine computes the live Business Health **from the shared Runtime Context
only**. It never rebuilds the WebsiteAggregate and never recalculates existing
scores — it consumes the context's outputs.

## Formula

```
overallScore = round( Σ (dimension.score × dimension.weight) / Σ weight )
```

Each dimension's `scoreExtractor(ctx, deps)` returns a 0–100 value sourced from
an existing runtime:

| Dimension | Source (Runtime Context) |
| --- | --- |
| Knowledge | `knowledge.score.overall` |
| Goal Alignment | `goals.alignment.overall` |
| Storefront Quality | `storefrontScore.overall` |
| Success Progress | `success.completionPercent` |
| Commerce Readiness | `goals.counts` (products/orders/services/courses/bookings/affiliates) |
| Brand / Trust / SEO | `knowledge.score.categories.*.percent` |
| Configuration | `intelligence.published` + custom domain + analytics + theme |
| Recommendation Adoption | recommendation history (completed / shown) |
| Performance | published + live version + analytics |
| Future Ready | goals set + declared facts + history + analytics (weight 0) |

`deps.recommendationHistory` is read **once** by the engine and shared across
dimensions — no duplicate reads.

## Weights (configurable)

```
Knowledge 20 · Goal Alignment 15 · Storefront 15 · Success 15
Commerce 10 · Brand 5 · Trust 5 · SEO 5 · Configuration 5
Recommendation Adoption 3 · Performance 2 · Future Ready 0
```

Weights live in the registry (`DEFAULT_DIMENSION_WEIGHTS`) and can be overridden
per evaluation via `BusinessHealthOptions.weights`.

## Grades (Phase 4)

| Band | Range |
| --- | --- |
| A+ | 95–100 |
| A | 90–94 |
| B | 80–89 |
| C | 70–79 |
| D | 60–69 |
| F | < 60 |

`nextMilestone` = the next 10-point boundary (e.g. 86 → 90).

## Output

```ts
interface BusinessHealth {
  overallScore: number;
  grade: HealthGrade;
  dimensions: HealthDimensionScore[];  // score + weight + status + improvements
  strongestAreas: string[];
  weakestAreas: string[];
  recommendedFocus: string;
  nextMilestone: number;
  confidence: number;                  // fraction of dimensions with real data
}
```

## No duplicate calculations

The engine reads existing outputs — `computeBusinessHealth` performs zero
aggregate builds and zero score recomputation. Verification:
`tests/unit/business-health.test.ts` asserts the Knowledge dimension equals
`ctx.knowledge.score.overall`.
