import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/modules/billing/application/service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";

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
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const event = payload.event;
  const idempotencyKey = payload.payload?.payment?.entity?.id
    ? `razorpay_${event}_${payload.payload.payment.entity.id}`
    : `razorpay_${event}_${Date.now()}`;

  const existing = await prisma.billingEvent.findUnique({ where: { idempotencyKey } });
  if (existing) return NextResponse.json({ ok: true });

  if (event === "payment.captured") {
    const notes = payload.payload?.payment?.entity?.notes || {};
    const planCode: string = notes.planCode || "creator_pro";
    const workspaceId: string = notes.workspaceId || "";
    const orderId: string = payload.payload?.payment?.entity?.order_id || "";

    try {
      if (workspaceId) {
        await billingService.handlePaymentCaptured(workspaceId, planCode, orderId, idempotencyKey);
      } else {
        const guestEmail: string = notes.email || "";
        if (guestEmail) {
          const user = await prisma.user.findUnique({ where: { email: guestEmail }, select: { id: true } });
          if (user) {
            const memberships = await workspaceRepository.findMembershipsByUserId(user.id);
            for (const m of memberships) {
              await billingService.handlePaymentCaptured(m.workspace.id, planCode, orderId, `${idempotencyKey}_${m.workspace.id}`);
            }
          }
        }
      }
    } catch (error) {
      captureError(error, { service: "razorpay-webhook", operation: "paymentCaptured" });
    }
  }

  return NextResponse.json({ ok: true });
}
