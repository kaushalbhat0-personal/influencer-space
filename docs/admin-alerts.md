# Admin Alerts — RCCF-TRACK-02

## Canonical alert templates

Super Admin alerts are first-class communications in the registry (channel
`alert`, audience `super_admin`, recipient "system"):

| Id | Trigger |
| --- | --- |
| alert.failed_generation | commission.failed (generation/commission failures) |
| alert.webhook_failure | webhook failures |
| alert.communication_failure | delivery failures surfaced in the retry runtime |

## Delivery

`AdminAlertAdapter` writes a `system`-category Notification for the super_admin
audience, so alerts appear in a super-admin notification stream and in the
Communication Center's delivery log. Rate/throttle policies (e.g. 1/hour) keep
failure storms from flooding the queue.

## Categories

All alerts are categorized `system` with high priority — the Communication
Center groups them and surfaces failed/queued counts.

## Extending

New alerts = a registry entry + a `handleRuntimeEvent` rule (or an explicit
`sendCommunication("alert.*", …)` call from an operations flow). No duplicated
notification logic.
