import { payoutLedger } from "./ledger";
import { payoutProviderRegistry } from "./registry";
import { buildEligibility } from "./mapper";
import { validateCreatePayout, canTransitionStatus } from "./validation";
import { platformEventBus } from "@/lib/events";
import { payoutRepository } from "./repositories/payout-repository";
import type { PayoutBatch, PayoutEligibility, PayoutReservation, PayoutQuery, PayoutSummary } from "./types";

export class PayoutService {
  checkEligibility(params: { partnerId: string; availableBalance: number; pendingBalance: number; hasVerifiedAccount: boolean; partnerActive: boolean }): PayoutEligibility {
    const totalReserved = payoutLedger.getTotalReservedByPartner(params.partnerId);
    return buildEligibility({ ...params, totalReserved });
  }

  createPayout(params: { partnerId: string; provider: string; currency: string; total: number; fee: number; entryIds: string[]; idempotencyKey: string; initiatedBy: string; metadata?: Record<string, string> }): PayoutBatch | { errors: string[] } {
    const errors = validateCreatePayout({ partnerId: params.partnerId, provider: params.provider, currency: params.currency, total: params.total, entryIds: params.entryIds, idempotencyKey: params.idempotencyKey });
    if (errors.length > 0) return { errors };
    const existing = payoutLedger.getAllBatches().find((b) => b.idempotencyKey === params.idempotencyKey);
    if (existing) return existing;
    const batch: PayoutBatch = { id: `pout_${Date.now()}`, partnerId: params.partnerId, status: "pending", provider: params.provider as PayoutBatch["provider"], currency: params.currency, total: params.total, fee: params.fee, netAmount: params.total - params.fee, entryCount: params.entryIds.length, entries: params.entryIds, idempotencyKey: params.idempotencyKey, audit: { payoutVersion: 1, initiatedBy: params.initiatedBy }, metadata: params.metadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    payoutLedger.addBatch(batch);
    for (const entryId of params.entryIds) { payoutLedger.addReservation({ id: `res_${batch.id}_${entryId}`, batchId: batch.id, partnerId: params.partnerId, commissionEntryId: entryId, amount: Math.round(params.total / params.entryIds.length), status: "reserved", createdAt: new Date().toISOString() }); }
    payoutRepository.saveBatch(batch).catch(() => {});
    platformEventBus.publish("PayoutCreated", { batchId: batch.id, partnerId: params.partnerId, amount: params.total, provider: params.provider });
    return batch;
  }

  processPayout(batchId: string): Promise<PayoutBatch | { error: string }> { return this.processPayoutAsync(batchId); }
  private async processPayoutAsync(batchId: string): Promise<PayoutBatch | { error: string }> {
    const batch = payoutLedger.getBatch(batchId);
    if (!batch) return { error: "Batch not found" };
    if (batch.status !== "reserved") return { error: `Cannot process batch in status: ${batch.status}` };
    payoutLedger.updateBatchStatus(batchId, "processing");
    try {
      const provider = payoutProviderRegistry.get(batch.provider);
      if (!provider) { payoutLedger.updateBatchStatus(batchId, "failed", { failureReason: `No provider: ${batch.provider}` }); return { error: `No provider registered: ${batch.provider}` }; }
      const result = await provider.createPayout(batch);
      if (result.success) {
        payoutLedger.updateBatchStatus(batchId, "completed", { providerReference: result.providerReference, settledAt: new Date().toISOString() });
        platformEventBus.publish("PayoutCompleted", { batchId, partnerId: batch.partnerId, amount: batch.total, providerReference: result.providerReference });
        const reservations = payoutLedger.getReservationsByBatch(batchId);
        for (const r of reservations) payoutLedger.settleReservation(r.id);
      } else { payoutLedger.updateBatchStatus(batchId, "failed", { failureReason: result.error }); }
      return payoutLedger.getBatch(batchId)!;
    } catch (err) { payoutLedger.updateBatchStatus(batchId, "failed", { failureReason: err instanceof Error ? err.message : "Unknown error" }); return { error: err instanceof Error ? err.message : "Unknown error" }; }
  }

  reservePayout(batchId: string): PayoutBatch | { error: string } {
    const batch = payoutLedger.getBatch(batchId);
    if (!batch) return { error: "Batch not found" };
    if (!canTransitionStatus(batch.status, "reserved")) return { error: `Cannot reserve batch in status: ${batch.status}` };
    payoutLedger.updateBatchStatus(batchId, "reserved"); return payoutLedger.getBatch(batchId)!;
  }

  cancelPayout(batchId: string, reason?: string): PayoutBatch | { error: string } {
    const batch = payoutLedger.getBatch(batchId);
    if (!batch) return { error: "Batch not found" };
    if (!canTransitionStatus(batch.status, "cancelled")) return { error: `Cannot cancel batch in status: ${batch.status}` };
    payoutLedger.updateBatchStatus(batchId, "cancelled", { failureReason: reason });
    const reservations = payoutLedger.getReservationsByBatch(batchId);
    for (const r of reservations) payoutLedger.releaseReservation(r.id);
    return payoutLedger.getBatch(batchId)!;
  }

  reversePayout(batchId: string, reason?: string): PayoutBatch | { error: string } {
    const batch = payoutLedger.getBatch(batchId);
    if (!batch) return { error: "Batch not found" };
    if (!canTransitionStatus(batch.status, "reversed")) return { error: `Cannot reverse batch in status: ${batch.status}` };
    payoutLedger.updateBatchStatus(batchId, "reversed", { failureReason: reason }); return payoutLedger.getBatch(batchId)!;
  }

  retryFailedPayout(batchId: string): PayoutBatch | { error: string } {
    const batch = payoutLedger.getBatch(batchId);
    if (!batch) return { error: "Batch not found" };
    if (batch.status !== "failed") return { error: `Can only retry failed payouts, got: ${batch.status}` };
    payoutLedger.updateBatchStatus(batchId, "pending"); return payoutLedger.getBatch(batchId)!;
  }

  getBatch(batchId: string): PayoutBatch | undefined { return payoutLedger.getBatch(batchId); }
  getBatchesByPartner(partnerId: string): PayoutBatch[] { return payoutLedger.getBatchesByPartner(partnerId); }
  queryBatches(query: PayoutQuery) { return payoutLedger.queryBatches(query); }
  getSummary(partnerId: string): PayoutSummary { return this.buildPayoutSummary(payoutLedger.getAllBatches(), partnerId); }
  getReservationsByBatch(batchId: string): PayoutReservation[] { return payoutLedger.getReservationsByBatch(batchId); }
  getReservationsByPartner(partnerId: string): PayoutReservation[] { return payoutLedger.getReservationsByPartner(partnerId); }
  getTotalReservedByPartner(partnerId: string): number { return payoutLedger.getTotalReservedByPartner(partnerId); }
  getAllBatches(): PayoutBatch[] { return payoutLedger.getAllBatches(); }

  private buildPayoutSummary(batches: PayoutBatch[], partnerId: string): PayoutSummary {
    const b = batches.filter((x) => x.partnerId === partnerId);
    return { partnerId, totalBatches: b.length, totalAmount: b.reduce((s, x) => s + x.total, 0), totalFee: b.reduce((s, x) => s + x.fee, 0), totalNet: b.reduce((s, x) => s + x.netAmount, 0), pendingCount: b.filter((x) => x.status === "pending" || x.status === "reserved" || x.status === "processing").length, completedCount: b.filter((x) => x.status === "completed").length, failedCount: b.filter((x) => x.status === "failed").length, currency: b[0]?.currency ?? "INR" };
  }
}

export const payoutService = new PayoutService();
