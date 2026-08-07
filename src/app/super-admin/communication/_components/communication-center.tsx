"use client";

import { useState } from "react";
import { retryCommunications } from "@/actions/communication.actions";

interface Health { total: number; delivered: number; failed: number; queued: number; volume: number; failureRate: number; recent: number }
interface HistoryItem { id: string; templateId: string; recipient: string; channel: string; status: string; provider: string; retries: number; error: string | null; createdAt: string }

/** RCCF-TRACK-02 Phase 17 — Communication Center (observability + retry). */
export function CommunicationCenter({ health, history }: { health: Health; history: { items: HistoryItem[]; total: number } }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const retry = async () => {
    setBusy(true); setMsg(null);
    const r = await retryCommunications();
    setMsg(r.success ? `Retried ${r.retried ?? 0} queued communications.` : r.error ?? "Failed");
    if (r.success) setTimeout(() => window.location.reload(), 700);
    setBusy(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Communication Center</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-400">
        Delivery observability for the canonical communication runtime — email, in-app notifications and admin alerts.
      </p>

      {msg && <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-300">{msg}</div>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card label="Total" value={String(health.total)} />
        <Card label="Delivered" value={String(health.delivered)} tone="text-emerald-400" />
        <Card label="Failed" value={String(health.failed)} tone={health.failed > 0 ? "text-red-400" : undefined} />
        <Card label="Queued" value={String(health.queued)} tone={health.queued > 0 ? "text-amber-400" : undefined} />
        <Card label="24h volume" value={String(health.recent)} />
        <Card label="Failure rate" value={`${health.failureRate}%`} tone={health.failureRate > 5 ? "text-amber-400" : undefined} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={retry} disabled={busy} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">
          {busy ? "Retrying…" : "Retry queued communications"}
        </button>
        <span className="text-xs text-zinc-500">{health.queued} queued · {health.failed} failed (DLQ)</span>
      </div>

      <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Recent deliveries</h2>
        <div className="space-y-1.5">
          {history.items.length === 0 && <p className="text-xs text-zinc-500">No communications yet.</p>}
          {history.items.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-zinc-900/40 px-3 py-1.5 text-xs">
              <span className="font-mono text-zinc-300">{h.templateId}</span>
              <span className="text-zinc-500">{h.channel} · {h.provider} · {h.retries} retries</span>
              <span className={`${h.status === "delivered" ? "text-emerald-400" : h.status === "failed" ? "text-red-400" : "text-amber-300"}`}>{h.status}</span>
              {h.error && <span className="max-w-40 truncate text-red-400">{h.error}</span>}
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
