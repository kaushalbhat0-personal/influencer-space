# Commission Runtime — RCCF-IMPLEMENTATION-72

## Activation

`src/lib/commission/runtime.ts` — `recordSubscriptionCommission` is the single
commission entry point. It is **transactional** (CommissionEntry + PartnerLedger
in one `$transaction`) and **idempotent** (per-invoice check, plus webhook-level
`BillingEvent.idempotencyKey`).

## Rule hydration (Phase 2)

The old in-memory `ruleEngine` (never seeded, lost on serverless restarts) is
replaced by DB reads:

```
resolveSplitSource(partnerId, planCode, tenantId)   [request-cached]
  1. CommissionRule where status=active, priority asc
     partnerRule (partnerId) → planRule (metadata.planCode) → defaultRule (type)
  2. AgencyTenant.revSharePercent
  3. CommissionPolicy.agencyDefaultShare
  4. 80/20
```

No bootstrap dependency, no manual reloads — rules always resolve.

## Idempotency + failure handling (Phase 3)

- `already-recorded`: skips when a `CommissionEntry` exists for the invoice.
- `no-partner`: creator subscription without an agency — no commission.
- Real failures **surface** to the caller (captured + `commission.failed` event)
  instead of being swallowed.

## Unit integrity

Rupees end-to-end; `computeSubscriptionSplit` rounds to paise and guarantees
`platformShare + partnerShare === amount`. Verified in
`tests/unit/revenue-runtime.test.ts`.

## Files

- `src/lib/commission/runtime.ts` — attribution, split, record, reporting, health.
- `src/modules/billing/application/service.ts` — webhook calls
  `recordSubscriptionCommission` for `activate`/`renew` (created/renewed/upgraded).
- `src/modules/event-runtime/domain/types.ts` — canonical revenue event types.
