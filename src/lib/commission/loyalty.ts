// ── Loyalty Commission Tiers — RCCF-IMPLEMENTATION-75 ────────────────────────
// Config-driven: agencies earn an automatic recurring share of creator
// subscriptions that scales with the number of ACTIVE clients. Rates and
// thresholds are DATA (LoyaltyTier), never hardcoded. The canonical "active
// client" definition = an AgencyTenant link whose creator workspace has a
// live BillingSubscription (ACTIVE / TRIALING).

import { prisma } from "@/lib/prisma";

export interface LoyaltyTierRow {
  id: string;
  name: string;
  minActiveClients: number;
  maxActiveClients: number | null;
  commissionPercent: number;
}

export interface LoyaltyProgress {
  activeClients: number;
  tier: LoyaltyTierRow | null;
  nextTier: LoyaltyTierRow | null;
  clientsToNext: number;
}

/** Canonical active-client count: AgencyTenant links with a live subscription. */
export async function getActiveClientCount(agencyId: string): Promise<number> {
  return prisma.agencyTenant.count({
    where: {
      agencyId,
      workspace: { billingSubscription: { status: { in: ["ACTIVE", "TRIALING"] } } },
    },
  });
}

/** ACTIVE loyalty tiers effective now, ascending by client range. */
export async function getLoyaltyTiers(): Promise<LoyaltyTierRow[]> {
  const now = new Date();
  const rows = await prisma.loyaltyTier.findMany({
    where: {
      status: "ACTIVE",
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: [{ minActiveClients: "asc" }, { priority: "asc" }],
    select: {
      id: true,
      name: true,
      minActiveClients: true,
      maxActiveClients: true,
      commissionPercent: true,
    },
  });
  return rows;
}

/** Resolve the tier that applies for a given active-client count. */
export function tierForCount(tiers: LoyaltyTierRow[], count: number): LoyaltyTierRow | null {
  return (
    tiers.find(
      (t) => count >= t.minActiveClients && (t.maxActiveClients === null || count <= t.maxActiveClients),
    ) ?? null
  );
}

/** Resolve the loyalty tier for an agency (optionally with a known count). */
export async function resolveLoyaltyTier(
  agencyId: string,
  activeClientCount?: number,
): Promise<LoyaltyTierRow | null> {
  const [tiers, count] = await Promise.all([
    getLoyaltyTiers(),
    activeClientCount === undefined ? getActiveClientCount(agencyId) : Promise.resolve(activeClientCount),
  ]);
  return tierForCount(tiers, count);
}

/** Tier + progress toward the next tier (for agency-facing UI). */
export async function getLoyaltyProgress(agencyId: string): Promise<LoyaltyProgress | null> {
  const [tiers, count] = await Promise.all([getLoyaltyTiers(), getActiveClientCount(agencyId)]);
  if (tiers.length === 0) return null;
  const tier = tierForCount(tiers, count);
  const nextTier = tiers.find((t) => count < t.minActiveClients) ?? null;
  return {
    activeClients: count,
    tier,
    nextTier,
    clientsToNext: nextTier ? Math.max(0, nextTier.minActiveClients - count) : 0,
  };
}
