import { prisma } from "@/lib/prisma";

type PlanTier = "STARTER" | "PRO";

interface SubscriptionInfo {
  plan: PlanTier;
  status: string;
}

const LIMITS: Record<PlanTier, { maxProducts: number; customDomain: boolean; customBranding: boolean }> = {
  STARTER: { maxProducts: 5, customDomain: false, customBranding: false },
  PRO: { maxProducts: Infinity, customDomain: true, customBranding: true },
};

async function getSubscription(tenantId: string): Promise<SubscriptionInfo> {
  const sub = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, status: true },
  });
  return {
    plan: (sub?.plan as PlanTier) || "STARTER",
    status: sub?.status || "FREE",
  };
}

export async function gateFeature(
  tenantId: string,
  feature: "maxProducts" | "customDomain" | "customBranding",
  currentCount?: number,
): Promise<{ allowed: boolean; error?: string }> {
  const sub = await getSubscription(tenantId);
  const limit = LIMITS[sub.plan];

  switch (feature) {
    case "maxProducts":
      if (currentCount !== undefined && currentCount >= limit.maxProducts) {
        return {
          allowed: false,
          error: `You've reached the ${limit.maxProducts} product limit on the ${sub.plan} plan. Upgrade to PRO to add more products.`,
        };
      }
      return { allowed: true };

    case "customDomain":
      if (!limit.customDomain) {
        return {
          allowed: false,
          error: "Custom domains require a PRO subscription. Upgrade in Billing to unlock this feature.",
        };
      }
      return { allowed: true };

    case "customBranding":
      if (!limit.customBranding) {
        return {
          allowed: false,
          error: "Custom branding and theme settings require a PRO subscription.",
        };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

export async function getPlanLimits(tenantId: string) {
  const sub = await getSubscription(tenantId);
  return {
    plan: sub.plan,
    status: sub.status,
    limits: LIMITS[sub.plan],
  };
}
