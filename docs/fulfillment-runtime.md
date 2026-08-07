# Fulfillment Runtime — RCCF-TRACK-01

Completes the post-payment commerce lifecycle. Payments already work — this adds
fulfillment for every product type. No payment/billing/pricing/runtime changes.

## Module (DDD)

```
src/modules/fulfillment/
  domain/types.ts          FulfillmentType, FulfillmentStatus, strategies, views
  application/strategies.ts  per-product-type fulfillment strategy + transitions
  application/runtime.ts   create/update/ship/download/lookup/lists/health
  index.ts
```

## Lifecycle

- **Physical:** pending → preparing → packed → shipped → delivered (→ cancelled / returned)
- **Digital / course:** pending → ready (download generated) → completed
- **Service:** pending → accepted → completed
- **Booking:** pending → confirmed → completed

Transitions are validated against the product-type strategy (no illegal moves).

## Integration

- **Order completion** (`payment.captured` webhook) → `ensureFulfillment(orderId)`
  creates the fulfillment record automatically.
- **Creator dashboard** (`/admin/orders` → Fulfillment) — status updates,
  tracking/courier/notes, download-link generation, service accept/complete,
  booking confirm.
- **Customer order portal** (`/purchase`) — lookup, status, tracking, downloads,
  shipping address, receipt.

## Files

- `prisma/schema.prisma` + `migrations/20260807000004_fulfillment` —
  `OrderFulfillment` + `ShippingAddress` + `Product.downloadUrl`.
- `src/modules/fulfillment/**`, `src/actions/fulfillment.actions.ts`,
  `src/actions/customer-orders.actions.ts`, `src/app/api/fulfillment/download/[token]`,
  `src/app/purchase/**`, `src/app/admin/orders/**`.
- `src/modules/product-types` — extended with fulfillment strategy flags.
