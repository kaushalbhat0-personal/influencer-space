import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building, Globe, Users, Activity, TrendingUp, AlertTriangle, Clock, Shield } from "lucide-react";
import { clientService } from "@/lib/client/service";
import { getAgencyClientCapacity } from "@/modules/partner/application/partner-relationship";
import { AgencyClientsTable } from "./_components/agency-clients-table";
import { AgencyRevenueSection } from "./_components/agency-revenue-section";
import { AgencySuccessSection } from "./_components/agency-success-section";
import { BRAND, CONTACT_EMAIL } from "@/lib/marketing/messaging";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgencyDashboard() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">No agency configured</p></ContentContainer>;

  const [summary, recentActivity, capacity] = await Promise.all([
    clientService.getSummary(agencyId),
    clientService.getRecentActivity(agencyId, 10),
    getAgencyClientCapacity(agencyId).catch(() => null),
  ]);

  const tenantNames = new Map(
    summary.recentClients.map((c) => [c.tenantId, c.businessName])
  );

  const capacityLabel = capacity
    ? capacity.limit === -1
      ? `${capacity.used} / Unlimited`
      : `${capacity.used} / ${capacity.limit}`
    : null;
  const capacitySubtext = capacity
    ? capacity.limit === -1
      ? "Unlimited client websites"
      : capacity.limit - capacity.used > 0
        ? `${capacity.limit - capacity.used} slots remaining`
        : "At capacity — upgrade to add more"
    : "Client website capacity";

  return (
    <ContentContainer>
      <PageHeader
        title="Agency Workspace"
        description="Build and manage client websites — health, publishing and billing in one place."
        actions={
          <Link href="/agency/generate" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90 transition-opacity">
            New Client Website
          </Link>
        }
      />

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total Clients" value={summary.totalClients} icon={Building} />
        <MetricCard label="Active Clients" value={summary.activeClients} icon={Users} />
        <MetricCard label="Published Sites" value={summary.publishedWebsites} icon={Globe} />
        <MetricCard label="Avg Health" value={summary.averageHealth > 0 ? `${summary.averageHealth}%` : "—"} icon={Activity} />
        <MetricCard label="Capacity" value={capacityLabel ?? "—"} icon={Shield} subtext={capacitySubtext} />
        <MetricCard label="Need Attention" value={summary.needingAttention} icon={AlertTriangle} />
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

        {/* Pilot feedback — agency workspace */}
        <section aria-labelledby="agency-pilot-feedback" className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 sm:p-5">
          <h2 id="agency-pilot-feedback" className="text-sm font-semibold text-amber-200">Found a bug or something difficult?</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">
            Tell us what happened at{" "}
            <a href={`mailto:${CONTACT_EMAIL}?subject=Pilot%20feedback%20—%20${BRAND.name}%20Agency`} className="font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200">
              {CONTACT_EMAIL}
            </a>
            . We&apos;re actively improving {BRAND.name} during the pilot and would love to hear what you run into — bugs, confusion, or workflow friction.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            For agencies: client creation, generation, handoff, or billing questions — just email us. · <Link href="/help#agency" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Agency Help</Link>
          </p>
        </section>

        {/* Recent Activity & Clients */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent Clients */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Clients</h2>
            <Link href="/agency/clients" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              View all →
            </Link>
          </div>

          {summary.recentClients.length === 0 ? (
            <EmptyState
              icon={Building}
              title="No client websites yet"
              description="Create your first client website — choose a business website, Google Business profile, social link, description or resume."
              action={
                <Link href="/agency/generate" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90">
                  Create Client Website
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
            <Activity className="h-4 w-4 text-[var(--text-muted)]" />
            Recent Activity
          </h2>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 divide-y divide-white/5">
            {recentActivity.length > 0 ? recentActivity.slice(0, 8).map((ev) => (
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
    </ContentContainer>
  );
}
