"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { websiteHealthEngine } from "@/lib/platform/health/engine";

export async function getWebsiteHealthScore(_clientTenantId: string): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    // VALIDATION-01 V-039: authenticate and always evaluate the session tenant.
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) throw new Error("Unauthorized");
    const health = await websiteHealthEngine.evaluate(tenantId);
    return { success: true, score: health.overallScore };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to evaluate health" };
  }
}
