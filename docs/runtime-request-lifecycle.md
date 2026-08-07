# Runtime Request Lifecycle

RCCF-INTEGRATION-01 · Phase 13.

Every request follows the same pipeline. No runtime may rebuild the
WebsiteAggregate independently.

```
Tenant
  │
  ▼
RuntimeContextBuilder
  │  (builds the WebsiteAggregate ONCE)
  ├── Knowledge   (score, questions, hints, pack)
  ├── Goals       (profile, alignment, milestones, ordering)
  ├── Success     (milestones, completion, next task)
  ├── Recommendations  (scored next actions)
  ├── Storefront Score (incl. Goal Alignment)
  ├── Health      (platform health engine)
  └── Metrics     (dashboard metrics)
  │
  ▼
Consumers
  ├── Dashboard
  ├── Builder
  ├── Storefront
  ├── Super Admin
  ├── Commerce
  ├── Knowledge
  ├── Goals
  ├── Recommendation
  └── Generation (onboarding)
```

## Rules

1. **Single snapshot** — `knowledgeAggregateSource.buildSnapshot` is called once
   per request (inside `RuntimeContextBuilder`). Every runtime evaluates from
   that snapshot via the `fromSnapshot` / `buildFromSnapshot` APIs.
2. **Request-scoped** — React.cache() memoizes the build within the request;
   no global state, no module-level caches.
3. **No mutation on read** — creator-owned reads may mark recommendations
   shown; super-admin reads pass `markShown: false`.
4. **Best-effort extras** — events, seeding and analytics never block the flow.

## Wired surfaces

- `getDashboardData` → one `runtimeContextBuilder.build(tenantId)`.
- `/admin/knowledge` → one build feeds knowledge + goals + recommendations.
- `/admin/goals` → one build.
- `/super-admin/tenants/[id]` → one build (`markShown: false`).

## Not yet on the pipeline (follow-up)

- Storefront rendering and the builder canvas load their own data directly
  (they predate the intelligence stack and only need goals + declared facts,
  both read via single lightweight settings). Fully routing them through the
  Runtime Context is a documented follow-up — behaviour is unchanged today.
