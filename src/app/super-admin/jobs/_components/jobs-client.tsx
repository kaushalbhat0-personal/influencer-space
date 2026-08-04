"use client";

import { useState } from "react";
import { listJobRuns, triggerPersistedJob, requeueJob, cancelJob } from "@/actions/operations.actions";

type JobRow = {
  id: string;
  type: string;
  name: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
  error: string | null;
  triggeredBy: string | null;
};

const STATUSES = ["ALL", "QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"];

export function JobsClient({ initial, runners }: { initial: { rows: JobRow[]; total: number; page: number; pageSize: number }; runners: Array<{ id: string; name: string }> }) {
  const [rows, setRows] = useState<JobRow[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const statusColor: Record<string, string> = {
    QUEUED: "bg-blue-500/10 text-blue-400",
    RUNNING: "bg-amber-500/10 text-amber-400",
    SUCCEEDED: "bg-emerald-500/10 text-emerald-400",
    FAILED: "bg-red-500/10 text-red-400",
    CANCELLED: "bg-zinc-700/40 text-zinc-400",
  };

  async function filter(status: string) {
    setBusy("filter");
    const result = await listJobRuns({ status: status as never, page: 1, pageSize: 100 });
    if (result.rows) {
      setRows(result.rows);
      setTotal(result.total);
    }
    setBusy(null);
  }

  async function run(jobId: string, name: string) {
    setBusy(jobId);
    const result = await triggerPersistedJob(jobId);
    setNotice(result.success ? `${name} executed.` : `${name}: ${result.error}`);
    await refreshRows();
    setBusy(null);
  }

  async function requeue(id: string) {
    const result = await requeueJob(id);
    setNotice(result.success ? "Job requeued." : result.error ?? "Failed to requeue");
    await refreshRows();
  }

  async function cancel(id: string) {
    const result = await cancelJob(id);
    setNotice(result.success ? "Job cancelled." : result.error ?? "Failed to cancel");
    await refreshRows();
  }

  async function refreshRows() {
    const result = await listJobRuns({ page: 1, pageSize: 100 });
    if (result.rows) {
      setRows(result.rows);
      setTotal(result.total);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select onChange={(e) => filter(e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300" aria-label="Filter jobs by status">
          {STATUSES.map((s) => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>)}
        </select>
        {busy === "filter" && <span className="text-xs text-zinc-500">Loading…</span>}
        <span className="mx-2 text-xs text-zinc-600">|</span>
        {runners.map((r) => (
          <button key={r.id} onClick={() => run(r.id, r.name)} disabled={busy !== null} className="rounded-md bg-white/5 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10 disabled:opacity-50" data-testid={`job-run-${r.id}`}>
            Run {r.name.replace(/s$/, "").split(" ").slice(-1)[0]}
          </button>
        ))}
      </div>

      {notice && <p className="rounded-lg bg-white/5 p-2 text-xs text-zinc-300" data-testid="jobs-notice">{notice}</p>}

      <div className="overflow-x-auto admin-card">
        <table className="w-full text-sm" data-testid="jobs-table">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-zinc-500">
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Triggered By</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-xs text-zinc-600">No job runs recorded yet.</td></tr>
            )}
            {rows.map((j) => (
              <tr key={j.id} className="border-b border-white/5" data-job={j.id} data-status={j.status}>
                <td className="px-3 py-2 text-zinc-200">
                  {j.name}
                  {j.error && <span className="block text-[11px] text-red-400">{j.error}</span>}
                </td>
                <td className="px-3 py-2 text-zinc-400">{j.type}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${statusColor[j.status] ?? "bg-white/5 text-zinc-400"}`}>{j.status}</span></td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{j.startedAt ? new Date(j.startedAt).toLocaleString("en-IN") : "—"}</td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{j.durationMs != null ? `${j.durationMs}ms` : "—"}</td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{j.triggeredBy ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    {(j.status === "FAILED" || j.status === "CANCELLED") && (
                      <button onClick={() => requeue(j.id)} disabled={busy !== null} className="rounded bg-blue-500/10 px-2 py-1 text-[10px] text-blue-300 hover:bg-blue-500/20 disabled:opacity-50" data-testid="job-requeue">Requeue</button>
                    )}
                    {(j.status === "QUEUED" || j.status === "RUNNING") && (
                      <button onClick={() => cancel(j.id)} disabled={busy !== null} className="rounded bg-zinc-700/40 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700/60 disabled:opacity-50" data-testid="job-cancel">Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600">{total} job runs</p>
    </div>
  );
}
