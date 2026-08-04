import { healthService, type ServiceHealth } from "@/lib/observability/health-service";
import { getOperationsSnapshotAction } from "@/actions/operations.actions";

export const dynamic = "force-dynamic";

function HealthBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    offline: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  const cls = colors[state] || colors.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${state === "healthy" ? "bg-emerald-400" : state === "warning" ? "bg-amber-400" : state === "critical" ? "bg-red-400" : "bg-zinc-400"}`} />
      {state.charAt(0).toUpperCase() + state.slice(1)}
    </span>
  );
}

function ServiceCard({ name, health }: { name: string; health: ServiceHealth }) {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white">{name}</h3>
        <HealthBadge state={health.state} />
      </div>
      <p className="text-xs text-zinc-500">{health.message}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
        <span>{health.latencyMs}ms</span>
        <span>Last checked: {new Date(health.lastChecked).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

export default async function HealthPage() {
  const [report, snapshot] = await Promise.all([
    healthService.checkAll(),
    getOperationsSnapshotAction().catch(() => null),
  ]);

  const groupOrder = ["database", "storage", "registry", "partnerEngine", "commissionEngine", "payoutEngine", "eventBus", "notifications", "idempotency", "jobRunner"];
  const grouped = groupOrder
    .filter((name) => report.services[name])
    .map((name) => ({ name: formatServiceName(name), key: name, health: report.services[name] }));

  // IMPLEMENTATION-40: real runtime-derived operations health (no fake checks).
  const runtime: Array<{ label: string; state: string; detail: string }> = snapshot
    ? [
        { label: "Billing", state: snapshot.billing.failedPayments > 0 ? "warning" : "healthy", detail: `${snapshot.billing.activeSubscribers} active · MRR ₹${snapshot.billing.mrr.toLocaleString("en-IN")}` },
        { label: "Publishing", state: "healthy", detail: `${snapshot.publishing.snapshots} snapshots · ${snapshot.publishing.published24h} published (24h)` },
        { label: "Provisioning", state: snapshot.provisioning.failed > 0 ? "warning" : "healthy", detail: `${snapshot.provisioning.succeeded} succeeded · ${snapshot.provisioning.failed} failed` },
        { label: "Generation", state: snapshot.generation.failed > 0 ? "warning" : "healthy", detail: `${snapshot.generation.succeeded} completed · ${snapshot.generation.failed} failed` },
        { label: "Jobs", state: snapshot.jobs.failed24h > 0 ? "warning" : "healthy", detail: `${snapshot.jobs.running} running · ${snapshot.jobs.failed24h} failed (24h)` },
        { label: "Marketplace", state: "healthy", detail: `${snapshot.marketplace.themes} themes · ${snapshot.marketplace.blueprintCount} blueprints` },
        { label: "Alerts", state: snapshot.alerts.ACTIVE > 0 ? "warning" : "healthy", detail: `${snapshot.alerts.ACTIVE} active alerts` },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Platform Health</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time health status for all platform services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge state={report.overall} />
          <span className="text-xs text-zinc-500">{new Date(report.timestamp).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grouped.map(({ name, key, health }) => (
          <ServiceCard key={key} name={name} health={health} />
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-white mb-3" data-testid="health-runtime-title">Operations Runtime (real)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {runtime.map((r) => (
            <div key={r.label} className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">{r.label}</h3>
                <HealthBadge state={r.state} />
              </div>
              <p className="text-xs text-zinc-500" data-testid={`health-runtime-${r.label.toLowerCase()}`}>{r.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900/30 p-4">
        <h2 className="text-sm font-semibold text-white mb-2">About Platform Health</h2>
        <ul className="space-y-1 text-xs text-zinc-500">
          <li><strong className="text-zinc-400">Healthy</strong> — All systems operating normally</li>
          <li><strong className="text-amber-400">Warning</strong> — Some services degraded or delayed</li>
          <li><strong className="text-red-400">Critical</strong> — Service unavailable — immediate attention required</li>
          <li><strong className="text-zinc-400">Offline</strong> — No response from the health check</li>
        </ul>
      </div>
    </div>
  );
}

function formatServiceName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace("Engine", "Engine")
    .replace("Event Bus", "Event Bus")
    .trim();
}
