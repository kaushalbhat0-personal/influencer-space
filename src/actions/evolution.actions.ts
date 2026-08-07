"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import { websiteEvolutionRuntime } from "@/modules/website-evolution";
import type { ChangePreview, EvolutionOpportunity, EvolutionStatus, WebsiteVersionInfo } from "@/modules/website-evolution";
import { revalidatePath } from "next/cache";

async function requireTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

/** Detection feed — growth-triggered evolution opportunities ordered by ROI. */
export async function getEvolutionFeed(): Promise<{
  success: boolean;
  data?: { opportunities: EvolutionOpportunity[]; versionInfo: WebsiteVersionInfo };
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const context = await runtimeContextBuilder.build(tenantId);
    const [opportunities, versionInfo] = await Promise.all([
      websiteEvolutionRuntime.detectFrom(context, tenantId),
      websiteEvolutionRuntime.versionInfo(tenantId),
    ]);
    return { success: true, data: { opportunities, versionInfo } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function previewEvolution(id: string): Promise<{
  success: boolean;
  data?: ChangePreview;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const preview = await websiteEvolutionRuntime.preview(tenantId, id);
    return preview ? { success: true, data: preview } : { success: false, error: "Not available." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function applyEvolution(id: string): Promise<{
  success: boolean;
  manifest?: ChangePreview["change"];
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const result = await websiteEvolutionRuntime.apply(tenantId, id);
    revalidatePath("/admin/dashboard");
    revalidatePath("/builder");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function setEvolutionStatus(id: string, status: EvolutionStatus): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    await websiteEvolutionRuntime.setStatus(tenantId, id, status);
    revalidatePath("/admin/dashboard");
    revalidatePath("/builder");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
