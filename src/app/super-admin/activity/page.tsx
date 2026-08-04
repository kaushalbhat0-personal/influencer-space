import { prisma } from "@/lib/prisma";
import { Activity, Globe, UserPlus, CreditCard, Upload, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getUnifiedActivity } from "@/actions/operations.actions";
import { UnifiedFeed } from "./_components/unified-feed";

export const dynamic = "force-dynamic";

function getEventMeta(action: string): { icon: React.ElementType; color: string } {
  if (action.includes("provision") || action.includes("import")) return { icon: UserPlus, color: "text-s8ul-cyan" };
  if (action.includes("publish")) return { icon: Globe, color: "text-emerald-400" };
  if (action.includes("subscription") || action.includes("plan")) return { icon: CreditCard, color: "text-amber-400" };
  if (action.includes("upload") || action.includes("media") || action.includes("image")) return { icon: Upload, color: "text-pink-400" };
  if (action.includes("fail") || action.includes("error")) return { icon: AlertCircle, color: "text-red-400" };
  return { icon: Activity, color: "text-zinc-400" };
}

export default async function ActivityPage() {
  const unified = await getUnifiedActivity({ limit: 150 }).catch(() => ({ rows: [], total: 0 }));
  const [recentEvents, recentPublishes, allTenants] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, action: true, tenantId: true, createdAt: true },
    }),
    prisma.publishSnapshot.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, state: true, version: true, createdAt: true, websiteId: true },
    }),
    prisma.tenant.findMany({ select: { id: true, name: true } }),
  ]);

  const tenantMap = new Map(allTenants.map((t) => [t.id, t.name]));

  const websiteTenantIds = await prisma.website.findMany({
    where: { id: { in: recentPublishes.map((p) => p.websiteId) } },
    select: { id: true, tenantId: true },
  });
  const pubTenantMap = new Map(websiteTenantIds.map((w) => [w.id, w.tenantId]));

  const today = new Date();
  const todayStr = today.toDateString();
  const yesterdayStr = new Date(today.getTime() - 86400000).toDateString();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const todayEvents = recentEvents.filter((e) => e.createdAt.toDateString() === todayStr);
  const yesterdayEvents = recentEvents.filter((e) => e.createdAt.toDateString() === yesterdayStr);
  const thisWeekEvents = recentEvents.filter(
    (e) => e.createdAt > weekAgo &&
      e.createdAt.toDateString() !== todayStr &&
      e.createdAt.toDateString() !== yesterdayStr
  );
  const olderEvents = recentEvents.filter((e) => e.createdAt <= weekAgo);

  const uniqueCreators = new Set(recentEvents.filter((e) => e.tenantId).map((e) => e.tenantId));
  const events24hCount = recentEvents.filter((e) => e.createdAt > new Date(Date.now() - 86400000)).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Activity</h1>
        <p className="mt-1 text-sm text-zinc-400">Real-time operational timeline across all domains.</p>
      </div>

      <div className="mb-8 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Unified Activity Feed</h3>
        <p className="mb-3 text-xs text-zinc-600">Audit + billing events + generation + provisioning merged chronologically.</p>
        <UnifiedFeed initial={unified} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {[
            { label: "Today", events: todayEvents.slice(0, 20) },
            { label: "Yesterday", events: yesterdayEvents.slice(0, 20) },
            { label: "Last 7 Days", events: thisWeekEvents.slice(0, 20) },
            { label: "Earlier", events: olderEvents.slice(0, 30) },
          ].map((group) =>
            group.events.length > 0 ? (
              <div key={group.label}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">{group.label}</h3>
                <div className="rounded-xl border border-white/10 bg-zinc-900/50 divide-y divide-white/5">
                  {group.events.map((ev) => {
                    const { icon: Icon, color } = getEventMeta(ev.action);
                    const tenantName = ev.tenantId ? tenantMap.get(ev.tenantId) : null;
                    return (
                      <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-300 truncate">{ev.action.replace(/_/g, " ")}</p>
                          {tenantName && (
                            <Link href={`/super-admin/tenants/${ev.tenantId}`} className="text-xs text-s8ul-cyan hover:underline">
                              {tenantName}
                            </Link>
                          )}
                        </div>
                        <span className="text-xs text-zinc-600 shrink-0">{ev.createdAt.toLocaleTimeString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Recent Publishes</h3>
            <div className="space-y-2">
              {recentPublishes.map((p) => {
                const tenantId = pubTenantMap.get(p.websiteId);
                const name = tenantId ? tenantMap.get(tenantId) : null;
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 truncate">{name ?? "Unknown"}</span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className={`rounded px-1.5 py-0.5 ${
                        p.state === "live" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                      }`}>{p.state}</span>
                      <span className="text-zinc-600">v{p.version}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Activity Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Events (24h)</span>
                <span className="text-white font-medium">{events24hCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Unique creators</span>
                <span className="text-white font-medium">{uniqueCreators.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Recent publishes</span>
                <span className="text-white font-medium">{recentPublishes.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Related</h3>
            <div className="space-y-1">
              <Link href="/super-admin/events" className="block text-sm text-zinc-400 hover:text-white transition-colors">Event Explorer →</Link>
              <Link href="/super-admin/audit" className="block text-sm text-zinc-400 hover:text-white transition-colors">Audit Log →</Link>
              <Link href="/super-admin/operations" className="block text-sm text-zinc-400 hover:text-white transition-colors">Operations →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
