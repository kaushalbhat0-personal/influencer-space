# Business Health Trends

RCCF-EPIC-07 · Phase 5.

`src/modules/business-health/infrastructure/history-store.ts` +
`application/trend.ts`

Per the derived-projection principle, trends come from **immutable
projections** — append-only snapshots of the live score, never mutable state.

## Immutable projections

A projection is a snapshot:

```ts
interface HealthProjection {
  recordedAt: string;
  overallScore: number;
  grade: HealthGrade;
  dimensions: Array<{ id: HealthDimensionId; score: number }>;
}
```

`record()` appends a projection only when due:

- no prior projection,
- a **new calendar day** (daily cadence), or
- a **significant change** (±10 points).

Projections are stored in the `health_history` Setting as an append-only list
(capped at ~730 daily points). Underlying runtimes remain the canonical source;
the history is only their synthesized view.

## Trend

```
computeTrend(current, previous):
  previous === null          → "new"
  current - previous > 2     → "improving"
  current - previous < -2    → "declining"
  otherwise                  → "stable"
```

## Events (Phase 15)

When a projection is recorded, the Event Runtime emits:

- `business-health.updated` (with overall + grade)
- `business-health.grade.changed` (from → to) when the grade moves

## Public API

```
businessHealthRuntime.getHistory(tenantId)   // immutable projections
businessHealthRuntime.getTrend(tenantId)     // improving/stable/declining/new
businessHealthRuntime.record(tenantId)       // append when due
businessHealthRuntime.compare(a, b)          // two-creator comparison
```
