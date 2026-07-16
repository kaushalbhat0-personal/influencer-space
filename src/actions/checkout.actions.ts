"use server";

import { prisma } from "@/lib/prisma";
import { getRazorpayInstance } from "@/lib/razorpay";
import crypto from "crypto";

export async function createCheckoutOrder(
  productId: string,
  tenantId: string,
): Promise<{
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}> {
  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
    });

    if (!product) {
      return { success: false, error: "Product not found or unavailable" };
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(product.price * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${productId.slice(0, 8)}`,
    });

    await prisma.productOrder.create({
      data: {
        tenantId,
        productId,
        amount: product.price,
        status: "PENDING",
        razorpayOrderId: razorpayOrder.id,
      },
    });

    return {
      success: true,
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout order",
    };
  }
}

export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expected !== razorpaySignature) {
      return { success: false, error: "Invalid payment signature" };
    }

    await prisma.productOrder.update({
      where: { razorpayOrderId },
      data: {
        status: "SUCCESS",
        razorpayPaymentId,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment verification failed",
    };
  }
}
