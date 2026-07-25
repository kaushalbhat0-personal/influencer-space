import type { PayoutBatch, PayoutReservation } from "./types";
import type { PayoutProviderType, PayoutStatus } from "./constants";
import { payoutRepository } from "./repositories/payout-repository";

export class PayoutLedger {
  private batches: PayoutBatch[] = [];
  private reservations: PayoutReservation[] = [];
  private initialized = false;

  async initialize(): Promise<{ batches: number }> {
    if (this.initialized) return { batches: this.batches.length };
    this.batches = await payoutRepository.getAllBatches();
    this.initialized = true;
    return { batches: this.batches.length };
  }

  addBatch(batch: PayoutBatch): void { this.batches.push(batch); payoutRepository.saveBatch(batch).catch(() => {}); }
  getBatch(batchId: string): PayoutBatch | undefined { return this.batches.find((b) => b.id === batchId); }

  updateBatchStatus(batchId: string, status: PayoutStatus, updates?: Partial<PayoutBatch["audit"]>): PayoutBatch | undefined {
    const batch = this.batches.find((b) => b.id === batchId);
    if (!batch) return undefined;
    batch.status = status; batch.updatedAt = new Date().toISOString();
    if (updates) batch.audit = { ...batch.audit, ...updates };
    payoutRepository.updateBatchStatus(batchId, status, updates as Record<string, unknown>).catch(() => {});
    return batch;
  }

  getBatchesByPartner(partnerId: string): PayoutBatch[] { return this.batches.filter((b) => b.partnerId === partnerId); }

  queryBatches(params: { partnerId?: string; status?: PayoutStatus; provider?: PayoutProviderType; createdAfter?: string; createdBefore?: string; minAmount?: number; maxAmount?: number; limit?: number; offset?: number }): { items: PayoutBatch[]; total: number; hasMore: boolean } {
    let result = [...this.batches];
    if (params.partnerId) result = result.filter((b) => b.partnerId === params.partnerId);
    if (params.status) result = result.filter((b) => b.status === params.status);
    if (params.provider) result = result.filter((b) => b.provider === params.provider);
    if (params.createdAfter) result = result.filter((b) => b.createdAt >= params.createdAfter!);
    if (params.createdBefore) result = result.filter((b) => b.createdAt <= params.createdBefore!);
    if (params.minAmount !== undefined) result = result.filter((b) => b.total >= params.minAmount!);
    if (params.maxAmount !== undefined) result = result.filter((b) => b.total <= params.maxAmount!);
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = result.length; const offset = params.offset ?? 0; const limit = params.limit ?? 50;
    return { items: result.slice(offset, offset + limit), total, hasMore: offset + limit < total };
  }

  addReservation(reservation: PayoutReservation): void { this.reservations.push(reservation); payoutRepository.saveReservation(reservation).catch(() => {}); }
  getReservationsByBatch(batchId: string): PayoutReservation[] { return this.reservations.filter((r) => r.batchId === batchId); }
  getReservationsByPartner(partnerId: string): PayoutReservation[] { return this.reservations.filter((r) => r.partnerId === partnerId); }
  getReservationsByCommissionEntry(commissionEntryId: string): PayoutReservation[] { return this.reservations.filter((r) => r.commissionEntryId === commissionEntryId); }

  settleReservation(reservationId: string): boolean {
    const r = this.reservations.find((x) => x.id === reservationId);
    if (!r || r.status !== "reserved") return false;
    r.status = "settled"; r.settledAt = new Date().toISOString();
    payoutRepository.updateReservationStatus(reservationId, "settled", { settledAt: new Date() }).catch(() => {});
    return true;
  }

  releaseReservation(reservationId: string): boolean {
    const r = this.reservations.find((x) => x.id === reservationId);
    if (!r || r.status !== "reserved") return false;
    r.status = "released"; r.releasedAt = new Date().toISOString();
    payoutRepository.updateReservationStatus(reservationId, "released", { releasedAt: new Date() }).catch(() => {});
    return true;
  }

  getTotalReservedByPartner(partnerId: string): number {
    return this.reservations.filter((r) => r.partnerId === partnerId && r.status === "reserved").reduce((sum, r) => sum + r.amount, 0);
  }

  getAllBatches(): PayoutBatch[] { return [...this.batches]; }
  clear(): void { this.batches = []; this.reservations = []; }
}

export const payoutLedger = new PayoutLedger();
