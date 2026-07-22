import { cn } from "@/lib/utils";
import { Globe, ShoppingBag, Palette, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ActivityItem {
  id: string;
  icon: "published" | "product" | "theme" | "domain" | "order";
  title: string;
  time: string;
}

const ICONS: Record<ActivityItem["icon"], LucideIcon> = {
  published: Rocket, product: ShoppingBag, theme: Palette, domain: Globe, order: ShoppingBag,
};

const ICON_BG: Record<ActivityItem["icon"], string> = {
  published: "bg-emerald-500/10 text-emerald-400",
  product: "bg-indigo-500/10 text-indigo-400",
  theme: "bg-violet-500/10 text-violet-400",
  domain: "bg-amber-500/10 text-amber-400",
  order: "bg-emerald-500/10 text-emerald-400",
};

interface ActivityTimelineProps {
  items: ActivityItem[];
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  if (items.length === 0) return (
    <div className="admin-card p-5 text-center">
      <p className="text-sm text-zinc-500">No recent activity. Your updates will appear here.</p>
    </div>
  );

  return (
    <div className="admin-card p-5">
      <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
      <div className="space-y-0">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.id} className={cn("flex items-center gap-3 py-2.5", i < items.length - 1 && "border-b border-white/[0.04]")}>
              <div className={cn("flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center", ICON_BG[item.icon])}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm text-zinc-300 flex-1">{item.title}</span>
              <span className="text-xs text-zinc-600">{item.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
