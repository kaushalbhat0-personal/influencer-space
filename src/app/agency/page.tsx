import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building, Globe, Users, Activity, TrendingUp, AlertTriangle, Clock, Shield } from "lucide-react";
import { clientService } from "@/lib/client/service";
import { AgencyClientsTable } from "./_components/agency-clients-table";
import { AgencyRevenueSection } from "./_components/agency-revenue-section";
import { AgencySuccessSection } from "./_components/agency-success-section";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgencyDashboard() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">No agency configured</p></ContentContainer>;

  const [summary, recentActivity] = await Promise.all([
    clientService.getSummary(agencyId),
    clientService.getRecentActivity(agencyId, 10),
  ]);

  const tenantNames = new Map(
    summary.recentClients.map((c) => [c.tenantId, c.businessName])
  );

  return (
    <ContentContainer>
      <PageHeader
        title="Agency Dashboard"
        description="Manage your clients and their websites."
        actions={
          <Link href="/agency/clients/new" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90 transition-opacity">
            + New Client
          </Link>
        }
      />

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total Clients" value={summary.totalClients} icon={Building} />
        <MetricCard label="Active Clients" value={summary.activeClients} icon={Users} />
        <MetricCard label="Published Sites" value={summary.publishedWebsites} icon={Globe} />
        <MetricCard label="Avg Health" value={summary.averageHealth > 0 ? `${summary.averageHealth}%` : "—"} icon={Activity} />
        <MetricCard label="Need Attention" value={summary.needingAttention} icon={AlertTriangle} />
        <MetricCard label="Unpublished" value={summary.unpublished} icon={Clock} />
      </div>

      {/* RCCF-IMPLEMENTATION-72: recurring subscription revenue */}
      <AgencyRevenueSection agencyId={agencyId} />

      {/* RCCF-EPIC-09: client success */}
      <AgencySuccessSection agencyId={agencyId} />

      {/* Attention Widget */}
      {summary.needingAttention > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-amber-400">Clients Needing Attention</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.recentClients
              .filter((c) => c.healthScore != null && c.healthScore < 50)
              .slice(0, 5)
              .map((c) => (
                <Link
                  key={c.tenantId}
                  href={`/agency/clients/${c.tenantId}`}
                  className="rounded bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/20 transition-colors"
                >
                  {c.businessName} ({c.healthScore}%)
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Recent Activity & Clients */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent Clients */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Clients</h2>
            <Link href="/agency/clients" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              View all →
            </Link>
          </div>

          {summary.recentClients.length === 0 ? (
            <EmptyState
              icon={Building}
              title="No clients yet"
              description="Create your first client to start managing their website."
              action={
                <Link href="/agency/clients/new" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90">
                  Create Client
                </Link>
              }
            />
          ) : (
            <AgencyClientsTable
              data={summary.recentClients.map((c) => ({
                id: c.tenantId,
                name: c.businessName,
                subdomain: null,
                products: 0,
                status: c.status,
                healthScore: c.healthScore,
                publishState: c.publishState,
              }))}
            />
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-500" />
            Recent Activity
          </h2>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 divide-y divide-white/5">
            {recentActivity.length > 0 ? recentActivity.slice(0, 8).map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className="h-2 w-2 rounded-full bg-[var(--brand-primary)] mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-300 truncate">{ev.action.replace(/_/g, " ")}</p>
                  <p className="text-[10px] text-zinc-600">
                    {tenantNames.get(ev.tenantId) ?? "Unknown"}
                    <span className="ml-2">{new Date(ev.timestamp).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
            )) : (
              <div className="px-4 py-6 text-center text-sm text-zinc-600">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </ContentContainer>
  );
}
