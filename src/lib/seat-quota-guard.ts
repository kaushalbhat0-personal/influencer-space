// src/lib/seat-quota-guard.ts
import { prisma } from "@/lib/prisma";

export async function checkSeatQuota(
  agencyId: string,
): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number; error?: string }> {
  const [agency, subscription, currentCount] = await Promise.all([
    prisma.websiteAgency.findUnique({
      where: { id: agencyId },
      select: { status: true },
    }),
    prisma.agencySubscription.findUnique({
      where: { agencyId },
      select: { maxManagedTenants: true, status: true, plan: true },
    }),
    prisma.agencyTenant.count({ where: { agencyId, status: "ACTIVE" } }),
  ]);

  if (!agency) {
    return { allowed: false, currentCount: 0, maxAllowed: 0, error: "Agency not found" };
  }

  if (agency.status === "SUSPENDED" || agency.status === "EXPIRED") {
    return {
      allowed: false,
      currentCount,
      maxAllowed: subscription?.maxManagedTenants ?? 0,
      error: `Agency is ${agency.status.toLowerCase()}. Cannot create new creator sites.`,
    };
  }

  const maxAllowed = subscription?.maxManagedTenants ?? 3;

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      currentCount,
      maxAllowed,
      error: `Seat limit reached. You have ${currentCount}/${maxAllowed} creators. Upgrade your plan to add more.`,
    };
  }

  return { allowed: true, currentCount, maxAllowed };
}

export async function requireSeatAvailable(agencyId: string): Promise<void> {
  const quota = await checkSeatQuota(agencyId);
  if (!quota.allowed) throw new Error(quota.error || "Seat quota exhausted");
}
