# Order Lifecycle — RCCF-TRACK-01

## From payment to fulfillment

```
Customer buys (Razorpay: PLATFORM_COLLECT order, or DIRECT_CREATOR link)
  → payment.captured webhook
  → ProductOrder COMPLETED (+ amount verified, idempotency recorded)
  → ensureFulfillment(orderId) creates OrderFulfillment (strategy from product type)
  → creator fulfills (ship / generate download / accept service / confirm booking)
  → customer tracks + downloads via /purchase
```

## States

| Order (ProductOrder) | Fulfillment (OrderFulfillment) |
| --- | --- |
| PENDING | — (created only when COMPLETED) |
| COMPLETED | pending → … → delivered / ready / completed / cancelled / returned |

## Timeline

Every fulfillment keeps an append-only `timeline` (`{ status, at, by }`) so the
creator and customer see the full history.

## Notifications (Phase 7)

Events fire for: order placed (`fulfillment.created`) · payment confirmed ·
preparing / packed (`fulfillment.updated`) · shipped (`shipment.created`) ·
delivered (`shipment.delivered`) · download ready (`download.generated`) ·
booking confirmed (`booking.confirmed`) · service accepted / completed
(`service.completed`) · cancellation / refund (`fulfillment.updated`).
All through the Event Runtime — no duplicated notification logic. Email
templates are the documented next infra step.
