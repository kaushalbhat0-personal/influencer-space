// ── Fulfillment — Application Runtime ───────────────────────
// RCCF-TRACK-01 Phases 1-6. Creates/updates fulfillment, handles physical
// shipping + secure digital delivery, and powers the customer order portal.

import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import { logAction } from "@/lib/audit";
import { runtimeEventBus } from "@/modules/event-runtime";
import { getFulfillmentStrategy, canTransition, statusLabel } from "./strategies";
import type { FulfillmentUpdateInput, FulfillmentView, ShippingAddressInput } from "../domain/types";

export const DOWNLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const DOWNLOAD_LIMIT = 5;

function serialize(f: {
  id: string; orderId: string; tenantId: string; productId: string; type: string; status: string;
  trackingNumber: string | null; courier: string | null; carrierNotes: string | null;
  shippedAt: Date | null; deliveredAt: Date | null; downloadUrl: string | null; downloadToken: string | null;
  downloadExpiresAt: Date | null; downloadLimit: number; downloadCount: number; timeline: unknown; createdAt: Date; updatedAt: Date;
}): FulfillmentView {
  return {
    id: f.id, orderId: f.orderId, tenantId: f.tenantId, productId: f.productId,
    type: f.type as FulfillmentView["type"], status: f.status as FulfillmentView["status"],
    trackingNumber: f.trackingNumber, courier: f.courier, carrierNotes: f.carrierNotes,
    shippedAt: f.shippedAt?.toISOString() ?? null, deliveredAt: f.deliveredAt?.toISOString() ?? null,
    downloadReady: !!f.downloadToken && !!f.downloadExpiresAt && f.downloadExpiresAt.getTime() > Date.now() && f.downloadCount < f.downloadLimit,
    downloadExpiresAt: f.downloadExpiresAt?.toISOString() ?? null,
    downloadCount: f.downloadCount, downloadLimit: f.downloadLimit,
    timeline: (f.timeline as Array<{ status: string; at: string; by?: string }>) ?? [],
    createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString(),
  };
}

async function emit(type: "fulfillment.created" | "fulfillment.updated" | "shipment.created" | "shipment.delivered" | "download.generated" | "download.expired" | "booking.confirmed" | "service.completed", tenantId: string, entityId: string, payload: Record<string, unknown>): Promise<void> {
  await runtimeEventBus.publish({ type, tenantId, entityId, payload, occurredAt: new Date().toISOString() }).catch(() => {});
}

// ── Creation ─────────────────────────────────────────────────

/** Create (or return) the fulfillment for a COMPLETED order. Called post-payment. */
export async function ensureFulfillment(orderId: string): Promise<FulfillmentView | null> {
  const order = await prisma.productOrder.findUnique({
    where: { id: orderId },
    include: { product: { select: { type: true, downloadUrl: true } } },
  });
  if (!order || order.status !== "COMPLETED") return null;

  const existing = await prisma.orderFulfillment.findUnique({ where: { orderId } });
  if (existing) return serialize(existing);

  const strategy = getFulfillmentStrategy(order.product.type);
  const now = new Date();
  const created = await prisma.orderFulfillment.create({
    data: {
      orderId: order.id,
      tenantId: order.tenantId,
      productId: order.productId,
      type: strategy.type,
      status: strategy.initialStatus,
      downloadUrl: strategy.requiresDownload ? order.product.downloadUrl ?? null : null,
      timeline: [{ status: strategy.initialStatus, at: now.toISOString() }],
    },
  });
  await emit("fulfillment.created", order.tenantId, created.id, { orderId: order.id, type: strategy.type });
  return serialize(created);
}

// ── Update (shipping / status) ───────────────────────────────

