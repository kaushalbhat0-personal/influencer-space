# Runtime Context

RCCF-INTEGRATION-01 · Phase 1.

`src/modules/runtime-context/`

One request-scoped context that carries every runtime's output, assembled from a
**single** WebsiteAggregate build. Every platform surface consumes this context
instead of rebuilding data. Zero global state; performance + consistency only.

## What it fixes

Before this change, a single dashboard render built the WebsiteAggregate
snapshot **3 times**:

| Caller | Snapshot builds | Score computations |
| --- | --- | --- |
| `knowledgeScoreService.evaluate` | 1× | knowledge + storefront |
| `goalRuntime.evaluate` | 1× | goal alignment + counts |
| `recommendationRuntime.getRecommendations` | 1× | knowledge + storefront + alignment + counts |

≈ **57 duplicate DB queries** and duplicated score math per render.

After: the `RuntimeContextBuilder` builds the snapshot once and every runtime
evaluates **from that snapshot** (no rebuilds, no re-scoring).

## Interface

```ts
interface RuntimeContext {
  tenantId: string;
  snapshot: KnowledgeSnapshot;       // single aggregate build
  knowledge: KnowledgeRuntimeResult; // score, questions, hints, pack
  goals: GoalRuntimeResult;          // profile, alignment, milestones, ordering
  success: CreatorSuccessData | null; // milestones, completion, next task
  recommendations: Recommendation[];  // scored next actions
  storefrontScore: StorefrontScore;   // incl. Goal Alignment dimension
  health: HealthReport;               // platform health engine
  metrics: DashboardMetrics;          // canonical dashboard metrics
}
```

## Builder

`application/builder.ts`

- `runtimeContextBuilder.build(tenantId, options?)` — builds the snapshot once,
  then evaluates Knowledge, Goals, Success, Recommendations, Storefront Score,
  Health and Metrics from it.
- React.cache() provides **request-scoped** memoization in Next.js server
  contexts (with a plain-function fallback for node test environments).
- `options.markShown` (default true): super-admin reads pass `false` so viewing
  a tenant never mutates its recommendation history.

## Runtime refactors that make this possible

- `knowledgeScoreService.evaluateFromSnapshot(snapshot)` — evaluate without
  building the snapshot.
- `goalRuntime.evaluateFromSnapshot(snapshot, tenantId)` / `evaluateFrom(...)`.
- `recommendationContextSource.buildFromSnapshot(snapshot, tenantId)` +
  `recommendationRuntime.getRecommendationsFrom(ctx, tenantId, markShown?)`.

## Consumers

- **Dashboard** (`getDashboardData`) — one build replaces three.
- **Knowledge page** (`/admin/knowledge`) — one build feeds knowledge + goals +
  recommendations.
- **Goals page** (`/admin/goals`) — one build.
- **Super Admin tenant page** (`/super-admin/tenants/[id]`) — the intelligence
  console reads the context with `markShown: false`.

## Constraint

No runtime may rebuild the WebsiteAggregate independently. New consumers read
the shared context.
