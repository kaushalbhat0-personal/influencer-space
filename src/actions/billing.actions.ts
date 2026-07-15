"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";

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

  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context" };
  }

  return { success: true, checkoutUrl: "#" };
}
