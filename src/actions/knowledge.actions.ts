"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  knowledgeScoreService,
  type KnowledgeRuntimeResult,
} from "@/modules/knowledge-runtime";
import type { CompletionAnswer } from "@/modules/knowledge-runtime";
import { emitEvent } from "@/modules/event-runtime";
import { revalidatePath } from "next/cache";

async function requireTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

export type KnowledgeRuntimeResponse = KnowledgeRuntimeResult;

/** Full runtime evaluation for the completion dashboard. Deterministic — no AI. */
export async function getKnowledgeRuntime(): Promise<{
  success: boolean;
  data?: KnowledgeRuntimeResponse;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const result = await knowledgeScoreService.evaluate(tenantId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Save creator-confirmed answers. Only declared facts are written; content
 * fields are rejected (their completion lives on their own admin pages).
 * On success the knowledge score is persisted and the path revalidated.
 */
export async function saveKnowledgeAnswers(input: CompletionAnswer[]): Promise<{
  success: boolean;
  data?: KnowledgeRuntimeResponse;
  errors?: Array<{ fieldId: string; message: string }>;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const saved = await knowledgeScoreService.saveAnswers(tenantId, input);
    if (saved.errors.length > 0) {
      return { success: false, errors: saved.errors };
    }
    await emitEvent("knowledge.completed", tenantId, undefined, { answers: input.length });
    revalidatePath("/admin/knowledge");
    revalidatePath("/admin/dashboard");
    return { success: true, data: saved.result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Builder-side completion hints, mapped to builder module ids. */
export async function getBuilderCompletionHints(): Promise<{
  success: boolean;
  data?: KnowledgeRuntimeResponse["hints"];
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const result = await knowledgeScoreService.evaluate(tenantId);
    return { success: true, data: result.hints };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
