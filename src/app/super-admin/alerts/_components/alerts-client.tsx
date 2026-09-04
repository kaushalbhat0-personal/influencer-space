"use client";

import { useState } from "react";
import { syncAlerts, listAlerts, setAlertStatus } from "@/actions/operations.actions";

const SOURCE_RUNBOOK: Record<string, string> = {
  health_database: "database-failure",
  health_registry: "registry-drift",
  health: "registry-drift",
  billing: "billing-failure",
  jobs_publishing: "publishing-failure",
  jobs_provisioning: "provisioning-failure",
  jobs: "generation-failure",
  generation: "generation-failure",
};

function runbookFor(source: string, service: string | null): string | undefined {
  const key = `${source}_${service}`;
  return SOURCE_RUNBOOK[key] ?? SOURCE_RUNBOOK[source];
}

const fmtDate = (v: string | Date) => new Date(v).toISOString().replace("T", " ").slice(0, 16);

type AlertRow = {
  id: string;
  level: string;
  status: string;
  title: string;
  message: string | null;
  source: string;
  service: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  dismissedAt: Date | null;
};

const STATUSES = ["ALL", "ACTIVE", "RESOLVED", "DISMISSED"];

export function AlertsClient({ initial }: { initial: { rows: AlertRow[]; total: number; page: number; pageSize: number } }) {
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState<AlertRow[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const levelColor: Record<string, string> = {
    CRITICAL: "bg-red-500/10 text-red-400",
    WARNING: "bg-amber-500/10 text-amber-400",
    INFO: "bg-blue-500/10 text-blue-400",
  };

  async function sync() {
    setBusy(true);
    const result = await syncAlerts();
    const refreshed = await listAlerts({ status: status as never, page: 1, pageSize: 100 });
    if (refreshed.rows) {
      setRows(refreshed.rows);
      setTotal(refreshed.total);
    }
    setNotice(`Sync complete — ${result.created} new alert(s).`);
    setBusy(false);
  }

  async function filter(nextStatus: string) {
    setBusy(true);
    setStatus(nextStatus);
    const result = await listAlerts({ status: nextStatus as never, page: 1, pageSize: 100 });
    if (result.rows) {
      setRows(result.rows);
      setTotal(result.total);
    }
    setBusy(false);
  }

  async function changeStatus(id: string, next: "RESOLVED" | "DISMISSED") {
    const result = await setAlertStatus(id, next);
    if (result.success) {
      const refreshed = await listAlerts({ status: status as never, page: 1, pageSize: 100 });
      if (refreshed.rows) {
        setRows(refreshed.rows);
        setTotal(refreshed.total);
      }
      setNotice(`Alert ${next.toLowerCase()}.`);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => filter(e.target.value)}
          className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
          aria-label="Filter alerts by status"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>)}
        </select>
        <button onClick={sync} disabled={busy} className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-600 disabled:opacity-50" data-testid="alerts-sync">
          {busy ? "Working…" : "Sync from runtime"}
        </button>
      </div>

      {notice && <p className="rounded-lg bg-white/5 p-2 text-xs text-zinc-300" data-testid="alerts-notice">{notice}</p>}

      <div className="overflow-x-auto admin-card">
        <table className="w-full text-sm" data-testid="alerts-table">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-zinc-500">
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2">Alert</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Runbook</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-4 text-center text-xs text-zinc-600">No alerts. Sync from runtime to evaluate platform conditions.</td></tr>
            )}
            {rows.map((a) => {
              const runbookId = runbookFor(a.source, a.service);
              return (
                <tr key={a.id} className="border-b border-white/5" data-alert={a.id} data-status={a.status}>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${levelColor[a.level] ?? "bg-white/5 text-zinc-400"}`}>{a.level}</span>
                  </td>
                  <td className="px-3 py-2 text-zinc-200">
                    {a.title}
                    {a.message && <span className="block text-[11px] text-zinc-500">{a.message}</span>}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{a.source}</td>
                  <td className="px-3 py-2 text-zinc-400">{a.service ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${a.status === "ACTIVE" ? "bg-red-500/10 text-red-400" : a.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700/40 text-zinc-400"}`}>{a.status}</span>
                  </td>
                  <td className="px-3 py-2 text-zinc-500 text-xs">{fmtDate(a.createdAt)}</td>
                  <td className="px-3 py-2">
                    {runbookId ? (
                      <a href={`/super-admin/runbooks/${runbookId}`} className="text-xs text-[var(--brand-primary)] hover:underline" data-testid={`runbook-${runbookId}`}>Runbook</a>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.status === "ACTIVE" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => changeStatus(a.id, "RESOLVED")} disabled={busy} className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50" data-testid="alert-resolve">
                          Resolve
                        </button>
                        <button onClick={() => changeStatus(a.id, "DISMISSED")} disabled={busy} className="rounded bg-zinc-700/40 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700/60 disabled:opacity-50" data-testid="alert-dismiss">
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600">{total} alerts</p>
    </div>
  );
}
