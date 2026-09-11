/**
 * RCCF-FINANCE-02 P0-2 — Automatic recovery for durable RECONCILIATION_REQUIRED events.
 * Bounded batch, idempotent, retry-safe, observable, repeated failures → SystemError/alert.
 * Never silently discard a paid event.
 */

import { prisma } from "@/lib/prisma";
import { billingService } from "./service";
import { captureError } from "@/lib/observability/error-tracker";

export const RECONCILIATION_BATCH_SIZE = 20;
export const RECONCILIATION_MAX_ATTEMPTS = 3;

export interface ReconciliationResult {
  total: number;
  repaired: number;
  alreadyResolved: number;
  failed: number;
  skipped: number;
  details: Array<{ paymentId: string; status: "repaired" | "already_resolved" | "failed" | "skipped"; error?: string }>;
}

export async function runReconciliationBatch(now = new Date(), batchSize = RECONCILIATION_BATCH_SIZE): Promise<ReconciliationResult> {
  const events = await prisma.billingEvent.findMany({
    where: { type: "RECONCILIATION_REQUIRED" },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let repaired = 0;
  let alreadyResolved = 0;
  let failed = 0;
  let skipped = 0;
  const details: ReconciliationResult["details"] = [];

  for (const evt of events) {
    const payload = evt.payload as Record<string, unknown> | null;
    const paymentId = String(payload?.paymentId ?? payload?.providerReference ?? payload?.subscriptionId ?? "");
    if (!paymentId) {
      skipped++;
      details.push({ paymentId: "", status: "skipped", error: "missing paymentId" });
      continue;
    }

    // Already resolved? Check for RECONCILIATION_RESOLVED with matching paymentId
    const resolved = await prisma.billingEvent.findUnique({ where: { idempotencyKey: `reconcile_resolved_${paymentId}` } }).catch(() => null);
    if (resolved) {
      alreadyResolved++;
      details.push({ paymentId, status: "already_resolved" });
      continue;
    }

    // Check if invoice already exists (idempotent already repaired via other path)
    const existingInvoice = await prisma.billingInvoice.findFirst({ where: { providerReference: paymentId }, select: { id: true } });
    if (existingInvoice) {
      // Mark resolved without re-creating
      await prisma.billingEvent
        .create({
          data: {
            workspaceId: evt.workspaceId,
            accountId: evt.accountId,
            type: "RECONCILIATION_RESOLVED",
            idempotencyKey: `reconcile_resolved_${paymentId}`,
            payload: { paymentId, alreadyPresent: true, source: "runner" },
          },
        })
        .catch(() => {});
      alreadyResolved++;
      details.push({ paymentId, status: "already_resolved" });
      continue;
    }

    // Attempt repair via existing service (idempotent, transactional)
    try {
      const res = await billingService.reconcileFailedPayment(paymentId);
      if (res.handled && res.repaired) {
        repaired++;
        details.push({ paymentId, status: "repaired" });
      } else if (res.handled && !res.repaired) {
        alreadyResolved++;
        details.push({ paymentId, status: "already_resolved" });
      } else {
        // Not handled — count failure attempt
        await recordFailureAttempt(evt, paymentId, res.error ?? "reconcile not handled", now);
        failed++;
        details.push({ paymentId, status: "failed", error: res.error ?? "not handled" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordFailureAttempt(evt, paymentId, msg, now);
      failed++;
      details.push({ paymentId, status: "failed", error: msg });
      captureError(err, { service: "reconciliation-runner", operation: "reconcile" });
    }
  }

  return { total: events.length, repaired, alreadyResolved, failed, skipped, details };
}

async function recordFailureAttempt(evt: { id: string; payload: unknown }, paymentId: string, error: string, now: Date) {
  const payload = (evt.payload as Record<string, unknown> | null) ?? {};
  const attempts = Number(payload["_reconcileAttempts"] ?? 0) + 1;
  // Bounded retry: update attempt count on original event payload for observability
  try {
    await prisma.billingEvent.update({
      where: { id: evt.id },
      data: { payload: { ...(payload as object), _reconcileAttempts: attempts, _lastReconcileError: error.slice(0, 500), _lastReconcileAt: now.toISOString() } as never },
    });
  } catch {}

  if (attempts >= RECONCILIATION_MAX_ATTEMPTS) {
    // Repeated failures → SystemError + AlertRecord (observable, never silent)
    try {
      await prisma.systemError.create({
        data: {
          fingerprint: `reconciliation_failed_${paymentId}`,
          level: "ERROR",
          service: "billing",
          operation: "reconciliation",
          message: `Reconciliation failed ${attempts}x for payment ${paymentId}: ${error.slice(0, 1000)}`,
          tenantIds: [],
        },
      });
    } catch {}
    try {
      await prisma.alertRecord.create({
        data: {
          level: "CRITICAL",
          status: "ACTIVE",
          title: `Billing reconciliation repeatedly failed for payment ${paymentId}`,
          message: `Attempts: ${attempts}, last error: ${error.slice(0, 500)}`,
          source: "billing",
          metadata: { paymentId, attempts, error: error.slice(0, 500) } as never,
        },
      });
    } catch {}
    captureError(new Error(`Reconciliation repeatedly failed for ${paymentId}: ${error}`), { service: "billing", operation: "reconciliation-repeated-failure" });
  }
}
