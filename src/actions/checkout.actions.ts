"use server";

import { getRazorpayInstance } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
};

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

export async function createCheckout(
  productId: string,
  fanEmail: string,
  couponCode?: string
): Promise<CheckoutResult> {
  try {
    const tenantId = await requireTenant();

    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
    });
    if (!product) return { success: false, error: "Product not found" };

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
    const tenantId = await requireTenant();

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

    await prisma.productOrder.update({
      where: { id: order.id },
      data: {
        status: "COMPLETED",
        razorpayPaymentId,
      },
    });

    await logAction(tenantId, "checkout:verified", {
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
