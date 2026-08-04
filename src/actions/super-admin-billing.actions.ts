"use server";

/**
 * Super Admin billing operations — IMPLEMENTATION-39.
 *
 * Everything delegates to BillingService / RevenueService (Billing v2). No
 * duplicate checkout, no duplicate revenue logic, no legacy writes. All actions
 * are SUPER_ADMIN guarded.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/modules/billing/application/service";
import { revenueService } from "@/modules/billing/application/revenue-service";
import { logAction } from "@/lib/audit";
import { billingMigrationRegistry } from "@/modules/billing/application/migration-registry";

async function requireSuperAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true };
}

async function workspaceForTenant(tenantId: string): Promise<string | null> {
  const workspace = await prisma.workspace.findFirst({ where: { tenantId }, select: { id: true } });
  return workspace?.id ?? null;
}

export async function adminGetInvoices(input: { tenantId?: string; status?: string; search?: string; page?: number; pageSize?: number }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  return { success: true, data: await revenueService.listInvoicesAdmin(input) };
}

export async function adminGetTransactions(input: { kind?: string; search?: string; page?: number; pageSize?: number }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  return { success: true, data: await revenueService.listUnifiedTransactions(input) };
}

export async function adminSetSubscription(
  tenantId: string,
  action: "upgrade" | "downgrade" | "cancel" | "resume" | "retry",
  planCode?: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const workspaceId = await workspaceForTenant(tenantId);
  if (!workspaceId) return { success: false, error: "Workspace not found" };

  try {
    switch (action) {
      case "upgrade":
      case "downgrade":
        if (!planCode) return { success: false, error: "Plan code required" };
        await billingService.adminSetPlan(workspaceId, planCode, "ACTIVE", `super-admin ${action}`);
        break;
      case "cancel":
        await billingService.cancelSubscription(workspaceId, "super-admin");
        break;
      case "resume":
        await billingService.resumeSubscription(workspaceId);
        break;
      case "retry":
        if (!planCode) return { success: false, error: "Plan code required" };
        await billingService.changePlan(workspaceId, planCode);
        break;
    }
    await logAction(tenantId, "billing:admin-" + action, { action, planCode }).catch(() => {});
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : `${action} failed` };
  }
}

export async function adminUpdateRevenueSettings(input: {
  defaultCurrency: string;
  defaultTrialDays: number;
  gracePeriodDays: number;
  invoicePrefix: string;
  autoRenew: boolean;
  refundWindowDays: number;
  prorationEnabled: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    await revenueService.updateBillingSettings(input);
    await logAction("system", "billing:settings-updated", { ...input }).catch(() => {});
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update settings" };
  }
}

export async function adminUpdateCommissionConfig(input: {
  agencyClientPercent: number;
  platformPercent: number;
  referralPercent: number;
  creatorDefaultShare: number;
  agencyDefaultShare: number;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (Object.values(input).some((v) => typeof v !== "number" || v < 0 || v > 100)) {
    return { success: false, error: "Invalid percentage" };
  }
  try {
    await revenueService.updateCommissionConfig(input);
    await logAction("system", "billing:commission-updated", { ...input }).catch(() => {});
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update commission" };
  }
}

export async function getBillingMigrationStatus() {
  return billingMigrationRegistry.getStatus();
}
