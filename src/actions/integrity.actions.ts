"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { previewTenantDeletion, safeDeleteTenant, runIntegrityScan, runSafeCleanup } from "@/lib/integrity/runtime";
import { logAction } from "@/lib/audit";

export async function getDeletionPreview(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  return previewTenantDeletion(tenantId);
}

export async function executeSafeDelete(tenantId: string, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  const result = await safeDeleteTenant(tenantId, { reason });
  if (result.success && session.user.id) {
    await logAction(tenantId, "integrity:tenant-deleted", {
      affectedRecords: result.preview.totalRecords,
      durationMs: result.durationMs,
      reason,
    }).catch(() => {});
  }
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/tenants");
  revalidatePath("/super-admin/integrity");
  return result;
}

export async function runIntegrityScanAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  const result = await runIntegrityScan();
  revalidatePath("/super-admin/integrity");
  return result;
}

export async function runSafeCleanupAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  const result = await runSafeCleanup();
  if (session.user.id) {
    await logAction("platform", "integrity:cleanup", { cleared: result.cleared, details: result.details }).catch(() => {});
  }
  revalidatePath("/super-admin/integrity");
  return result;
}
