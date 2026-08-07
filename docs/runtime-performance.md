# Runtime Performance

RCCF-INTEGRATION-01 · Phase 10.

## The problem

The RCCF-AUDIT-06 measured **3× WebsiteAggregate builds per dashboard render**
(~57 duplicate DB queries), duplicated score calculations and no caching on the
intelligence pipeline.

## What changed

### 1. Single snapshot per request

`getDashboardData` previously ran `knowledgeScoreService.evaluate` +
`goalRuntime.evaluate` + `recommendationRuntime.getRecommendations`, each
building the full aggregate. Now it calls `runtimeContextBuilder.build` once.

| Computation | Before | After |
| --- | --- | --- |
| `buildSnapshot` (~19 queries) | 3× | **1×** |
| `computeKnowledgeScore` | 2× | **1×** |
| `computeStorefrontScore` | 2× | **1×** |
| `computeGoalAlignment` | 2× | **1×** |
| `buildGoalCounts` | 2× | **1×** |
| `getCreatorSuccess` (7 queries) | 1× | 1× |

The same single-build pattern is used by `/admin/knowledge`, `/admin/goals` and
the Super Admin tenant page.

### 2. Request-scoped memoization

`RuntimeContextBuilder` wraps the build in React.cache() — repeated `build()`
calls within a request share the result. Zero global state.

### 3. No mutation on read

Recommendation history `markShown` is a **conditional** upsert (only on first
impression) and super-admin reads pass `markShown: false`, so viewing a tenant
never writes to its history.

### 4. Pure helpers for client bundles

Goal ordering helpers were extracted into a prisma-free module
(`weights.ts`, `commerce.ts`) so client components can use goal-aware commerce
ordering without pulling the DB layer into the browser bundle.

## Persisted scores (Phase 10)

`knowledge_score` is persisted on save and exposed via `loadPersistedScore`
(read-model for diagnostics/super-admin). Live evaluation remains the source of
truth for creator surfaces; the persisted record supports cross-tenant analysis
without re-computation.

## Verification

- Unit: 98 files / 1952 tests passing.
- Build: `next build` green.
- The duplication measurement from the audit (3× snapshot, 2× scores) is
  eliminated for the wired surfaces.

## Remaining opportunities (documented, not in scope)

- Route storefront rendering + builder canvas through the shared context.
- Per-request memo of the storefront goal-profile read.
- A `knowledge_score` read-back cache with TTL for dashboards that tolerate
  slight staleness.
