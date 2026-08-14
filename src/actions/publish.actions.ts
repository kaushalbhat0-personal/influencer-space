"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publishingService, type CapabilityIssue } from "@/lib/publishing/service";
import type { PublishStatus } from "@/lib/publishing/service";
import { getPublishUsage, type PublishUsage } from "@/lib/publishing/publish-usage";
import { emitEvent } from "@/modules/event-runtime";

export type PublishActionResult = {
  success: boolean;
  error?: string;
  status?: PublishStatus;
  version?: number;
  issues?: string[];
  capabilityIssues?: CapabilityIssue[];
  code?: string;
  used?: number;
  limit?: number;
  periodStart?: string;
  periodEnd?: string | null;
  mode?: string;
  suggestedUpgrade?: "growth" | "scale" | null;
};

export async function getCreatorPublishUsage(): Promise<{ success: boolean; usage?: PublishUsage; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) return { success: false, error: "Unauthorized" };
    return { success: true, usage: await getPublishUsage(tenantId) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load publish usage" };
  }
}

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

export async function publishWebsite(): Promise<PublishActionResult> {
  try {
    const tenantId = await requireTenant();
    const result = await publishingService.publish(tenantId);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        code: result.code,
        used: result.used,
        limit: result.limit,
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
        mode: result.mode,
        suggestedUpgrade: result.suggestedUpgrade,
      };
    }

    await emitEvent("storefront.published", tenantId, undefined, { version: result.version });
    const status = await publishingService.getStatus(tenantId);
    return { success: true, status: status.data, version: result.version, capabilityIssues: result.capabilityIssues };
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

