"use client";

import { useState } from "react";
import { listErrors, updateErrorStatus, getError } from "../actions";
import { getRunbookForSystemError } from "@/lib/observability/runbooks";

type Row = {
  id: string;
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  level: string;
  service: string;
  operation: string | null;
  route: string | null;
  message: string;
  stackTrace: string | null;
  code: string | null;
  tenantIds: string[];
  correlationId: string | null;
  environment: string | null;
  deploymentId: string | null;
  commitSha: string | null;
  recovery: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

const STATUSES = ["ALL", "NEW", "ACKNOWLEDGED", "RESOLVED", "IGNORED"];
const LEVELS = ["ALL", "WARN", "ERROR", "FATAL"];
const ENVIRONMENTS = ["ALL", "production", "preview", "development"];
const WORKFLOWS = ["ALL", "provisioning", "publishing", "builder_save", "billing", "generation", "onboarding", "import", "partner", "commerce", "storefront", "client"];

const levelColor: Record<string, string> = {
  WARN: "bg-amber-500/10 text-amber-400",
  ERROR: "bg-red-500/10 text-red-400",
  FATAL: "bg-red-600/20 text-red-300",
};

const statusColor: Record<string, string> = {
  NEW: "bg-red-500/10 text-red-400",
  ACKNOWLEDGED: "bg-amber-500/10 text-amber-400",
  RESOLVED: "bg-emerald-500/10 text-emerald-400",
  IGNORED: "bg-zinc-700/40 text-zinc-400",
};

const fmt = (v: string | Date) => new Date(v).toISOString().replace("T", " ").slice(0, 16);

export function ErrorsClient({ initial }: { initial: { rows: Row[]; total: number; page: number; pageSize: number } }) {
  const [rows, setRows] = useState<Row[]>(initial.rows as Row[]);
  const [total, setTotal] = useState(initial.total);
  const [status, setStatus] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [service, setService] = useState("ALL");
  const [environment, setEnvironment] = useState("ALL");
  const [tenant, setTenant] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function applyFilters() {
    setBusy(true);
    const res = await listErrors({
      status: status === "ALL" ? undefined : status,
      level: level === "ALL" ? undefined : level,
      service: service === "ALL" ? undefined : service,
      environment: environment === "ALL" ? undefined : environment,
      tenantId: tenant || undefined,
      search: search || undefined,
      page: 1,
      pageSize: 50,
    });
    if (res.success) {
      setRows(res.rows as Row[]);
      setTotal(res.total);
    } else {
      setNotice(res.error ?? "Failed to list");
    }
    setBusy(false);
  }

  async function changeStatus(id: string, next: "ACKNOWLEDGED" | "RESOLVED" | "IGNORED") {
    setBusy(true);
    const res = await updateErrorStatus(id, next as never);
    if (res.success) {
      setNotice(`Error ${next.toLowerCase()}.`);
      await applyFilters();
      if (selected?.id === id) {
        const detail = await getError(id);
        if (detail.success) setSelected(detail.row as Row);
      }
    } else {
      setNotice(res.error ?? "Failed");
    }
    setBusy(false);
  }

  async function openDetail(id: string) {
    const res = await getError(id);
    if (res.success) setSelected(res.row as Row);
  }

  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300" aria-label="Filter by status">
          {STATUSES.map((s) => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300" aria-label="Filter by level">
          {LEVELS.map((s) => <option key={s} value={s}>{s === "ALL" ? "All levels" : s}</option>)}
        </select>
        <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300" aria-label="Filter by workflow/service">
          {WORKFLOWS.map((s) => <option key={s} value={s}>{s === "ALL" ? "All workflows" : s}</option>)}
        </select>
        <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300" aria-label="Filter by environment">
          {ENVIRONMENTS.map((s) => <option key={s} value={s}>{s === "ALL" ? "All envs" : s}</option>)}
        </select>
        <input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="Tenant ID" className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 w-32" aria-label="Filter by tenant" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Fingerprint / search" className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 w-40" aria-label="Search fingerprint" />
        <button onClick={applyFilters} disabled={busy} className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-600 disabled:opacity-50" data-testid="errors-filter">Filter</button>
      </div>

      {notice && <p className="rounded-lg bg-white/5 p-2 text-xs text-zinc-300" data-testid="errors-notice">{notice}</p>}

      <div className="overflow-x-auto admin-card">
        <table className="w-full text-sm" data-testid="errors-table">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-zinc-500">
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Service / Operation</th>
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">Count</th>
              <th className="px-3 py-2">First</th>
              <th className="px-3 py-2">Last</th>
              <th className="px-3 py-2">Tenants</th>
              <th className="px-3 py-2">Deployment</th>
              <th className="px-3 py-2">Correlation</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={11} className="px-3 py-4 text-center text-xs text-zinc-600">No errors. System is quiet.</td></tr>}
            {rows.map((r) => {
              const tenantCount = Array.isArray(r.tenantIds) ? r.tenantIds.length : 0;
              const barWidth = Math.min(100, Math.max(4, (r.count / maxCount) * 100));
              return (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer" data-error={r.id} onClick={() => openDetail(r.id)}>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${levelColor[r.level] ?? "bg-white/5 text-zinc-400"}`}>{r.level}</span></td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${statusColor[r.status] ?? "bg-white/5 text-zinc-400"}`}>{r.status}</span></td>
                <td className="px-3 py-2 text-zinc-300 text-xs">{r.service}<span className="block text-[11px] text-zinc-500">{r.operation ?? "—"}</span><span className="block text-[10px] text-zinc-600">{r.environment ?? "—"}</span></td>
                <td className="px-3 py-2 text-zinc-200 max-w-[280px] truncate" title={r.message}>{r.message.slice(0, 120)}</td>
                <td className="px-3 py-2 text-zinc-400"><div className="flex flex-col gap-1"><span>{r.count}</span><div className="h-1 w-12 rounded bg-white/10 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${barWidth}%` }} /></div></div></td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{fmt(r.firstSeen)}</td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{fmt(r.lastSeen)}</td>
                <td className="px-3 py-2 text-zinc-400"><span title={Array.isArray(r.tenantIds) ? r.tenantIds.join(", ") : ""}>{tenantCount} {tenantCount === 1 ? "tenant" : "tenants"}</span></td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{r.commitSha ? r.commitSha.slice(0, 7) : r.deploymentId ? r.deploymentId.slice(0, 8) : "—"}</td>
                <td className="px-3 py-2 text-zinc-500 text-xs truncate max-w-[100px]">{r.correlationId ?? "—"}</td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  {r.status === "NEW" || r.status === "ACKNOWLEDGED" ? (
                    <div className="flex gap-1.5">
                      {r.status === "NEW" && <button onClick={() => changeStatus(r.id, "ACKNOWLEDGED")} disabled={busy} className="rounded bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300 hover:bg-amber-500/20 disabled:opacity-50" data-testid="error-acknowledge">Acknowledge</button>}
                      <button onClick={() => changeStatus(r.id, "RESOLVED")} disabled={busy} className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50" data-testid="error-resolve">Resolve</button>
                      <button onClick={() => changeStatus(r.id, "IGNORED")} disabled={busy} className="rounded bg-zinc-700/40 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700/60 disabled:opacity-50" data-testid="error-ignore">Ignore</button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600">{total} errors</p>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Error detail" onClick={() => setSelected(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-sm font-semibold text-white break-all">{selected.message}</h2>
              <button onClick={() => setSelected(null)} className="rounded bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-white" aria-label="Close detail">Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-zinc-500">Fingerprint</span><p className="text-zinc-300 break-all">{selected.fingerprint}</p></div>
              <div><span className="text-zinc-500">Status</span><p className="text-zinc-300">{selected.status}</p></div>
              <div><span className="text-zinc-500">Level</span><p className="text-zinc-300">{selected.level}</p></div>
              <div><span className="text-zinc-500">Service</span><p className="text-zinc-300">{selected.service} / {selected.operation ?? "—"}</p></div>
              <div><span className="text-zinc-500">Route</span><p className="text-zinc-300 break-all">{selected.route ?? "—"}</p></div>
              <div><span className="text-zinc-500">Code</span><p className="text-zinc-300">{selected.code ?? "—"}</p></div>
              <div><span className="text-zinc-500">Correlation</span><p className="text-zinc-300 break-all">{selected.correlationId ?? "—"}</p></div>
              <div><span className="text-zinc-500">Environment</span><p className="text-zinc-300">{selected.environment ?? "—"}</p></div>
              <div><span className="text-zinc-500">Deployment</span><p className="text-zinc-300 break-all">{selected.deploymentId ?? "—"}</p></div>
              <div><span className="text-zinc-500">Commit</span><p className="text-zinc-300 break-all">{selected.commitSha ?? "—"}</p></div>
              <div><span className="text-zinc-500">Count</span><p className="text-zinc-300">{selected.count}</p></div>
              <div><span className="text-zinc-500">Tenants</span><p className="text-zinc-300 break-all">{Array.isArray(selected.tenantIds) ? selected.tenantIds.join(", ") || "—" : "—"}</p></div>
              <div><span className="text-zinc-500">First</span><p className="text-zinc-300">{fmt(selected.firstSeen)}</p></div>
              <div><span className="text-zinc-500">Last</span><p className="text-zinc-300">{fmt(selected.lastSeen)}</p></div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-400">Recovery</p>
              <p className="mt-1 text-xs text-zinc-300">{(selected as unknown as { recovery?: string | null }).recovery ?? "No automated recovery — investigate manually"}</p>
              {(() => { const rb = getRunbookForSystemError(selected.service, selected.operation, selected.code); return rb ? <a href={`/super-admin/runbooks/${rb.id}`} className="mt-1 inline-block text-xs text-indigo-400 hover:underline">Runbook: {rb.title}</a> : null; })()}
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-400">Stack (sanitized)</p>
              <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/30 p-3 text-[11px] text-zinc-300 whitespace-pre-wrap break-all">{selected.stackTrace ?? "No stack"}</pre>
            </div>
            <div className="mt-4 flex gap-2">
              {selected.status !== "ACKNOWLEDGED" && <button onClick={() => changeStatus(selected.id, "ACKNOWLEDGED")} className="rounded bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20">Acknowledge</button>}
              {selected.status !== "RESOLVED" && <button onClick={() => changeStatus(selected.id, "RESOLVED")} className="rounded bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20">Resolve</button>}
              {selected.status !== "IGNORED" && <button onClick={() => changeStatus(selected.id, "IGNORED")} className="rounded bg-zinc-700/40 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700/60">Ignore</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
