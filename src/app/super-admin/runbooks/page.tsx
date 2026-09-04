import { RUNBOOKS } from "@/lib/observability/runbooks";
import Link from "next/link";

export const dynamic = "force-dynamic";

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[severity] || colors.warning}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

export default function RunbooksPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white font-display">Runbooks</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Structured recovery guides for common platform incidents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RUNBOOKS.map((runbook) => (
          <Link
            key={runbook.id}
            href={`/super-admin/runbooks/${runbook.id}`}
            className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <SeverityBadge severity={runbook.severity} />
              {runbook.alertRule && (
                <span className="text-xs text-[var(--brand-primary)]">{runbook.alertRule}</span>
              )}
            </div>
            <h3 className="text-sm font-medium text-white">{runbook.title}</h3>
            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{runbook.description}</p>
            <p className="mt-3 text-xs text-zinc-600">{runbook.steps.length} steps</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
