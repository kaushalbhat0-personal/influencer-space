/**
 * RCCF-31 — PlanUsage repository. The single writer for commercial usage rows.
 *
 * Quota slots are reserved ATOMICALLY: a conditional increment on
 * `used < limit` inside the caller's transaction, so two concurrent final-slot
 * publishes cannot both succeed. First-use rows are created atomically on the
 * `(tenantId, featureKey, periodStart)` unique key, retrying the increment when
 * a concurrent request wins the create race.
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
   */
  async reserveSlot(
    tx: Prisma.TransactionClient,
    params: ReserveSlotParams,
  ): Promise<boolean> {
    const { tenantId, featureKey, periodStart, periodEnd, limit } = params;
    if (limit <= 0) return false;

    const updated = await tx.planUsage.updateMany({
      where: { tenantId, featureKey, periodStart, used: { lt: limit } },
      data: { used: { increment: 1 } },
    });
    if (updated.count === 1) return true;

    // Row missing (first publish) or exhausted. Create-if-missing atomically:
    // the unique key makes a concurrent first-create collide (P2002), in which
    // case retry the conditional increment against the now-existing row.
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
