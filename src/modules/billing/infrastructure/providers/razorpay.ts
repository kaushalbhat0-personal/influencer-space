/**
 * Billing v2 — RazorpayProvider
 *
 * Implements BillingProvider interface for Razorpay payment gateway.
 * Application code depends on BillingProvider — never on this class directly.
 */

import type { BillingProvider, CheckoutParams, CheckoutResult } from "../../domain/types";
import { razorpayPlanIdFor, isManualPlan, getCommercePlan } from "@/config/commerce/plans";
import crypto from "crypto";

export class RazorpayProvider implements BillingProvider {
  readonly name = "razorpay";

  private get keyId(): string {
    return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
  }

  private get keySecret(): string {
    return process.env.RAZORPAY_KEY_SECRET ?? "";
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const Razorpay = (await import("razorpay")).default;
      const razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });

      // IMPLEMENTATION-34: subscription checkout driven by the canonical
      // commerce config. RCCF-36: the DB-authoritative razorpayPlanId (stored
      // by the Pricing Center when the price is provisioned) wins; the registry
      // mapping is the fallback so existing flows never break. Manual plans
      // (enterprise) never create a public checkout.
      const planId = params.razorpayPlanId ?? razorpayPlanIdFor(params.planCode);
      if (planId && !isManualPlan(params.planCode)) {
        const subscription = await razorpay.subscriptions.create({
          plan_id: planId,
          total_count: 12,
          customer_notify: 1,
          notes: {
            planCode: params.planCode,
            accountId: params.accountId,
            email: params.email ?? "",
            workspaceId: params.accountId,
          },
          ...(params.email ? { customer_notify: 1, start_at: Math.floor(Date.now() / 1000) + 300 } : {}),
        });
        return {
          success: true,
          orderId: subscription.id,
          providerOrderId: subscription.id,
          subscriptionId: subscription.id,
        };
      }

      // Fallback: one-time order (free/manual-adjacent flows).
      // RCCF-IMPLEMENTATION-72: the amount was hardcoded to 0 (Razorpay rejects
      // ₹0 orders). RCCF-36: use the DB-authoritative price so a plan without a
      // Razorpay subscription id still produces a valid payable order at the
      // currently configured price.
      const price = params.price ?? getCommercePlan(params.planCode)?.price ?? 0;
      const order = await razorpay.orders.create({
        amount: Math.round((price ?? 0) * 100),
        currency: params.currency ?? "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: {
          planCode: params.planCode,
          accountId: params.accountId,
          email: params.email ?? "",
        },
      });

      return {
        success: true,
        orderId: order.id,
        providerOrderId: order.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Checkout creation failed",
      };
    }
  }

  async handleWebhook(payload: unknown): Promise<{ success: boolean }> {
    const body = payload as Record<string, unknown>;
    const event = body.event as string;

    if (event === "payment.captured") {
      return { success: true };
    }

    return { success: true };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = crypto
      .createHmac("sha256", this.keySecret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}

export const razorpayProvider = new RazorpayProvider();
