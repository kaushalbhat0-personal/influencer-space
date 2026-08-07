# Customer Orders — RCCF-TRACK-01

## The order portal (Phase 5)

Guest + authenticated customers can:

- **Look up** an order by ID + the email used at checkout (`/purchase`).
- **Track** status + tracking number / courier.
- **Download** digital products and courses (email-verified, token-gated).
- **Enter / update their shipping address** for physical orders.
- **View a receipt** (item + total paid).
- **Contact the creator** (support note on the page).

All mobile-friendly (responsive layouts, no dependencies).

## Access control

- Order detail requires **either** the owner session (creator tenant /
  SUPER_ADMIN) **or** the exact email used at checkout — verified server-side.
- Download links are token-gated (see `digital-delivery.md`).

## Pages

```
/purchase                lookup form
/purchase/[orderId]      order detail (status, tracking, download, shipping, receipt)
/api/fulfillment/download/[token]  secure file delivery
```

## Creator side

The creator sees the same order + customer + shipping in `/admin/orders` and
fulfills it from the Fulfillment section.
