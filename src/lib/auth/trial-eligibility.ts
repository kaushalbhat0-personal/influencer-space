/**
 * RCCF-FINANCE-02 P0-6 — Harden trial eligibility against trivial trial farming.
 * Reuse existing DB-authoritative identity/account signals.
 * Do not introduce invasive fingerprinting.
 * Preserve legitimate signup flows.
 */

import { prisma } from "@/lib/prisma";

export interface TrialEligibilityResult {
  eligible: boolean;
  reason?: string;
  existingTrialCount?: number;
}

/**
 * Agency trial eligibility: same accountId (agency) can have only one TRIALING
 * at a time; if they've ever had a TRIALING that expired/converted, a new
 * trial is allowed only after 30 days? Simpler: one TRIALING per agency ever
 * if they have ANY BillingSubscription history with TRIALING, deny second trial
 * unless admin override. This prevents farming via delete/recreate? But delete
 * would remove BillingAccount — so we check User email hash as signal.
 */
export async function checkAgencyTrialEligibility(params: {
  email?: string;
  agencyId?: string;
}): Promise<TrialEligibilityResult> {
  // Signal 1: BillingAccount history for agency
  if (params.agencyId) {
    const account = await prisma.billingAccount.findUnique({
      where: { accountType_accountId: { accountType: "agency", accountId: params.agencyId } },
      select: { id: true },
    });
    if (account) {
      const priorTrials = await prisma.billingSubscription.count({
        where: { accountId: account.id, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED"] } },
      });
      if (priorTrials > 1) {
        // Already had trial + conversion/cancellation — second trial is farming
        return { eligible: false, reason: "Trial already used for this agency", existingTrialCount: priorTrials };
      }
      const trialing = await prisma.billingSubscription.findFirst({ where: { accountId: account.id, status: "TRIALING" }, select: { id: true } });
      if (trialing) return { eligible: false, reason: "Active trial already exists", existingTrialCount: 1 };
    }
  }

  // Signal 2: User email history — if same email previously had an agency trial, deny second
  if (params.email) {
    const normalized = params.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true, agencyId: true } });
    if (user?.agencyId) {
      const acct = await prisma.billingAccount.findUnique({
        where: { accountType_accountId: { accountType: "agency", accountId: user.agencyId } },
        select: { id: true },
      });
      if (acct) {
        const hasHistory = await prisma.billingSubscription.findFirst({ where: { accountId: acct.id }, select: { id: true } });
        if (hasHistory) return { eligible: false, reason: "Email already associated with prior trial", existingTrialCount: 1 };
      }
    }
    // Also check BillingEvent mentions of this email in account creation?
    // Keep lightweight: if user already exists, trial eligibility is tied to agency history above.
  }

  return { eligible: true };
}

export async function checkCreatorTrialEligibility(params: { email: string; userId?: string }): Promise<TrialEligibilityResult> {
  const normalized = params.email.trim().toLowerCase();
  // Reuse BillingAccount for creator (accountType=creator)
  const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
  if (user) {
    const acct = await prisma.billingAccount.findUnique({
      where: { accountType_accountId: { accountType: "creator", accountId: user.id } },
      select: { id: true },
    });
    if (acct) {
      const prior = await prisma.billingSubscription.count({ where: { accountId: acct.id } });
      if (prior > 0) return { eligible: false, reason: "Creator trial already used", existingTrialCount: prior };
    }
  }
  return { eligible: true };
}
