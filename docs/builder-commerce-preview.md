# Builder Commerce Preview

**Track:** RCCF-LAUNCH-TRACK-06 (Phase 9)
**Status:** Implemented

## Problem

The Builder canvas renders the **real** storefront renderers via
`ComponentRenderer`, including the `BuyNowButton`. Clicking "Buy Now" inside the
Builder preview called `createCheckout` — creating a real `ProductOrder` row and
a Razorpay order while editing.

## Fix

A `previewMode` flag is threaded from the canvas to the commerce renderer:

```
InteractiveCanvas  →  ComponentRenderer  →  ProductsRenderer  →  BuyNowButton
   previewMode            previewMode           previewMode          previewMode
```

- `ComponentRenderer` accepts `previewMode?: boolean` and forwards it to the
  registry renderer (`RendererProps.previewMode`).
- The Builder canvas renders with `previewMode` enabled.
- `BuyNowButton`:
  - `handleBuy` returns immediately when `previewMode` (no `createCheckout`).
  - Renders an inert, disabled label: **"Checkout available on your live website"**.

**Result:** editing in the Builder can never create an order, touch Prisma, or
depend on Razorpay. The live storefront (no `previewMode`) is unchanged.
