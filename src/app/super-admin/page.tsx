import { getPlatformStats, getAllTenants } from "@/services/super-admin.service";
import { SuperAdminDashboard } from "@/components/admin/SuperAdminDashboard";
import { TenantLedger } from "./_components/tenant-ledger";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm transition-all hover:border-white/10">
      <div className="flex items-center gap-3">
        <div className={`inline-flex rounded-xl p-3 ${accent}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default async function SuperAdminPage() {
  const [stats, tenants] = await Promise.all([
    getPlatformStats(),
    getAllTenants(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Platform Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Monitor platform health, manage creators, and configure domains.
      </p>

      {/* ─── Stat Cards ─── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Creators"
          value={stats.totalTenants}
          accent="bg-s8ul-cyan/10 text-s8ul-cyan"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
        />
        <StatCard
          label="Products Across Platform"
          value={stats.totalProducts}
          accent="bg-purple-500/20 text-purple-400"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          label="Pro Subscriptions"
          value={stats.activeProSubscriptions}
          accent="bg-amber-500/20 text-amber-400"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ─── Provisioning Card ─── */}
      <div className="mt-8">
        <SuperAdminDashboard tenants={tenants} />
      </div>

      {/* ─── Tenant Ledger ─── */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">
          All Tenants <span className="text-zinc-500">({tenants.length})</span>
        </h2>
        <TenantLedger tenants={tenants} />
      </div>
    </div>
  );
}
