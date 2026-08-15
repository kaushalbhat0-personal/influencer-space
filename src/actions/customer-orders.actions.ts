"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFulfillmentByOrder, saveShippingAddress, getShippingAddress } from "@/modules/fulfillment";
import type { ShippingAddressInput } from "@/modules/fulfillment";

export interface CustomerOrderView {
  ok: boolean;
  order?: {
    id: string;
    productName: string;
    amount: number;
    status: string;
    customerEmail: string | null;
    createdAt: string;
    fulfillment: Awaited<ReturnType<typeof getFulfillmentByOrder>>;
    shipping: Awaited<ReturnType<typeof getShippingAddress>>;
  };
  error?: string;
}

/** Phase 5 — customer order lookup (guest by orderId + email, or authenticated). */
export async function getCustomerOrder(orderId: string, email?: string): Promise<CustomerOrderView> {
  const order = await prisma.productOrder.findUnique({
    where: { id: orderId },
    include: { product: { select: { name: true } } },
  });
  if (!order) return { ok: false, error: "Order not found" };

  if (!(await canAccessOrder(order, email))) {
    return { ok: false, error: "Order not found" };
  }

  const [fulfillment, shipping] = await Promise.all([getFulfillmentByOrder(order.id), getShippingAddress(order.id)]);
  return {
    ok: true,
    order: {
      id: order.id,
      productName: order.product.name,
      amount: order.amount,
      status: order.status,
      customerEmail: order.fanEmail,
      createdAt: order.createdAt.toISOString(),
      fulfillment,
      shipping,
    },
  };
}

/**
 * RCCF-67.2 — canonical customer-order proof reused by reads AND mutations.
 * A caller may access an order only if they are the authenticated owner
 * (creator/SUPER_ADMIN) OR the verified buyer email matches the stored order
 * email. An orderId alone is never sufficient. This is the same boundary the
 * order-lookup and download paths already use — no second identity model.
 */
async function canAccessOrder(
  order: { tenantId: string; fanEmail: string | null },
  email?: string,
): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.tenantId === order.tenantId || session?.user?.role === "SUPER_ADMIN";
  const emailMatch = !!email && !!order.fanEmail && email.trim().toLowerCase() === order.fanEmail.trim().toLowerCase();
  return isOwner || emailMatch;
}

/**
 * Phase 5 — customer submits their shipping address for a physical order.
 * RCCF-67.2 (P1 IDOR): the mutation now requires the same ownership proof as
 * reads/downloads (authenticated owner OR verified buyer email). The tenant is
 * resolved server-side from the order (never client-supplied) and the address
 * write is scoped to that tenant. An arbitrary orderId alone is insufficient.
 */
export async function submitShippingAddress(orderId: string, email: string | undefined, input: ShippingAddressInput): Promise<{ success: boolean; error?: string }> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId }, select: { tenantId: true, fanEmail: true } });
  if (!order) return { success: false, error: "Order not found" };
  if (!(await canAccessOrder(order, email))) return { success: false, error: "Order not found" };
  const result = await saveShippingAddress(orderId, order.tenantId, input);
  return result;
}

/** Phase 5 — customer downloads their digital purchase (email-verified). */
export async function getOrderDownload(orderId: string, email?: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId }, select: { tenantId: true, fanEmail: true } });
  if (!order) return { success: false, error: "Order not found" };
  if (!(await canAccessOrder(order, email))) return { success: false, error: "Order not found" };

  const { generateDownloadForOrder } = await import("@/modules/fulfillment");
  const result = await generateDownloadForOrder(orderId);
  return result;
}
