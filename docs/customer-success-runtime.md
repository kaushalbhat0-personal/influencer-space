# Customer Success Runtime — RCCF-EPIC-09

Read-only operational intelligence: "who needs help right now" — derived from
existing runtimes, never creating new business data.

```
Runtime Context · Knowledge · Goals · Recommendations · Business Health ·
Success · Commerce · Payment Account · Dashboard Metrics · Activity
        │
        ▼
loadSignals(tenantId)  /  loadSignalsLight(tenantId)
        │   (one canonical signals bundle)
        ▼
computeFromSignals(signals)
   ├─ Success Score (9 dimensions, 0-100)
   ├─ Journey (10 canonical stages → next milestone)
   ├─ Risk (low → critical + findings)
   └─ Opportunities (deterministic)
```

## Signal sources (no duplicate calculations)

| Signal | Source |
| --- | --- |
| knowledge / goals / health / success / commerce / publish | **Runtime Context** (one aggregate build) |
| payment ready | **Payment Account readiness runtime** |
| recommendations completed | **Recommendation history runtime** |
| subscription / trial | **Billing runtime** |
| last activity | AuditLog |

Two builders feed the **same** engine: `loadSignals` (full context, creator
dashboard) and `loadSignalsLight` (light DB reads, super-admin/agency lists).
Scoring/journey/risk/opportunity logic is shared — no duplicate scores.

## Module

```
src/modules/customer-success/
  domain/types.ts         signals, CustomerSuccess, dimensions, risk, journey
  application/score.ts    9 weighted dimensions → 0-100
  application/journey.ts  10 canonical stages + next milestone
  application/risk.ts     deterministic risk findings
  application/opportunities.ts
  application/compute.ts  computeFromSignals (single entry)
  application/signals.ts  context + light signal builders
  application/timeline.ts chronological events
  application/platform.ts super-admin + agency aggregation
  presentation/success-journey-card.tsx
  index.ts
```

## Philosophy

- Business Health → "how healthy is the business?"
- Recommendation Runtime → "what should happen next?"
- **Customer Success → "who needs help right now?"**

## Events (Phase 9)

`success.stage.changed` · `risk.changed` · `opportunity.detected` ·
`customer.activated` · `customer.retained` · `customer.churn-risk` — emitted on
check-in when the derived values change (idempotent, deterministic).
