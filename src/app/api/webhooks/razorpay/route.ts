import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/modules/billing/application/service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";

/**
 * Razorpay webhook â€” IMPLEMENTATION-34 lifecycle.
 *
 * Every event is signature-verified, idempotent (BillingEvent.idempotencyKey)
 * and audited. Each becomes a BillingEvent â†’ BillingSubscription update â†’
 * capability (entitlement) refresh. Payments never unlock features directly.
 */
const SUBSCRIPTION_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.completed",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
  "payment.failed",
  "order.paid",
]);

type RazorpayPayload = { event?: string; payload?: { payment?: { entity?: Record<string, unknown> }; subscription?: { entity?: Record<string, unknown> } } };

function entityNotes(payload: RazorpayPayload): Record<string, string> {
  const paymentNotes = payload.payload?.payment?.entity?.notes as Record<string, string> | undefined;
  const subNotes = payload.payload?.subscription?.entity?.notes as Record<string, string> | undefined;
  return { ...(subNotes ?? {}), ...(paymentNotes ?? {}) };
}

function providerReference(payload: RazorpayPayload, event: string): string {
  const paymentId = payload.payload?.payment?.entity?.id as string | undefined;
  const subscriptionId = payload.payload?.subscription?.entity?.id as string | undefined;
  return paymentId ?? subscriptionId ?? `${event}_${Date.now()}`;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "webhook";
  const rateCheck = checkRateLimit(`webhook:${ip}`, "/api/webhooks/razorpay");
  if (!rateCheck.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  // VALIDATION-04: timingSafeEqual throws on length mismatch (empty/malformed
  // signature) — guard first so a bad signature is a 401, not a 500.
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const event = payload.event as string;
  const ref = providerReference(payload, event);
  const idempotencyKey = ref ? `razorpay_${event}_${ref}` : `razorpay_${event}_${Date.now()}`;

  const existing = await prisma.billingEvent.findUnique({ where: { idempotencyKey } });
  if (existing) return NextResponse.json({ ok: true });

  const notes = entityNotes(payload);
  const workspaceId: string = notes.workspaceId || notes.accountId || "";

  try {
    // â”€â”€ Subscription lifecycle events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (SUBSCRIPTION_EVENTS.has(event)) {
      if (!workspaceId) return NextResponse.json({ ok: true });
      const result = await billingService.handleSubscriptionWebhook({
        eventName: event,
        workspaceId,
        planCode: notes.planCode || undefined,
        providerReference: ref,
        idempotencyKey,
        renewsAt: event === "subscription.activated" || event === "subscription.charged" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        amount: Number(((payload.payload?.payment?.entity?.amount as number | undefined) ?? 0)) / 100,
      });
      if (!result.handled && result.error) {
        captureError(new Error(result.error), { service: "razorpay-webhook", operation: "subscriptionWebhook" });
      }
      return NextResponse.json({ ok: true });
    }

    // â”€â”€ payment.captured (legacy + plan activation + product orders) â”€â”€â”€â”€â”€
    if (event === "payment.captured") {
      const planCode: string | undefined = notes.planCode || undefined;
      const orderId: string = payload.payload?.payment?.entity?.order_id || "";
      const paymentId: string = payload.payload?.payment?.entity?.id || "";
      const capturedAmountPaise: number = Number(payload.payload?.payment?.entity?.amount ?? 0);

      try {
        if (workspaceId) {
          await billingService.handleSubscriptionWebhook({
            eventName: "payment.captured",
            workspaceId,
            planCode,
            providerReference: orderId || paymentId,
            idempotencyKey,
            amount: capturedAmountPaise / 100,
          });
        } else {
          const guestEmail: string = notes.email || "";
          if (guestEmail) {
            const user = await prisma.user.findUnique({ where: { email: guestEmail }, select: { id: true } });
            if (user) {
              const memberships = await workspaceRepository.findMembershipsByUserId(user.id);
              for (const m of memberships) {
                await billingService.handleSubscriptionWebhook({
                  eventName: "payment.captured",
                  workspaceId: m.workspace.id,
                  planCode,
                  providerReference: orderId || paymentId,
                  idempotencyKey: `${idempotencyKey}_${m.workspace.id}`,
                  amount: capturedAmountPaise / 100,
                });
              }
            }
          }
        }
      } catch (error) {
        captureError(error, { service: "razorpay-webhook", operation: "paymentCaptured" });
      }

      // Complete Creator CMS product orders (storefront guest purchases)
      const productId: string = notes.productId || "";
      const dbOrderId: string = notes.orderId || "";
      if (productId && dbOrderId) {
        try {
          const dbOrder = await prisma.productOrder.findUnique({
            where: { id: dbOrderId },
            select: { id: true, status: true, amount: true, razorpayPaymentId: true, tenantId: true },
          });
          if (dbOrder && dbOrder.status === "PENDING" && !dbOrder.razorpayPaymentId) {
            // RCCF-IMPLEMENTATION-72: idempotency + amount verification — only
            // complete when the captured amount matches the order amount.
            const expectedPaise = Math.round(dbOrder.amount * 100);
            if (capturedAmountPaise === expectedPaise) {
              await prisma.productOrder.update({
                where: { id: dbOrder.id },
                data: { status: "COMPLETED", razorpayPaymentId: paymentId },
              });
              await prisma.billingEvent
                .create({
                  data: {
                    workspaceId: null,
                    accountId: dbOrder.tenantId,
                    type: "PAYMENT_CAPTURED_PRODUCT",
                    idempotencyKey: `razorpay_payment_captured_product_${paymentId}`,
                    payload: { orderId: dbOrder.id, productId, amount: dbOrder.amount },
                  },
                })
                .catch(() => {});
            } else {
              captureError(new Error(`Product order amount mismatch: captured ${capturedAmountPaise} vs expected ${expectedPaise}`), { service: "razorpay-webhook", operation: "productOrderCaptured" });
            }
          }
        } catch (error) {
          captureError(error, { service: "razorpay-webhook", operation: "productOrderCaptured" });
        }
      }
    }
  } catch (error) {
    captureError(error, { service: "razorpay-webhook", operation: event });
  }

  return NextResponse.json({ ok: true });
}
