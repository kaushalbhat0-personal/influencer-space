import { revenueService } from "@/modules/billing/application/revenue-service";
import { IndianRupee, TrendingUp, Users, CreditCard, Clock, AlertTriangle, Activity, Percent } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function MetricCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4 hover:border-white/10 transition-all">
      <div className="flex items-center gap-3">
        <div className={`inline-flex rounded-lg p-2 ${accent}`}>{icon}</div>
        <div>
          <p className="text-xl font-bold text-white">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default async function RevenueManagementPage() {
  const data = await revenueService.getDashboard().catch(() => null);
  if (!data) return <div className="p-6 text-zinc-400">Failed to load revenue data.</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Revenue Management</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Platform revenue, subscriptions, commissions, and billing configuration.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-8">
        <MetricCard label="MRR" value={`₹${data.mrr.toLocaleString("en-IN")}`} accent="bg-emerald-500/10 text-emerald-400" icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="ARR" value={`₹${data.arr.toLocaleString("en-IN")}`} accent="bg-emerald-500/10 text-emerald-400" icon={<IndianRupee className="h-4 w-4" />} />
        <MetricCard label="Creator Subs" value={data.activeCreatorSubs} accent="bg-s8ul-cyan/10 text-s8ul-cyan" icon={<Users className="h-4 w-4" />} />
        <MetricCard label="Agency Subs" value={data.activeAgencySubs} accent="bg-purple-500/10 text-purple-400" icon={<Users className="h-4 w-4" />} />
        <MetricCard label="Trial Users" value={data.trialUsers} accent="bg-amber-500/10 text-amber-400" icon={<Clock className="h-4 w-4" />} />
        <MetricCard label="Monthly Revenue" value={`₹${data.monthlyRevenue.toLocaleString("en-IN")}`} accent="bg-emerald-500/10 text-emerald-400" icon={<IndianRupee className="h-4 w-4" />} />
        <MetricCard label="Commission" value={`₹${data.commissionRevenue.toLocaleString("en-IN")}`} accent="bg-violet-500/10 text-violet-400" icon={<Percent className="h-4 w-4" />} />
        <MetricCard label="Platform Take" value={`${data.platformTakeRate}%`} accent="bg-blue-500/10 text-blue-400" icon={<Activity className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Revenue Breakdown */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: "Total Invoiced", value: `₹${data.totalInvoiced.toLocaleString("en-IN")}`, color: "text-emerald-400" },
              { label: "Pending Invoices", value: data.pendingInvoices, color: "text-amber-400" },
              { label: "Failed Payments (30d)", value: data.failedPayments, color: "text-red-400" },
              { label: "Commission Revenue", value: `₹${data.commissionRevenue.toLocaleString("en-IN")}`, color: "text-violet-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-zinc-400">{item.label}</span>
                <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Management</h3>
          <div className="space-y-2">
            <Link href="/super-admin/revenue-management/commissions" className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3 hover:bg-zinc-800 transition-colors">
              <div>
                <p className="text-sm text-white">Commission Center</p>
                <p className="text-xs text-zinc-500">Platform fees, agency splits, referral rates</p>
              </div>
              <span className="text-zinc-600">→</span>
            </Link>
            <Link href="/super-admin/revenue-management/settings" className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3 hover:bg-zinc-800 transition-colors">
              <div>
                <p className="text-sm text-white">Billing Settings</p>
                <p className="text-xs text-zinc-500">Currencies, trials, invoices, refunds</p>
              </div>
              <span className="text-zinc-600">→</span>
            </Link>
            <Link href="/super-admin/revenue" className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3 hover:bg-zinc-800 transition-colors">
              <div>
                <p className="text-sm text-white">Revenue Reports</p>
                <p className="text-xs text-zinc-500">Historical revenue, plan distribution</p>
              </div>
              <span className="text-zinc-600">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
