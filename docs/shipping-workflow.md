# Shipping Workflow — RCCF-TRACK-01

## Physical fulfillment (Phase 3)

The creator moves an order through the shipping sequence and records tracking:

```
pending → preparing → packed → shipped → delivered
                      └─ tracking number + courier + carrier notes (optional)
                      └─ shippedAt set
         delivered → shippedAt + deliveredAt
         → returned / cancelled (exits)
```

`updateFulfillment` validates every transition against the physical strategy
and appends to the fulfillment timeline. `shipment.created` / `shipment.delivered`
events fire at the endpoints.

## Shipping address (Phase 6)

`ShippingAddress` per order: name, phone, email, line1, line2, city, state,
PIN, country, delivery instructions.

- Customer enters it in the **order portal** after purchase (physical orders).
- The creator can view it on the order.
- Validation is minimal + configurable (required: name/line1/city/pin for
  shipping; future courier integration is the roadmap — launch is manual
  shipping only).

## Creator UI

`/admin/orders` → Fulfillment section shows the physical queue with
Preparing / Packed / Shipped / Delivered buttons + tracking + courier inputs,
filterable by status.
