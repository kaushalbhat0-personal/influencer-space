# Currency Formatting

**Track:** RCCF-LAUNCH-POLISH-06 (Phase 1)
**Status:** Implemented

## The canonical helper

`formatCurrency(amount, currency = "INR", locale = "en-IN")` in
`src/lib/utils.ts` is the ONLY currency formatter.

```ts
formatCurrency(1999)    // "₹1,999"
formatCurrency(1999.5)  // "₹1,999.5"
formatCurrency(1999.05) // "₹1,999.05"
formatCurrency(0)       // "₹0"
```

- Uses `Intl.NumberFormat` with `currencyDisplay: "narrowSymbol"` → renders `₹`
  (U+20B9) for INR. **Never** a raw `"₹"`/`"Rs."` string concatenation — that is
  what produced the mojibake `â‚¹50` on the live storefront.
- 0–2 fraction digits: integers show clean (`₹1,999`), fractional prices keep
  the paise (`₹1,999.05`).
- Prices are stored as **numbers + a currency code**; formatting happens only at
  render time. No formatted strings are ever persisted.

## What was unified

Three divergent `formatCurrency` implementations existed:

| Location | Before | After |
| --- | --- | --- |
| `src/lib/utils.ts` | 2-fixed decimals | canonical (narrowSymbol, 0–2) |
| `src/lib/analytics/date.ts` | 0 decimals | delegates to canonical |
| `src/lib/billing/invoice-engine.ts` | symbol + `toLocaleString("en-IN")` | delegates to canonical |

## Mojibake fixed (`â‚¹` → `₹`)

- `src/lib/registry/components/renderers.tsx` — products, pricing plans, courses, services cards.
- `src/app/pricing/page.tsx` — metadata + FAQ schema (`â‚¹699` → `₹699`).
- `src/app/showcase/page.tsx` — product chips.

## Every surface now uses the helper

All currency renderers were converted from `₹${x.toLocaleString("en-IN")}` to
`formatCurrency(x)`: storefront (products/courses/services/pricing), marketing
Pricing, showcase, purchase/receipts, orders, dashboard, customer portal,
admin commerce managers, super-admin (revenue, settlements, invoices,
transactions, finance, partner ledger, reconciliation, payments, operations,
health, revenue-center), agency billing/analytics, dev pages, activity feed,
notification descriptions and support search. Local `inr()`/`formatRupees()`
helpers now delegate to the canonical one.

Intentionally left as compact/non-currency formatting: chart tooltips
(`₹1.5L`/`₹1.5k`), form input labels ("Price (₹)"), and communication
template variables (`₹{{amount}}` — data injected at render).
