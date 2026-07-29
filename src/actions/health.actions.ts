"use server";

import { websiteHealthEngine } from "@/lib/platform/health/engine";

export async function getWebsiteHealthScore(tenantId: string): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    const health = await websiteHealthEngine.evaluate(tenantId);
    return { success: true, score: health.overallScore };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to evaluate health" };
  }
}