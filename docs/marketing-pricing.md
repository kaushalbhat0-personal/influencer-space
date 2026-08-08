# Marketing Pricing — RCCF-IMPLEMENTATION-73

## Truth alignment (from AUDIT-08)

- `/faq` **Scale price fixed** — ₹1,999 (was ₹1,995), now consistent with the
  Pricing Runtime.
- `/faq` **transaction-fee story removed** — replaced with "Creators keep 100%
  of every sale. CreatorStore never takes a transaction fee."
- Agency billing page updated to reflect the **real subscription-sharing
  runtime** (was "Coming soon — no commissions active").
- Every price on the site derives from the Pricing Runtime (`getPublicPricingData`)
  — no hardcoded pricing.

## Value communication added

The Partner panel now includes a **concrete, runtime-derived revenue example**
computed from the live Creator Growth price (₹699 × 20% share × 10 clients →
"~₹1,398/month recurring for you"). The percentage is a constant derived from
the platform's default agency share; the price comes from the runtime — nothing
hardcoded.

## Audit-verified pricing facts

- Growth ₹699 / Scale ₹1,999 / Solo ₹2,999 / Partner Scale ₹7,999 — all match
  the registry.
- Annual "Save ~17%" is mathematically correct.
- 15-day trial + no credit card messaging is consistent across pricing, hero,
  and FAQ.

## Roadmap

- Per-plan "why it matters" lines surfaced from the runtime upgrade copy.
- Explicit "0% transaction fees on every plan" trust line near the pricing grid.
