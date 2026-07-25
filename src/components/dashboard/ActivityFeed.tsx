import { prisma } from "@/lib/prisma";
import { createActivityEntry, activityFromAuditAction, formatAuditAction } from "@/lib/dashboard/activity";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import type { ActivityEntry } from "@/lib/dashboard/types";

export async function ActivityFeed({ tenantId }: { tenantId: string }) {
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
    activities.push(createActivityEntry(`o-${o.createdAt.getTime()}`, "order", `Order received — ₹${o.amount.toLocaleString("en-IN")}`, o.createdAt.getTime()));
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

  return (
    <DashboardWidget title="Recent Activity" empty={activities.length === 0} emptyMessage="No activity yet. Start by adding products or customizing your website.">
      <div className="divide-y divide-white/5 -mx-5 -mb-5">
        {activities.slice(0, 8).map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-5 py-3">
            <div className={`flex-shrink-0 rounded-lg ${a.iconBg} p-2`}>
              <a.icon className={`h-4 w-4 ${a.iconColor}`} aria-hidden="true" />
            </div>
            <p className="flex-1 text-sm text-zinc-300 truncate">{a.title}</p>
            <span className="text-xs text-zinc-600 shrink-0">{a.time}</span>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
