# Merchant of Record — RCCF-IMPLEMENTATION-73

## Today: CreatorStore is the single Merchant of Record (PLATFORM_COLLECT)

- One Razorpay key pair (`NEXT_PUBLIC_RAZORPAY_KEY_ID` /
  `RAZORPAY_KEY_SECRET`) for every transaction.
- Funds from both creator product sales and creator subscriptions land in the
  **platform** account.
- No per-creator accounts, no Route / transfers / linked accounts in code
  (confirmed in AUDIT-07).

## The strategy runtime formalizes MoR

`commerceStrategy.definition.merchantOfRecord` is now the canonical answer to
"who is the merchant for this transaction?" — `"platform"` (PLATFORM_COLLECT /
MARKETPLACE) or `"creator"` (DIRECT_CREATOR).

| Strategy | MoR | Who receives product funds |
| --- | --- | --- |
| PLATFORM_COLLECT | platform | CreatorStore (later: platform → payout to creator) |
| DIRECT_CREATOR | creator | Creator's own Razorpay account (future) |
| MARKETPLACE | platform | Platform collects, then splits |
| HYBRID | platform | Per-product |

## Subscriptions (unchanged)

Subscriptions are a **platform** revenue stream in every strategy — CreatorStore
receives them and shares a configurable % with the managing agency (the
RCCF-IMPLEMENTATION-72 revenue runtime). The strategy runtime does not change
subscription billing.

## Creator product revenue

- PLATFORM_COLLECT: CreatorStore is MoR; creators keep 100% of the revenue
  (payouts to creators are the next EPIC's infrastructure).
- DIRECT_CREATOR (declared, not implemented): the creator is MoR for product
  sales; money goes directly to their account. CreatorStore never touches it.

## Business principles

- CreatorStore is SaaS — creators own customers, products and revenue.
- No transaction commissions, no marketplace behavior.
- CreatorStore owns subscriptions; agencies earn recurring subscription revenue
  only.

## Readiness to switch MoR

The runtime resolves the strategy per tenant (Setting/workspace override →
platform default). Switching a tenant to DIRECT_CREATOR in the future requires
only the infrastructure (linked accounts, route transfers) — the checkout and
consumers already read the strategy and require no architecture change.
