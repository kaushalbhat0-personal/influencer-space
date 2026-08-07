"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { seedBillingCatalog } from "@/modules/billing/infrastructure/catalog-seed";

export async function resyncBillingCatalog(): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await seedBillingCatalog();
    await logAction("system", "pricing:resync-catalog", {});
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Sync failed" };
  }
}
