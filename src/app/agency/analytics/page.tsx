import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { getAgencyRevenue, getAgencyPayouts, getAgencyPartnerStats } from "@/actions/agency.actions";
import { TrendingUp, Wallet, Timer, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatRupees(amount: number): string {
  return formatCurrency(amount / 100);
}

export default async function AgencyAnalytics() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">No agency configured</p></ContentContainer>;

  const [revenue, payouts, partner] = await Promise.all([
    getAgencyRevenue(agencyId).catch(() => null),
    getAgencyPayouts(agencyId).catch(() => null),
    getAgencyPartnerStats(agencyId).catch(() => null),
  ]);

  const r = revenue?.data;
  const p = payouts?.data;
  const ps = partner?.data;

  return (
    <ContentContainer>
      <PageHeader title="Analytics" description="Cross-client performance and commission metrics." />

      <div className="space-y-6">
        <PageSection>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Commission Summary</h2>
          <MetricGrid>
            <MetricCard label="Pending" value={formatRupees(r?.pendingCommission ?? 0)} icon={Timer} />
            <MetricCard label="Available" value={formatRupees(r?.availableCommission ?? 0)} icon={Wallet} />
            <MetricCard label="Paid" value={formatRupees(r?.paidCommission ?? 0)} icon={CheckCircle2} />
            <MetricCard label="Lifetime" value={formatRupees(r?.lifetimeCommission ?? 0)} icon={TrendingUp} />
          </MetricGrid>
        </PageSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="admin-card p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Payout Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Payout Eligibility</span>
                <span className={p?.eligible ? "text-emerald-400" : "text-amber-400"}>{p?.eligible ? "Eligible" : "Below threshold"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Available Balance</span>
                <span className="text-zinc-300">{formatRupees(p?.availableBalance ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Minimum Threshold</span>
                <span className="text-zinc-300">{formatRupees(p?.minimumThreshold ?? 500_00)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total Paid</span>
                <span className="text-zinc-300">{formatRupees(p?.totalPaid ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Batches</span>
                <span className="text-zinc-300">{p?.totalBatches ?? 0} ({p?.completedCount ?? 0} completed)</span>
              </div>
            </div>
          </div>

          <div className="admin-card p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Client Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Active Clients</span>
                <span className="text-zinc-300">{ps?.totalClients ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Workspace Usage</span>
                <span className="text-zinc-300">{ps?.workspaceUsage.assigned ?? 0} / {ps?.workspaceUsage.capacity ?? 10}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Team Members</span>
                <span className="text-zinc-300">{ps?.teamMembers ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Pending Invites</span>
                <span className="text-zinc-300">{ps?.pendingInvites ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {p?.recentBatches && p.recentBatches.length > 0 && (
          <div className="admin-card p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Recent Payouts</h3>
            <div className="space-y-2">
              {p.recentBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      batch.status === "completed" ? "bg-emerald-400" :
                      batch.status === "processing" ? "bg-amber-400" :
                      batch.status === "failed" ? "bg-red-400" : "bg-zinc-600"
                    }`} />
                    <span className="text-xs text-zinc-400 capitalize">{batch.status}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-300">{formatRupees(batch.netAmount)}</span>
                    <span className="text-[10px] text-zinc-600">{batch.entryCount} entries</span>
                    <span className="text-[10px] text-zinc-600">{new Date(batch.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ContentContainer>
  );
}
