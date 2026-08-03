/**
 * Subscription source of truth reader — IMPLEMENTATION-33.
 *
 * Every feature gate resolves the ACTIVE plan through Billing v2
 * (BillingSubscription → BillingPlan) with a backward-compatible fallback to
 * the legacy Subscription table for tenants that have not migrated yet.
 * Billing v2 wins when present; the legacy table is never written here.
 */
import { prisma } from "@/lib/prisma";
import { billingRepository } from "../infrastructure/repository";
import { resolvePlan } from "@/lib/capabilities/plan-resolution";

export type PlanOrigin = "v2" | "legacy" | "none";

export interface ResolvedActivePlan {
  /** Canonical (or legacy-fallback) plan code; null when no subscription. */
  code: string | null;
  origin: PlanOrigin;
  status: string | null;
}

/** Admin-facing subscription row (v2 + legacy union, canonical display). */
export interface AdminSubscriptionRow {
  tenantId: string;
  tenantName: string;
  planCode: string;
  planDisplay: string;
  status: string;
  currentPeriodEnd: string | null;
  origin: PlanOrigin;
}

/** Resolve the active plan for a workspace (v2 first). */
export async function resolveActivePlan(
  workspaceId?: string | null,
  tenantId?: string | null,
): Promise<ResolvedActivePlan> {
  if (workspaceId) {
    const sub = await billingRepository.findSubscriptionWithPlan(workspaceId);
    if (sub?.plan?.code) return { code: sub.plan.code, origin: "v2", status: sub.status };
  }

  if (tenantId) {
    const workspace = await prisma.workspace.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    if (workspace) {
      const sub = await billingRepository.findSubscriptionWithPlan(workspace.id);
      if (sub?.plan?.code) return { code: sub.plan.code, origin: "v2", status: sub.status };
    }
    const legacy = await prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: true, status: true },
    });
    if (legacy?.plan) return { code: legacy.plan, origin: "legacy", status: legacy.status };
  }

  return { code: null, origin: "none", status: null };
}

/**
 * Every subscription for admin dashboards: Billing v2 first, legacy fallback
 * for unmigrated tenants (never duplicated — v2 wins per tenant).
 */
export async function listAllSubscriptions(): Promise<AdminSubscriptionRow[]> {
  const [v2, legacy] = await Promise.all([
    prisma.billingSubscription.findMany({
      include: {
        plan: { select: { code: true, name: true } },
        workspace: { include: { tenant: { select: { id: true, name: true } } } },
      },
    }),
    prisma.subscription.findMany({
      include: { tenant: { select: { id: true, name: true } } },
    }),
  ]);

  const rows: AdminSubscriptionRow[] = v2.map((sub) => ({
    tenantId: sub.workspace?.tenant?.id ?? sub.accountId,
    tenantName: sub.workspace?.tenant?.name ?? "Unknown",
    planCode: sub.plan?.code ?? "creator_free",
    planDisplay: resolvePlan(sub.plan?.code ?? "").displayName,
    status: sub.status,
    currentPeriodEnd: sub.renewsAt?.toISOString() ?? null,
    origin: "v2",
  }));

  const v2TenantIds = new Set(rows.map((r) => r.tenantId));
  for (const sub of legacy) {
    if (!sub.tenantId || v2TenantIds.has(sub.tenantId)) continue;
    rows.push({
      tenantId: sub.tenantId,
      tenantName: sub.tenant?.name ?? "Unknown",
      planCode: sub.plan,
      planDisplay: resolvePlan(sub.plan).displayName,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      origin: "legacy",
    });
  }

  return rows;
}

export type { BillingSubscription } from "@/generated/prisma/client";
