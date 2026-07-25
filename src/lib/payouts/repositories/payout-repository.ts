import { prisma } from "@/lib/prisma";
import type { PayoutBatch, PayoutReservation } from "../types";
async function tryDb<T>(fn: () => Promise<T>, fallback: T): Promise<T> { try { return await fn(); } catch { return fallback; } }

export class PayoutRepository {
  async saveBatch(batch: PayoutBatch): Promise<void> {
    await tryDb(async () => {
      await prisma.payoutBatch.create({
        data: { id: batch.id, partnerId: batch.partnerId, status: batch.status, provider: batch.provider, currency: batch.currency, total: batch.total, fee: batch.fee, netAmount: batch.netAmount, entryCount: batch.entryCount, idempotencyKey: batch.idempotencyKey, providerReference: batch.audit.providerReference, bankReference: batch.audit.bankReference, failureReason: batch.audit.failureReason, audit: JSON.parse(JSON.stringify(batch.audit)), metadata: JSON.parse(JSON.stringify(batch.metadata ?? {})) },
      });
    }, undefined);
  }

  async getBatch(batchId: string): Promise<PayoutBatch | undefined> {
    return tryDb(async () => { const r = await prisma.payoutBatch.findUnique({ where: { id: batchId } }); return r ? this.toDomain(r) : undefined; }, undefined);
  }

  async updateBatchStatus(batchId: string, status: string, extra?: Record<string, unknown>): Promise<boolean> {
    return tryDb(async () => {
      const data: Record<string, unknown> = { status };
      if (extra?.providerReference) data.providerReference = extra.providerReference;
      if (extra?.failureReason) data.failureReason = extra.failureReason;
      const r = await prisma.payoutBatch.updateMany({ where: { id: batchId }, data });
      return r.count > 0;
    }, false);
  }

  async getBatchesByPartner(partnerId: string): Promise<PayoutBatch[]> {
    return tryDb(async () => { const r = await prisma.payoutBatch.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } }); return r.map((x) => this.toDomain(x)); }, []);
  }

  async getAllBatches(): Promise<PayoutBatch[]> {
    return tryDb(async () => { const r = await prisma.payoutBatch.findMany({ orderBy: { createdAt: "desc" } }); return r.map((x) => this.toDomain(x)); }, []);
  }

  async saveReservation(reservation: PayoutReservation): Promise<void> {
    await tryDb(async () => {
      await prisma.payoutReservation.create({
        data: { id: reservation.id, batchId: reservation.batchId, partnerId: reservation.partnerId, commissionEntryId: reservation.commissionEntryId, amount: reservation.amount, status: reservation.status, settledAt: reservation.settledAt ? new Date(reservation.settledAt) : null, releasedAt: reservation.releasedAt ? new Date(reservation.releasedAt) : null },
      });
    }, undefined);
  }

  async getReservationsByBatch(batchId: string): Promise<PayoutReservation[]> {
    return tryDb(async () => {
      const r = await prisma.payoutReservation.findMany({ where: { batchId }, orderBy: { createdAt: "desc" } });
      return r.map((x) => ({ id: x.id, batchId: x.batchId, partnerId: x.partnerId, commissionEntryId: x.commissionEntryId, amount: x.amount, status: x.status as PayoutReservation["status"], createdAt: x.createdAt.toISOString(), settledAt: x.settledAt?.toISOString(), releasedAt: x.releasedAt?.toISOString() }));
    }, []);
  }

  async updateReservationStatus(reservationId: string, status: string, extra?: Record<string, Date>): Promise<boolean> {
    return tryDb(async () => {
      const data: Record<string, unknown> = { status };
      if (extra?.settledAt) data.settledAt = extra.settledAt;
      if (extra?.releasedAt) data.releasedAt = extra.releasedAt;
      const r = await prisma.payoutReservation.updateMany({ where: { id: reservationId }, data });
      return r.count > 0;
    }, false);
  }

  async findByBatchPartner(partnerId: string): Promise<PayoutReservation[]> {
    return tryDb(async () => {
      const r = await prisma.payoutReservation.findMany({ where: { partnerId, status: "reserved" } });
      return r.map((x) => ({ id: x.id, batchId: x.batchId, partnerId: x.partnerId, commissionEntryId: x.commissionEntryId, amount: x.amount, status: x.status as PayoutReservation["status"], createdAt: x.createdAt.toISOString(), settledAt: x.settledAt?.toISOString(), releasedAt: x.releasedAt?.toISOString() }));
    }, []);
  }

  private toDomain(r: { id: string; partnerId: string; status: string; provider: string; currency: string; total: number; fee: number; netAmount: number; entryCount: number; idempotencyKey: string; providerReference: string | null; bankReference: string | null; failureReason: string | null; audit: unknown; metadata: unknown; createdAt: Date }): PayoutBatch {
    const audit = JSON.parse(JSON.stringify(r.audit)) as PayoutBatch["audit"];
    return { id: r.id, partnerId: r.partnerId, status: r.status as PayoutBatch["status"], provider: r.provider as PayoutBatch["provider"], currency: r.currency, total: r.total, fee: r.fee, netAmount: r.netAmount, entryCount: r.entryCount, entries: [], idempotencyKey: r.idempotencyKey, audit: { ...audit, providerReference: r.providerReference ?? audit.providerReference, bankReference: r.bankReference ?? audit.bankReference, failureReason: r.failureReason ?? audit.failureReason }, metadata: JSON.parse(JSON.stringify(r.metadata ?? {})) as Record<string, string> | undefined, createdAt: r.createdAt.toISOString(), updatedAt: r.createdAt.toISOString() };
  }
}

export const payoutRepository = new PayoutRepository();
