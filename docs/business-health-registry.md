# Business Health Registry

RCCF-EPIC-07 · Phase 1, Phase 2.

`src/modules/business-health/domain/registry.ts`

One canonical registry. Every dimension declares:

- `id` + `label` + `description`
- `weight` (relative, configurable)
- `sourceRuntime`
- `healthyThreshold` / `warningThreshold` / `criticalThreshold`
- `improvementRecommendations`
- `scoreExtractor(ctx, deps)` — reads ONLY the shared Runtime Context
- `dataAvailable(ctx, deps)` — drives confidence

## The 12 dimensions

| Dimension | Weight | Source runtime |
| --- | --- | --- |
| Knowledge | 20 | Knowledge |
| Goal Alignment | 15 | Goals |
| Storefront Quality | 15 | Knowledge (Storefront Score) |
| Success Progress | 15 | Success |
| Commerce Readiness | 10 | Commerce |
| Brand | 5 | Knowledge |
| Trust | 5 | Knowledge |
| SEO | 5 | Knowledge |
| Platform Configuration | 5 | Platform / Commerce |
| Recommendation Adoption | 3 | Recommendation |
| Performance | 2 | Runtime Context |
| Future Ready | 0 | All runtimes |

## Section contributions (Phase 14)

`SECTION_HEALTH_CONTRIBUTION` maps builder section base ids to the dimensions
they influence — used by the builder health badge:

```
hero → brand, knowledge, seo, trust
products → commerce, knowledge, storefront_quality
gallery → storefront_quality, trust
testimonials → trust, goal_alignment
newsletter → goal_alignment, future_ready
… etc
```

## Derived-projection principle

The registry never owns business data. It only defines *how* to read each
dimension from the context. The engine is a thin loop over the registry — no
field knowledge lives in the UI.
