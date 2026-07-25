import type { PayoutEligibility, PayoutSummary } from "./types";
import { MIN_PAYOUT_AMOUNT } from "./constants";
import { formatMinorUnits as formatMoney } from "@/lib/utils";

export { formatMoney };

export function formatPayoutStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending", reserved: "Reserved", processing: "Processing",
    completed: "Completed", failed: "Failed", cancelled: "Cancelled", reversed: "Reversed",
  };
  return map[status] ?? status;
}

export function buildEligibility(params: {
  partnerId: string; availableBalance: number; pendingBalance: number;
  totalReserved: number; hasVerifiedAccount: boolean; partnerActive: boolean;
}): PayoutEligibility {
  const meetsMinimum = params.availableBalance >= MIN_PAYOUT_AMOUNT;
  const reasons: string[] = [];
  if (!params.partnerActive) reasons.push("Partner is not active");
  if (!params.hasVerifiedAccount) reasons.push("No verified payout account");
  if (!meetsMinimum) reasons.push(`Available balance (${formatMoney(params.availableBalance)}) is below minimum threshold (${formatMoney(MIN_PAYOUT_AMOUNT)})`);
  return {
    eligible: params.partnerActive && params.hasVerifiedAccount && meetsMinimum,
    partnerId: params.partnerId, availableBalance: params.availableBalance,
    pendingBalance: params.pendingBalance, totalReserved: params.totalReserved,
    minimumThreshold: MIN_PAYOUT_AMOUNT, meetsMinimum,
    hasVerifiedAccount: params.hasVerifiedAccount, partnerActive: params.partnerActive, reasons,
  };
}

export function summaryToText(summary: PayoutSummary): string {
  return [
    `Partner: ${summary.partnerId}`, `Total Batches: ${summary.totalBatches}`,
    `Total Amount: ${formatMoney(summary.totalAmount)}`, `Total Fees: ${formatMoney(summary.totalFee)}`,
    `Total Net: ${formatMoney(summary.totalNet)}`, `Pending: ${summary.pendingCount}`,
    `Completed: ${summary.completedCount}`, `Failed: ${summary.failedCount}`,
  ].join("\n");
}
