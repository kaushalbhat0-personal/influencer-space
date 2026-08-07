"use client";

import Link from "next/link";

interface Monitor {
  items: Array<{ id: string; creatorName: string; status: string; currentStage: string | null; progressPercent: number; startedAt: string | null; completedAt: string | null; durationMs: number | null; failedStage: string | null; error: string | null }>;
  averageDurationMs: number;
  total: number;
}

/** RCCF-LAUNCH-TRACK-03 Phase 11 — Super Admin generation monitor. */
export function GenerationMonitor({ monitor }: { monitor: Monitor }) {
  const fmt = (ms: number | null) => (ms == null ? "—" : ms < 60000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`);
  const active = monitor.items.filter((i) => i.status === "running" || i.status === "publishing").length;
  const failed = monitor.items.filter((i) => i.status === "failed").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Generation Monitor</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-400">
        Real-time generation sessions — current stage, duration, failures. Useful for support.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Recent generations" value={String(monitor.total)} />
        <Card label="In progress" value={String(active)} tone="text-amber-400" />
        <Card label="Failed" value={String(failed)} tone={failed > 0 ? "text-red-400" : undefined} />
        <Card label="Avg duration (completed)" value={fmt(monitor.averageDurationMs)} />
      </div>

      <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Recent generations</h2>
        <div className="space-y-2">
          {monitor.items.length === 0 && <p className="text-xs text-zinc-500">No generations yet.</p>}
          {monitor.items.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-zinc-900/50 px-3 py-2 text-xs">
              <div>
                <p className="text-zinc-200">{g.creatorName} <span className="text-zinc-600 font-mono">· {g.id.slice(0, 8)}</span></p>
                <p className="text-zinc-500">
                  stage: <span className="text-zinc-300">{g.currentStage ?? "—"}</span> · {g.progressPercent}%
                  {g.failedStage && <span className="text-red-400"> · failed at {g.failedStage}</span>}
                </p>
                {g.error && <p className="text-red-400">{g.error}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${g.status === "completed" ? "bg-emerald-500/10 text-emerald-300" : g.status === "failed" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>{g.status}</span>
                <span className="text-zinc-500">{fmt(g.durationMs)}</span>
                {g.currentStage && g.status !== "completed" && g.status !== "failed" && (
                  <Link href={`/super-admin/generation-monitor?session=${g.id}`} className="text-cyan-400 hover:underline">view</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
