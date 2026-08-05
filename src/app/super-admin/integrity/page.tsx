import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runIntegrityScanAction } from "@/actions/integrity.actions";
import Link from "next/link";
import { IntegrityDashboardClient } from "./_components/integrity-client";

export const dynamic = "force-dynamic";

export default async function IntegrityDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;

  const scan = await runIntegrityScanAction().catch(() => null);
  const score = scan ? Math.round(Math.max(0, 100 - scan.totalIssues * 0.5)) : 100;
  const statusColor = scan?.status === "healthy" ? "text-emerald-400" : scan?.status === "warning" ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Platform Integrity</h1><p className="mt-1 text-sm text-zinc-400">Data governance, orphan detection, and safe deletion</p></div>
          <Link href="/super-admin/reconciliation" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Reconciliation →</Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">Health Score</p>
            <p className={`mt-1 text-3xl font-bold ${statusColor}`}>{score}%</p>
            <p className="text-xs text-zinc-600">{scan?.status ?? "scanning..."}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">Issues Found</p>
            <p className={`mt-1 text-3xl font-bold ${scan?.totalIssues ? "text-amber-400" : "text-emerald-400"}`}>{scan?.totalIssues ?? 0}</p>
            <p className="text-xs text-zinc-600">across {scan?.issues.length ?? 0} categories</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">Last Scan</p>
            <p className="mt-1 text-lg font-bold text-white">{scan?.scannedAt ? new Date(scan.scannedAt).toLocaleTimeString() : "—"}</p>
          </div>
        </div>

        {scan?.issues && scan.issues.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Detected Issues</h2>
            {scan.issues.map((issue, i) => (
              <div key={i} className="flex items-center justify-between border-b border-white/5 py-2 text-xs last:border-0">
                <div>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${issue.severity === "high" ? "bg-red-500" : issue.severity === "medium" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <span className="text-zinc-300">{issue.label}</span>
                  <span className="ml-2 text-zinc-500">({issue.category})</span>
                </div>
                <span className={`font-mono font-bold ${issue.severity === "high" ? "text-red-400" : issue.severity === "medium" ? "text-amber-400" : "text-zinc-400"}`}>{issue.count}</span>
              </div>
            ))}
          </div>
        )}

        <IntegrityDashboardClient />
      </div>
    </div>
  );
}
