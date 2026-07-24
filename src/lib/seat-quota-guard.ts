import { prisma } from "@/lib/prisma";
import { entitlement } from "@/modules/billing/application/entitlements";

export async function checkSeatQuota(
  agencyId: string,
): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number; error?: string }> {
  const [agency, currentCount] = await Promise.all([
    prisma.websiteAgency.findUnique({
      where: { id: agencyId },
      select: { status: true },
    }),
    prisma.agencyTenant.count({ where: { agencyId, status: "ACTIVE" } }),
  ]);

  if (!agency) {
    return { allowed: false, currentCount: 0, maxAllowed: 0, error: "Agency not found" };
  }

  if (agency.status === "SUSPENDED" || agency.status === "EXPIRED") {
    return { allowed: false, currentCount, maxAllowed: 0, error: `Agency is ${agency.status.toLowerCase()}. Cannot create new creator sites.` };
  }

  // Resolve plan from workspace billing subscription (v2), fall back to legacy
  let maxAllowed = 3;
  const workspace = await prisma.workspace.findUnique({ where: { agencyId } });
  if (workspace) {
    const billingSub = await prisma.billingSubscription.findUnique({ where: { workspaceId: workspace.id } });
    if (billingSub) {
      const plan = await prisma.billingPlan.findUnique({ where: { id: billingSub.planId } });
      if (plan) {
        maxAllowed = entitlement.limit(plan.code, "max_clients");
      }
    }
  } else {
    const legacySub = await prisma.agencySubscription.findUnique({ where: { agencyId } });
    maxAllowed = legacySub?.maxManagedTenants ?? 3;
  }

  if (currentCount >= maxAllowed) {
    return { allowed: false, currentCount, maxAllowed, error: `Seat limit reached. You have ${currentCount}/${maxAllowed} creators. Upgrade your plan to add more.` };
  }

  return { allowed: true, currentCount, maxAllowed };
}

export async function requireSeatAvailable(agencyId: string): Promise<void> {
  const quota = await checkSeatQuota(agencyId);
  if (!quota.allowed) throw new Error(quota.error || "Seat quota exhausted");
}
