import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { getAgencyFinancialOverview, getAgencyPayouts } from "@/actions/agency.actions";
import { TrendingUp, Wallet, Timer, CheckCircle2, RotateCcw, Users, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MonthlyEarningsChart } from "./_components/monthly-earnings-chart";

export const dynamic = "force-dynamic";

function formatRupees(amount: number): string {
  return formatCurrency(amount);
}

function fmtDate(v: string): string {
  return new Date(v).toLocaleDateString("en-IN");
}

export default async function AgencyAnalytics() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">No agency configured</p></ContentContainer>;

  const [overview, payouts] = await Promise.all([
    getAgencyFinancialOverview(agencyId).catch(() => null),
    getAgencyPayouts(agencyId).catch(() => null),
  ]);
  const o = overview?.data;
  const p = payouts?.data;

  return (
    <ContentContainer>
      <PageHeader title="Analytics" description="Your commission earnings, refunds, clients and settlements — from the canonical financial records." />

      <div className="space-y-6">
        <PageSection>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Earnings Summary</h2>
          <MetricGrid>
            <MetricCard label="Gross Commission" value={formatRupees(o?.summary.grossCommission ?? 0)} icon={TrendingUp} />
            <MetricCard label="Refund Adjustments" value={formatRupees(o?.summary.refundReversals ?? 0)} icon={RotateCcw} />
            <MetricCard label="Net Earnings" value={formatRupees(o?.summary.netCommission ?? 0)} icon={Wallet} />
            <MetricCard label="Paid" value={formatRupees(o?.summary.paid ?? 0)} icon={CheckCircle2} />
            <MetricCard label="Pending" value={formatRupees(o?.summary.pending ?? 0)} icon={Timer} />
            <MetricCard label="Clawback Due" value={formatRupees(o?.summary.clawbackDue ?? 0)} icon={RotateCcw} />
            <MetricCard label="Available" value={formatRupees(o?.summary.available ?? 0)} icon={Wallet} />
          </MetricGrid>
          <p className="mt-3 text-xs text-zinc-500">
            Net Earnings = Gross Commission − Refund Adjustments · Clawback Due = refunds of already-settled commission ·
            Available = Net Earnings − Paid − Clawback Due. Active clients: {o?.summary.activeClients ?? 0} · Upcoming renewals: {o?.summary.upcomingRenewals ?? 0}.
          </p>
        </PageSection>

        <PageSection>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Monthly Earnings</h2>
          <div className="admin-card p-5">
            <MonthlyEarningsChart data={o?.monthly ?? []} />
            <p className="mt-3 text-[10px] text-zinc-600">Last 6 months, UTC calendar months. Net = Gross − Refunds; refunds are recorded in the month the reversal occurred.</p>
          </div>
        </PageSection>

        {o && o.clients.length > 0 ? (
          <PageSection>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Earnings by Client</h2>
            <div className="admin-card overflow-hidden">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-left">Client</th>
                    <th className="text-left">Plan</th>
                    <th className="text-right">Gross</th>
                    <th className="text-right">Refunds</th>
                    <th className="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {o.clients.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <span className="text-white text-sm">{c.name}</span>
                        <span className="ml-2 text-[10px] text-zinc-500">{c.subdomain}</span>
                      </td>
                      <td><span className="text-zinc-400 text-xs font-mono">{c.planCode ?? "—"}</span></td>
                      <td className="text-right text-zinc-300">{formatRupees(c.grossCommission)}</td>
                      <td className="text-right text-red-400/90">{formatRupees(c.refundReversals)}</td>
                      <td className="text-right text-white font-medium">{formatRupees(c.netCommission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageSection>
        ) : (
          <PageSection>
            <div className="admin-card p-8 text-center">
              <Users className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No managed clients yet. Earnings appear once you onboard creators.</p>
            </div>
          </PageSection>
        )}

        {o && o.transactions.length > 0 ? (
          <PageSection>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Transactions</h2>
            <div className="admin-card overflow-hidden">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Plan</th>
                    <th className="text-right">Gross</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Commission</th>
                    <th className="text-right">Refund</th>
                    <th className="text-right">Net</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {o.transactions.slice(0, 25).map((t) => {
                    const isReversal = t.entryType === "refund_reversal";
                    const refund = isReversal ? t.partnerShare : 0;
                    const net = isReversal ? t.partnerShare : t.partnerShare + (t.refundId ? 0 : 0);
                    return (
                      <tr key={t.id}>
                        <td className="text-zinc-400 text-xs">{fmtDate(t.createdAt)}</td>
                        <td><span className="text-zinc-300 text-xs font-mono">{t.planCode}</span></td>
                        <td className="text-right text-zinc-300">{formatRupees(t.grossAmount)}</td>
                        <td className="text-right text-zinc-400 text-xs">{isReversal ? "—" : `${t.partnerPercent}%`}</td>
                        <td className="text-right text-zinc-300">{isReversal ? "—" : formatRupees(t.partnerShare)}</td>
                        <td className="text-right text-red-400/90">{isReversal ? formatRupees(refund) : "—"}</td>
                        <td className="text-right text-white font-medium">{formatRupees(net)}</td>
                        <td className="text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            t.reserved ? "bg-amber-500/15 text-amber-300" :
                            t.status === "cleared" ? "bg-emerald-500/15 text-emerald-300" :
                            t.status === "reversed" ? "bg-zinc-500/15 text-zinc-400" :
                            "bg-indigo-500/15 text-indigo-300"
                          }`}>
                            {t.reserved ? "reserved" : t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-4 py-2 text-[10px] text-zinc-600">Refund adjustments are shown as negative values; the net for each entry equals its commission less any refund adjustment.</p>
            </div>
          </PageSection>
        ) : (
          <PageSection>
            <div className="admin-card p-8 text-center">
              <Receipt className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No financial transactions yet.</p>
            </div>
          </PageSection>
        )}

        {o && o.settlements.length > 0 && (
          <PageSection>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Settlements</h2>
            <div className="admin-card overflow-hidden">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Reference</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {o.settlements.map((s) => (
                    <tr key={s.id}>
                      <td className="text-zinc-400 text-xs">{fmtDate(s.createdAt)}</td>
                      <td><span className="text-zinc-300 text-xs font-mono">{s.id.slice(0, 8)}</span></td>
                      <td className="text-right text-zinc-300">{formatRupees(s.netAmount)}</td>
                      <td className="text-right"><span className="text-xs text-zinc-400 capitalize">{s.status.toLowerCase()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageSection>
        )}

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
                <span className="text-zinc-300">{formatRupees(p?.minimumThreshold ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total Paid</span>
                <span className="text-zinc-300">{formatRupees(p?.totalPaid ?? 0)}</span>
              </div>
            </div>
          </div>

          <div className="admin-card p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Partner Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Active Clients</span>
                <span className="text-zinc-300">{o?.summary.activeClients ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Upcoming Renewals</span>
                <span className="text-zinc-300">{o?.summary.upcomingRenewals ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Commission Entries</span>
                <span className="text-zinc-300">{o?.summary.entryCount ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentContainer>
  );
}
