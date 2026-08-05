import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cacheRuntime, costMonitor } from "@/lib/intelligence/runtime";

export const dynamic = "force-dynamic";

export default async function AIOperationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;

  const summary = costMonitor.getSummary();
  const perTask = costMonitor.getPerTask();
  const recent = costMonitor.getLog(20);

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">AI Operations</h1><p className="mt-1 text-sm text-zinc-400">Cost-optimised intelligence runtime — AI is the last resort</p></div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Total AI Calls</p><p className="mt-1 text-2xl font-bold text-white">{summary.totalCalls}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Cache Hit Rate</p><p className={`mt-1 text-2xl font-bold ${summary.cacheHitRate > 80 ? "text-emerald-400" : summary.cacheHitRate > 50 ? "text-amber-400" : "text-red-400"}`}>{summary.cacheHitRate}%</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Total Cost</p><p className="mt-1 text-2xl font-bold text-emerald-400">${summary.totalCost.toFixed(4)}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Total Tokens</p><p className="mt-1 text-2xl font-bold text-white">{summary.totalTokens.toLocaleString()}</p></div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Per-Task Cost</h2>
          {perTask.length === 0 ? (<p className="text-xs text-zinc-500">No AI calls recorded yet.</p>) : (
            <table className="w-full text-xs">
              <thead><tr className="text-zinc-500"><th className="text-left pb-1">Task</th><th className="text-left pb-1">Calls</th><th className="text-left pb-1">Tokens</th><th className="text-left pb-1">Cost</th></tr></thead>
              <tbody>
                {perTask.map((t) => (
                  <tr key={t.task} className="border-t border-white/5 text-zinc-300">
                    <td className="py-1 font-medium">{t.task}</td><td className="py-1">{t.calls}</td><td className="py-1 font-mono">{t.tokens.toLocaleString()}</td><td className="py-1 font-mono text-emerald-400">${t.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Recent Calls</h2>
          {recent.length === 0 ? (<p className="text-xs text-zinc-500">No recent calls.</p>) : (
            <table className="w-full text-xs">
              <thead><tr className="text-zinc-500"><th className="text-left pb-1">Task</th><th className="text-left pb-1">Tokens</th><th className="text-left pb-1">Cost</th><th className="text-left pb-1">Cached</th></tr></thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i} className="border-t border-white/5 text-zinc-300">
                    <td className="py-1">{r.task}</td><td className="py-1 font-mono">{r.tokens.toLocaleString()}</td><td className="py-1 font-mono text-emerald-400">${r.cost.toFixed(6)}</td><td className="py-1">{r.cached ? <span className="text-emerald-400">✓ cached</span> : <span className="text-amber-400">AI call</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 text-xs text-zinc-500 space-y-2">
          <p><strong className="text-zinc-400">Copy Templates:</strong> 7 niches (fitness, restaurant, photographer, musician, developer, educator, creator)</p>
          <p><strong className="text-zinc-400">Deterministic-only tasks:</strong> FAQ, Privacy, Terms, Refund — never use AI</p>
          <p><strong className="text-zinc-400">Template-covered tasks:</strong> Hero, About, CTA, SEO — deterministic templates for all niches</p>
          <p><strong className="text-zinc-400">AI Router:</strong> Cache hit → template → confidence check → AI (last resort)</p>
        </div>
      </div>
    </div>
  );
}
