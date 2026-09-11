import { prisma } from "@/lib/prisma";
import { validateTransition } from "@/modules/billing/domain/lifecycle";
import { RENEWAL_GRACE_DAYS } from "@/lib/billing/constants";
import { getGracePeriodEndDate } from "@/lib/billing/subscription-engine";
import { captureError } from "@/lib/observability/error-tracker";

/**
 * RCCF-BILLING-06H — canonical billing expiry logic.
 * Extracted so the cron route stays Next.js-type-clean and tests can import directly.
 */
/**
 * RCCF-FINANCE-02 P1-8 — bounded and observable expiry processing.
 * Batch processing, maxDuration, liveness/failure alert, no unbounded full-table scan.
 */
export const BILLING_EXPIRY_BATCH_SIZE = 100;
export const BILLING_EXPIRY_MAX_DURATION_MS = 25_000;

export async function runBillingExpiry(now = new Date(), opts?: { batchSize?: number; maxDurationMs?: number }) {
  const batchSize = opts?.batchSize ?? BILLING_EXPIRY_BATCH_SIZE;
  const maxDurationMs = opts?.maxDurationMs ?? BILLING_EXPIRY_MAX_DURATION_MS;
  const startedAt = Date.now();
  // Bounded: only process first batchSize past-due, ordered by renewsAt (oldest first)
  const pastDueSubs = await prisma.billingSubscription.findMany({
    where: { status: "PAST_DUE" },
    select: { id: true, workspaceId: true, accountId: true, renewsAt: true, status: true },
    orderBy: { renewsAt: "asc" },
    take: batchSize,
  });

  let expired = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const sub of pastDueSubs) {
    // Bounded by maxDuration: if we exceed wall clock, stop and report liveness
    if (Date.now() - startedAt > maxDurationMs) {
      try {
        await prisma.alertRecord.create({
          data: {
            level: "WARNING",
            status: "ACTIVE",
            title: "Billing expiry batch hit maxDuration",
            message: `Processed ${expired + skipped}/${pastDueSubs.length} in ${Date.now() - startedAt}ms (limit ${maxDurationMs}ms)`,
            source: "billing",
            metadata: { expired, skipped, totalPastDue: pastDueSubs.length, batchSize } as never,
          },
        });
      } catch {}
      break;
    }
    const renewsAt = sub.renewsAt;
    let graceExpired: boolean;
    if (!renewsAt) {
      graceExpired = true;
    } else {
      const graceEnd = getGracePeriodEndDate(new Date(renewsAt), RENEWAL_GRACE_DAYS);
      graceExpired = now.getTime() > graceEnd.getTime();
    }
    if (!graceExpired) {
      skipped++;
      continue;
    }

    try {
      validateTransition(sub.status as never, "EXPIRED");
    } catch {
      skipped++;
      continue;
    }

    const idempotencyKey = `billing_expiry_${sub.id}_${renewsAt ? new Date(renewsAt).toISOString().slice(0, 10) : "no_renews"}`;

    const existingEvent = await prisma.billingEvent.findUnique({ where: { idempotencyKey } }).catch(() => null);
    if (existingEvent) {
      skipped++;
      continue;
    }

    const fresh = await prisma.billingSubscription.findUnique({ where: { id: sub.id }, select: { status: true } });
    if (!fresh || fresh.status !== "PAST_DUE") {
      skipped++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.billingSubscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
        await tx.billingEvent.create({
          data: {
            workspaceId: sub.workspaceId,
            accountId: sub.accountId,
            type: "SUBSCRIPTION_EXPIRED",
            idempotencyKey,
            payload: {
              previousStatus: "PAST_DUE",
              newStatus: "EXPIRED",
              renewsAt: renewsAt?.toISOString() ?? null,
              reason: "grace_expired",
              graceDays: RENEWAL_GRACE_DAYS,
            },
          },
        });
        if (sub.workspaceId) {
          const ws = await tx.workspace.findUnique({ where: { id: sub.workspaceId }, select: { tenantId: true } });
          if (ws?.tenantId) {
            await tx.auditLog.create({
              data: {
                tenantId: ws.tenantId,
                action: "billing:subscription-expired",
                metadata: {
                  workspaceId: sub.workspaceId,
                  subscriptionId: sub.id,
                  previousStatus: "PAST_DUE",
                  newStatus: "EXPIRED",
                  reason: "grace_expired",
                },
              },
            });
          }
        }
      });
      expired++;
      details.push(sub.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unique constraint") || msg.includes("P2002") || msg.includes("idempotencyKey")) {
        skipped++;
      } else {
        captureError(err, { service: "billing-expiry", operation: "expire" });
        skipped++;
      }
    }
  }

  return { expired, skipped, details, totalPastDue: pastDueSubs.length };
}
