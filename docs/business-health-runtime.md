# Business Health Runtime

RCCF-EPIC-07 · Launch Readiness Initiative, Phase 9.

A canonical **Business Health Runtime** that combines all existing platform
intelligence into a single **Business Health Score (0–100)** — the creator's
north-star KPI and the optimization target for the Recommendation Runtime.

It **does not replace** any runtime. It **composes**:

- Identity Runtime
- Knowledge Runtime
- Goals Runtime
- Success Runtime
- Recommendation Runtime
- Storefront Quality Runtime
- Commerce Runtime
- Runtime Context

No AI. No duplicate calculations. No duplicate scoring systems. Everything
derives from existing runtimes.

## Philosophy

| Runtime | Answers |
| --- | --- |
| Knowledge | Who are you? |
| Goals | What do you want? |
| Success | What have you achieved? |
| Recommendations | What should you do next? |
| **Business Health** | **How healthy is your creator business?** |

## Derived projection

Per the architectural enhancement, Business Health is **not an independent
source of truth** — it is a **derived projection**:

```
Runtime Context
        │
        ▼
Business Health Engine
        │
        ▼
Business Health Projection
```

The engine computes the live score from existing runtime outputs. Snapshots for
trends are stored as **immutable projections** (daily or on significant
changes), never as mutable state. The underlying runtimes remain canonical; the
score is simply their synthesized view.

## Architecture

```
Knowledge / Goals / Success / Recommendation / Storefront / Commerce
                                │
                                ▼
                          Runtime Context
                                │
                                ▼
                        Business Health Engine
                                │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
         Dashboard         Super Admin       Recommendation
```

## Module

`src/modules/business-health/` (DDD: domain / application / infrastructure /
presentation).

| Layer | File | Responsibility |
| --- | --- | --- |
| Domain | `domain/types.ts` | `BusinessHealth`, `HealthDimension`, `HealthProjection`, grades/trend types |
| Domain | `domain/registry.ts` | `HEALTH_DIMENSION_REGISTRY` — 12 dimensions, weights, thresholds, extractors, section contributions |
| App | `application/engine.ts` | `computeBusinessHealth(ctx, deps)` — weighted score from RuntimeContext only |
| App | `application/grades.ts` | Grade bands (A+…F) + next milestone |
| App | `application/trend.ts` | Improving / stable / declining / new |
| App | `application/runtime.ts` | Public API — evaluate, record, getHistory, getTrend, compare, platformHealth |
| Infra | `infrastructure/history-store.ts` | Immutable health projections |
| Pres | `presentation/business-health-hero.tsx` | Dashboard hero |
| Pres | `presentation/business-health-badge.tsx` | Builder health + section contribution |
| Pres | `presentation/platform-health-view.tsx` | Super Admin platform health |

## Public API (Phase 16)

```
businessHealthRuntime.evaluate(tenantId)      // live score + trend (no writes)
businessHealthRuntime.record(tenantId)        // append projection when due
businessHealthRuntime.getHistory(tenantId)
businessHealthRuntime.getTrend(tenantId)
businessHealthRuntime.compare(a, b)
businessHealthRuntime.platformHealth()        // Super Admin platform view
```

## Consumers

- **Dashboard** — `BusinessHealthHero` (score, grade, trend, recommended focus,
  next milestone, expandable dimension breakdown); computed from the SAME
  Runtime Context (no second build) and recorded once per day.
- **Builder** — `BusinessHealthBadge` (score + selected section's contribution).
- **Super Admin** — `/super-admin/business-health` platform aggregates + the
  tenant page intelligence console headline.
- **Recommendation Runtime** — every recommendation now declares an expected
  `healthLift`.

## Constraints honoured

- No AI, no duplicate scores, no duplicate DB queries, no duplicate runtime
  logic.
- Consumes RuntimeContext only; never rebuilds the WebsiteAggregate.
- Existing runtimes unchanged.

## See also

- `docs/business-health-scoring.md` — how the score is computed.
- `docs/business-health-registry.md` — the 12 dimensions.
- `docs/business-health-trends.md` — projections and trends.
- `docs/implementation-68-report.md` — verification report.
