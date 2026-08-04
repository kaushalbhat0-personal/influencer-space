"use client";

import { useState } from "react";
import { getUnifiedActivity } from "@/actions/operations.actions";

const KINDS = ["ALL", "audit", "billing", "generation", "provisioning"];

type Row = { id: string; kind: string; type: string; detail: string; createdAt: string };

export function UnifiedFeed({ initial }: { initial: { rows: Row[]; total: number } }) {
  const [kind, setKind] = useState("ALL");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>(initial.rows);
  const [busy, setBusy] = useState(false);

  const kindColor: Record<string, string> = {
    audit: "bg-zinc-700/40 text-zinc-300",
    billing: "bg-amber-500/10 text-amber-300",
    generation: "bg-blue-500/10 text-blue-300",
    provisioning: "bg-emerald-500/10 text-emerald-300",
  };

  async function run(nextKind: string, nextSearch: string) {
    setBusy(true);
    const result = await getUnifiedActivity({ kind: nextKind, search: nextSearch || undefined, limit: 150 });
    if (result.rows) setRows(result.rows);
    setBusy(false);
  }

  return (
    <div className="space-y-3" data-testid="unified-feed">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => { setKind(e.target.value); run(e.target.value, search); }}
          className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
          aria-label="Filter feed by kind"
        >
          {KINDS.map((k) => <option key={k} value={k}>{k === "ALL" ? "All kinds" : k}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run(kind, search); }}
          placeholder="Search type / creator…"
          className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
          aria-label="Search activity feed"
        />
        <button onClick={() => run(kind, search)} disabled={busy} className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 disabled:opacity-50">
          {busy ? "Loading…" : "Apply"}
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 divide-y divide-white/5">
        {rows.length === 0 && <p className="p-4 text-center text-xs text-zinc-600">No activity found.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-start gap-3 px-4 py-2.5" data-feed-row={r.kind}>
            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] ${kindColor[r.kind] ?? "bg-white/5 text-zinc-400"}`}>{r.kind}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 truncate">{r.type.replace(/_/g, " ")}</p>
              {r.detail && <p className="text-xs text-zinc-600 truncate">{r.detail}</p>}
            </div>
            <span className="text-xs text-zinc-600 shrink-0">{r.createdAt.replace("T", " ").slice(0, 16)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
