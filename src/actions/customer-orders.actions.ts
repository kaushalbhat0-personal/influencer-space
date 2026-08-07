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

  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.tenantId === order.tenantId || session?.user?.role === "SUPER_ADMIN";
  const emailMatch = !!email && !!order.fanEmail && email.trim().toLowerCase() === order.fanEmail.trim().toLowerCase();

  if (!isOwner && !emailMatch) {
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

/** Phase 5 — customer submits their shipping address for a physical order.
 * The tenant is resolved server-side from the order (never client-supplied). */
export async function submitShippingAddress(orderId: string, input: ShippingAddressInput): Promise<{ success: boolean; error?: string }> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId }, select: { tenantId: true } });
  if (!order) return { success: false, error: "Order not found" };
  const result = await saveShippingAddress(orderId, order.tenantId, input);
  return result;
}

/** Phase 5 — customer downloads their digital purchase (email-verified). */
export async function getOrderDownload(orderId: string, email?: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId }, select: { tenantId: true, fanEmail: true } });
  if (!order) return { success: false, error: "Order not found" };
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.tenantId === order.tenantId || session?.user?.role === "SUPER_ADMIN";
  const emailMatch = !!email && !!order.fanEmail && email.trim().toLowerCase() === order.fanEmail.trim().toLowerCase();
  if (!isOwner && !emailMatch) return { success: false, error: "Order not found" };

  const { generateDownloadForOrder } = await import("@/modules/fulfillment");
  const result = await generateDownloadForOrder(orderId);
  return result;
}
