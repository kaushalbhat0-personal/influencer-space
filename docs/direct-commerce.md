# Direct Commerce — RCCF-IMPLEMENTATION-74

## The flow (DIRECT_CREATOR)

```
Customer
  ↓  Buy on creator website
Creator Website ([domain] → BuyNowButton)
  ↓  createCheckout → resolveCommerceStrategy() = DIRECT_CREATOR
Commerce Strategy Runtime
  ↓
Payment Account Runtime → computePaymentReadiness() = ready
  ↓
Provider Adapter (Razorpay)
  ↓  payment link created on the CREATOR'S OWN account
Hosted checkout URL → redirect
  ↓
Creator's Razorpay account  →  Creator's bank
CreatorStore is NOT in the money flow
```

## Checkout integration (Phase 6)

- `checkout.actions.ts` resolves the strategy first.
- **PLATFORM_COLLECT** (default): unchanged platform Razorpay order flow.
- **DIRECT_CREATOR** + ready: delegates to `createDirectCheckout` → returns a
  `checkoutUrl`; `BuyNowButton` redirects the customer. A `ProductOrder` is
  recorded with `commerceStrategy`, `provider`, `providerReference`,
  `providerMetadata.checkoutUrl`.
- Platform subscriptions are **unchanged**.

## Order metadata (Phase 8)

`ProductOrder` now records `commerceStrategy`, `provider`, `providerReference`,
`providerMetadata` (Json) — a full, auditable order trail. **No settlement
logic** (the money already went to the creator).

## Product types (Phase 7)

`src/modules/product-types` — digital / physical / course / service / booking /
affiliate / donation, each declaring `requiresPayment`, `requiresShipping`,
`requiresDownload`, `requiresBooking`. The type is **persisted on Product**
(was cosmetic). Consumers read the declarative flags — no branching.

## Creator earnings

100% of product, service, course, booking, affiliate and donation revenue goes
to the creator. CreatorStore earns only subscriptions and add-ons; agency
subscription sharing is unchanged (IMPLEMENTATION-72).

## Migration safety

- PLATFORM_COLLECT creators keep working until they connect a payment account
  and switch strategy.
- DIRECT_CREATOR requires readiness `ready` (account + keys + verification);
  checkout refuses with "Creator payment account not ready" otherwise.
