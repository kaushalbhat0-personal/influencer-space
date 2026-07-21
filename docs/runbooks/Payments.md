# Runbook: Payments (Razorpay)

**Last updated:** July 2026
**Owner:** Backend Engineering

## Integration
- **Gateway:** Razorpay
- **SDK:** `razorpay` npm package (v2.9.6)
- **Webhook:** `/api/webhooks/razorpay`
- **Checkout:** Server-side order creation → client-side Razorpay popup

## Creating an Order
```ts
// Server Action or API Route
import { razorpay } from "@/lib/razorpay";
const order = await razorpay.orders.create({
  amount: amount * 100, // Razorpay expects paise
  currency: "INR",
  receipt: `order_${Date.now()}`,
});
```

## Webhook Verification
```ts
// src/app/api/webhooks/razorpay/route.ts
const signature = req.headers.get("x-razorpay-signature");
const isValid = validateWebhookSignature(body, signature, WEBHOOK_SECRET);
```

## Troubleshooting

### Checkout Popup Doesn't Open
- Verify `RAZORPAY_KEY_ID` is set in environment
- Check browser console for SDK loading errors
- `razorpay` SDK must be loaded before calling `open()`

### Payment Succeeds but Order Not Updated
- Webhook may not be reaching `/api/webhooks/razorpay`
- Check Vercel logs for webhook endpoint
- Verify webhook URL is configured in Razorpay dashboard
- Check `razorpayOrderId` matches in `ProductOrder` table

### Webhook Signature Invalid
- `RAZORPAY_WEBHOOK_SECRET` must match Razorpay dashboard
- Raw body must be passed to signature validation (not parsed JSON)

## Refunds
```ts
// Server-side refund
const refund = await razorpay.payments.refund(paymentId, { amount: refundAmount * 100 });
await prisma.productOrder.update({
  where: { razorpayPaymentId: paymentId },
  data: { status: "REFUNDED" },
});
```
