"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { publishingService } from "@/lib/publishing/service";
import type { PublishStatus } from "@/lib/publishing/service";

export type PublishActionResult = {
  success: boolean;
  error?: string;
  status?: PublishStatus;
  previewUrl?: string;
  issues?: string[];
};

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

export async function publishWebsite(): Promise<PublishActionResult> {
  try {
    const tenantId = await requireTenant();
    const result = await publishingService.publish(tenantId);
    if (!result.success) return { success: false, error: result.error?.message };

    const status = await publishingService.getStatus(tenantId);
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, status: status.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Publish failed" };
  }
}

export async function rollbackWebsite(): Promise<PublishActionResult> {
  try {
    await requireTenant();
    const result = await publishingService.rollback();
    if (!result.success) return { success: false, error: result.error?.message };
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Rollback failed" };
  }
}

export async function getPublishStatus(): Promise<PublishActionResult> {
  try {
    const tid = await requireTenant();
    const result = await publishingService.getStatus(tid);
    return { success: true, status: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Status check failed" };
  }
}

export async function validateBeforePublish(): Promise<PublishActionResult> {
  try {
    const tenantId = await requireTenant();
    const result = await publishingService.validateBeforePublish(tenantId);
    return { success: result.success, issues: result.data?.issues };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Validation failed" };
  }
}
