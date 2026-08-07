# Digital Delivery — RCCF-TRACK-01

## Secure download runtime (Phase 4)

- The creator sets a `downloadUrl` on the product (their private file link).
- `generateDownload` creates a **signed token** (random, stored on the
  fulfillment row) with an **expiry** (7 days) and a **download limit** (5).
- The customer reaches the file only via `/api/fulfillment/download/[token]`:
  token validity + expiry + remaining-count enforced, then a 302 redirect to the
  file. **No public asset exposure** — the file URL is never revealed in the UI.

## Flow

```
creator: Generate link → token created, status ready
customer: /purchase/[order] → Download → getOrderDownload (email-verified)
  → generateDownloadForOrder → token (re)issued → /api/.../[token]
  → resolveDownloadToken: valid? not expired? count < limit? → redirect to file
download.count increments per access; expired links emit download.expired.
```

## Security

- Token is secret (never exposed in customer views).
- Email/order-ownership verified before a link is issued.
- Limit + expiry are enforced server-side on every request.
- License support is future-ready (the token model generalizes to license keys).

## Events

`download.generated` on issuance · `download.expired` on expiry.
