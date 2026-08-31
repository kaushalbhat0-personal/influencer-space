// ── Customer Success — Timeline ─────────────────────────────
// RCCF-EPIC-09 Phase 5. Chronological, read-only events per creator.

import { prisma } from "@/lib/prisma";
import type { TimelineEvent } from "../domain/types";

export async function getCustomerTimeline(tenantId: string, limit = 30): Promise<TimelineEvent[]> {
  const [audit, orders, publishes, products, account] = await Promise.all([
    prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, action: true, createdAt: true } }),
    prisma.productOrder.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, status: true, createdAt: true } }),
    prisma.publishSnapshot.findMany({ where: { publishStatus: { website: { tenantId } } }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, version: true, createdAt: true } }),
    prisma.product.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, name: true, createdAt: true } }),
    prisma.paymentAccount.findFirst({ where: { tenantId }, select: { id: true, createdAt: true } }),
  ]);

  const events: TimelineEvent[] = [
    ...audit.map((a) => ({ id: `audit_${a.id}`, type: "activity", label: humanize(a.action), timestamp: a.createdAt.toISOString(), icon: "activity" })),
    ...orders.map((o) => ({ id: `order_${o.id}`, type: "sale", label: o.status === "COMPLETED" ? "Completed a sale" : `Order ${o.status.toLowerCase()}`, timestamp: o.createdAt.toISOString(), icon: "sale" })),
    ...publishes.map((p) => ({ id: `pub_${p.id}`, type: "publish", label: `Published version ${p.version}`, timestamp: p.createdAt.toISOString(), icon: "publish" })),
    ...products.map((p) => ({ id: `prod_${p.id}`, type: "product", label: `Added product: ${p.name}`, timestamp: p.createdAt.toISOString(), icon: "product" })),
    ...(account ? [{ id: `pay_${account.id}`, type: "payment", label: "Connected payment account", timestamp: account.createdAt.toISOString(), icon: "payment" }] : []),
  ];

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

function humanize(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
