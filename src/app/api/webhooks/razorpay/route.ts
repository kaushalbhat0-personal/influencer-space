import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/modules/billing/application/service";
import { buildRazorpayIdempotencyKey } from "@/modules/billing/domain/webhook";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { checkRateLimit } from "@/lib/security/rate-limiter";
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

type RazorpayPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    subscription?: { entity?: Record<string, unknown> };
    refund?: { entity?: Record<string, unknown> };
    // RCCF-72.18D.6.1 — Payment Link entity (present on payment-link-shaped
    // deliveries); its id is one reconciliation identity candidate.
    payment_link?: { entity?: Record<string, unknown> };
  };
};

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

// ── RCCF-72.18D.5.5 (WEBHOOK-02) — X-Razorpay-Failure-Reason ────────────────
// Razorpay delivers the payment failure reason as a webhook HEADER. It is
// untrusted provider-controlled text: control characters are stripped,
// whitespace collapsed and the value length-capped before anything is stored.
// The sanitized reason is persisted ONLY server-side (ProductOrder.providerMetadata
// — the existing provider-agnostic runtime field, no schema change) and in the
// BillingEvent audit payload. It is never echoed back to any browser surface;
// creator-facing error wording remains the D.5.2-D safe contract.

const FAILURE_REASON_MAX_LENGTH = 256;

