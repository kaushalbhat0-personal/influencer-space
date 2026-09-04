import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building, Globe, Activity, AlertTriangle, Clock } from "lucide-react";
import { assignmentService } from "@/lib/client/assignment";
import { clientService } from "@/lib/client/service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  const userId = session?.user?.id;

  if (!agencyId || !userId) {
    return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;
  }

  const memberAssignments = await assignmentService.getMemberAssignments(agencyId, userId);
  const clientIds = memberAssignments?.clients.map((c) => c.tenantId) ?? [];
  const tenantNames = new Map(memberAssignments?.clients.map((c) => [c.tenantId, c.businessName]) ?? []);

  const allClients = await clientService.listByAgency(agencyId);
  const myClients = allClients.filter((c) => clientIds.includes(c.tenantId));

  const publishedCount = myClients.filter((c) => c.publishState === "live").length;
  const needsAttention = myClients.filter((c) => c.healthScore != null && c.healthScore < 50).length;

  const recentActivity = await clientService.getRecentActivity(agencyId, 10);
  const myActivity = recentActivity.filter((ev) => clientIds.includes(ev.tenantId));

  return (
    <ContentContainer>
      <PageHeader title="My Work" description="Your assigned clients and recent activity." />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="My Clients" value={myClients.length} icon={Building} />
        <MetricCard label="Published" value={publishedCount} icon={Globe} />
        <MetricCard label="Needs Attention" value={needsAttention} icon={AlertTriangle} />
        <MetricCard label="Recent Activity" value={myActivity.length} icon={Clock} />
      </div>

      {myClients.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No assigned clients"
          description="You haven't been assigned to any clients yet. Contact your agency owner."
        />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* My Clients */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">My Clients</h2>
            <div className="space-y-2">
              {myClients.map((c) => (
                <Link
                  key={c.tenantId}
                  href={`/agency/clients/${c.tenantId}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-4 hover:border-white/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{c.businessName}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {c.publishState === "live" ? "Published" : "Draft"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.healthScore != null && (
                      <span className={`text-xs font-medium ${
                        c.healthScore >= 80 ? "text-emerald-400" : c.healthScore >= 50 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {c.healthScore}%
                      </span>
                    )}
                    <span className={`h-2 w-2 rounded-full ${
                      c.publishState === "live" ? "bg-emerald-500" : "bg-zinc-600"
                    }`} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* My Activity */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 divide-y divide-white/5">
              {myActivity.length > 0 ? myActivity.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="h-2 w-2 rounded-full bg-[var(--brand-primary)] mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-primary)] truncate">{ev.action.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {tenantNames.get(ev.tenantId) ?? "Unknown"}
                      <span className="ml-2">{new Date(ev.timestamp).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
              )) : (
                <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No recent activity</div>
              )}
            </div>
          </div>
        </div>
      )}
    </ContentContainer>
  );
}
