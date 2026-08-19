/**
 * RCCF-31 — PlanUsage repository. The single writer for commercial usage rows.
 *
 * Quota slots are reserved ATOMICALLY: a conditional increment on
 * `used < limit` inside the caller's transaction, so two concurrent final-slot
 * publishes cannot both succeed. First-use rows are created atomically on the
 * `(tenantId, featureKey, periodStart)` unique key, retrying the increment when
 * a concurrent request wins the create race.
 *
 * RCCF-72.13 — an exhausted row is NEVER written to. A create on an existing
 * (exhausted) row would collide on the unique key (P2002), which aborts the
 * caller's PostgreSQL transaction ("current transaction is aborted") and
 * surfaces a raw DB error to the creator. The exhausted path resolves to a
 * structured quota failure with no DB writes.
 */
import type { Prisma } from "@/generated/prisma/client";

export const PUBLISH_FEATURE_KEY = "publish";

export interface ReserveSlotParams {
  tenantId: string;
  featureKey: string;
  periodStart: Date;
  periodEnd: Date | null;
  limit: number;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

export class PlanUsageRepository {
  /**
   * Atomically consume one quota slot. Returns true when a slot was reserved,
   * false when the limit is exhausted. Must be called inside the same
   * transaction that writes the PublishedSnapshot so quota and snapshot commit
   * or roll back together.
   *
   * The exhausted path performs NO writes: after the conditional increment
   * fails, the existing row is resolved by primary key and the reservation
   * returns false. A create is only attempted when no row exists (first
   * publish), so the caller's transaction is never aborted by a P2002 on an
   * existing row.
   */
  async reserveSlot(
    tx: Prisma.TransactionClient,
    params: ReserveSlotParams,
  ): Promise<boolean> {
    const { tenantId, featureKey, periodStart, periodEnd, limit } = params;
    if (limit <= 0) return false;

    // Atomic conditional increment — the concurrency-safe quota decision. Two
    // concurrent final-slot publishes cannot both match `used < limit`.
    const updated = await tx.planUsage.updateMany({
      where: { tenantId, featureKey, periodStart, used: { lt: limit } },
      data: { used: { increment: 1 } },
    });
    if (updated.count === 1) return true;

    // No row was incremented: the row is either missing (first publish) or the
    // limit is exhausted. Resolve which BEFORE attempting any write — creating
    // on an existing (exhausted) row would collide on the unique key (P2002),
    // abort the caller's transaction, and surface a raw DB error (RCCF-72.13).
    const existing = await tx.planUsage.findUnique({
      where: {
        tenantId_featureKey_periodStart: { tenantId, featureKey, periodStart },
      },
      select: { used: true },
    });
    if (existing) {
      // A concurrent first-create may have just inserted the row below the
      // limit between our increment and this read. In that narrow race the row
      // now exists, so retry the conditional increment — no create, no P2002.
      if (existing.used < limit) {
        const retried = await tx.planUsage.updateMany({
          where: { tenantId, featureKey, periodStart, used: { lt: limit } },
          data: { used: { increment: 1 } },
        });
        return retried.count === 1;
      }
      return false; // exhausted — nothing to write, nothing to abort
    }

    // Row missing (first publish): create-if-missing atomically. The unique key
    // makes a concurrent first-create collide (P2002), in which case retry the
    // conditional increment against the now-existing row.
    try {
      await tx.planUsage.create({
        data: { tenantId, featureKey, periodStart, periodEnd, used: 1 },
      });
      return true;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const retried = await tx.planUsage.updateMany({
        where: { tenantId, featureKey, periodStart, used: { lt: limit } },
        data: { used: { increment: 1 } },
      });
      return retried.count === 1;
    }
  }

  /** Current usage for a (tenant, feature, period) window. */
  async getUsage(
    client: Prisma.TransactionClient | typeof import("@/lib/prisma").prisma,
    params: { tenantId: string; featureKey: string; periodStart: Date },
  ) {
    return client.planUsage.findUnique({
      where: {
        tenantId_featureKey_periodStart: {
          tenantId: params.tenantId,
          featureKey: params.featureKey,
          periodStart: params.periodStart,
        },
      },
    });
  }
}

export const planUsageRepository = new PlanUsageRepository();
