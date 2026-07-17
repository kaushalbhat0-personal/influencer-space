import { prisma } from "@/lib/prisma";
import { getPlatformStats } from "@/services/super-admin.service";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [stats, auditCount24h, failedStatTenants] = await Promise.all([
    getPlatformStats(),
    prisma.auditLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.socialStats.groupBy({
      by: ["tenantId"],
      where: { updatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }).then((r) =>
      Promise.all(
        r.map(async (row) => {
          const t = await prisma.tenant.findUnique({
            where: { id: row.tenantId },
            select: { name: true, subdomain: true },
          });
          return { ...row, tenant: t };
        }),
      ),
    ),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">System Health</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Global metrics and anomaly detection.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Tenants" value={stats.totalTenants} />
        <Stat label="Total Products" value={stats.totalProducts} />
        <Stat label="Pro Subscriptions" value={stats.activeProSubscriptions} accent />
        <Stat label="Audit Entries (24h)" value={auditCount24h} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">
          Stale Syncs{" "}
          <span className="text-xs text-zinc-500">
            (No update in 7+ days)
          </span>
        </h2>
        {failedStatTenants.length > 0 ? (
          <div className="mt-4 space-y-2">
            {failedStatTenants.map((row) => (
              <div
                key={row.tenantId}
                className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
              >
                <span className="text-sm text-zinc-300">
                  {row.tenant?.name || row.tenantId}
                </span>
                <span className="text-xs text-amber-400">Stale</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-emerald-400">
            All tenants synced within 7 days.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
      <p className={`text-3xl font-bold ${accent ? "text-purple-400" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
