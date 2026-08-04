"use client";

import { useState } from "react";
import { adminGetTransactions } from "@/actions/super-admin-billing.actions";

const KINDS = ["ALL", "event", "invoice", "payment"];

type TxRow = { id: string; kind: string; type: string; amount: number | null; status: string; createdAt: string; tenantName: string; ref: string };
type TxData = { rows: TxRow[]; total: number; page: number; pageSize: number };

export function TransactionsClient({ initial }: { initial: TxData }) {
  const [kind, setKind] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TxData>(initial ?? { rows: [], total: 0, page: 1, pageSize: 50 });
  const [loading, setLoading] = useState(false);

  async function run(nextKind: string, nextSearch: string, nextPage: number) {
    setLoading(true);
    const result = await adminGetTransactions({ kind: nextKind, search: nextSearch || undefined, page: nextPage, pageSize: 50 });
    if (result.success && result.data) setData(result.data);
    setLoading(false);
  }

  const kindColor: Record<string, string> = {
    event: "bg-indigo-500/10 text-indigo-300",
    invoice: "bg-emerald-500/10 text-emerald-300",
    payment: "bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => { setKind(e.target.value); run(e.target.value, search, 1); setPage(1); }}
          className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
          aria-label="Filter by kind"
        >
          {KINDS.map((k) => <option key={k} value={k}>{k === "ALL" ? "All kinds" : k}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { run(kind, search, 1); setPage(1); } }}
          placeholder="Search type / tenant / reference…"
          className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
          aria-label="Search transactions"
        />
        <button onClick={() => run(kind, search, 1)} className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10" disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>

      <div className="overflow-x-auto admin-card">
        <table className="w-full text-sm" data-testid="transactions-table">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-zinc-500">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Type / Plan</th>
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Reference</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-xs text-zinc-600">No transactions found.</td></tr>
            )}
            {data.rows.map((t) => (
              <tr key={t.id} className="border-b border-white/5" data-transaction={t.id} data-kind={t.kind}>
                <td className="px-3 py-2 text-zinc-500 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${kindColor[t.kind] ?? "bg-white/5 text-zinc-400"}`}>{t.kind}</span></td>
                <td className="px-3 py-2 text-zinc-300">{t.type}</td>
                <td className="px-3 py-2 text-zinc-400">{t.tenantName}</td>
                <td className="px-3 py-2 text-white">{t.amount != null ? `₹${t.amount.toLocaleString("en-IN")}` : "—"}</td>
                <td className="px-3 py-2 text-zinc-400">{t.status}</td>
                <td className="px-3 py-2 text-zinc-600 text-xs">{t.ref ? t.ref.slice(0, 18) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{data.total} transactions</span>
        <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); run(kind, search, p); }} disabled={page <= 1} className="rounded bg-white/5 px-2 py-1 disabled:opacity-40">Prev</button>
        <span>Page {data.page}</span>
        <button onClick={() => { const p = page + 1; setPage(p); run(kind, search, p); }} disabled={data.page * data.pageSize >= data.total} className="rounded bg-white/5 px-2 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
