"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireTenant } from "@/lib/auth/require-tenant";
import { requireCreatorOrSuperAdminSession } from "@/lib/auth/role-guards";
import { listFulfillments, updateFulfillment, generateDownload, getShippingAddress } from "@/modules/fulfillment";
import type { FulfillmentStatus } from "@/modules/fulfillment";

/** Phase 8 — the creator's fulfillment queue. */
export async function getFulfillmentQueue(status?: string): Promise<{ ok: boolean; items?: Awaited<ReturnType<typeof listFulfillments>>["items"]; total?: number; error?: string }> {
  const { tenantId } = await requireTenant().catch(() => ({ tenantId: null as string | null }));
  if (!tenantId) return { ok: false, error: "Unauthorized" };
  const result = await listFulfillments(tenantId, { status, limit: 100 });
  return { ok: true, items: result.items, total: result.total };
}

/**
 * Phase 3 — update a fulfillment's status / tracking.
 * RCCF-72.18D.5.2-A: role authorization now exists at the mutation boundary
 * (previously tenant membership only). ALLOW: ADMIN (creator), SUPER_ADMIN.
 * DENY: AGENCY_ADMIN, AGENCY_STAFF, SUPPORT, READ_ONLY, anonymous. Server-side
 * transition validation in @/modules/fulfillment remains authoritative.
 */
export async function updateFulfillmentStatus(fulfillmentId: string, input: { status?: FulfillmentStatus; trackingNumber?: string; courier?: string; carrierNotes?: string }): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireCreatorOrSuperAdminSession();
  if (!ctx || !ctx.tenantId) return { success: false, error: "Unauthorized" };
  const result = await updateFulfillment(ctx.tenantId, fulfillmentId, input, ctx.actor ?? "creator");
  return result.success ? { success: true } : { success: false, error: result.error };
}

/**
 * Phase 4 — generate a secure download link for an order.
 * RCCF-72.18D.5.2-A: same mutation-boundary role guard as status updates
 * (generating a token mutates the fulfillment record).
 */
export async function generateDownloadLink(fulfillmentId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const ctx = await requireCreatorOrSuperAdminSession();
  if (!ctx || !ctx.tenantId) return { success: false, error: "Unauthorized" };
  return generateDownload(ctx.tenantId, fulfillmentId, ctx.actor ?? "creator");
}

/** Phase 8 — shipping address for an order (creator view). */
export async function getOrderShippingAddress(orderId: string): Promise<{ ok: boolean; address?: Awaited<ReturnType<typeof getShippingAddress>>; error?: string }> {
  const { tenantId } = await requireTenant().catch(() => ({ tenantId: null as string | null }));
  if (!tenantId) return { ok: false, error: "Unauthorized" };
  const order = await (await import("@/lib/prisma")).prisma.productOrder.findFirst({ where: { id: orderId, tenantId }, select: { id: true } });
  if (!order) return { ok: false, error: "Order not found" };
  return { ok: true, address: await getShippingAddress(orderId) };
}

/** Phase 9 — platform fulfillment health (super admin). */
export async function getFulfillmentOpsData(): Promise<{ ok: boolean; health?: Awaited<ReturnType<typeof import("@/modules/fulfillment").getFulfillmentHealth>>; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") return { ok: false, error: "Unauthorized" };
  const { getFulfillmentHealth } = await import("@/modules/fulfillment");
  return { ok: true, health: await getFulfillmentHealth() };
}
