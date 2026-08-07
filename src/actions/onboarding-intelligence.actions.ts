"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeOnboardingPreview } from "@/modules/runtime-context";
import type { OnboardingPreview, OnboardingPreviewInput } from "@/modules/runtime-context";
import { goalProfileService } from "@/modules/goals-runtime";
import type { GoalWeight } from "@/modules/goals-runtime";
import { knowledgeScoreService } from "@/modules/knowledge-runtime";
import type { CompletionAnswer } from "@/modules/knowledge-runtime";
import { emitEvent } from "@/modules/event-runtime";
import { revalidatePath } from "next/cache";

/** Compute the intelligence preview before generation (no tenant required). */
export async function getOnboardingPreview(input: OnboardingPreviewInput): Promise<{
  success: boolean;
  data?: OnboardingPreview;
  error?: string;
}> {
  try {
    const preview = computeOnboardingPreview(input);
    return { success: true, data: preview };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function requireTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

/**
 * Seed the intelligence accepted during onboarding: a weighted goal profile
 * and/or declared facts. Called once the tenant exists, right after
 * generation. No new onboarding forms — reuses the Goals + Knowledge runtimes.
 */
export async function seedOnboardingIntelligence(input: {
  goals?: GoalWeight[];
  answers?: CompletionAnswer[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await requireTenantId();

    if (input.goals && input.goals.length > 0) {
      await goalProfileService.saveProfile(tenantId, { weights: input.goals, source: "recommended" });
      await emitEvent("goal.updated", tenantId, undefined, { source: "onboarding" });
    }

    if (input.answers && input.answers.length > 0) {
      const saved = await knowledgeScoreService.saveAnswers(tenantId, input.answers);
      if (saved.errors.length > 0) {
        return { success: false, error: saved.errors.map((e) => e.message).join(" ") };
      }
      await emitEvent("knowledge.completed", tenantId, undefined, { source: "onboarding", answers: input.answers.length });
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/goals");
    revalidatePath("/admin/knowledge");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