export async function updateFulfillment(tenantId: string, fulfillmentId: string, input: FulfillmentUpdateInput, by = "creator"): Promise<{ success: boolean; view?: FulfillmentView; error?: string }> {
  const f = await prisma.orderFulfillment.findFirst({ where: { id: fulfillmentId, tenantId } });
  if (!f) return { success: false, error: "Fulfillment not found" };

  const strategy = getFulfillmentStrategy(f.type);
  const timeline = (f.timeline as Array<{ status: string; at: string; by?: string }>) ?? [];

  let nextStatus = f.status;
  if (input.status && input.status !== f.status) {
    if (!canTransition(strategy, f.status as never, input.status as never)) {
      return { success: false, error: `Cannot transition ${statusLabel(f.status)} → ${statusLabel(input.status)}` };
    }
    nextStatus = input.status;
    timeline.push({ status: input.status, at: new Date().toISOString(), by });
  }

  const data: Record<string, unknown> = { status: nextStatus, updatedAt: new Date(), timeline: timeline as never };
  if (input.trackingNumber !== undefined) data.trackingNumber = input.trackingNumber;
  if (input.courier !== undefined) data.courier = input.courier;
  if (input.carrierNotes !== undefined) data.carrierNotes = input.carrierNotes;
  if (nextStatus === "shipped" && !f.shippedAt) data.shippedAt = new Date();
  if (nextStatus === "delivered" && !f.deliveredAt) data.deliveredAt = new Date();

  const updated = await prisma.orderFulfillment.update({ where: { id: f.id }, data });

  await emit("fulfillment.updated", tenantId, f.id, { status: nextStatus });
  if (nextStatus === "shipped") await emit("shipment.created", tenantId, f.id, { trackingNumber: input.trackingNumber ?? null, courier: input.courier ?? null });
  if (nextStatus === "delivered") await emit("shipment.delivered", tenantId, f.id, {});
  if (nextStatus === "confirmed") await emit("booking.confirmed", tenantId, f.id, {});
  if (nextStatus === "completed" && f.type === "service") await emit("service.completed", tenantId, f.id, {});

  await logAction(tenantId, "fulfillment:updated", { fulfillmentId: f.id, orderId: f.orderId, status: nextStatus, by }).catch(() => {});
  return { success: true, view: serialize(updated) };
}

// ── Shipping address ─────────────────────────────────────────

export async function saveShippingAddress(orderId: string, tenantId: string, input: ShippingAddressInput): Promise<{ success: boolean; error?: string }> {
  const order = await prisma.productOrder.findFirst({ where: { id: orderId, tenantId }, select: { id: true } });
  if (!order) return { success: false, error: "Order not found" };
  await prisma.shippingAddress.upsert({
    where: { orderId },
    update: { ...input, updatedAt: new Date() },
    create: { orderId, tenantId, ...input },
  });
  return { success: true };
}

export async function getShippingAddress(orderId: string): Promise<ShippingAddressInput & { id: string } | null> {
  const a = await prisma.shippingAddress.findUnique({ where: { orderId } });
  if (!a) return null;
  return { id: a.id, name: a.name ?? undefined, phone: a.phone ?? undefined, email: a.email ?? undefined, line1: a.line1 ?? undefined, line2: a.line2 ?? undefined, city: a.city ?? undefined, state: a.state ?? undefined, pin: a.pin ?? undefined, country: a.country ?? undefined, instructions: a.instructions ?? undefined };
}

// ── Digital delivery ─────────────────────────────────────────

export async function generateDownload(tenantId: string, fulfillmentId: string, by = "creator"): Promise<{ success: boolean; url?: string; error?: string }> {
  const f = await prisma.orderFulfillment.findFirst({ where: { id: fulfillmentId, tenantId } });
  if (!f) return { success: false, error: "Fulfillment not found" };
  if (f.type !== "digital" && f.type !== "course") return { success: false, error: "Not a downloadable product" };
  if (!f.downloadUrl) return { success: false, error: "No download file configured on the product" };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_MS);
  const updated = await prisma.orderFulfillment.update({
    where: { id: f.id },
    data: { downloadToken: token, downloadExpiresAt: expiresAt, downloadCount: 0, status: "ready", timeline: [...((f.timeline as Array<{ status: string; at: string }>) ?? []), { status: "ready", at: new Date().toISOString(), by }] as never },
  });
  const url = `/api/fulfillment/download/${token}`;
  await emit("download.generated", tenantId, f.id, { expiresAt: expiresAt.toISOString() });
  await logAction(tenantId, "fulfillment:download-generated", { fulfillmentId: f.id, by }).catch(() => {});
  return { success: true, url };
}

