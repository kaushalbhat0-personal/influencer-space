"use client";

import { useState } from "react";
import { adminGetInvoices } from "@/actions/super-admin-billing.actions";

const STATUSES = ["ALL", "PAID", "PENDING", "FAILED", "REFUNDED"];

type InvoicesData = { rows: Array<{ id: string; planCode: string; amount: number; status: string; issuedAt: string; paidAt: string | null; providerReference: string | null; tenantName: string; subdomain: string }>; total: number; page: number; pageSize: number };

const fmtDate = (iso: string) => iso.replace("T", " ").slice(0, 16);

export function InvoicesClient({ initial }: { initial: InvoicesData }) {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InvoicesData>(initial ?? { rows: [], total: 0, page: 1, pageSize: 50 });
  const [loading, setLoading] = useState(false);

  async function run(nextStatus: string, nextSearch: string, nextPage: number) {
    setLoading(true);
    const result = await adminGetInvoices({ status: nextStatus, search: nextSearch || undefined, page: nextPage, pageSize: 50 });
    if (result.success && result.data) setData(result.data);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); run(e.target.value, search, 1); setPage(1); }}
          className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { run(status, search, 1); setPage(1); } }}
          placeholder="Search plan code / invoice id…"
          className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
          aria-label="Search invoices"
        />
        <button onClick={() => run(status, search, 1)} className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10" disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>

      <div className="overflow-x-auto admin-card">
        <table className="w-full text-sm" data-testid="invoices-table">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-zinc-500">
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Issued</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Provider</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-xs text-zinc-600">No invoices found.</td></tr>
            )}
            {data.rows.map((inv) => (
              <tr key={inv.id} className="border-b border-white/5" data-invoice={inv.id}>
                <td className="px-3 py-2 text-zinc-300">{inv.tenantName} <span className="text-zinc-600">({inv.subdomain})</span></td>
                <td className="px-3 py-2 text-zinc-400">{inv.planCode}</td>
                <td className="px-3 py-2 text-white">₹{inv.amount.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : inv.status === "FAILED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{fmtDate(inv.issuedAt)}</td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{inv.paidAt ? fmtDate(inv.paidAt) : "—"}</td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{inv.providerReference ? inv.providerReference.slice(0, 14) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{data.total} invoices</span>
        <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); run(status, search, p); }} disabled={page <= 1} className="rounded bg-white/5 px-2 py-1 disabled:opacity-40">Prev</button>
        <span>Page {data.page}</span>
        <button onClick={() => { const p = page + 1; setPage(p); run(status, search, p); }} disabled={data.page * data.pageSize >= data.total} className="rounded bg-white/5 px-2 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
