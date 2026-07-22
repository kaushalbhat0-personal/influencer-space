import { prisma } from "@/lib/prisma";
import type { CheckoutProvider } from "./providers/interface";

export class PurchaseService {
  /** Create a checkout session. */
  async createCheckout(
    offeringId: string,
    provider: CheckoutProvider,
    options: { customerEmail?: string; customerName?: string; successUrl: string; cancelUrl: string },
  ): Promise<{ sessionId: string; checkoutUrl: string }> {
    const offering = await prisma.offering.findUnique({ where: { id: offeringId } });
    if (!offering) throw new Error("Offering not found");
    if (offering.status !== "published") throw new Error("Offering is not published");

    const result = await provider.createCheckout({
      offeringId: offering.id,
      tenantId: offering.tenantId,
      amount: offering.price,
      currency: offering.currency,
      customerEmail: options.customerEmail,
      customerName: options.customerName,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
    });

    // Record the pending purchase
    await prisma.purchase.create({
      data: {
        offeringId: offering.id,
        tenantId: offering.tenantId,
        customerEmail: options.customerEmail || null,
        customerName: options.customerName || null,
        amount: offering.price,
        currency: offering.currency,
        status: "pending",
        checkoutProvider: provider.name,
        providerSessionId: result.sessionId,
      },
    });

    return { sessionId: result.sessionId, checkoutUrl: result.checkoutUrl };
  }

  /** Complete a purchase after payment verification. */
  async completePurchase(sessionId: string, provider: CheckoutProvider): Promise<void> {
    const payment = await provider.verifyPayment(sessionId);
    const purchase = await prisma.purchase.findFirst({
      where: { providerSessionId: sessionId },
    });
    if (!purchase) throw new Error("Purchase not found");

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        status: payment.status === "completed" ? "completed" : "cancelled",
        providerPaymentId: payment.providerPaymentId,
        ...(payment.status === "completed" ? { fulfilledAt: new Date() } : {}),
      },
    });
  }

  /** Fulfill a purchase (e.g., grant access to content). */
  async fulfill(purchaseId: string): Promise<void> {
    await prisma.purchase.update({
      where: { id: purchaseId },
      data: { status: "fulfilled", fulfilledAt: new Date() },
    });
  }

  /** Refund a purchase. */
  async refund(purchaseId: string): Promise<void> {
    await prisma.purchase.update({
      where: { id: purchaseId },
      data: { status: "refunded" },
    });
  }

  /** List purchases for a tenant. */
  async listByTenant(tenantId: string) {
    return prisma.purchase.findMany({
      where: { tenantId },
      include: { offering: { select: { title: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** List purchases for an offering. */
  async listByOffering(offeringId: string) {
    return prisma.purchase.findMany({
      where: { offeringId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Get total revenue for a tenant. */
  async getRevenue(tenantId: string): Promise<number> {
    const result = await prisma.purchase.aggregate({
      where: { tenantId, status: { in: ["completed", "fulfilled"] } },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }
}

export const purchaseService = new PurchaseService();
