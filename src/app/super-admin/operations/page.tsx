import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { getOperationsDashboard, getJobStatus, exportDiagnostics } from "@/actions/operations.actions";
import { OperationsClient } from "./_components/operations-client";
import { Activity, Timer, Users, Building2, CreditCard, TrendingUp, Database, Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") return <p className="text-red-400 p-8">Unauthorized</p>;

  const [dashboard, jobs, diagnostics] = await Promise.all([
    getOperationsDashboard().catch(() => null),
    getJobStatus().catch(() => []),
    exportDiagnostics().catch(() => null),
  ]);

  const metrics = dashboard?.metrics;
  const health = dashboard?.health;

  return (
    <ContentContainer>
      <PageHeader title="Platform Operations" description="Monitor, diagnose, and recover platform services."
        breadcrumbs={[{ label: "Dashboard", href: "/super-admin" }, { label: "Operations" }]} />

      {/* Platform Health */}
      <PageSection>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Platform Health</h2>
        <MetricGrid>
          <MetricCard label="Status" value={health?.status ?? "unknown"} icon={Activity}
            subtext={health?.status === "ok" ? "All systems operational" : health?.status === "degraded" ? "Degraded" : "Error"} />
          <MetricCard label="Uptime" value={health ? `${Math.round((health.uptime ?? 0) / 60000)}m` : "—"} icon={Timer} />
          <MetricCard label="Database" value={health?.checks?.database?.status ?? "—"} icon={Database} />
          <MetricCard label="Events (24h)" value={metrics?.eventsLast24h ?? 0} icon={Activity} />
        </MetricGrid>
      </PageSection>

      {/* Engine Status */}
      <PageSection>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Engine Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Partner Engine", count: diagnostics?.cacheSizes?.partners ?? 0, unit: "partners", status: diagnostics?.engineStatus ?? "unknown" },
            { label: "Commission Engine", count: diagnostics?.cacheSizes?.commissionEntries ?? 0, unit: "entries", status: diagnostics?.engineStatus ?? "unknown" },
            { label: "Payout Engine", count: diagnostics?.cacheSizes?.payoutBatches ?? 0, unit: "batches", status: diagnostics?.engineStatus ?? "unknown" },
            { label: "Event Bus", count: diagnostics?.cacheSizes?.eventHistory ?? 0, unit: "events", status: "healthy" },
            { label: "Idempotency", count: diagnostics?.idempotency?.keysTracked ?? 0, unit: "keys", status: "healthy" },
          ].map((engine) => (
            <div key={engine.label} className="admin-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300">{engine.label}</p>
                <p className="text-xs text-zinc-600">{engine.count} {engine.unit}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                engine.status === "healthy" ? "bg-emerald-500/20 text-emerald-400" :
                engine.status === "degraded" ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
              }`}>{engine.status}</span>
            </div>
          ))}
        </div>
      </PageSection>

      {/* Platform Metrics */}
      <PageSection>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Platform Metrics</h2>
        <MetricGrid>
          <MetricCard label="Total Tenants" value={metrics?.totalTenants ?? 0} icon={Building2} />
          <MetricCard label="Total Users" value={metrics?.totalUsers ?? 0} icon={Users} />
          <MetricCard label="Active Subscriptions" value={metrics?.activeSubscriptions ?? 0} icon={CreditCard} />
          <MetricCard label="MRR" value={`₹${((metrics?.mrr ?? 0)).toLocaleString("en-IN")}`} icon={TrendingUp} />
          <MetricCard label="ARR" value={`₹${((metrics?.arr ?? 0)).toLocaleString("en-IN")}`} icon={TrendingUp} />
          <MetricCard label="Total Revenue" value={`₹${((metrics?.totalRevenue ?? 0)).toLocaleString("en-IN")}`} icon={Package} />
        </MetricGrid>
      </PageSection>

      {/* Job Runner */}
      <PageSection>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Scheduled Jobs</h2>
        <div className="admin-card overflow-hidden">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Last Run</th>
                <th>Interval</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td><span className="text-white text-sm">{job.name}</span></td>
                  <td>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      job.running ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"
                    }`}>{job.running ? "Running" : "Idle"}</span>
                  </td>
                  <td><span className="text-xs text-zinc-500">{job.lastRunAt ? new Date(job.lastRunAt).toLocaleString("en-IN") : "Never"}</span></td>
                  <td><span className="text-xs text-zinc-500">{job.intervalMs >= 86400000 ? "Daily" : job.intervalMs >= 3600000 ? "Hourly" : `${job.intervalMs}ms`}</span></td>
                  <td>
                    <form action={async () => { "use server"; /* handled by client */ }}>
                      <button className="text-xs text-s8ul-cyan hover:underline">Run Now</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      {/* Recovery Actions */}
      <PageSection>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recovery Actions</h2>
        <OperationsClient />
      </PageSection>

      {/* Diagnostics */}
      {diagnostics && (
        <PageSection>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Diagnostics</h2>
          <div className="admin-card p-4">
            <details>
              <summary className="text-sm text-s8ul-cyan cursor-pointer hover:underline">View Full Diagnostics JSON</summary>
              <pre className="mt-3 text-xs text-zinc-400 overflow-auto max-h-96 whitespace-pre-wrap font-mono">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          </div>
        </PageSection>
      )}
    </ContentContainer>
  );
}