function sanitizeFailureReason(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FAILURE_REASON_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
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

  // RCCF-72.18D.5.5: a valid signature over non-JSON bytes is a provider-side
  // bug, not a crash — answer 400 instead of throwing out of the handler.
  let payload: RazorpayPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const event = payload.event as string;
  const ref = providerReference(payload, event);
  // RCCF-37 (P1): a single Razorpay payment can raise SEVERAL events — e.g.
  // subscription.activated + subscription.charged + payment.captured, or
  // order.paid + payment.captured. They are one financial occurrence. Keying
  // idempotency on the payment id collapses them so a charge can never be
  // processed twice (double invoice / double partner commission).
  const idempotencyKey = buildRazorpayIdempotencyKey(payload, event, ref);

  const existing = await prisma.billingEvent.findUnique({ where: { idempotencyKey } });
  if (existing) return NextResponse.json({ ok: true });

  const notes = entityNotes(payload);
  const workspaceId: string = notes.workspaceId || notes.accountId || "";

  try {
    // ── RCCF-72.18D.5.5 — payment failure diagnostics for product orders ──
    // Records WHY a creator-commerce payment failed while the order still
    // awaits payment. The Razorpay order id persisted at checkout is the only
    // lookup identity (server-side; no tenant/creator signal from the wire).
    // Subscription payments carry no ProductOrder and fall through untouched;
    // completed/settled orders are never mutated.
    if (event === "payment.failed") {
      try {
        const paymentEntity = (payload.payload?.payment?.entity ?? {}) as Record<string, unknown>;
        const failedPaymentId = (paymentEntity.id as string | undefined) ?? "";
        const rzpOrderId = (paymentEntity.order_id as string | undefined) ?? "";
        const reason = sanitizeFailureReason(req.headers.get("x-razorpay-failure-reason"));

        if (rzpOrderId) {
          const productOrder = await prisma.productOrder.findFirst({
            where: { razorpayOrderId: rzpOrderId },
            select: { id: true, tenantId: true, status: true, providerMetadata: true },
          });

          if (productOrder && productOrder.status === "PENDING") {
            const dedupeKey = `razorpay_payment_failed_product_${failedPaymentId || rzpOrderId}`;
            const alreadyRecorded = await prisma.billingEvent.findUnique({
              where: { idempotencyKey: dedupeKey },
              select: { id: true },
            });

            if (!alreadyRecorded) {
              const metadata = (productOrder.providerMetadata as Record<string, unknown> | null) ?? {};
              await prisma.productOrder.update({
                where: { id: productOrder.id },
                data: {
                  providerMetadata: {
                    ...metadata,
                    lastPaymentFailureReason: reason ?? "unspecified",
                    lastPaymentFailedAt: new Date().toISOString(),
                  },
                },
              });
              await prisma.billingEvent
                .create({
                  data: {
                    workspaceId: null,
                    accountId: productOrder.tenantId,
                    type: "PAYMENT_FAILED_PRODUCT",
                    idempotencyKey: dedupeKey,
                    payload: {
                      orderId: productOrder.id,
                      providerPaymentId: failedPaymentId,
                      failureReason: reason ?? "unspecified",
                      webhookEvent: event,
                    },
                  },
                })
                .catch(() => {});
            }
          }
        }
      } catch (error) {
        captureError(error, { service: "razorpay-webhook", operation: "productOrderFailureReason" });
      }
    }

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
      // RCCF-72.18D.5.5: payload is now strictly typed — provider fields are
      // read through explicit string casts instead of implicit any.
      const orderId: string = (payload.payload?.payment?.entity?.order_id as string | undefined) || "";
      const paymentId: string = (payload.payload?.payment?.entity?.id as string | undefined) || "";
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
              // RCCF-38: the canonical completion boundary — reserves the monthly
              // order quota atomically and transitions the order to COMPLETED.
              const { completeProductOrder } = await import("@/modules/billing/application/order-completion");
              const completed = await completeProductOrder(dbOrder.id, { paymentId });
              if (!completed.success) {
                captureError(new Error(`Order not completed (${completed.reason ?? "unknown"}): order=${dbOrder.id} tenant=${dbOrder.tenantId}`), {
                  service: "razorpay-webhook",
                  operation: "productOrderQuota",
                });
              }
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

      // ── RCCF-72.18D.6.1 — DIRECT_CREATOR Payment Link reconciliation ─────
      // Payment Link payments carry link notes (`referenceId`/`creatorStore`),
      // NOT `notes.orderId/productId`, so the legacy block above never runs for
      // them and the ProductOrder would stay PENDING forever (the D.6 P1-1
      // blocker). Reconcile by exact server-persisted identity instead:
      // providerReference (plink id) or the checkout-persisted
      // providerMetadata.reconciliationRef echoed back through link notes.
      //
      // PLATFORM_COLLECT orders always carry both legacy notes and are fully
      // handled by the block above — they never reach here. Unknown provider
      // identities resolve to nothing and mutate nothing. No tenant, email or
      // client-supplied value is ever trusted; no credentials are decrypted.
      if (!(productId && dbOrderId)) {
        try {
          const paymentEntity = payload.payload?.payment?.entity as Record<string, unknown> | undefined;
          const paymentLinkField =
            typeof paymentEntity?.payment_link === "string" ? paymentEntity.payment_link : undefined;
          const linkEntityRaw = payload.payload?.payment_link?.entity?.id;
          const linkEntityId = typeof linkEntityRaw === "string" ? linkEntityRaw : undefined;

          const { reconcileDirectCreatorPaymentLinkPayment } = await import(
            "@/modules/billing/application/direct-creator-reconciliation"
          );
          await reconcileDirectCreatorPaymentLinkPayment({
            paymentId,
            capturedAmountPaise,
            notes,
            providerPaymentLinkIds: [linkEntityId, paymentLinkField],
          });
        } catch (error) {
          captureError(error, { service: "razorpay-webhook", operation: "directCreatorPaymentLinkReconciliation" });
        }
      }
    }
    // ── refund.processed — reverse partner commission (RCCF-41) ─────────────
    if (event === "refund.processed" || event === "refund.failed") {
      const refundEntity = payload.payload?.refund?.entity as Record<string, unknown> | undefined;
      const refundId = (refundEntity?.id as string | undefined) ?? "";
      const refundPaymentId = (refundEntity?.payment_id as string | undefined) ?? "";
      const refundAmountPaise = Number(refundEntity?.amount ?? 0);
      if (refundId && refundPaymentId) {
        try {
          const { billingService } = await import("@/modules/billing/application/service");
          await billingService.handleRefund({
            refundId,
            paymentId: refundPaymentId,
            refundAmountPaise,
          });
        } catch (error) {
          captureError(error, { service: "razorpay-webhook", operation: "refundProcessed" });
        }

        // Reconcile DIRECT_CREATOR product order refunds (RCCF-72.18D.4;
        // ledger semantics repaired in RCCF-72.18D.5.1). Find the ProductOrder
        // through the server-side persisted payment ID — never trust
        // tenantId from webhook/client input.
        //
        // D.5.1 semantics: ProductOrder.refundAmount is ACTUAL refunded paise.
        //   refund.failed  → NEVER mutates refundAmount; PENDING→FAILED (a
        //                    failure cannot convert to PARTIAL or downgrade a
        //                    settled PARTIAL/REFUNDED state).
        //   refund.processed → clamp-adds the provider amount once, keyed by
        //                    provider refund id (BillingEvent dedupe below).
        try {
          const productOrder = await prisma.productOrder.findFirst({
            where: { razorpayPaymentId: refundPaymentId },
            select: {
              id: true,
              tenantId: true,
              commerceStrategy: true,
              paymentAccountId: true,
              refundId: true,
              refundAmount: true,
              refundStatus: true,
              amount: true,
            },
          });

          // Only reconcile DIRECT_CREATOR orders — PLATFORM_COLLECT uses
          // the billing commission path above; subscriptions are unaffected.
          if (productOrder && productOrder.commerceStrategy === "DIRECT_CREATOR") {
            // Idempotency FIRST, keyed on the provider refund id: duplicate
            // deliveries of either event type are dropped before any state
            // math. (order.refundId alone is not used as the dedupe gate so a
            // legitimate SECOND sequential partial refund is still reconciled.)
            const existingEvent = await prisma.billingEvent.findUnique({
              where: { idempotencyKey: `product_refund_webhook_${refundId}` },
              select: { id: true },
            });

            if (!existingEvent) {
              const originalCapturedPaise = Math.round(productOrder.amount * 100);
              const refundedToDatePaise = productOrder.refundAmount ?? 0;
              const priorStatus = productOrder.refundStatus;
              const isFailed = event === "refund.failed";

              if (isFailed) {
                // Money did NOT move — the webhook amount field is informational,
                // never truth. Only PENDING/FAILED may transition to FAILED.
                if (priorStatus === "PENDING" || priorStatus === "FAILED") {
                  await prisma.$transaction(async (tx) => {
                    await tx.productOrder.update({
                      where: { id: productOrder.id },
                      data: { refundStatus: "FAILED" },
                    });

                    await tx.billingEvent.create({
                      data: {
                        workspaceId: null,
                        accountId: productOrder.tenantId,
                        type: "REFUND_FAILED",
                        idempotencyKey: `product_refund_webhook_${refundId}`,
                        payload: {
                          orderId: productOrder.id,
                          providerRefundId: refundId,
                          amountReportedPaise: refundAmountPaise,
                          refundedPaise: refundedToDatePaise,
                          status: "FAILED",
                          priorStatus,
                          webhookevent: event,
                        },
                      },
                    });
                  });
                } else {
                  // Failure arriving against NONE/PARTIAL/REFUNDED: record for
                  // audit only — a failure can neither downgrade settled state
                  // nor conjure a refund that never happened.
                  await prisma.billingEvent.create({
                    data: {
                      workspaceId: null,
                      accountId: productOrder.tenantId,
                      type: "REFUND_FAILED_IGNORED",
                      idempotencyKey: `product_refund_webhook_${refundId}`,
                      payload: {
                        orderId: productOrder.id,
                        providerRefundId: refundId,
                        amountReportedPaise: refundAmountPaise,
                        refundedPaise: refundedToDatePaise,
                        reason: `failure ignored in state ${priorStatus}`,
                        webhookevent: event,
                      },
                    },
                  }).catch(() => {});
                }
              } else {
                // refund.processed — provider truth: this much money DID move.
                // Clamp to the remaining ceiling so cumulative refunds can never
                // exceed the original captured amount, and count it exactly once.
                const deltaPaise = Math.max(0, Math.min(refundAmountPaise, originalCapturedPaise - refundedToDatePaise));

                if (deltaPaise > 0) {
                  // RCCF-72.18D.5.5 — atomic ledger application. The ENTIRE
                  // apply-cycle runs inside ONE interactive transaction: the
                  // base ledger is re-read inside the tx, the increment is
                  // conditioned on that exact base (no lost update when two
                  // legitimate refunds race), and the dedupe BillingEvent
                  // shares the tx — so a duplicate same-refund-id delivery
                  // hitting the unique constraint rolls its money write back.
                  await prisma.$transaction(async (tx) => {
                    const current = await tx.productOrder.findUnique({
                      where: { id: productOrder.id },
                      select: { refundAmount: true, refundStatus: true },
                    });
                    const basePaise = current?.refundAmount ?? refundedToDatePaise;
                    const appliedDeltaPaise = Math.max(0, Math.min(refundAmountPaise, originalCapturedPaise - basePaise));

                    if (appliedDeltaPaise <= 0) {
                      await tx.billingEvent.create({
                        data: {
                          workspaceId: null,
                          accountId: productOrder.tenantId,
                          type: "REFUND_WEBHOOK_NOOP",
                          idempotencyKey: `product_refund_webhook_${refundId}`,
                          payload: {
                            orderId: productOrder.id,
                            providerRefundId: refundId,
                            amountReportedPaise: refundAmountPaise,
                            refundedPaise: basePaise,
                            reason: "no remaining refundable headroom",
                            webhookevent: event,
                          },
                        },
                      });
                      return;
                    }

                    const applied = await tx.productOrder.updateMany({
                      where: { id: productOrder.id, refundAmount: basePaise },
                      data: {
                        refundId: refundId,
                        refundAmount: { increment: appliedDeltaPaise },
                        refundedAt: new Date(),
                      },
                    });

                    if (applied.count === 0) {
                      // Ledger moved between our in-tx read and write — record
                      // truthfully instead of guessing; a redelivery retries.
                      await tx.billingEvent.create({
                        data: {
                          workspaceId: null,
                          accountId: productOrder.tenantId,
                          type: "REFUND_WEBHOOK_NOOP",
                          idempotencyKey: `product_refund_webhook_${refundId}`,
                          payload: {
                            orderId: productOrder.id,
                            providerRefundId: refundId,
                            amountReportedPaise: refundAmountPaise,
                            refundedPaise: basePaise,
                            reason: "ledger changed concurrently",
                            webhookevent: event,
                          },
                        },
                      });
                      return;
                    }

                    const newTotalRefundedPaise = Math.min(basePaise + appliedDeltaPaise, originalCapturedPaise);
                    const finalStatus = newTotalRefundedPaise >= originalCapturedPaise ? "REFUNDED" : "PARTIAL";
                    if ((current?.refundStatus ?? priorStatus) !== finalStatus) {
                      await tx.productOrder.update({
                        where: { id: productOrder.id },
                        data: { refundStatus: finalStatus },
                      });
                    }

                    // RCCF-72.18D.6.5 — POLICY 1 parity with the D.4 execution
                    // path: a webhook-reconciled FULL refund revokes digital
                    // download access in the SAME transaction. PARTIAL keeps it.
                    if (finalStatus === "REFUNDED") {
                      await tx.orderFulfillment.updateMany({
                        where: { orderId: productOrder.id, type: { in: ["digital", "course"] }, downloadToken: { not: null } },
                        data: { downloadToken: null, downloadExpiresAt: null },
                      });
                    }

                    // Created LAST inside the tx: a duplicate delivery losing
                    // this unique constraint rolls back its money application.
                    await tx.billingEvent.create({
                      data: {
                        workspaceId: null,
                        accountId: productOrder.tenantId,
                        type: "REFUND_WEBHOOK_RECONCILED",
                        idempotencyKey: `product_refund_webhook_${refundId}`,
                        payload: {
                          orderId: productOrder.id,
                          providerRefundId: refundId,
                          amountPaise: appliedDeltaPaise,
                          totalRefundedPaise: newTotalRefundedPaise,
                          status: finalStatus,
                          priorStatus,
                          webhookevent: event,
                        },
                      },
                    });
                  });
                } else {
                  // Order already settled to (or beyond) this refund's size.
                  await prisma.billingEvent.create({
                    data: {
                      workspaceId: null,
                      accountId: productOrder.tenantId,
                      type: "REFUND_WEBHOOK_NOOP",
                      idempotencyKey: `product_refund_webhook_${refundId}`,
                      payload: {
                        orderId: productOrder.id,
                        providerRefundId: refundId,
                        amountReportedPaise: refundAmountPaise,
                        refundedPaise: refundedToDatePaise,
                        reason: "no remaining refundable headroom",
                        webhookevent: event,
                      },
                    },
                  }).catch(() => {});
                }
              }
            }
          }
        } catch (error) {
          captureError(error, { service: "razorpay-webhook", operation: "productOrderRefundReconcile" });
        }
      }
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    captureError(error, { service: "razorpay-webhook", operation: event });
  }

  return NextResponse.json({ ok: true });
}
