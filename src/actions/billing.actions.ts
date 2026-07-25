"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceService } from "@/modules/workspace/application/service";
import { billingService } from "@/lib/billing/service";
import { getPlan } from "@/lib/capabilities";

export type BillingActionResult = { success: boolean; checkoutUrl?: string; error?: string; orderId?: string; amount?: number };

export async function createSubscriptionCheckout(planCode: string = "creator_pro"): Promise<BillingActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const ws = workspaceService.getCurrent();
    const workspaceId = ws?.id;
    if (!workspaceId) return { success: false, error: "No workspace associated with account" };

    const result = await billingService.createCheckout(workspaceId, planCode, session.user.email ?? undefined);
    if (!result.success) return result;

    const plan = getPlan(planCode);
    const amount = plan?.price ?? 0;
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    return { success: true, checkoutUrl: `https://checkout.razorpay.com/v1/checkout.js?key_id=${keyId}&amount=${amount * 100}&order_id=${result.orderId}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Checkout failed" };
  }
}
