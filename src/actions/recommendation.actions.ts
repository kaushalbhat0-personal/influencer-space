"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recommendationRuntime } from "@/modules/recommendation-runtime";
import type { Recommendation } from "@/modules/recommendation-runtime";
import { emitEvent } from "@/modules/event-runtime";
import { revalidatePath } from "next/cache";

async function requireTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

/** Full scored recommendation list (highest impact first). */
export async function getRecommendations(): Promise<{
  success: boolean;
  data?: Recommendation[];
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const recommendations = await recommendationRuntime.getRecommendations(tenantId);
    return { success: true, data: recommendations };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Today's highest-impact next action. */
export async function getTopRecommendation(): Promise<{
  success: boolean;
  data?: Recommendation | null;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const top = await recommendationRuntime.getTopRecommendation(tenantId);
    return { success: true, data: top };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function dismissRecommendation(recommendationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    await recommendationRuntime.dismiss(tenantId, recommendationId);
    await emitEvent("recommendation.dismissed", tenantId, recommendationId);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/knowledge");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function completeRecommendation(recommendationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    await recommendationRuntime.complete(tenantId, recommendationId);
    await emitEvent("recommendation.accepted", tenantId, recommendationId);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/knowledge");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Refresh surfaces previously ignored recommendations. */
export async function refreshRecommendations(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    await recommendationRuntime.refresh(tenantId);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/knowledge");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
