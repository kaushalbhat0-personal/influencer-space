import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { PayoutBatch, PayoutReservation } from "../types";
import { InfrastructureError } from "@/lib/errors/infrastructure-error";

export class PayoutRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async saveBatch(batch: PayoutBatch, tx?: Prisma.TransactionClient): Promise<void> {
    try {
      await this.client(tx).payoutBatch.create({
        data: {
          id: batch.id, partnerId: batch.partnerId, status: batch.status, provider: batch.provider,
          currency: batch.currency, total: batch.total, fee: batch.fee, netAmount: batch.netAmount,
          entryCount: batch.entryCount, idempotencyKey: batch.idempotencyKey,
          providerReference: batch.audit.providerReference, bankReference: batch.audit.bankReference,
          failureReason: batch.audit.failureReason,
          audit: JSON.parse(JSON.stringify(batch.audit)),
          metadata: JSON.parse(JSON.stringify(batch.metadata ?? {})),
        },
      });
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.saveBatch", `Failed to save batch ${batch.id}`, err);
    }
  }

  async getBatch(batchId: string, tx?: Prisma.TransactionClient): Promise<PayoutBatch | undefined> {
    try {
      const r = await this.client(tx).payoutBatch.findUnique({ where: { id: batchId } });
      return r ? this.toDomain(r) : undefined;
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.getBatch", `Failed to get batch ${batchId}`, err);
    }
  }

  async updateBatchStatus(batchId: string, status: string, extra?: Record<string, unknown>, tx?: Prisma.TransactionClient): Promise<boolean> {
    try {
      const data: Record<string, unknown> = { status };
      if (extra?.providerReference) data.providerReference = extra.providerReference;
      if (extra?.failureReason) data.failureReason = extra.failureReason;
      const r = await this.client(tx).payoutBatch.updateMany({ where: { id: batchId }, data });
      return r.count > 0;
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.updateBatchStatus", `Failed to update batch ${batchId} status`, err);
    }
  }

  async getBatchesByPartner(partnerId: string, tx?: Prisma.TransactionClient): Promise<PayoutBatch[]> {
    try {
      const r = await this.client(tx).payoutBatch.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
      return r.map((x) => this.toDomain(x));
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.getBatchesByPartner", `Failed to get batches for partner ${partnerId}`, err);
    }
  }

  async getAllBatches(tx?: Prisma.TransactionClient): Promise<PayoutBatch[]> {
    try {
      const r = await this.client(tx).payoutBatch.findMany({ orderBy: { createdAt: "desc" } });
      return r.map((x) => this.toDomain(x));
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.getAllBatches", "Failed to get all batches", err);
    }
  }

  async saveReservation(reservation: PayoutReservation, tx?: Prisma.TransactionClient): Promise<void> {
    try {
      await this.client(tx).payoutReservation.create({
        data: {
          id: reservation.id, batchId: reservation.batchId, partnerId: reservation.partnerId,
          commissionEntryId: reservation.commissionEntryId, amount: reservation.amount,
          status: reservation.status,
          settledAt: reservation.settledAt ? new Date(reservation.settledAt) : null,
          releasedAt: reservation.releasedAt ? new Date(reservation.releasedAt) : null,
        },
      });
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.saveReservation", `Failed to save reservation ${reservation.id}`, err);
    }
  }

  async getReservationsByBatch(batchId: string, tx?: Prisma.TransactionClient): Promise<PayoutReservation[]> {
    try {
      const r = await this.client(tx).payoutReservation.findMany({ where: { batchId }, orderBy: { createdAt: "desc" } });
      return r.map((x) => ({
        id: x.id, batchId: x.batchId, partnerId: x.partnerId, commissionEntryId: x.commissionEntryId,
        amount: x.amount, status: x.status as PayoutReservation["status"],
        createdAt: x.createdAt.toISOString(), settledAt: x.settledAt?.toISOString(),
        releasedAt: x.releasedAt?.toISOString(),
      }));
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.getReservationsByBatch", `Failed to get reservations for batch ${batchId}`, err);
    }
  }

  async updateReservationStatus(reservationId: string, status: string, extra?: Record<string, Date>, tx?: Prisma.TransactionClient): Promise<boolean> {
    try {
      const data: Record<string, unknown> = { status };
      if (extra?.settledAt) data.settledAt = extra.settledAt;
      if (extra?.releasedAt) data.releasedAt = extra.releasedAt;
      const r = await this.client(tx).payoutReservation.updateMany({ where: { id: reservationId }, data });
      return r.count > 0;
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.updateReservationStatus", `Failed to update reservation ${reservationId} status`, err);
    }
  }

  async findByBatchPartner(partnerId: string, tx?: Prisma.TransactionClient): Promise<PayoutReservation[]> {
    try {
      const r = await this.client(tx).payoutReservation.findMany({ where: { partnerId, status: "reserved" } });
      return r.map((x) => ({
        id: x.id, batchId: x.batchId, partnerId: x.partnerId, commissionEntryId: x.commissionEntryId,
        amount: x.amount, status: x.status as PayoutReservation["status"],
        createdAt: x.createdAt.toISOString(), settledAt: x.settledAt?.toISOString(),
        releasedAt: x.releasedAt?.toISOString(),
      }));
    } catch (err) {
      throw new InfrastructureError("PayoutRepository.findByBatchPartner", `Failed to find reservations for partner ${partnerId}`, err);
    }
  }

  private toDomain(r: {
    id: string; partnerId: string; status: string; provider: string; currency: string;
    total: number; fee: number; netAmount: number; entryCount: number; idempotencyKey: string;
    providerReference: string | null; bankReference: string | null; failureReason: string | null;
    audit: unknown; metadata: unknown; createdAt: Date;
  }): PayoutBatch {
    const audit = JSON.parse(JSON.stringify(r.audit)) as PayoutBatch["audit"];
    return {
      id: r.id, partnerId: r.partnerId, status: r.status as PayoutBatch["status"],
      provider: r.provider as PayoutBatch["provider"], currency: r.currency, total: r.total,
      fee: r.fee, netAmount: r.netAmount, entryCount: r.entryCount, entries: [],
      idempotencyKey: r.idempotencyKey,
      audit: {
        ...audit,
        providerReference: r.providerReference ?? audit.providerReference,
        bankReference: r.bankReference ?? audit.bankReference,
        failureReason: r.failureReason ?? audit.failureReason,
      },
      metadata: JSON.parse(JSON.stringify(r.metadata ?? {})) as Record<string, string> | undefined,
      createdAt: r.createdAt.toISOString(), updatedAt: r.createdAt.toISOString(),
    };
  }
}

export const payoutRepository = new PayoutRepository();
