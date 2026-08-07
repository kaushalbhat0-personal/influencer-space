# Communication Runtime — RCCF-TRACK-02

The canonical communication layer. Business runtimes **never send** — they emit
events; this runtime routes, templates, delivers, records and retries.

```
Business Runtime
  ↓ Event Runtime (canonical events)
Communication Runtime
  ├─ Registry (declarative templates)
  ├─ Template Runtime ({{variables}}, no HTML in logic)
  ├─ Provider Adapters (email / in_app / alert + future sms, whatsapp, push)
  ├─ Notification Center (in-app, preferences)
  ├─ Delivery Log (auditable history)
  └─ Retry Runtime (queue, DLQ, backoff, manual retry)
```

## Module (DDD)

```
src/modules/communication/
  domain/types.ts          channels, audiences, templates, recipients
  application/registry.ts  canonical COMMUNICATION_REGISTRY
  application/templates.ts render + validate {{variables}}
  application/adapters.ts  provider adapter interface + email/in_app/alert adapters
  application/runtime.ts   send, notifications, preferences, retry, history, health
  application/event-wiring.ts  Runtime Event → communication mapping
  index.ts
```

## Design

- **Registry** — every communication declares id, name, audience, priority,
  channel, category, template, retries, throttle, required data. Declarative.
- **Adapters** — `CommunicationProviderAdapter` (deliver). Email (durable log
  for launch), In-App + Admin Alert write the Notification table. SMS / WhatsApp
  / Push / Slack / Discord are future adapters — no provider lock-in.
- **Event wiring** — `subscribeCommunicationEvents()` registers on the Event
  Runtime (idempotent, module scope). Deterministic event → template mapping.
- **Retry** — failed deliveries stay queued up to `maxRetries`; DLQ beyond that;
  manual retry from the Communication Center.

## Success criteria

✅ Every runtime communicates only through the Event Runtime · ✅ all emails
template-driven · ✅ every user has a Notification Center · ✅ auditable history
· ✅ failed deliveries retryable · ✅ full super-admin observability · ✅
providers replaceable through adapters · ✅ one canonical layer, launch + future
expansion ready.
