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
import { resolveRestrictedPlanCode } from "./plan-restriction";

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
    if (sub?.plan?.code) {
      // IMPLEMENTATION-42 Phase 5: clamp Launch → Grow for agency-managed creators.
      const code = await resolveRestrictedPlanCode({ tenantId, code: sub.plan.code });
      return { code, origin: "v2", status: sub.status };
    }
  }

  if (tenantId) {
    const workspace = await prisma.workspace.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    if (workspace) {
      const sub = await billingRepository.findSubscriptionWithPlan(workspace.id);
      if (sub?.plan?.code) {
        const code = await resolveRestrictedPlanCode({ tenantId, code: sub.plan.code });
        return { code, origin: "v2", status: sub.status };
      }
    }
    const legacy = await prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: true, status: true },
    });
    if (legacy?.plan) {
      const code = await resolveRestrictedPlanCode({ tenantId, code: legacy.plan });
      return { code, origin: "legacy", status: legacy.status };
    }
  }

  return { code: null, origin: "none", status: null };
}

/**
 * Every subscription for admin dashboards: Billing v2 first, legacy fallback
 * for unmigrated tenants (never duplicated — v2 wins per tenant).
 */
export async function listAllSubscriptions(): Promise<AdminSubscriptionRow[]> {  const [v2, legacy] = await Promise.all([
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
    planCode: sub.plan?.code ?? "creator_launch",
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

export interface TenantPlanRow {
  tenantId: string;
  planCode: string | null;
  planDisplay: string;
  origin: PlanOrigin;
  status: string | null;
}

/**
 * Batched active-plan resolution for many tenants (IMPLEMENTATION-39): Billing
 * v2 subscriptions win per tenant, legacy fallback for unmigrated ones. Uses 3
 * batched queries — no N+1.
 */
export async function resolvePlansForTenantIds(tenantIds: string[]): Promise<TenantPlanRow[]> {
  if (tenantIds.length === 0) return [];

  const [workspaces, legacy] = await Promise.all([
    prisma.workspace.findMany({ where: { tenantId: { in: tenantIds } }, select: { id: true, tenantId: true } }),
    prisma.subscription.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, plan: true, status: true },
    }),
  ]);

  const subs = await prisma.billingSubscription.findMany({
    where: { workspaceId: { in: workspaces.map((w) => w.id) } },
    include: { plan: { select: { code: true, name: true } } },
  });

  const workspaceByTenant = new Map<string, string>();
  for (const w of workspaces) workspaceByTenant.set(w.tenantId ?? "", w.id);

  const subByWorkspace = new Map<string, { code: string; name: string; status: string }>();
  for (const s of subs) {
    if (s.workspaceId && s.plan?.code) subByWorkspace.set(s.workspaceId, { code: s.plan.code, name: s.plan.name, status: s.status });
  }

  const legacyByTenant = new Map<string, { plan: string; status: string }>();
  for (const l of legacy) legacyByTenant.set(l.tenantId, { plan: l.plan, status: l.status ?? "" });

  return tenantIds.map((tenantId) => {
    const workspaceId = workspaceByTenant.get(tenantId);
    const v2 = workspaceId ? subByWorkspace.get(workspaceId) : undefined;
    if (v2) {
      return { tenantId, planCode: v2.code, planDisplay: v2.name, origin: "v2" as const, status: v2.status };
    }
    const legacy = legacyByTenant.get(tenantId);
    if (legacy?.plan) {
      return { tenantId, planCode: legacy.plan, planDisplay: resolvePlan(legacy.plan).displayName, origin: "legacy" as const, status: legacy.status };
    }
    return { tenantId, planCode: null, planDisplay: "Free", origin: "none" as const, status: null };
  });
}

export type { BillingSubscription } from "@/generated/prisma/client";
