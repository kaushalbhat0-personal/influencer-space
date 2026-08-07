# Payment Account Runtime — RCCF-IMPLEMENTATION-74

Enables creators to receive payments directly into their own account.
CreatorStore is **never** in the money flow for creator commerce.

## Module (DDD)

```
src/modules/payment-account/
  domain/types.ts          PaymentAccountData, readiness types
  providers/meta.ts        provider metadata (client-safe)
  providers/types.ts       PaymentProviderAdapter interface
  providers/registry.ts    provider registry
  providers/razorpay.ts    Razorpay adapter (payment links on the creator's own account)
  application/runtime.ts   get / save / verify / disconnect / readiness / health
  index.ts                 public API
```

## Runtime model

Every creator has **one canonical `PaymentAccount`** (unique `tenantId`):
provider, display name, account holder, merchant name, UPI ID, bank account
name/number (encrypted AES-256-GCM), IFSC, settlement mode (UPI/bank), status,
verification status, capabilities, provider keys (encrypted), last verified.

## Provider adapter interface (every provider interaction)

```
createCheckout()   → hosted checkout URL on the merchant's own account
verifyPayment()    → confirm capture for the expected amount
refundPayment()    → refund (implemented; safe to leave unimplemented per provider)
getAccountStatus() → probe account configuration
```

New providers (Stripe, PhonePe, Cashfree, PayU, Manual) implement this interface
— checkout, orders and commerce runtimes never change.

## Readiness (shared)

`computePaymentReadiness(tenantId)` — checks strategy, provider selected,
account configured, identity, settlement detail, verification →
`ready | warning | blocked` + missing requirements. **Builder, dashboard,
checkout and storefront all use the same runtime.**

## Security (Phase 13)

- Payment accounts are tenant-scoped (`PaymentAccount.tenantId` unique).
- **Only the owner (session tenant) or SUPER_ADMIN** can modify; agency roles
  cannot edit creator payment accounts.
- Bank account number + provider keys encrypted at rest; the API view never
  exposes them (`hasBankAccountNumber`/`hasProviderKeys` only).
- Every change is audited (`logAction`) + emits a canonical event.

## Events

`payment.account.created` · `updated` · `verified` · `disconnected` ·
`payment.readiness.changed` — through the Event Runtime.
