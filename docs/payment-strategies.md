# Payment Strategies — RCCF-IMPLEMENTATION-73

Four canonical strategies, all declarative in
`src/modules/commerce-strategy/application/registry.ts`.

| Strategy | Status | Merchant of record | Linked account | Settlement | Notes |
| --- | --- | --- | --- | --- | --- |
| **PLATFORM_COLLECT** | active (default) | platform | no | no | Funds land in CreatorStore's Razorpay account. Used today. |
| **DIRECT_CREATOR** | future | creator | yes | yes | Customer → creator website → creator Razorpay → creator bank. CreatorStore never touches product revenue. |
| **MARKETPLACE** | reserved | platform | yes | yes | Platform collects, splits, settles. Not implemented. |
| **HYBRID** | reserved | platform | yes | no | Per-product strategy. Not implemented. |

## Declarative surface

Every strategy declares `merchantOfRecord`, `supports{Products,Bookings,
Services,Courses,Subscriptions,Transfers}`, and
`requires{LinkedAccount,Settlement,Shipping,DigitalDelivery}` — consumers read
these fields; they never branch on the strategy id.

## Resolution

```
resolveCommerceStrategy(tenantId)
  tenant override → workspace override → platform default → PLATFORM_COLLECT
```

PLATFORM_COLLECT is the only active strategy — today every tenant resolves to
it, so **no behavior changes**. DIRECT_CREATOR / MARKETPLACE / HYBRID are
declared so the next EPIC (linked accounts, route transfers, shipping, digital
delivery) is infrastructure-only.

## Readiness

`getCommerceStrategyReadiness(tenantId, strategy)`:
- PLATFORM_COLLECT → `ready`.
- DIRECT_CREATOR → `incomplete` until the tenant has a linked Razorpay account
  (`Tenant.razorpayAccountId`, reserved in the schema) + payout config.

## Migration readiness (super admin)

`getMigrationReadiness()` — count of tenants ready for DIRECT_CREATOR (linked
account present). Today: 0 ready, all incomplete — the platform is prepared, not
active.

## Consumers

- Checkout stamps `commerceStrategy` into order notes (no routing change).
- Runtime Context exposes `commerceStrategy` for every consumer.
- Builder + creator billing show the strategy read-only.
- Super Admin Commerce Center shows the registry + distribution + readiness.
