# Template Runtime — RCCF-TRACK-02

## Canonical templates

Every communication is declarative in `COMMUNICATION_REGISTRY`:

```
id · name · audience · priority · channel · category
template { subject, body }   ← {{variable}} placeholders
retries · throttle · requiredData
```

Templates live with the registry — no HTML inside business logic, nothing
duplicated across surfaces.

## Rendering

`renderTemplate(template, data)` replaces `{{key}}` with the data value
(unknown placeholders are left untouched). `validateTemplate` reports missing
variables for template/authoring checks.

## Localization + versioning readiness

- Localization-ready: templates are pure strings keyed by id; a locale table
  can be layered without touching business runtimes.
- Versioning: `CommunicationLog.templateId` records which template produced
  every delivery — retro-audit of copy changes is possible.
- Test send: the registry + renderer make previewing a template a pure function
  (used by the Communication Center's observability and future authoring UI).

## Examples

- `subscription.trial_ending`: "Your {{plan}} trial ends in {{days}} day(s)…"
- `order.confirmed`: "You received a new order {{orderId}}…"
- `alert.failed_generation`: "A generation failed: {{error}}…"
