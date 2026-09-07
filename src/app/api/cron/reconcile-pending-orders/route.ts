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
      select: { id: true, tenantId: true },
      take: 100,
    });

    let expired = 0;
    for (const order of pendingOrders) {
      try {
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

    await persistedJobRuntime.recordCron("Reconcile Pending Orders", true, `expired ${expired} / ${pendingOrders.length} pending>7d`);
    return NextResponse.json({ ok: true, expired, checked: pendingOrders.length });
  } catch (error) {
    captureError(error, { service: "reconcile-pending-orders", operation: "GET" });
    await persistedJobRuntime.recordCron("Reconcile Pending Orders", false, error instanceof Error ? error.message : "failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
