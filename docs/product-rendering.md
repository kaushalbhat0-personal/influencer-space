# Product Rendering

**Track:** RCCF-LAUNCH-POLISH-06 (Phase 2)
**Status:** Implemented

## The storefront product card

Data path:

```
Product (prisma) → WebsiteAggregate (websiteAggregateService)
  → LayoutEngine.composeSectionConfig (products.grid branch)
  → ProductsRenderer → BuyNowButton → storefront
```

The card now renders, in order:

1. **Image** — `product.imageUrl` (via `CreatorImage`), with the product name as
   alt text.
2. **Title** — `product.name`.
3. **Description** — `product.description` (canonical field, composed by the
   LayoutEngine). The description line is only rendered when non-empty — when a
   product has no description the space collapses (no placeholder text, no
   empty paragraph).
4. **Price** — `formatCurrency(product.price)` (see
   [currency-formatting.md](./currency-formatting.md)).
5. **CTA** — `BuyNowButton` (productId/name/imageUrl → Razorpay checkout).

## What changed

- `ProductsRenderer` previously **composed but never rendered** `description`.
  It now renders the canonical `prod.description`, collapsed when empty.
- Prices use the canonical `formatCurrency` (no mojibake, correct en-IN
  grouping).

## Verified

- Unit tests in `src/lib/storefront/layout-engine/__tests__/products-rendering.test.ts`
  assert the description and price flow into `config.resolvedData` and that
  presentation title overrides never touch canonical module ids.
