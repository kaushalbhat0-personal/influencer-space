# Delivery Engine — RCCF-TRACK-02

## Pipeline

```
sendCommunication(templateId, recipient, data)
  → registry lookup → render subject/body
  → CommunicationLog(queued)
  → adapter.deliver(...)
  → delivered (log updated)   |   failed (retries++, re-queued or DLQ)
```

## Retry runtime (Phase 14)

- A failed delivery stays `queued` with `retries++` up to the template's
  `retries` (exponential backoff, capped at 60s).
- Beyond max retries → `failed` (dead-letter queue).
- `retryFailedCommunications()` re-processes queued items; manual retry from the
  Super Admin Communication Center.
- No duplicate retries: status transitions are guarded (only `queued` re-runs).

## History (Phase 13)

`CommunicationLog` persists recipient, template, payload, channel, provider,
status, retries, error, timestamps — fully auditable. Opened/clicked are
future-ready fields.

## Health (Phase 17)

`getCommunicationHealth()` — total, delivered, failed, queued, 24h volume,
failure rate. Surfaced in `/super-admin/communication`.

## Performance (Phase 19)

- Background-friendly: send + retry are discrete callable operations (a cron
  can drive `retryFailedCommunications`).
- Request-cached unread counts; paginated history.
- Minimal DB writes (one log create + one update per send; no N+1).

## Security (Phase 18)

- Recipients resolve from the session (tenant/agency/system) — no cross-user
  reads.
- Payloads stored are the communication payloads (no secrets); email addresses
  come from the session.
- Preference-aware: `none` categories are skipped.
- Rate/throttle policies declared per template.
