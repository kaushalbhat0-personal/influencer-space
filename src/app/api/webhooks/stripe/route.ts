import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability/error-tracker";
import { checkRateLimit } from "@/lib/security/rate-limiter";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "webhook-stripe";
  const rateCheck = checkRateLimit(`webhook-stripe:${ip}`, "/api/webhooks/stripe");
  if (!rateCheck.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    const StripeMod = await import("stripe");
    const Stripe = (StripeMod as unknown as { default: new (k: string, opts: { apiVersion: string }) => { webhooks: { constructEvent: (body: string, sig: string, secret: string) => unknown } } }).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_dummy", { apiVersion: "2024-06-20" as never });
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret) as never;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const type = event.type as string;
    const obj = event.data.object as Record<string, unknown>;

    // checkout.session.completed → retrieve line metadata reconciliationRef
    if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
      const sessionId = (obj.id as string) || "";
      const reconciliationRef = ((obj.client_reference_id as string) || (obj.metadata as Record<string, unknown> | undefined)?.reconciliationRef as string | undefined) ?? null;
      const amountTotal = Number(obj.amount_total ?? 0); // cents
      const customerEmail = (obj.customer_details as { email?: string } | undefined)?.email ?? (obj.customer_email as string | undefined) ?? null;

      // Idempotency per session id
      const idempotencyKey = `stripe_session_${sessionId}`;
      const existing = await prisma.billingEvent.findUnique({ where: { idempotencyKey } });
      if (existing) return NextResponse.json({ ok: true });

      // Find ProductOrder by providerReference or reconciliationRef
      let order: { id: string; tenantId: string; status: string; amount: number } | null = null;
      if (reconciliationRef) {
        const candidates = await prisma.productOrder.findMany({ where: { provider: "stripe", commerceStrategy: "DIRECT_CREATOR", status: "PENDING" }, select: { id: true, tenantId: true, status: true, amount: true, providerMetadata: true, providerReference: true } });
        const match = candidates.find((c: { providerMetadata: unknown; providerReference: string | null }) => {
          const meta = c.providerMetadata as Record<string, unknown> | null;
          return meta?.reconciliationRef === reconciliationRef || c.providerReference === sessionId;
        });
        if (match) order = match as unknown as typeof order;
      }
      if (!order && sessionId) {
        const byRef = await prisma.productOrder.findFirst({ where: { providerReference: sessionId } });
        if (byRef) order = byRef as unknown as typeof order;
      }

      if (order && (order as { status: string }).status === "PENDING") {
        const expectedPaise = Math.round((order as { amount: number }).amount * 100);
        const capturedPaise = amountTotal;
        if (capturedPaise === expectedPaise || capturedPaise === 0) {
          const { completeProductOrder } = await import("@/modules/billing/application/order-completion");
          await completeProductOrder((order as { id: string }).id, { paymentId: sessionId });
        }
        await prisma.billingEvent.create({ data: { workspaceId: null, accountId: (order as { tenantId: string }).tenantId, type: "PAYMENT_CAPTURED_PRODUCT", idempotencyKey, payload: { orderId: (order as { id: string }).id, provider: "stripe", sessionId, amountTotal, reconciliationRef, customerEmail } } }).catch(()=>{});
      } else {
        await prisma.billingEvent.create({ data: { workspaceId: null, accountId: "00000000-0000-0000-0000-000000000000", type: "STRIPE_WEBHOOK_UNMATCHED", idempotencyKey, payload: { type, sessionId, reconciliationRef } } }).catch(()=>{});
      }
      return NextResponse.json({ ok: true });
    }

    // refund/charge refunded could be handled similarly, but reuse existing refund path for provider-agnostic
    return NextResponse.json({ ok: true });
  } catch (error) {
    captureError(error, { service: "stripe-webhook", operation: "handle" });
    return NextResponse.json({ ok: true });
  }
}
