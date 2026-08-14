/**
 * RCCF-32 — canonical publish-usage read for the creator UI.
 *
 * Authoritative, server-side: resolves the effective plan + publish policy
 * through the canonical chain, computes the current period, and reads the
 * PlanUsage row. The frontend never infers usage from snapshots/version/clicks.
 */
import { prisma } from "@/lib/prisma";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { resolvePublishPolicy, suggestedPublishUpgrade } from "./publish-policy";
import { computePublishPeriod } from "./publish-period";
import { planUsageRepository, PUBLISH_FEATURE_KEY } from "@/modules/billing/infrastructure/plan-usage-repository";

export interface PublishUsage {
  mode: "lifetime" | "monthly" | "unlimited";
  used: number;
  limit: number | null;
  remaining: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  isExhausted: boolean;
  suggestedUpgrade: "growth" | "scale" | null;
  /** RCCF-34: true when the Launch trial has ended (TRIALING + trialEndsAt <= now). */
  trialExpired: boolean;
}

/**
 * RCCF-34 — canonical server-authoritative trial-expiry check. A Launch trial
 * is expired when the subscription is still TRIALING and trialEndsAt has
 * passed. Used by the publish gate and the usage read so the creator sees the
 * truthful state everywhere.
 */
export async function isTrialExpiredForTenant(tenantId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({ where: { tenantId }, select: { id: true } });
  if (!workspace) return false;
  const sub = await prisma.billingSubscription.findUnique({
    where: { workspaceId: workspace.id },
    select: { status: true, trialEndsAt: true },
  });
  return sub?.status === "TRIALING" && !!sub.trialEndsAt && sub.trialEndsAt.getTime() <= Date.now();
}

export async function getPublishUsage(tenantId: string): Promise<PublishUsage> {
  const resolved = await resolveActivePlan(undefined, tenantId);
  const policy = await resolvePublishPolicy(resolved.code);
  const suggestedUpgrade = suggestedPublishUpgrade(resolved.code);
  const trialExpired = await isTrialExpiredForTenant(tenantId);

  if (policy.mode === "unlimited") {
    return {
      mode: "unlimited",
      used: 0,
      limit: null,
      remaining: null,
      periodStart: null,
      periodEnd: null,
      isExhausted: false,
      suggestedUpgrade,
      trialExpired,
    };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { createdAt: true },
  });
  const createdAt = tenant?.createdAt ?? new Date();
  const period = computePublishPeriod(policy.mode, createdAt, new Date());
  const row = await planUsageRepository.getUsage(prisma, {
    tenantId,
    featureKey: PUBLISH_FEATURE_KEY,
    periodStart: period.periodStart,
  });

  const used = row?.used ?? 0;
  const limit = policy.limit ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    mode: policy.mode,
    used,
    limit,
    remaining,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    isExhausted: remaining === 0,
    suggestedUpgrade,
    trialExpired,
  };
}
