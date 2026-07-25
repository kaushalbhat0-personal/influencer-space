import type { PayoutBatch, PayoutSummary } from "./types";
import type { PayoutProviderType, PayoutStatus } from "./constants";

export function buildPayoutSummary(
  batches: PayoutBatch[],
  partnerId: string,
): PayoutSummary {
  const partnerBatches = batches.filter((b) => b.partnerId === partnerId);
  return {
    partnerId,
    totalBatches: partnerBatches.length,
    totalAmount: partnerBatches.reduce((s, b) => s + b.total, 0),
    totalFee: partnerBatches.reduce((s, b) => s + b.fee, 0),
    totalNet: partnerBatches.reduce((s, b) => s + b.netAmount, 0),
    pendingCount: partnerBatches.filter((b) => b.status === "pending" || b.status === "reserved" || b.status === "processing").length,
    completedCount: partnerBatches.filter((b) => b.status === "completed").length,
    failedCount: partnerBatches.filter((b) => b.status === "failed").length,
    currency: partnerBatches[0]?.currency ?? "INR",
  };
}

export function aggregateByStatus(batches: PayoutBatch[]): Record<PayoutStatus, number> {
  const result = {} as Record<PayoutStatus, number>;
  const statuses: PayoutStatus[] = ["pending", "reserved", "processing", "completed", "failed", "cancelled", "reversed"];
  for (const s of statuses) {
    result[s] = batches.filter((b) => b.status === s).length;
  }
  return result;
}

export function aggregateByProvider(batches: PayoutBatch[]): Record<PayoutProviderType, number> {
  const result = {} as Record<PayoutProviderType, number>;
  for (const b of batches) {
    result[b.provider] = (result[b.provider] ?? 0) + 1;
  }
  return result;
}
