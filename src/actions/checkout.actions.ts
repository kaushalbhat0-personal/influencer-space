"use server";

import { getRazorpayInstance } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { validateCoupon, applyCoupon, calculateTax } from "@/lib/commerce/coupons";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";

const emailSchema = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * RCCF-69.2 (P0) — canonical checkout tenant authority.
 *
 * A Creator must NEVER be able to create or initiate checkout against another
 * Creator's Product. The Product lookup used to build a ProductOrder must be
 * scoped to the tenant that owns the storefront the request came from.
 *
 * The client can NEVER supply the tenant — it is resolved server-side:
 *   1. Public storefront → `getTenantContext()` (host-derived via the
 *      middleware-set `x-tenant-host` header). This is the same authority the
 *      public contact/newsletter/booking/affiliate actions use.
 *   2. Authenticated admin context → the server session tenant.
 *   3. Neither → no tenant, checkout rejected.
 *
 * The invariant enforced by the caller is `product.tenantId === checkoutTenantId`.
 */
export async function resolveCheckoutTenantId(): Promise<string | null> {
  // Lazy import: `@/lib/tenant` (and its react `cache`) must not be pulled into
  // modules that transitively import checkout.actions at load time (e.g. the
  // storefront BuyNowButton) in environments where it cannot load.
  const { getTenantContext } = await import("@/lib/tenant");
  const storefrontTenant = await getTenantContext();
  if (storefrontTenant?.id) return storefrontTenant.id;
  const session = await getServerSession(authOptions);
  return session?.user?.tenantId ?? null;
}

function resolveClientIp(): string {
  try {
    const headersList = headers();
    return headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "checkout";
  } catch {
    // `headers()` throws outside a request scope (e.g. tests / build-time calls).
    // The rate limiter degrades to the shared "checkout" bucket — checkout must
    // never fail solely because the IP header is unavailable.
    return "checkout";
  }
}

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
  /** RCCF-72.18D.7.5: stable failure category (e.g. PAYMENT_SETUP_REQUIRED) for safe UI mapping. */
  code?: string;
};

export async function createCheckout(
  productId: string,
  fanEmail: string,
  couponCode?: string
): Promise<CheckoutResult> {
  try {
    // RCCF-69.2 — server-side rate limit before any expensive provider work. The
    // limit (20/min/IP) is deliberate: a genuine buyer rarely initiates more than
    // a handful of checkouts per minute, while this bounds automated abuse without
    // blocking legitimate purchases. Reuses the existing in-memory limiter and the
    // canonical client-IP resolution used by auth/affiliate/booking.
    const ip = resolveClientIp();
    const rate = checkRateLimit(`/checkout:${ip}`, "/api/checkout");
    if (!rate.allowed) {
      return { success: false, error: "Too many checkout attempts. Please try again shortly." };
    }

    // RCCF-67.2 (P1): the buyer's email is required and validated server-side.
    // Guest order lookup, customer grouping and fulfillment access all depend on
    // a real stored email — an empty/invalid value must never create an order.
    const buyerEmail = (fanEmail ?? "").trim().toLowerCase();
    if (!emailSchema.test(buyerEmail)) {
      return { success: false, error: "A valid email is required to complete your order." };
    }

    // RCCF-69.2 (P0) — the Product lookup is scoped to the server-resolved
    // checkout tenant. A product owned by another Creator is treated exactly like
    // an unknown/inactive product: rejected with zero side effects (no ProductOrder,
    // no Razorpay order, no payment record, no quota reservation).
    const checkoutTenantId = await resolveCheckoutTenantId();
    if (!checkoutTenantId) return { success: false, error: "Product not found" };

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: checkoutTenantId,
        isActive: true,
        status: "PUBLISHED",
        archivedAt: null,
      },
    });
    if (!product) return { success: false, error: "Product not found" };

    const tenantId = product.tenantId;

    // RCCF-IMPLEMENTATION-73: every commerce flow asks the canonical runtime —
    // "which commerce strategy does this tenant use?" No behavior change today
    // (PLATFORM_COLLECT is the only active strategy).
    const { resolveCommerceStrategy } = await import("@/modules/commerce-strategy");
    const commerceStrategy = await resolveCommerceStrategy(tenantId);

    // RCCF-69.2 — DIRECT_CREATOR is `status: "future"` in the canonical registry
    // and cannot be reconciled by the webhook (Payment Link notes carry
    // `referenceId`, not `productId/orderId`). It must never be invoked in the
    // normal production path — only a strategy marked `active` may branch here.
    if (commerceStrategy.id === "DIRECT_CREATOR" && commerceStrategy.definition.status === "active") {
      const { createDirectCheckout } = await import("@/actions/payment-account.actions");
      const direct = await createDirectCheckout({ productId: product.id, customerEmail: buyerEmail });
      if (direct.success && direct.checkoutUrl) {
        return { success: true, checkoutUrl: direct.checkoutUrl, orderId: undefined };
      }
      // RCCF-72.18D.7.5 — fail-closed is preserved, but the buyer receives a
      // safe category instead of the creator's internal account state. The
      // canonical readiness gate itself is unchanged.
      if (direct.error === "Creator payment account not ready") {
        return {
          success: false,
          error: "Payments for this store aren't available yet. Please contact the seller.",
          code: "PAYMENT_SETUP_REQUIRED",
        };
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

    // Create DB order — buyer email is the captured, validated value.
    const dbOrder = await prisma.productOrder.create({
      data: {
        tenantId,
        productId: product.id,
        amount: total,
        status: "PENDING",
        razorpayOrderId: "",
        fanEmail: buyerEmail,
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

