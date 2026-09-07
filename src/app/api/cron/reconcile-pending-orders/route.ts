import { NextResponse } from "next/server";
import { verifyBearerAuth } from "@/lib/security/verify-bearer";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability/error-tracker";
import { persistedJobRuntime } from "@/modules/operations/application/job-runtime";

export async function GET(request: Request) {
  if (!verifyBearerAuth(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pendingOrders = await prisma.productOrder.findMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      select: { id: true, tenantId: true, commerceStrategy: true, provider: true, providerReference: true, paymentAccountId: true },
      take: 100,
    });

    let expired = 0;
    let skippedPaid = 0;
    let skippedTransient = 0;
    for (const order of pendingOrders) {
      try {
        // F2: for DIRECT_CREATOR, never expire solely because >7d — check Razorpay Payment Link
        if (order.commerceStrategy === "DIRECT_CREATOR" && order.providerReference && order.paymentAccountId) {
          let shouldExpire = false;
          let isTransient = false;
          let isPaid = false;
          try {
            const paymentAccount = await prisma.paymentAccount.findUnique({
              where: { id: order.paymentAccountId },
              select: { providerKeyId: true, providerKeySecret: true, provider: true },
            });
            if (!paymentAccount?.providerKeyId || !paymentAccount?.providerKeySecret) {
              // No credentials to check — fall back to expiry policy (allow)
              shouldExpire = true;
            } else {
              const { decrypt } = await import("@/lib/crypto");
              const keyId = decrypt(paymentAccount.providerKeyId);
              const keySecret = decrypt(paymentAccount.providerKeySecret);
              if (!keyId || !keySecret) {
                shouldExpire = true;
              } else {
                // Best-effort Razorpay Payment Link lookup — no new abstraction
                const Razorpay = (await import("razorpay")).default;
                const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
                try {
                  const link = await (client as unknown as { paymentLink: { fetch(id: string): Promise<{ status?: string; payments?: unknown[] }> } }).paymentLink.fetch(order.providerReference!);
                  const status = (link as { status?: string })?.status;
                  if (status === "paid") {
                    isPaid = true;
                  } else if (status === "created" || status === "partially_paid" || status === "cancelled" || status === "expired") {
                    shouldExpire = true;
                  } else {
                    // Unknown status — do not expire, retry next cron
                    isTransient = true;
                  }
                  // If link has payments array with successful payment, consider paid
                  if (!isPaid && Array.isArray((link as { payments?: unknown[] }).payments) && (link as { payments?: unknown[] }).payments!.length > 0) {
                    isPaid = true;
                  }
                } catch (err: unknown) {
                  const statusCode = (err as { statusCode?: number; status?: number })?.statusCode ?? (err as { status?: number })?.status;
                  if (statusCode === 404) {
                    // Link not found — not paid, allow expiry per policy
                    shouldExpire = true;
                  } else if (statusCode === 401 || statusCode === 403) {
                    // Credentials rejected — cannot verify, do not expire blindly
                    isTransient = true;
                  } else if (statusCode === 429 || (typeof statusCode === "number" && statusCode >= 500)) {
                    isTransient = true;
                  } else {
                    const msg = err instanceof Error ? err.message : "";
                    const transientSignal = /timeout|timed out|econn|enotfound|eai_again|socket|fetch failed/i.test(msg);
                    if (transientSignal) isTransient = true;
                    else shouldExpire = true;
                  }
                }
              }
            }
          } catch {
            // Decrypt or import failure — treat as transient, retry next cron
            isTransient = true;
          }

          if (isPaid) {
            skippedPaid++;
            continue;
          }
          if (isTransient) {
            skippedTransient++;
            continue;
          }
          if (!shouldExpire) {
            // No definitive unpaid signal — retry next cron
            skippedTransient++;
            continue;
          }
        }

        await prisma.$transaction(async (tx) => {
          const updated = await tx.productOrder.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: { status: "EXPIRED" },
          });
          if (updated.count > 0) {
            await tx.billingEvent.create({
              data: {
                workspaceId: null,
                accountId: order.tenantId,
                type: "ORDER_EXPIRED",
                idempotencyKey: `order_expired_${order.id}`,
                payload: { orderId: order.id, reason: "abandoned_7d" },
              },
            }).catch(() => {});
            expired++;
          }
        });
      } catch (e) {
        captureError(e, { service: "reconcile-pending-orders", operation: order.id });
      }
    }

    await persistedJobRuntime.recordCron("Reconcile Pending Orders", true, `expired ${expired} / ${pendingOrders.length} pending>7d (skippedPaid:${skippedPaid} transient:${skippedTransient})`);
    return NextResponse.json({ ok: true, expired, checked: pendingOrders.length, skippedPaid, skippedTransient });
  } catch (error) {
    captureError(error, { service: "reconcile-pending-orders", operation: "GET" });
    await persistedJobRuntime.recordCron("Reconcile Pending Orders", false, error instanceof Error ? error.message : "failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
