# Commerce Principles

## The invariant: Payments never unlock features.

The entire commerce platform follows one rule:

```
Payment
  → Billing Event
  → Entitlement (subscription/plan state)
  → Capability (granted by the plan's capability matrix)
  → Feature access (consumed by Builder, Themes, AI, Storage, Domains, White Label, ...)
```

A payment is a **producer of entitlements**, never a direct feature switch. A
feature is only accessible when the account's active subscription grants the
capability in the canonical matrix.

## Single source of truth

| Concern | Source |
|---|---|
| Plans + pricing + capability matrix + Razorpay plan ids | `src/config/commerce/plans.ts` |
| Feature values (what a capability unlocks) | `lib/capabilities/` (derived from the matrix) |
| Authorization | `CapabilityService` / `EntitlementService` — the only authorization layer |
| Subscription state | `BillingSubscription` → `BillingPlan` |
| Event log | `BillingEvent` (append-only, idempotency-keyed) |
| Invoices | `BillingInvoice` |

Documentation, the pricing page, checkout and billing UI all **derive** from
these sources — never maintain separate lists.

## Webhook lifecycle

Every Razorpay webhook is signature-verified, idempotent
(`BillingEvent.idempotencyKey`), and audited. Each becomes:

```
webhook event
  → BillingEvent        (append-only, deduped)
  → BillingSubscription (status transition via lifecycle state machine)
  → Capability refresh  (CapabilityService derives from the updated plan)
  → Feature unlock      (Builder, Themes, ...)
```

## Extension rules

- New plan → add one entry to `COMMERCE_PLANS` (+ capabilities).
- New capability → add to the matrix + map to a feature value.
- New add-on (AI credits, storage, theme packs) → an entitlement grant consumed
  through `CapabilityService`; it never bypasses the matrix.
- Never hardcode a price, a Razorpay plan id, or a capability check in feature
  code.
