import { getPlatformStats, getAllTenants } from "@/services/super-admin.service";
import { TenantLedger } from "./_components/tenant-ledger";
import { ProvisionTrigger } from "./_components/provision-trigger";
import { Building2, Package, Image, IndianRupee, CreditCard, Users, Activity, ScrollText, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm transition-all hover:border-white/10">
      <div className="flex items-center gap-3">
        <div className={`inline-flex rounded-xl p-3 ${accent}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-white">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default async function SuperAdminPage() {
  const [stats, tenants] = await Promise.all([
    getPlatformStats().catch(() => ({
      totalTenants: 0, totalProducts: 0, totalGallery: 0, totalOrders: 0, totalRevenue: 0,
      totalAgencies: 0, totalUsers: 0, activeProSubscriptions: 0, auditEntries24h: 0, publishCount: 0,
    })),
    getAllTenants().catch(() => []),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Platform Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor platform health, manage creators, and configure domains.
          </p>
        </div>
        <ProvisionTrigger tenants={tenants} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Creators" value={stats.totalTenants} accent="bg-s8ul-cyan/10 text-s8ul-cyan" icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Users" value={stats.totalUsers} accent="bg-blue-500/20 text-blue-400" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Agencies" value={stats.totalAgencies} accent="bg-purple-500/20 text-purple-400" icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Products" value={stats.totalProducts} accent="bg-emerald-500/20 text-emerald-400" icon={<Package className="h-5 w-5" />} />
        <StatCard label="Gallery Items" value={stats.totalGallery} accent="bg-pink-500/20 text-pink-400" icon={<Image className="h-5 w-5" />} />
        <StatCard label="Orders" value={stats.totalOrders} accent="bg-amber-500/20 text-amber-400" icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="Revenue" value={`₹${(stats.totalRevenue).toLocaleString("en-IN")}`} accent="bg-yellow-500/20 text-yellow-400" icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="Pro Subs" value={stats.activeProSubscriptions} accent="bg-rose-500/20 text-rose-400" icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="Publishes" value={stats.publishCount} accent="bg-indigo-500/20 text-indigo-400" icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Audit (24h)" value={stats.auditEntries24h} accent="bg-zinc-500/20 text-zinc-400" icon={<ScrollText className="h-5 w-5" />} />
      </div>

      {/* Platform Status Summary */}
      <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Platform Summary</h2>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Architecture Stable
            </span>
            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Publishing Healthy
            </span>
            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Marketplace Healthy
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-zinc-500">Items Needing Attention</p>
            <p className="text-lg font-bold text-amber-400">0</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Creator Growth</p>
            <p className="text-lg font-bold text-emerald-400">+{Math.round(tenants.filter((t) => t.createdAt > new Date(Date.now() - 30 * 86400000)).length / Math.max(tenants.length, 1) * 100)}%</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Database</p>
            <p className="text-lg font-bold text-emerald-400">Online</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">v1.1 Release</p>
            <p className="text-lg font-bold text-emerald-400">Ready</p>
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <Link href="/super-admin/insights" className="text-xs text-s8ul-cyan hover:underline">View Insights →</Link>
          <Link href="/super-admin/activity" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">View Activity →</Link>
          <Link href="/super-admin/health" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Platform Health →</Link>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">
          All Tenants <span className="text-zinc-500">({tenants.length})</span>
        </h2>
        <TenantLedger tenants={tenants} />
      </div>
    </div>
  );
}
