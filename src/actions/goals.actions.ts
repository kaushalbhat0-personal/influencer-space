"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { goalRuntime } from "@/modules/goals-runtime";
import type { GoalBuilderSuggestion, GoalCounts, GoalDashboardData, GoalMilestone, GoalProfile, SaveGoalProfileInput } from "@/modules/goals-runtime";
import { emitEvent } from "@/modules/event-runtime";
import { revalidatePath } from "next/cache";

async function requireTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

/** Serializable runtime payload (the internal knowledge snapshot is excluded). */
export interface GoalsRuntimePayload {
  profile: GoalProfile | null;
  activeProfile: GoalProfile;
  recommendations: Array<{ goalId: string; weight: number; reason: string }>;
  alignment: { items: Array<{ goalId: string; label: string; weight: number; supported: number; total: number; percent: number }>; overall: number };
  builderSuggestions: GoalBuilderSuggestion[];
  dashboard: GoalDashboardData | null;
  counts: GoalCounts;
  milestones: GoalMilestone[];
  commercePriority: string | null;
}

export async function getGoalsRuntime(): Promise<{
  success: boolean;
  data?: GoalsRuntimePayload;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const { snapshot, ...rest } = await goalRuntime.evaluate(tenantId);
    return { success: true, data: { ...rest, commercePriority: rest.commercePriority } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveGoalProfile(input: SaveGoalProfileInput): Promise<{
  success: boolean;
  data?: GoalsRuntimePayload;
  errors?: string[];
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    await goalRuntime.saveProfile(tenantId, input);
    await emitEvent("goal.updated", tenantId, undefined, { source: input.source, weights: input.weights });
    const { snapshot, ...rest } = await goalRuntime.evaluate(tenantId);
    revalidatePath("/admin/goals");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/knowledge");
    return { success: true, data: { ...rest, commercePriority: rest.commercePriority } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function applyRecommendedGoals(): Promise<{
  success: boolean;
  data?: GoalsRuntimePayload;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    await goalRuntime.recommendAndSave(tenantId);
    await emitEvent("goal.updated", tenantId, undefined, { source: "recommended" });
    const { snapshot, ...rest } = await goalRuntime.evaluate(tenantId);
    revalidatePath("/admin/goals");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/knowledge");
    return { success: true, data: { ...rest, commercePriority: rest.commercePriority } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function clearGoalProfile(): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await requireTenantId();
    await goalRuntime.clearProfile(tenantId);
    revalidatePath("/admin/goals");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Builder-side goal recommendations (Phase 7). */
export async function getGoalBuilderSuggestions(): Promise<{
  success: boolean;
  data?: GoalBuilderSuggestion[];
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const result = await goalRuntime.evaluate(tenantId);
    return { success: true, data: result.builderSuggestions };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
