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
import { loadRuntimeFeatureOverrides } from "./runtime-config-loader";
import { headers } from "next/headers";

export type PlanOrigin = "v2" | "legacy" | "none";

export interface ResolvedActivePlan {
  /** Canonical (or legacy-fallback) plan code; null when no subscription. */
  code: string | null;
  origin: PlanOrigin;
  status: string | null;
}

export interface SubscriptionEntitlementState {
  status: string | null | undefined;
  trialEndsAt?: Date | null;
  renewsAt?: Date | null;
  currentPeriodEnd?: Date | null;
}

/**
 * Resolve whether a subscription currently grants plan capabilities.
 *
 * Billing lifecycle semantics are deliberately centralized here: ACTIVE is
 * eligible until an explicit period end, TRIALING is eligible only while its
 * trial is open (or when the existing record has no trial end), and PAST_DUE /
 * CANCELLED / EXPIRED never grant access because no grace period exists.
 */
export function isSubscriptionEntitlementEligible(
  subscription: SubscriptionEntitlementState,
  now = new Date(),
): boolean {
  const status = subscription.status;
  if (status === "ACTIVE") {
    const end = subscription.renewsAt ?? subscription.currentPeriodEnd;
    return !end || end.getTime() > now.getTime();
  }
  if (status === "TRIALING") {
    const end = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
    return !end || end.getTime() > now.getTime();
  }
  return false;
}

function noEntitlement(origin: PlanOrigin, status: string | null | undefined): ResolvedActivePlan {
  return { code: null, origin, status: status ?? null };
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

/**
 * RCCF-72.17C.1 — request-scoped plan memoization.
 *
 * `resolveActivePlan` runs ~3 DB queries (5 cold) per call and is invoked
 * multiple times within one logical request (publish ×3, dashboard, agency).
 * The result is a pure function of (workspaceId, tenantId) + committed DB
 * state — NOT of user/session/role — and the resolver never uses a transaction
 * client, so it is safe to memoize per request.
 *
 * React 18 (this app) does not export `cache`, and a module/global Map would
 * leak billing state across requests. Next.js creates a UNIQUE `Headers`
 * instance per request (RSC + Server Actions); keying a WeakMap on that
 * instance yields a true request scope that is garbage-collected when the
 * request ends. Outside a request context (`headers()` throws) the cache is a
 * no-op — cron/job/build callers resolve fresh, preserving correctness.
 */
const requestPlanCache = new WeakMap<object, Map<string, Promise<ResolvedActivePlan>>>();

function cachedPlan(
  workspaceId: string | null | undefined,
  tenantId: string | null | undefined,
  compute: () => Promise<ResolvedActivePlan>,
): Promise<ResolvedActivePlan> {
  let scope: Map<string, Promise<ResolvedActivePlan>> | undefined;
  try {
    const h = headers();
    let m = requestPlanCache.get(h);
    if (!m) {
      m = new Map();
      requestPlanCache.set(h, m);
    }
    scope = m;
  } catch {
    // Not in a request scope (tests, cron, build): resolve fresh each call.
    return compute();
  }
  const key = JSON.stringify([workspaceId ?? null, tenantId ?? null]);
  const hit = scope.get(key);
  if (hit) return hit;
  const p = compute();
  // Never cache a failure: if compute() rejects, drop the entry so a later
  // call in the same request re-invokes instead of reusing a rejection.
  p.catch(() => {
    if (scope?.get(key) === p) scope.delete(key);
  });
  scope.set(key, p);
  return p;
}

/** Resolve the active plan for a workspace (v2 first). */
async function resolveActivePlanImpl(
  workspaceId?: string | null,
  tenantId?: string | null,
): Promise<ResolvedActivePlan> {
  // RCCF-29: warm the Super Admin runtime overrides so the capability engine
  // (getPlan overlay) honors persisted BillingPlan.runtimeConfig limits.
  // Parallelize with the first DB lookup (independent, saves ~300ms cold).
  const overridesPromise = loadRuntimeFeatureOverrides();

  if (workspaceId) {
    const [ , sub ] = await Promise.all([
      overridesPromise,
      billingRepository.findSubscriptionWithPlan(workspaceId),
    ]);
    if (sub?.plan?.code) {
      if (!isSubscriptionEntitlementEligible(sub)) return noEntitlement("v2", sub.status);
      // IMPLEMENTATION-42 Phase 5: clamp Launch → Grow for agency-managed creators.
      const code = await resolveRestrictedPlanCode({ tenantId, code: sub.plan.code });
      return { code, origin: "v2", status: sub.status };
    }
  }

  if (tenantId) {
    // Single query via workspace include instead of workspace (1) + subscription (1) serial = saves 1 query + ~120ms.
    // In production the include returns billingSubscription directly; fallback preserves test mocks where workspace returns only {id}.
    const [ , workspaceWithSub ] = await Promise.all([
      overridesPromise,
      prisma.workspace.findFirst({
        where: { tenantId },
        select: { id: true, billingSubscription: { include: { plan: { select: { code: true } } } } },
      }),
    ]);
    const subFromInclude = (workspaceWithSub as unknown as { billingSubscription?: { plan?: { code?: string } } })?.billingSubscription;
    if ((subFromInclude as unknown as { plan?: { code?: string } })?.plan?.code) {
      const typedSub = subFromInclude as unknown as SubscriptionEntitlementState & { plan: { code: string }; status: string };
      if (!isSubscriptionEntitlementEligible(typedSub)) return noEntitlement("v2", typedSub.status);
      const code = await resolveRestrictedPlanCode({ tenantId, code: typedSub.plan.code });
      return { code, origin: "v2", status: typedSub.status };
    }
    if (workspaceWithSub) {
      const sub = await billingRepository.findSubscriptionWithPlan(workspaceWithSub.id);
      if (sub?.plan?.code) {
        if (!isSubscriptionEntitlementEligible(sub)) return noEntitlement("v2", sub.status);
        const code = await resolveRestrictedPlanCode({ tenantId, code: sub.plan.code });
        return { code, origin: "v2", status: sub.status };
      }
    }
    const legacy = await prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: true, status: true, currentPeriodEnd: true },
    });
    if (legacy?.plan) {
      if (!isSubscriptionEntitlementEligible({ status: legacy.status, currentPeriodEnd: legacy.currentPeriodEnd })) {
        return noEntitlement("legacy", legacy.status);
      }
      const code = await resolveRestrictedPlanCode({ tenantId, code: legacy.plan });
      return { code, origin: "legacy", status: legacy.status };
    }
  }

  await overridesPromise;
  return { code: null, origin: "none", status: null };
}

