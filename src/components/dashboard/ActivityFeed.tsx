import { getDashboardActivity } from "@/lib/dashboard/activity-service";
import { DashboardWidget } from "@/components/ui/DashboardWidget";

export async function ActivityFeed({ tenantId }: { tenantId: string }) {
  const activities = await getDashboardActivity(tenantId);

  return (
    <DashboardWidget title="Recent Activity" empty={activities.length === 0} emptyMessage="No activity yet. Start by adding products or customizing your website.">
      <div className="divide-y divide-white/5 -mx-5 -mb-5">
        {activities.slice(0, 8).map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-5 py-3">
            <div className={`flex-shrink-0 rounded-lg ${a.iconBg} p-2`}>
              <a.icon className={`h-4 w-4 ${a.iconColor}`} aria-hidden="true" />
            </div>
            <p className="flex-1 text-sm text-[var(--text-primary)] truncate">{a.title}</p>
            <span className="text-xs text-[var(--text-muted)] shrink-0">{a.time}</span>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
