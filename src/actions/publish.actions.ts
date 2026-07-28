"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publishingService } from "@/lib/publishing/service";
import type { PublishStatus } from "@/lib/publishing/service";

export type PublishActionResult = {
  success: boolean;
  error?: string;
  status?: PublishStatus;
  version?: number;
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
    if (!result.success) return { success: false, error: result.error };

    const status = await publishingService.getStatus(tenantId);
    return { success: true, status: status.data, version: result.version };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Publish failed" };
  }
}

export async function rollbackWebsite(version?: number): Promise<PublishActionResult> {
  try {
    const tenantId = await requireTenant();
    const result = await publishingService.rollback(tenantId, version ?? 0);
    if (!result.success) return { success: false, error: result.error };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Rollback failed" };
  }
}

export async function getPublishStatus(): Promise<PublishActionResult> {
  try {
    const tid = await requireTenant();
    const result = await publishingService.getStatus(tid);
    if (!result.success) return { success: false, error: result.error };
    return { success: true, status: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Status check failed" };
  }
}

export async function previewWebsite(): Promise<PublishActionResult> {
  try {
    const tenantId = await requireTenant();
    const result = await publishingService.preview(tenantId);
    if (!result.success) return { success: false, error: result.error };

    const status = await publishingService.getStatus(tenantId);
    return { success: true, status: status.data, version: result.version, previewUrl: status.data?.previewUrl ?? undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Preview failed" };
  }
}

export async function validateBeforePublish(): Promise<PublishActionResult> {
  try {
    const tenantId = await requireTenant();
    const result = await publishingService.validateBeforePublish(tenantId);
    if (!result.success) return { success: false, error: result.error };
    return { success: true, issues: result.issues };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Validation failed" };
  }
}