/**
 * RCCF-72.17C.1 — request-scoped memoized plan resolution.
 * Repeated calls with the same (workspaceId, tenantId) within one request reuse
 * the first resolution; different requests and different tenants never share.
 * Signature and semantics are unchanged from the pre-memoization resolver.
 */
export function resolveActivePlan(
  workspaceId?: string | null,
  tenantId?: string | null,
): Promise<ResolvedActivePlan> {
  return cachedPlan(workspaceId, tenantId, () => resolveActivePlanImpl(workspaceId, tenantId));
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

  // RCCF-29: warm runtime overrides so batched enforcement (e.g. the social
  // sync cron entitlement filter) uses persisted configuration too.
  await loadRuntimeFeatureOverrides();

  const [workspaces, legacy] = await Promise.all([
    prisma.workspace.findMany({ where: { tenantId: { in: tenantIds } }, select: { id: true, tenantId: true } }),
    prisma.subscription.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, plan: true, status: true, currentPeriodEnd: true },
    }),
  ]);

  const subs = await prisma.billingSubscription.findMany({
    where: { workspaceId: { in: workspaces.map((w) => w.id) } },
    include: { plan: { select: { code: true, name: true } } },
  });

  const workspaceByTenant = new Map<string, string>();
  for (const w of workspaces) workspaceByTenant.set(w.tenantId ?? "", w.id);

  const subByWorkspace = new Map<string, { code: string; name: string; status: string; trialEndsAt: Date | null; renewsAt: Date | null }>();
  for (const s of subs) {
    if (s.workspaceId && s.plan?.code) subByWorkspace.set(s.workspaceId, {
      code: s.plan.code,
      name: s.plan.name,
      status: s.status,
      trialEndsAt: s.trialEndsAt,
      renewsAt: s.renewsAt,
    });
  }

  const legacyByTenant = new Map<string, { plan: string; status: string; currentPeriodEnd: Date | null }>();
  for (const l of legacy) legacyByTenant.set(l.tenantId, { plan: l.plan, status: l.status ?? "", currentPeriodEnd: l.currentPeriodEnd });

  const rows = tenantIds.map((tenantId) => {
    const workspaceId = workspaceByTenant.get(tenantId);
    const v2 = workspaceId ? subByWorkspace.get(workspaceId) : undefined;
    if (v2) {
      if (!isSubscriptionEntitlementEligible(v2)) {
        return { tenantId, planCode: null, planDisplay: "Free", origin: "v2" as const, status: v2.status };
      }
      return { tenantId, planCode: v2.code, planDisplay: v2.name, origin: "v2" as const, status: v2.status };
    }
    const legacy = legacyByTenant.get(tenantId);
    if (legacy?.plan) {
      if (!isSubscriptionEntitlementEligible(legacy)) {
        return { tenantId, planCode: null, planDisplay: "Free", origin: "legacy" as const, status: legacy.status };
      }
      return { tenantId, planCode: legacy.plan, planDisplay: resolvePlan(legacy.plan).displayName, origin: "legacy" as const, status: legacy.status };
    }
    return { tenantId, planCode: null, planDisplay: "Free", origin: "none" as const, status: null };
  });

  // RCCF-11: apply the same agency-managed restriction the single-tenant path
  // applies (Launch → Grow) so batched resolution never disagrees with
  // resolveActivePlan. isTenantAgencyManaged is 30s-cached — no N+1.
  return Promise.all(
    rows.map(async (row) => {
      if (!row.planCode) return row;
      const code = await resolveRestrictedPlanCode({ tenantId: row.tenantId, code: row.planCode });
      if (code === row.planCode) return row;
      return { ...row, planCode: code, planDisplay: resolvePlan(code ?? "").displayName };
    }),
  );
}

export type { BillingSubscription } from "@/generated/prisma/client";
