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

/** Canonical active-client count: AgencyTenant links with a live subscription.
 * RCCF-FINANCE-02: counts only ACTIVE qualifying client websites (tenant/agency
 * scoped). Do not count offboarded, deleted, expired, pending, historical.
 * TRIALING is not a qualifying active client for royalty.
 */
export async function getActiveClientCount(agencyId: string): Promise<number> {
  return prisma.agencyTenant.count({
    where: {
      agencyId,
      // Only ACTIVE counts toward royalty; TRIALING/PAST_DUE/CANCELLED/EXPIRED excluded
      workspace: { billingSubscription: { status: "ACTIVE" } },
    },
  });
}

/** ACTIVE loyalty tiers effective now, ascending by client range.
 * RCCF-FINANCE-02: canonical tiers are 0–4→0%, 5–25→20%, 26–50→30%, 51+→40%.
 * If DB has no active rows (fresh env) or rows still carry legacy 30/40/50
 * without the 0–4 bucket, fall back to the canonical in-code tiers so
 * financial semantics are correct before/after data migration.
 */
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
  if (rows.length === 0) {
    const { AGENCY_ROYALTY_TIERS } = await import("@/config/commerce/agency-commercial");
    return AGENCY_ROYALTY_TIERS.map((t, idx) => ({
      id: `canonical-${idx}`,
      name: t.label,
      minActiveClients: t.minActiveClients,
      maxActiveClients: t.maxActiveClients,
      commissionPercent: t.percent,
    }));
  }
  // If DB has legacy tiers but no 0-4 bucket, inject the 0% bucket so 0–4 never falls through to 20% default
  const hasZeroBucket = rows.some((r) => r.minActiveClients === 0 && r.maxActiveClients === 4);
  if (!hasZeroBucket) {
    // Prepend canonical 0–4 tier while preserving DB tiers for 5+
    const canonicalZero: LoyaltyTierRow = { id: "canonical-0", name: "0–4 active — 0%", minActiveClients: 0, maxActiveClients: 4, commissionPercent: 0 };
    // Filter out any DB tier that overlaps 0-4 to avoid duplicate
    const filtered = rows.filter((r) => r.minActiveClients > 4 || (r.minActiveClients === 0 && r.maxActiveClients !== 4));
    // If DB tiers are legacy 30/40/50, replace their percents with canonical 20/30/40 if count matches expected ranges
    const mapped = filtered.map((r) => {
      if (r.minActiveClients === 5 && r.maxActiveClients === 25) return { ...r, commissionPercent: 20 };
      if (r.minActiveClients === 26 && r.maxActiveClients === 50) return { ...r, commissionPercent: 30 };
      if (r.minActiveClients === 51 && r.maxActiveClients === null) return { ...r, commissionPercent: 40 };
      return r;
    });
    return [canonicalZero, ...mapped].sort((a, b) => a.minActiveClients - b.minActiveClients);
  }
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
