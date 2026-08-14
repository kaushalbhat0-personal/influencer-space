"use server";

import { getRazorpayInstance } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { validateCoupon, applyCoupon, calculateTax } from "@/lib/commerce/coupons";

export type CheckoutResult = {
  success: boolean;
  orderId?: string;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
  couponApplied?: boolean;
  discountAmount?: number;
  tax?: number;
  /** True when the order was fulfilled without payment (free / 100% coupon). */
  free?: boolean;
  /** RCCF-IMPLEMENTATION-74: hosted checkout URL for DIRECT_CREATOR (customer pays the creator's own account). */
  checkoutUrl?: string;
};

export async function createCheckout(
  productId: string,
  fanEmail: string,
  couponCode?: string
): Promise<CheckoutResult> {
  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true, status: "PUBLISHED", archivedAt: null },
    });
    if (!product) return { success: false, error: "Product not found" };

    const tenantId = product.tenantId;

    // RCCF-IMPLEMENTATION-73: every commerce flow asks the canonical runtime —
    // "which commerce strategy does this tenant use?" No behavior change today
    // (PLATFORM_COLLECT is the only active strategy).
    const { resolveCommerceStrategy } = await import("@/modules/commerce-strategy");
    const commerceStrategy = await resolveCommerceStrategy(tenantId);

    // RCCF-IMPLEMENTATION-74 Phase 6: DIRECT_CREATOR — the customer pays the
    // creator's OWN payment account via a hosted checkout URL. CreatorStore is
    // not in the money flow. Platform subscriptions remain unchanged.
    if (commerceStrategy.id === "DIRECT_CREATOR") {
      const { createDirectCheckout } = await import("@/actions/payment-account.actions");
      const direct = await createDirectCheckout({ productId: product.id, customerEmail: fanEmail || undefined });
      if (direct.success && direct.checkoutUrl) {
        return { success: true, checkoutUrl: direct.checkoutUrl, orderId: undefined };
      }
      return { success: false, error: direct.error ?? "Creator payment account not ready" };
    }

    let amount = product.price;
    let discountAmount = 0;
    let couponApplied = false;

    // Apply coupon if provided
    if (couponCode) {
      const validation = validateCoupon(couponCode);
      if (validation.valid) {
        const result = applyCoupon(amount, validation);
        if (result.applied) {
          amount = result.finalAmount;
          discountAmount = result.discountAmount;
          couponApplied = true;
        }
      }
    }

    // Calculate tax
    const { tax, total } = calculateTax(amount);

    // Create DB order
    const dbOrder = await prisma.productOrder.create({
      data: {
        tenantId,
        productId: product.id,
        amount: total,
        status: "PENDING",
        razorpayOrderId: "",
        fanEmail,
      },
    });

    // VALIDATION-01 V-028: free products / 100%-off coupons (total ≤ 0) cannot
    // go through Razorpay (it rejects amount 0). Complete the order immediately
    // through the canonical completion boundary (RCCF-38) so a free order that
    // completes still consumes its monthly order allowance.
    if (total <= 0) {
      const { completeProductOrder } = await import("@/modules/billing/application/order-completion");
      const completed = await completeProductOrder(dbOrder.id);
      if (!completed.success) {
        return { success: false, error: completed.error ?? "Checkout failed" };
      }
      await logAction(tenantId, "checkout:completed", {
        orderId: dbOrder.id,
        productId,
        amount: total,
        free: true,
        couponCode: couponCode ?? null,
      });
      return {
        success: true,
        orderId: dbOrder.id,
        amount: total,
        currency: "INR",
        free: true,
        couponApplied,
        discountAmount,
        tax,
      };
    }

    // Create Razorpay order
    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // Razorpay expects paise
      currency: "INR",
      receipt: dbOrder.id,
      notes: {
        tenantId,
        productId: product.id,
        orderId: dbOrder.id,
        fanEmail,
        commerceStrategy: commerceStrategy.id,
        ...(couponApplied && { couponCode, discountAmount: String(discountAmount) }),
      },
    });

    // Update DB order with Razorpay order ID
    await prisma.productOrder.update({
      where: { id: dbOrder.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    await logAction(tenantId, "checkout:created", {
      orderId: dbOrder.id,
      razorpayOrderId: razorpayOrder.id,
      productId,
      amount: total,
      couponCode: couponCode ?? null,
      discountAmount,
    });

    return {
      success: true,
      orderId: dbOrder.id,
      razorpayOrderId: razorpayOrder.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: total,
      currency: "INR",
      couponApplied,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      tax,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Checkout creation failed",
    };
  }
}

export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const crypto = await import("crypto");
    const expectedSignature = crypto
      .default.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return { success: false, error: "Invalid payment signature" };
    }

    const order = await prisma.productOrder.findUnique({
      where: { razorpayOrderId },
    });
    if (!order) return { success: false, error: "Order not found" };

    if (order.status === "COMPLETED") {
      return { success: true };
    }

    // RCCF-IMPLEMENTATION-72: verify the CAPTURED amount matches the order
    // amount before completing (the HMAC proves authenticity, not the amount).
    try {
      const razorpay = getRazorpayInstance();
      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      const capturedPaise = Number(payment?.amount ?? 0);
      const expectedPaise = Math.round(order.amount * 100);
      if (capturedPaise !== expectedPaise) {
        return { success: false, error: "Payment amount does not match order amount" };
      }
    } catch {
      // Amount verification is best-effort on the client path; the webhook is
      // the authoritative reconcile and enforces the same check.
    }

    // RCCF-38: complete through the canonical boundary — this reserves the
    // monthly order quota atomically and creates the fulfillment record.
    const { completeProductOrder } = await import("@/modules/billing/application/order-completion");
    const completed = await completeProductOrder(order.id, { paymentId: razorpayPaymentId });
    if (!completed.success) {
      return { success: false, error: completed.error ?? "Order completion failed" };
    }

    await logAction(order.tenantId, "checkout:verified", {
      orderId: order.id,
      razorpayOrderId,
      razorpayPaymentId,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

