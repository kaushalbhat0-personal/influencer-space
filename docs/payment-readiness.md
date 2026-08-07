# Payment Readiness — RCCF-IMPLEMENTATION-74

## The shared runtime

`computePaymentReadiness(tenantId)` — one runtime used by the builder, creator
dashboard, checkout and storefront. No duplicated validation.

## Checks

| Requirement | Met when |
| --- | --- |
| Commerce strategy | PLATFORM_COLLECT or DIRECT_CREATOR |
| Provider selected | a PaymentAccount exists with a registered adapter |
| Account configured | provider keys OR a settlement detail present |
| Identity | account holder name provided |
| Settlement detail | UPI id (UPI mode) OR bank name + account number + IFSC (bank mode) |
| Verification | provider `verificationStatus === "verified"` |

For **PLATFORM_COLLECT** the creator does not need their own account — the
runtime reports `ready` (only the strategy requirement is enforced).

## Result

`ready | warning | blocked` + `missing[]` (human labels) + `requirements[]`
(met/unmet). The UI renders exactly these.

| Readiness | Meaning |
| --- | --- |
| ready | everything required is present |
| warning | 1–2 requirements missing |
| blocked | 3+ requirements missing |

## Where it surfaces

- **Creator Payments dashboard** (`/admin/payments`) — readiness badge + missing
  list + onboarding form.
- **Builder** — `Payment ready — start selling` / `Missing: …` in the commerce
  panel.
- **Checkout** — DIRECT_CREATOR refuses checkout until `ready`.
- **Storefront** — the buy button surfaces the same runtime through
  `createCheckout` (no extra validation path).
