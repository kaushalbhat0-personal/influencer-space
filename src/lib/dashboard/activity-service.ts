import { prisma } from "@/lib/prisma";
import { createActivityEntry, activityFromAuditAction, formatAuditAction } from "@/lib/dashboard/activity";
import type { ActivityEntry } from "@/lib/dashboard/types";
import { formatCurrency } from "@/lib/utils";

export async function getDashboardActivity(tenantId: string): Promise<ActivityEntry[]> {
  const [products, orders, milestones, galleryCount, auditLogs] = await Promise.all([
    prisma.product.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 3, select: { name: true, createdAt: true } }),
    prisma.productOrder.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 3, select: { amount: true, createdAt: true } }),
    prisma.timelineEvent.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 3, select: { title: true, createdAt: true } }),
    prisma.galleryImage.count({ where: { tenantId } }),
    prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 5, select: { action: true, createdAt: true } }),
  ]);

  const activities: ActivityEntry[] = [];

  for (const p of products) {
    activities.push(createActivityEntry(`p-${p.createdAt.getTime()}`, "product", `Added product "${p.name}"`, p.createdAt.getTime()));
  }
  for (const o of orders) {
    activities.push(createActivityEntry(`o-${o.createdAt.getTime()}`, "order", `Order received — ${formatCurrency(o.amount)}`, o.createdAt.getTime()));
  }
  for (const m of milestones) {
    activities.push(createActivityEntry(`m-${m.createdAt.getTime()}`, "milestone", `Added milestone "${m.title}"`, m.createdAt.getTime()));
  }
  if (galleryCount > 0) {
    activities.push(createActivityEntry(`g-${tenantId}`, "gallery", `${galleryCount} gallery items`, Date.now()));
  }
  for (const log of auditLogs) {
    const entry = activityFromAuditAction(log.action);
    if (entry) {
      const timestamp = log.createdAt.getTime();
      activities.push({
        id: `a-${timestamp}`,
        type: "audit",
        title: formatAuditAction(log.action),
        time: "",
        timestamp,
        icon: entry.icon,
        iconBg: entry.bg,
        iconColor: entry.color,
      });
    }
  }

  activities.sort((a, b) => b.timestamp - a.timestamp);
  return activities;
}
