# Revenue Sharing — RCCF-IMPLEMENTATION-72

## The business model

| Stream | Who earns | CreatorStore fee? |
| --- | --- | --- |
| Creator subscriptions (₹699/₹1999/…) | CreatorStore → shares a % with the agency | platform keeps the remainder |
| Agency subscriptions | CreatorStore | — |
| Add-ons | CreatorStore | — |
| Creator **products / courses / services / bookings / affiliates / donations** | **100% creator** | **0% — never touched** |

Agencies earn recurring revenue **only from creator subscriptions** — never from
creator product sales.

## The split

`computeSubscriptionSplit(amount, src)` → `platformShare` + `partnerShare`
(= amount). Agency percent resolution:

1. `CommissionRule` partner → plan → default (DB, request-cached).
2. `AgencyTenant.revSharePercent` (per-creator override, default 20).
3. `CommissionPolicy.agencyDefaultShare` (platform default, 30).
4. 80/20 hardcoded default.

**No creator share** — the creator is the payer, not a recipient of the
subscription split. Creator product revenue is completely outside this runtime.

## Lifecycle

```
Creator subscribes → Billing webhook → recordSubscriptionCommission
  → CommissionEntry (pending) + PartnerLedger (balance chain)
  → Settlement (pending entries) → APPROVED
  → Payout (queued → approved → processing → paid/failed)
  → Settlement PAID → entries cleared
```

## Configurability (Phase 4/15)

- Super Admin configures `CommissionPolicy` splits at runtime
  (`/super-admin/revenue-management/commissions`) — now honored by the runtime
  (rules are DB-backed, not in-memory).
- Per-creator `AgencyTenant.revSharePercent` (editable via the existing
  relationship service) overrides for that creator.

## Events (Phase 11)

`subscription.created` · `subscription.renewed` · `subscription.upgraded` ·
`subscription.cancelled` · `commission.created` · `commission.failed` ·
`ledger.updated` · `settlement.created` · `settlement.completed` ·
`payout.created` · `payout.completed` — all through the Event Runtime
(`runtimeEventBus`, durable AnalyticsEvent rows).

## Security (Phase 15)

- Only SUPER_ADMIN can write rules, create settlements, approve/process payouts.
- Agencies have no write path to commission/ledger/settlement/payout/rule.
- Commission is idempotent per invoice; payouts idempotent per settlement;
  webhooks deduplicated via `BillingEvent.idempotencyKey`.
