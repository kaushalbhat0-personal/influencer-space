/**
 * Agency Access State (RCCF-62).
 *
 * "Platform subscription" and "financial/account identity" are separate
 * concepts. The ACCESS state is DERIVED from the BillingSubscription (never a
 * new financial state): Partner Launch is trial-only; once the trial has ended
 * without a paid Partner subscription the Agency is PLATFORM_LOCKED — it can no
 * longer operate the platform, but its account and financial records remain
 * durable.
 *
 * The lock is a server-side authorization gate (access state), NOT a financial
 * mutation. No client-supplied subscription/flag can bypass it.
 */
import { prisma } from "@/lib/prisma";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { PARTNER_TRIAL_DAYS } from "@/config/commerce/agency-addons";

export const PARTNER_FREE_PLAN = "partner_free";

export interface AgencyAccessState {
  planCode: string;
  trialActive: boolean;
  trialExpired: boolean;
  /** true when the trial has ended (or never started) and no paid plan exists. */
  platformLocked: boolean;
  paid: boolean;
  /** Grace period after expiry before an inactive account is eligible for cleanup. */
  deletionEligible: boolean;
}

export async function resolveAgencyAccess(agencyId: string): Promise<AgencyAccessState> {
  const workspace = await prisma.workspace.findUnique({ where: { agencyId }, select: { id: true } });
  const subscription = workspace
    ? await prisma.billingSubscription.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        select: { status: true, trialEndsAt: true },
      })
    : null;
  const resolved = await resolveActivePlan(workspace?.id, undefined);
  const planCode = resolved.code && resolved.code.startsWith("partner") ? resolved.code : PARTNER_FREE_PLAN;

  const now = Date.now();
  const paid = planCode !== PARTNER_FREE_PLAN;
  const trialActive = !paid && subscription?.status === "TRIALING" && !!subscription.trialEndsAt && subscription.trialEndsAt.getTime() > now;
  const trialEndsAtMs = subscription?.trialEndsAt?.getTime() ?? null;
  const trialExpired = !paid && trialEndsAtMs !== null && trialEndsAtMs <= now;
  const platformLocked = !paid && !trialActive;
  const deletionEligible = trialExpired && trialEndsAtMs !== null && now - trialEndsAtMs >= PARTNER_TRIAL_DAYS * 24 * 60 * 60 * 1000;

  return { planCode, trialActive, trialExpired, platformLocked, paid, deletionEligible };
}

export const PLATFORM_LOCKED_MESSAGE = "Your Partner trial has ended. Subscribe to continue managing your client websites.";
