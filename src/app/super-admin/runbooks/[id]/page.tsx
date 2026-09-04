import { getRunbook, RUNBOOKS } from "@/lib/observability/runbooks";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RunbookPage({ params }: { params: { id: string } }) {
  const runbook = getRunbook(params.id);
  if (!runbook) notFound();

  const severityColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/super-admin/runbooks" className="text-xs text-[var(--brand-primary)] hover:underline mb-2 inline-block">
          ← Back to Runbooks
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-white font-display">{runbook.title}</h1>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityColors[runbook.severity]}`}>
            {runbook.severity.charAt(0).toUpperCase() + runbook.severity.slice(1)}
          </span>
        </div>
        <p className="text-sm text-zinc-400">{runbook.description}</p>
        {runbook.alertRule && (
          <p className="mt-1 text-xs text-[var(--brand-primary)]">Linked alert rule: {runbook.alertRule}</p>
        )}
      </div>

      <div className="space-y-3">
        {runbook.steps.map((step) => (
          <div key={step.order} className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
            <div className="flex items-start gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-xs font-medium text-[var(--brand-primary)]">
                {step.order}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-white">{step.action}</h3>
                <p className="mt-1 text-xs text-zinc-500">{step.details}</p>
                {step.command && (
                  <pre className="mt-2 rounded-lg bg-black/40 px-3 py-2 text-xs text-zinc-300 overflow-x-auto">
                    {step.command}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {runbook.relatedLinks && runbook.relatedLinks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-white mb-3">Related Pages</h2>
          <div className="flex flex-wrap gap-2">
            {runbook.relatedLinks.map((link) => (
              <Link
                key={link}
                href={link}
                className="text-xs text-[var(--brand-primary)] hover:underline bg-[var(--brand-primary)]/5 px-3 py-1.5 rounded-lg border border-[var(--brand-primary)]/10"
              >
                {link}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
