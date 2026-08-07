"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { businessHealthRuntime } from "@/modules/business-health";

async function requireTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

/** Live Business Health for the creator (read-only — no projection recorded). */
export async function getBusinessHealth(): Promise<{
  success: boolean;
  data?: { overall: number; grade: string; trend: string; delta: number; recommendedFocus: string; nextMilestone: number };
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const evaluation = await businessHealthRuntime.evaluate(tenantId);
    return {
      success: true,
      data: {
        overall: evaluation.health.overallScore,
        grade: evaluation.health.grade,
        trend: evaluation.trend.trend,
        delta: evaluation.trend.delta,
        recommendedFocus: evaluation.health.recommendedFocus,
        nextMilestone: evaluation.health.nextMilestone,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Builder-side health (Phase 14) — read-only, never records. */
export async function getBuilderBusinessHealth(): Promise<{
  success: boolean;
  data?: { overall: number; grade: string };
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const evaluation = await businessHealthRuntime.evaluate(tenantId, { markShown: false });
    return { success: true, data: { overall: evaluation.health.overallScore, grade: evaluation.health.grade } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
