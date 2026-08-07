# Runtime Event Contract

RCCF-INTEGRATION-01 · Phase 9.

`src/modules/event-runtime/`

A canonical, internal event layer. Every runtime emits typed events that become
future inputs for the Insights, Automation and Business Health runtimes. No
external queues — an internal bus with a durable AnalyticsEvent record.

## Contract

```ts
interface RuntimeEvent {
  type: IntelligenceEventType;
  tenantId: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
}
```

| Event | Emitter |
| --- | --- |
| `knowledge.completed` | `saveKnowledgeAnswers`, onboarding quick answers |
| `goal.updated` | `saveGoalProfile`, `applyRecommendedGoals`, onboarding goals |
| `recommendation.accepted` | `completeRecommendation` |
| `recommendation.dismissed` | `dismissRecommendation` |
| `storefront.published` | `publishWebsite` |
| `onboarding.completed` | `markOnboardingComplete` |
| `milestone.unlocked` | (future — needs before/after success diff) |
| `theme.changed`, `builder.published`, `commerce.created`, `booking.received`, `product.created`, `generation.completed` | (declared, wired in a follow-up) |

## API

```ts
runtimeEventBus.subscribe(type, handler)  // returns unsubscribe
runtimeEventBus.publish(event)            // fires handlers, then persists
emitEvent(type, tenantId, entityId?, payload?)  // best-effort helper
```

## Durability

Events are persisted to the existing `AnalyticsEvent` table
(`source: "runtime"`), so the layer survives restarts without any external
queue. Persistence is best-effort — an emit failure never breaks the platform
flow.

## Side effect

Because runtime events are written to `AnalyticsEvent`, a tenant using the
intelligence layer satisfies the `ENABLE_ANALYTICS` recommendation's
`analyticsActive` signal — accurate, since the event layer IS platform
analytics.

## Guarantees

- Internal bus only — no external queues, no new infrastructure.
- Handler failures never propagate.
- Read surfaces never emit (super-admin reads pass `markShown: false`).
