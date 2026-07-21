/**
 * Order Lifecycle Service v1.0.0
 *
 * Manages order state transitions with validation and audit logging.
 * Ensures orders only transition through valid states.
 */

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

interface Transition {
  from: OrderStatus[];
  to: OrderStatus;
}

const TRANSITIONS: Transition[] = [
  { from: ["PENDING"], to: "PAID" },
  { from: ["PENDING"], to: "FAILED" },
  { from: ["PENDING"], to: "CANCELLED" },
  { from: ["PAID"], to: "PROCESSING" },
  { from: ["PROCESSING"], to: "COMPLETED" },
  { from: ["PAID", "PROCESSING", "COMPLETED"], to: "REFUNDED" },
  { from: ["PENDING", "FAILED"], to: "PENDING" },
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS.some((t) => t.from.includes(from) && t.to === to);
}

export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "Order not found" };

  const currentStatus = order.status as OrderStatus;
  if (!canTransition(currentStatus, to)) {
    return {
      success: false,
      error: `Cannot transition from "${currentStatus}" to "${to}"`,
    };
  }

  await prisma.productOrder.update({
    where: { id: orderId },
    data: { status: to },
  });

  await logAction(order.tenantId, `order:${to.toLowerCase()}`, {
    orderId,
    from: currentStatus,
    to,
    ...metadata,
  });

  return { success: true };
}

export async function markOrderPaid(
  orderId: string,
  razorpayPaymentId: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "Order not found" };
  if (order.status !== "PENDING") return { success: false, error: `Order already ${order.status}` };

  await prisma.productOrder.update({
    where: { id: orderId },
    data: {
      status: "COMPLETED",
      razorpayPaymentId,
    },
  });

  await logAction(order.tenantId, "order:paid", {
    orderId,
    razorpayPaymentId,
    amount: order.amount,
    ...metadata,
  });

  return { success: true };
}

export async function markOrderRefunded(
  orderId: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  return transitionOrder(orderId, "REFUNDED", metadata);
}
