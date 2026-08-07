# Provider Registry — RCCF-IMPLEMENTATION-74

## Design

Every payment provider interaction goes through the **`PaymentProviderAdapter`
interface** — no provider-specific logic outside adapters.

```
checkout.actions.ts / order runtime
      │  (imports only the interface + registry)
      ▼
getPaymentProviderAdapter("razorpay")  →  RazorpayPaymentAdapter
      │  createCheckout() / verifyPayment() / refundPayment() / getAccountStatus()
      ▼
provider SDK
```

## Adapter interface

```ts
interface PaymentProviderAdapter {
  id: PaymentProviderId;              // razorpay | stripe | phonepe | cashfree | payu | manual
  label: string;
  createCheckout(input): Promise<{ checkoutUrl?; providerReference?; error? }>;
  verifyPayment(input): Promise<{ success; status?; error? }>;
  refundPayment?(input): Promise<{ success; error? }>;          // may be unimplemented
  getAccountStatus(input): Promise<{ verified?; status?; error? }>;
}
```

## Registry

| Provider | Status | Adapter |
| --- | --- | --- |
| Razorpay | **active** | `RazorpayPaymentAdapter` (payment links on the creator's own account) |
| Stripe | future | none |
| PhonePe | future | none |
| Cashfree | future | none |
| PayU | future | none |
| Manual | future | none |

## Adding a provider

1. Implement `PaymentProviderAdapter` in `providers/<name>.ts`.
2. Register it in `providers/registry.ts`.
3. Metadata already exists in `providers/meta.ts`.

Checkout, orders and commerce runtimes are **never touched** — the next provider
is a new adapter file + a registry line.
