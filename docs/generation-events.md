# Generation Events — RCCF-LAUNCH-TRACK-03

## Canonical event model

All generation progress events flow through the **existing Event Runtime** — no
new event system.

```
generation.started
generation.profile.imported
generation.workspace.created
generation.runtime.initialized
generation.website.generated
generation.content.generated
generation.builder.completed
generation.quality.started
generation.quality.completed
generation.publish.started
generation.publish.completed
generation.dashboard.ready
generation.completed
generation.failed
generation.cancelled
```

## Emitted from the pipeline

The generation pipeline (`runCreatorGeneration`) emits the canonical events at
the real boundaries:

| Event | When |
| --- | --- |
| generation.started | session starts |
| generation.profile.imported | profile import completes |
| generation.publish.started | publishing begins |
| generation.publish.completed | publish succeeds |
| generation.dashboard.ready | session marked complete |
| generation.completed | full success |
| generation.failed | provisioning or publish failure (with stage + error) |

## Durability

Events persist as `AnalyticsEvent` rows (durable) via the Event Runtime, so the
Super Admin Generation Monitor and the Communication Runtime can consume them.
