"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export type BillingActionResult = {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
};

export async function createSubscriptionCheckout(): Promise<BillingActionResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  if (!session.user?.tenantId) {
    return { success: false, error: "No tenant associated with account" };
  }

  await logAction(session.user.tenantId, "createSubscriptionCheckout", {});
  return { success: true, checkoutUrl: "#" };
}
