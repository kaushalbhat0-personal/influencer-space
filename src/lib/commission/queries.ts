import type { CommissionEntry, CommissionSummary } from "./types";
import type { LedgerEntryType } from "./constants";

export function buildCommissionSummary(
  entries: CommissionEntry[],
  partnerId: string,
  periodStart: string,
  periodEnd: string,
): CommissionSummary {
  const filtered = entries.filter(
    (e) =>
      e.partnerId === partnerId &&
      e.createdAt >= periodStart &&
      e.createdAt <= periodEnd &&
      e.type !== "reversal",
  );

  const totalCommissions = filtered.reduce((sum, e) => sum + e.amount.gross, 0);
  const totalPlatformShare = filtered.reduce((sum, e) => sum + e.amount.platformShare, 0);
  const totalPartnerShare = filtered.reduce((sum, e) => sum + e.amount.partnerShare, 0);
  const pendingCount = filtered.filter((e) => e.status === "pending").length;
  const clearedCount = filtered.filter((e) => e.status === "cleared").length;

  return {
    partnerId,
    totalCommissions,
    totalPlatformShare,
    totalPartnerShare,
    entryCount: filtered.length,
    pendingCount,
    clearedCount,
    currency: filtered[0]?.amount.currency ?? "INR",
    periodStart,
    periodEnd,
  };
}

export function aggregateByType(entries: CommissionEntry[]): Record<LedgerEntryType, number> {
  const result = {} as Record<LedgerEntryType, number>;
  for (const t of ["commission_created", "commission_adjusted", "refund", "chargeback", "manual_credit", "manual_debit", "reversal"] as LedgerEntryType[]) {
    result[t] = entries.filter((e) => e.type === t).length;
  }
  return result;
}

export function aggregateByStatus(entries: CommissionEntry[]): Record<string, number> {
  return {
    pending: entries.filter((e) => e.status === "pending").length,
    cleared: entries.filter((e) => e.status === "cleared").length,
    reversed: entries.filter((e) => e.status === "reversed").length,
  };
}

export function totalPartnerShareForPeriod(
  entries: CommissionEntry[],
  partnerId: string,
  start: string,
  end: string,
): number {
  return entries
    .filter(
      (e) =>
        e.partnerId === partnerId &&
        e.status !== "reversed" &&
        e.createdAt >= start &&
        e.createdAt <= end,
    )
    .reduce((sum, e) => sum + e.amount.partnerShare, 0);
}
