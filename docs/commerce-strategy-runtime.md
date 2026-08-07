# Commerce Strategy Runtime — RCCF-IMPLEMENTATION-73

The canonical runtime that determines how money flows for every commercial
transaction.

```
Checkout                        Commerce flows
   │                                │
   └──────────▶ resolveCommerceStrategy() ◀────────┐
                    │   (tenant → workspace →      │
                    │    platform → PLATFORM_COLLECT)│
                    ▼                              │
              Strategy + definition  ──────────────┘
                    │
                    ▼
              Execution (today: PLATFORM_COLLECT)
```

Every commerce flow asks **one question** — "which strategy does this tenant
use?" — and reads the declarative definition. No branching in consumers.

## Module (DDD)

```
src/modules/commerce-strategy/
  domain/types.ts         CommerceStrategyId, CommerceStrategyDefinition,
                          ResolvedCommerceStrategy, StrategyReadiness
  application/registry.ts  declarative COMMERCE_STRATEGY_REGISTRY
  application/runtime.ts   resolution engine (request-cached)
  presentation/strategy-badge.tsx  read-only badge
  index.ts                 public API
```

## Resolution (Phase 3)

`resolveCommerceStrategy(tenantId)` — priority:

1. **Tenant override** — `Setting(tenantId, "commerce_strategy")`.
2. **Workspace override** — `Workspace.metadata.commerceStrategy`.
3. **Platform default** — `Setting(platformTenant, "commerce_strategy_default")`.
4. **PLATFORM_COLLECT** (default).

Request-cached per tenant; the Runtime Context builder resolves it once and
every consumer reads the context — no duplicated queries.

## Runtime Context (Phase 4)

`RuntimeContext.commerceStrategy` is added to the single canonical context
(`runtime-context/application/builder.ts`). Consumers never read the database
for the strategy.

## Consumers (Phases 5–6)

- **Checkout** (`checkout.actions.ts`) resolves the strategy and stamps it into
  the Razorpay order notes. **No payment/routing behavior change.**
- Products / services / courses / bookings / affiliates all resolve through the
  runtime when they need a strategy — no duplicated branching.

## Events (Phase 10)

`commerce.strategy.resolved` · `commerce.strategy.changed` — emitted through the
Event Runtime (durable AnalyticsEvent rows) for analytics.

## Health (Phase 11)

Strategy readiness is reported in the revenue runtime health:
`PLATFORM_COLLECT` → ready; future/reserved strategies → incomplete (with the
requirement, e.g. linked account). `getCommerceStrategyReadiness(tenantId,
strategy)` returns per-requirement met/unmet.
