/**
 * Billing v2 — RazorpayProvider
 *
 * Implements BillingProvider interface for Razorpay payment gateway.
 * Application code depends on BillingProvider — never on this class directly.
 */

import type { BillingProvider, CheckoutParams, CheckoutResult } from "../../domain/types";
import { razorpayPlanIdFor, isManualPlan, getCommercePlan, isOneTimePlan } from "@/config/commerce/plans";
import crypto from "crypto";
import { captureError } from "@/lib/observability/error-tracker";

export class RazorpayProvider implements BillingProvider {
  readonly name = "razorpay";

  private get keyId(): string {
    // Prefer test key for agency test mode; fallback to live key
    const testId = process.env.TEST_RAZORPAY_KEY_ID ?? "";
    const liveId = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
    // If liveId is test (rzp_test) use it, otherwise prefer testId when available
    if (liveId.startsWith("rzp_test")) return liveId;
    if (testId) return testId;
    return liveId;
  }

  private get keySecret(): string {
    const testSecret = process.env.TEST_RAZORPAY_KEY_SECRET ?? "";
    const liveSecret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const keyId = this.keyId;
    if (keyId.startsWith("rzp_test") && testSecret) return testSecret;
    return liveSecret || testSecret;
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
      //
      // RCCF-73: ONE-TIME plans (Partner Solo/Scale) NEVER take this branch —
      // no recurring subscription contract may exist for them, even if a stale
      // DB runtimeConfig still carries a legacy provider plan id. They fall
      // through to a single Razorpay ORDER at the DB-authoritative price.
      const planId = isOneTimePlan(params.planCode) ? null : params.razorpayPlanId ?? razorpayPlanIdFor(params.planCode);
      if (planId && !isManualPlan(params.planCode)) {
        // RCCF-FINANCE-03: cycle-aware — yearly uses single period vs monthly 12
        let totalCount = 12;
        const cycle = params.cycle ?? "monthly";
        if (cycle === "yearly") totalCount = 1;
        else {
          try {
            const plan = getCommercePlan(params.planCode);
            if (plan?.annualPrice && params.price && Math.abs(params.price - plan.annualPrice) < 0.01) totalCount = 1;
            else if (plan?.cycle === "yearly") totalCount = 1;
          } catch {}
        }
        const subscription = await razorpay.subscriptions.create({
          plan_id: planId,
          total_count: totalCount,
          customer_notify: 1,
          notes: {
            planCode: params.planCode,
            accountId: params.accountId,
            email: params.email ?? "",
            workspaceId: params.accountId,
            cycle,
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

      // Fallback: one-time order (free/manual-adjacent flows AND RCCF-73
      // one-time partner plan purchases). The amount was hardcoded to 0
      // (Razorpay rejects ₹0 orders) before RCCF-IMPLEMENTATION-72; RCCF-36
      // made it the DB-authoritative price so a plan without a Razorpay
      // subscription id still produces a valid payable order at the currently
      // configured price.
      const price = params.price ?? getCommercePlan(params.planCode)?.price ?? 0;
      const cycle = params.cycle ?? "monthly";
      const order = await razorpay.orders.create({
        amount: Math.round((price ?? 0) * 100),
        currency: params.currency ?? "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: {
          planCode: params.planCode,
          accountId: params.accountId,
          email: params.email ?? "",
          cycle,
        },
      });

      return {
        success: true,
        orderId: order.id,
        providerOrderId: order.id,
      };
    } catch (error) {
      captureError(error, { service: "razorpay-provider", operation: "createCheckout", planCode: params.planCode });
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

  /**
   * RCCF-73 — create a ONE-TIME order for additional partner client capacity.
   * The amount is derived server-side from the canonical unit price × the
   * requested quantity — never from client input. Order notes carry the
   * purpose tag + agency identity (both server-derived) so the webhook can
   * reconcile the capture without trusting any tenant signal from the wire.
   * No capacity is granted here — only the payment capture (webhook) grants.
   */
  async createCapacityAddonOrder(input: { agencyId: string; quantity: number; unitPriceInr: number }): Promise<{ success: boolean; orderId?: string; amountPaise?: number; error?: string }> {
    try {
      if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        return { success: false, error: "Invalid quantity" };
      }
      const Razorpay = (await import("razorpay")).default;
      const razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
      const amountPaise = Math.round(input.unitPriceInr * input.quantity * 100);
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `cap_${Date.now()}`,
        notes: {
          purpose: "partner_capacity_addon",
          agencyId: input.agencyId,
          quantity: String(input.quantity),
          unitPriceInr: String(input.unitPriceInr),
        },
      });
      return { success: true, orderId: order.id, amountPaise };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Capacity order creation failed",
      };
    }
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
