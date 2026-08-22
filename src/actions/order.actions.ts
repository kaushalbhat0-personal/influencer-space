"use server";
import type { OrderRow } from "./order.types";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCreatorOrSuperAdminSession } from "@/lib/auth/role-guards";
import { getShippingAddress } from "@/modules/fulfillment";

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

// ── RCCF-72.18D.5.2-A — canonical server-paginated creator orders ──
export interface CreatorOrdersPage {
  ok: boolean;
  items?: OrderRow[];
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
}

const ORDERS_PAGE_DEFAULT_SIZE = 25;
const ORDERS_PAGE_MAX_SIZE = 100;

/**
 * Server-side paginated order list for the creator dashboard. Tenant is always
 * derived from the session (never client input). The product relation is loaded
 * in the same query (no N+1); count runs in parallel so `total` is truthful.
 * Replaces the legacy `take: 200` cap that silently hid older orders.
 */
export async function getOrdersPage(opts: { page?: number; pageSize?: number } = {}): Promise<CreatorOrdersPage> {
  let tenantId: string;
  try {
    tenantId = await requireTenant();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const pageSize = Math.min(Math.max(Math.floor(opts.pageSize ?? ORDERS_PAGE_DEFAULT_SIZE), 1), ORDERS_PAGE_MAX_SIZE);
  const page = Math.max(Math.floor(opts.page ?? 1), 1);

  const where = { tenantId };
  const [rows, total] = await Promise.all([
    prisma.productOrder.findMany({
      where,
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productOrder.count({ where }),
  ]);

  return {
    ok: true,
    items: rows.map(toOrderRow),
    total,
    page,
    pageSize,
  };
}

function toOrderRow(o: {
  id: string;
  amount: number;
  status: string;
  fanEmail: string | null;
  razorpayOrderId: string;
  createdAt: Date;
  product?: { name: string } | null;
}): OrderRow {
  return {
    id: o.id,
    productName: o.product?.name ?? "Unknown",
    amount: o.amount,
    status: o.status,
    fanEmail: o.fanEmail,
    razorpayOrderId: o.razorpayOrderId,
    createdAt: o.createdAt.toISOString(),
  };
}

/**
 * Legacy shape preserved for the existing /admin/orders consumer until the
 * Phase B table rewires to getOrdersPage. Returns the first page at the
 * previous effective cap so behavior (including metrics over ≤200 recent
 * rows) is unchanged while the scan itself is now bounded through the
 * canonical paginated path.
 */
export async function fetchOrders(_clientTenantId: string): Promise<OrderRow[]> {
  // VALIDATION-01 V-036: always use the session tenant, never a client-supplied id.
  await requireTenant();
  const result = await getOrdersPage({ page: 1, pageSize: 200 });
  return result.items ?? [];
}

// ── RCCF-72.18D.5.2-A — canonical single-order truth projection ──

export interface CreatorOrderFulfillmentView {
  id: string;
  type: string;
  status: string;
  trackingNumber: string | null;
  courier: string | null;
  carrierNotes: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  timeline: Array<{ status: string; at: string; by?: string }>;
}

export interface CreatorOrderDetailView {
  id: string;
  /** Stored order amount in rupees (the checkout currency unit). */
  amount: number;
  /** Stored captured amount in minor units (paise) — refund ceiling basis. */
  originalCapturedPaise: number;
  status: string;
  commerceMode: string;
  productName: string;
  productType: string;
  customerEmail: string | null;
  createdAt: string;
  /** Safe provider references (non-secret identifiers only). */
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  refund: {
    status: string;
    /** Cumulative ACTUAL refunded paise (D.5.1 ledger semantics). */
    refundedPaise: number;
    remainingRefundablePaise: number;
    providerRefundId: string | null;
    refundedAt: string | null;
    /**
     * RCCF-72.18D.5.2-D — server-derived creator-direct refund eligibility.
     * Computed from scalars already loaded on this query (commerceStrategy,
     * paymentAccountId presence, captured payment, order/refund status) so the
     * drawer renders the action ONLY when the existing D.3 contract could
     * accept it. No secret or identifier is exposed; D.3/D.4 remain fully
     * authoritative and re-validate every request.
     */
    eligible: boolean;
  };
  fulfillment: CreatorOrderFulfillmentView | null;
  /** Present ONLY for physical products (fulfillment requires shipping). */
  shippingAddress: Awaited<ReturnType<typeof getShippingAddress>> | null;
}

export type CreatorOrderDetailResult =
  | { ok: true; order: CreatorOrderDetailView }
  | { ok: false; error: string; code?: string };

/**
 * Canonical per-order truth projection for the future order drawer. Lazily
 * loads ONE order (≤2 queries: order+product+fulfillment, plus the shipping
 * address only for physical products).
 *
 * Authorization (RCCF-72.18D.5.2-A matrix):
 *   ADMIN            → own-tenant orders only
 *   SUPER_ADMIN      → intentional cross-tenant access (same semantics as
 *                      the D.3/D.4 refund actions)
 *   agency/support/view-only/anonymous → denied
 *
 * Credential safety: no PaymentAccount data, no decrypted provider secrets,
 * no encryption material is queried or returned — provider order/payment IDs
 * are non-secret references already shown in the existing table.
 */
export async function getCreatorOrderDetail(orderId: string): Promise<CreatorOrderDetailResult> {
  const ctx = await requireCreatorOrSuperAdminSession();
  if (!ctx) return { ok: false, error: "Unauthorized", code: "UNAUTHORIZED" };

  const order = await prisma.productOrder.findFirst({
    where: ctx.isSuper ? { id: orderId } : { id: orderId, tenantId: ctx.tenantId },
    include: {
      product: { select: { name: true, type: true, commerceMode: true } },
      fulfillment: true,
    },
  });
  if (!order) return { ok: false, error: "Order not found", code: "NOT_FOUND" };

  // Shipping address is exposed only when the product actually ships.
  // It remains accessible after delivery or refund — fulfilment truth is not
  // retroactively hidden, but it is scoped to physical orders exclusively.
  const isPhysical = order.fulfillment?.type === "physical" || order.product.type === "physical";
  const shippingAddress = isPhysical ? await getShippingAddress(order.id) : null;

  const originalCapturedPaise = Math.round(order.amount * 100);
  const refundedPaise = order.refundAmount ?? 0;
  const remainingRefundablePaise = Math.max(0, originalCapturedPaise - refundedPaise);

  // RCCF-72.18D.5.2-D — creator-direct refund eligibility (render hint only).
  // Mirrors the D.3 preconditions exactly; the server actions re-validate all
  // of it authoritatively on every call.
  const refundEligible =
    order.commerceStrategy === "DIRECT_CREATOR" &&
    !!order.paymentAccountId &&
    order.status === "COMPLETED" &&
    !!order.razorpayPaymentId &&
    ["NONE", "PARTIAL", "FAILED"].includes(order.refundStatus) &&
    remainingRefundablePaise > 0;

  return {
    ok: true,
    order: {
      id: order.id,
      amount: order.amount,
      originalCapturedPaise,
      status: order.status,
      commerceMode: order.product.commerceMode,
      productName: order.product.name,
      productType: order.product.type,
      customerEmail: order.fanEmail,
      createdAt: order.createdAt.toISOString(),
      razorpayOrderId: order.razorpayOrderId ?? null,
      razorpayPaymentId: order.razorpayPaymentId ?? null,
      refund: {
        status: order.refundStatus,
        refundedPaise,
        remainingRefundablePaise,
        providerRefundId: order.refundId ?? null,
        refundedAt: order.refundedAt ? order.refundedAt.toISOString() : null,
        eligible: refundEligible,
      },
      fulfillment: order.fulfillment
        ? {
            id: order.fulfillment.id,
            type: order.fulfillment.type,
            status: order.fulfillment.status,
            trackingNumber: order.fulfillment.trackingNumber,
            courier: order.fulfillment.courier,
            carrierNotes: order.fulfillment.carrierNotes,
            shippedAt: order.fulfillment.shippedAt ? order.fulfillment.shippedAt.toISOString() : null,
            deliveredAt: order.fulfillment.deliveredAt ? order.fulfillment.deliveredAt.toISOString() : null,
            timeline: (order.fulfillment.timeline as Array<{ status: string; at: string; by?: string }>) ?? [],
          }
        : null,
      shippingAddress,
    },
  };
}

// ── RCCF-72.18D.5.2-A — bounded customer aggregation (S-8/O-6 fix) ──

export async function fetchCustomers(_clientTenantId: string) {
  // VALIDATION-01 V-036: always use the session tenant.
  const tenantId = await requireTenant();

  // groupBy replaces the former unbounded findMany + JS aggregation with a
  // single database aggregation. Semantics preserved exactly: every order
  // carrying a buyer email contributes its amount regardless of status, the
  // count is per email, and lastOrder is the most recent order date.
  const groups = await prisma.productOrder.groupBy({
    by: ["fanEmail"],
    where: { tenantId, fanEmail: { not: null } },
    _sum: { amount: true },
    _count: { _all: true },
    _max: { createdAt: true },
  });

  return groups
    .map((g) => ({
      email: g.fanEmail!,
      totalSpent: g._sum.amount ?? 0,
      orderCount: g._count._all,
      lastOrder: (g._max.createdAt ?? new Date(0)).toISOString(),
    }))
    .sort((a, b) => (a.lastOrder < b.lastOrder ? 1 : a.lastOrder > b.lastOrder ? -1 : 0));
}

// ── RCCF-72.18D.5.2-A — bounded analytics (S-8/O-6 fix) ──

export async function fetchAnalytics(_clientTenantId: string) {
  // VALIDATION-01 V-036: always use the session tenant.
  const tenantId = await requireTenant();

  // The former implementation scanned every order twice (findMany + filter)
  // to derive totals. Two indexed COUNTs are exactly equivalent now that the
  // dead "PAID" vocabulary is gone: completedOrders === COMPLETED count.
  const [totalOrders, completedOrders, products, totalRevenue] = await Promise.all([
    prisma.productOrder.count({ where: { tenantId } }),
    prisma.productOrder.count({ where: { tenantId, status: "COMPLETED" } }),
    prisma.product.findMany({
      where: { tenantId },
      select: { name: true, isActive: true },
    }),
    prisma.productOrder.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    }),
  ]);

  const revenue = totalRevenue._sum.amount ?? 0;

  return {
    totalOrders,
    completedOrders,
    totalRevenue: revenue,
    activeProducts: products.filter((p) => p.isActive).length,
    topProducts: products.slice(0, 5).map((p) => p.name),
  };
}