/** Order-scoped download link for the customer portal (access verified by the caller). */
export async function generateDownloadForOrder(orderId: string, by = "customer"): Promise<{ success: boolean; url?: string; error?: string }> {
  const f = await prisma.orderFulfillment.findUnique({ where: { orderId } });
  if (!f) return { success: false, error: "No fulfillment for this order" };
  if (f.type !== "digital" && f.type !== "course") return { success: false, error: "Not a downloadable product" };
  return generateDownload(f.tenantId, f.id, by);
}

/** Validate a download token and return the target URL (or an error). */
export async function resolveDownloadToken(token: string): Promise<{ ok: boolean; url?: string; error?: string; orderId?: string; tenantId?: string }> {  const f = await prisma.orderFulfillment.findUnique({ where: { downloadToken: token } });
  if (!f) return { ok: false, error: "Invalid download link" };
  if (!f.downloadExpiresAt || f.downloadExpiresAt.getTime() < Date.now()) {
    await emit("download.expired", f.tenantId, f.id, {}).catch(() => {});
    return { ok: false, error: "This download link has expired" };
  }
  if (f.downloadCount >= f.downloadLimit) return { ok: false, error: "Download limit reached" };
  if (!f.downloadUrl) return { ok: false, error: "No file configured" };

  await prisma.orderFulfillment.update({ where: { id: f.id }, data: { downloadCount: f.downloadCount + 1 } });
  return { ok: true, url: f.downloadUrl, orderId: f.orderId, tenantId: f.tenantId };
}

// ── Lists ────────────────────────────────────────────────────

export async function listFulfillments(tenantId: string, params: { status?: string; search?: string; limit?: number; offset?: number } = {}): Promise<{ items: Array<FulfillmentView & { productName: string; customer: string | null; amount: number }>; total: number }> {
  const where: Record<string, unknown> = { tenantId };
  if (params.status) where.status = params.status;

  const [rows, total] = await Promise.all([
    prisma.orderFulfillment.findMany({
      where,
      include: { order: { select: { fanEmail: true, amount: true, product: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    }),
    prisma.orderFulfillment.count({ where }),
  ]);

  let items = rows.map((f) => ({ ...serialize(f), productName: f.order.product.name, customer: f.order.fanEmail, amount: f.order.amount }));
  if (params.search) {
    const q = params.search.toLowerCase();
    items = items.filter((i) => i.productName.toLowerCase().includes(q) || (i.customer ?? "").toLowerCase().includes(q));
  }
  return { items, total };
}

export async function getFulfillmentByOrder(orderId: string): Promise<FulfillmentView | null> {
  const f = await prisma.orderFulfillment.findUnique({ where: { orderId } });
  return f ? serialize(f) : null;
}

/** Phase 9 — platform fulfillment health / order stats. */
export async function getFulfillmentHealth(): Promise<{
  totalOrders: number;
  pending: number;
  shipped: number;
  delivered: number;
  ready: number;
  cancelled: number;
  failed: number;
  downloadFailures: number;
  volume: number;
}> {
  const [totalOrders, pending, shipped, delivered, ready, cancelled, failed, downloadFailures, volumeAgg] = await Promise.all([
    prisma.productOrder.count(),
    prisma.orderFulfillment.count({ where: { status: { in: ["pending", "preparing", "packed"] } } }),
    prisma.orderFulfillment.count({ where: { status: "shipped" } }),
    prisma.orderFulfillment.count({ where: { status: "delivered" } }),
    prisma.orderFulfillment.count({ where: { status: "ready" } }),
    prisma.orderFulfillment.count({ where: { status: "cancelled" } }),
    prisma.orderFulfillment.count({ where: { status: "failed" } }),
    prisma.orderFulfillment.count({ where: { type: "digital", downloadUrl: null, status: { notIn: ["cancelled", "completed"] } } }),
    prisma.productOrder.aggregate({ _sum: { amount: true } }),
  ]);
  return { totalOrders, pending, shipped, delivered, ready, cancelled, failed, downloadFailures, volume: volumeAgg._sum.amount ?? 0 };
}
