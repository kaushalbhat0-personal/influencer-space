"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { billingService } from "@/lib/billing/service";
import { workspaceService } from "@/modules/workspace/application/service";

export type BillingActionResult = {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
};

export async function createSubscriptionCheckout(planCode: string = "creator_pro"): Promise<BillingActionResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const ws = workspaceService.getCurrent();
  const workspaceId = ws?.id ?? session.user.workspaceId ?? session.user.tenantId;
  if (!workspaceId) return { success: false, error: "No workspace associated with account" };

  const result = await billingService.createCheckout(workspaceId, planCode, session.user.email ?? undefined);
  if (!result.success) return result;

  const plan = (await import("@/lib/billing/plan-catalog")).PLANS.find((p) => p.code === planCode);
  const amount = plan?.price ?? 0;
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  return {
    success: true,
    checkoutUrl: `https://checkout.razorpay.com/v1/checkout.js?key_id=${keyId}&amount=${amount * 100}&order_id=${result.orderId}`,
  };
}
