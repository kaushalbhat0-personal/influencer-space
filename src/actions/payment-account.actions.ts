"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getPaymentAccount,
  savePaymentAccount,
  verifyPaymentAccount,
  disconnectPaymentAccount,
  computePaymentReadiness,
  getPaymentHealth,
} from "@/modules/payment-account";
import { getPaymentProviderAdapter } from "@/modules/payment-account";
import type { PaymentAccountInput } from "@/modules/payment-account";

async function requireCreatorOrSuperAdmin(): Promise<{ tenantId?: string; isSuper: boolean; actor?: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const isSuper = role === "SUPER_ADMIN";
  const tenantId = session?.user?.tenantId ?? undefined;
  if (!isSuper && !tenantId) return { isSuper: false };
  return { tenantId, isSuper, actor: session?.user?.email ?? session?.user?.name ?? "user" };
}

/** Phase 4 — creator's own payment account (creator or super-admin only). */
export async function getMyPaymentAccount(): Promise<{ ok: boolean; account?: Awaited<ReturnType<typeof getPaymentAccount>>; readiness?: Awaited<ReturnType<typeof computePaymentReadiness>>; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId) return { ok: false, error: "Unauthorized" };
  const [account, readiness] = await Promise.all([getPaymentAccount(ctx.tenantId), computePaymentReadiness(ctx.tenantId)]);
  return { ok: true, account, readiness };
}

/** Phase 4 — save/edit the creator's own payment account. */
export async function saveMyPaymentAccount(input: PaymentAccountInput): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId) return { success: false, error: "Unauthorized" };
  const result = await savePaymentAccount(ctx.tenantId, input, ctx.actor ?? "creator");
  revalidatePath("/admin/payments");
  return { success: result.success, error: result.error };
}

export async function verifyMyPaymentAccount(): Promise<{ success: boolean; verified?: boolean; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId) return { success: false, error: "Unauthorized" };
  const result = await verifyPaymentAccount(ctx.tenantId, ctx.actor ?? "creator");
  if (result.success) revalidatePath("/admin/payments");
  return result;
}

export async function disconnectMyPaymentAccount(): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.tenantId) return { success: false, error: "Unauthorized" };
  const result = await disconnectPaymentAccount(ctx.tenantId, ctx.actor ?? "creator");
  revalidatePath("/admin/payments");
  return result;
}

/** Phase 6 — DIRECT_CREATOR checkout: create a hosted checkout on the creator's
 * account. The customer is a storefront guest, so the tenant comes from the
 * product row. CreatorStore is never in the money flow. */
export async function createDirectCheckout(input: { productId: string; customerEmail?: string; customerName?: string }): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  const product = await prisma.product.findFirst({ where: { id: input.productId, isActive: true, status: "PUBLISHED", archivedAt: null } });
  if (!product) return { success: false, error: "Product not found" };
  const tenantId = product.tenantId;

  const readiness = await computePaymentReadiness(tenantId);
  if (readiness.strategy !== "DIRECT_CREATOR" || readiness.readiness !== "ready") {
    return { success: false, error: "Creator payment account not ready" };
  }

  const account = await prisma.paymentAccount.findUnique({ where: { tenantId } });
  const adapter = getPaymentProviderAdapter(account?.provider ?? "");
  if (!adapter) return { success: false, error: "No provider adapter" };

  const { decrypt } = await import("@/lib/crypto");
  const keyId = account?.providerKeyId ? decrypt(account.providerKeyId) : null;
  const keySecret = account?.providerKeySecret ? decrypt(account.providerKeySecret) : null;

  const result = await adapter.createCheckout({
    providerAccount: { provider: account!.provider as never, providerKeyId: keyId, providerKeySecret: keySecret },
    order: { referenceId: input.productId, amount: product.price, currency: "INR", description: product.name, customerEmail: input.customerEmail, customerName: input.customerName },
  });

  if (result.success && result.checkoutUrl) {
    await prisma.productOrder.create({
      data: {
        tenantId,
        productId: product.id,
        amount: product.price,
        status: "PENDING",
        razorpayOrderId: result.providerReference ?? `dc_${Date.now()}`,
        fanEmail: input.customerEmail ?? null,
        commerceStrategy: "DIRECT_CREATOR",
        provider: account!.provider,
        providerReference: result.providerReference ?? null,
        providerMetadata: { checkoutUrl: result.checkoutUrl },
      },
    });
  }
  return { success: !!result.success && !!result.checkoutUrl, checkoutUrl: result.checkoutUrl, error: result.error };
}

/** Phase 12 — platform payment health (super admin). */
export async function getPaymentHealthData(): Promise<{ ok: boolean; health?: Awaited<ReturnType<typeof getPaymentHealth>>; error?: string }> {
  const ctx = await requireCreatorOrSuperAdmin();
  if (!ctx.isSuper) return { ok: false, error: "Unauthorized" };
  return { ok: true, health: await getPaymentHealth() };
}
