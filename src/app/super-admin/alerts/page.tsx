import { alertEvaluator } from "@/lib/observability/alert-evaluator";
import { getRunbookForAlert } from "@/lib/observability/runbooks";
import { AlertSeverity } from "@/lib/observability/alert-rules";
import Link from "next/link";

export const dynamic = "force-dynamic";

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[severity] || colors.warning}`}>
      {severity === AlertSeverity.Critical ? "Critical" : "Warning"}
    </span>
  );
}

function StatusIndicator({ triggered }: { triggered: boolean }) {
  if (triggered) {
    return <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />;
  }
  return <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />;
}

export default async function AlertsPage() {
  const report = await alertEvaluator.evaluateAllRules();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Alert Center</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Evaluate platform rules against live metrics. Updated on every page load.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {report.criticalCount} critical, {report.warningCount} warning
          </span>
          <span className="text-xs text-zinc-600">
            {new Date(report.evaluatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {report.evaluations.map((evalItem) => {
          const runbook = getRunbookForAlert(evalItem.rule.name);
          return (
            <div
              key={evalItem.rule.name}
              className={`rounded-xl border p-4 ${
                evalItem.triggered
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-white/5 bg-zinc-900/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-1">
                    <StatusIndicator triggered={evalItem.triggered} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-white">{evalItem.rule.name.replace(/_/g, " ")}</h3>
                      <SeverityBadge severity={evalItem.severity} />
                      {evalItem.triggered && (
                        <span className="text-xs text-red-400 font-medium">Triggered</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{evalItem.rule.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-zinc-600">
                      <span>Threshold: {formatThreshold(evalItem.rule.threshold, evalItem.rule.name)}</span>
                      <span>Current: {formatThreshold(evalItem.currentValue, evalItem.rule.name)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {runbook && (
                    <Link
                      href={`/super-admin/runbooks/${runbook.id}`}
                      className="text-xs text-s8ul-cyan hover:underline"
                    >
                      Runbook →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {report.criticalCount === 0 && report.warningCount === 0 && (
        <div className="mt-8 text-center py-12">
          <p className="text-lg font-medium text-emerald-400">All clear</p>
          <p className="mt-1 text-sm text-zinc-500">No rules triggered in the latest evaluation.</p>
        </div>
      )}
    </div>
  );
}

function formatThreshold(value: number, ruleName: string): string {
  if (ruleName.includes("duration") || ruleName.includes("latency")) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  if (ruleName.includes("rate")) {
    return `${(value * 100).toFixed(0)}%`;
  }
  return String(value);
}
