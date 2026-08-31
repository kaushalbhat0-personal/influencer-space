"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { recordAgencyCommissionPayment } from "@/actions/agency-commission.actions";

interface Props {
  list: { items: Array<{ id: string; orderId: string; agencyId: string; tenantId: string; grossAmount: number; refundAmount: number; eligibleRevenue: number; commissionRate: number; commissionEarned: number; paidAmount: number; outstanding: number; status: string; createdAt: string }>; total: number; page: number; limit: number; totalPages: number; totals: { gross: number; eligible: number; earned: number; paid: number; outstanding: number } };
  agencies: Array<{ id: string; name: string }>;
  tenants: Array<{ id: string; name: string; subdomain: string }>;
  agencyMap: Record<string, string>;
  tenantMap: Record<string, { id: string; name: string; subdomain: string }>;
  summary: { totalEligibleSales: number; totalCommissionEarned: number; totalCommissionPaid: number; totalCommissionOutstanding: number; count: number };
  currentFilters: { agencyId: string; tenantId: string; status: string; dateFrom: string; dateTo: string };
}

const STATUS_COLORS: Record<string, string> = {
  UNPAID: "bg-amber-500/20 text-amber-400",
  PARTIALLY_PAID: "bg-blue-500/20 text-blue-400",
  PAID: "bg-emerald-500/20 text-emerald-400",
  VOID: "bg-zinc-500/20 text-zinc-500",
};

export function AgencyCommissionsClient({ list, agencies, tenants, agencyMap, tenantMap }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [payOpen, setPayOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");

  function updateFilter(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value); else sp.delete(key);
    if (key !== "page") sp.delete("page");
    router.push(`?${sp.toString()}`);
  }

  async function handlePay() {
    setPayError("");
    setPaySuccess("");
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { setPayError("Enter a valid amount"); return; }
    const agencyId = params.get("agencyId") || "";
    if (!agencyId) { setPayError("Filter by agency to record a payment (or select commissions from one agency)"); return; }
    // If multiple agencies selected, use first selected's agency
    const ids = Array.from(selected);
    const res = await recordAgencyCommissionPayment({ agencyId, amount, commissionIds: ids.length ? ids : undefined, reference: payRef || undefined, note: payNote || undefined });
    if (!res.success) { setPayError(res.error ?? "Failed"); return; }
    setPaySuccess(`Payment recorded: ${res.paymentId}`);
    setSelected(new Set());
    setPayAmount(""); setPayRef(""); setPayNote("");
    router.refresh();
  }

  const allSelected = list.items.length > 0 && list.items.every((i) => selected.has(i.id));
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(list.items.map((i) => i.id)));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <select value={params.get("agencyId") ?? ""} onChange={(e) => updateFilter("agencyId", e.target.value)} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white border border-white/10">
            <option value="">All Agencies</option>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={params.get("tenantId") ?? ""} onChange={(e) => updateFilter("tenantId", e.target.value)} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white border border-white/10">
            <option value="">All Creators</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>)}
          </select>
          <select value={params.get("status") ?? ""} onChange={(e) => updateFilter("status", e.target.value)} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white border border-white/10">
            <option value="">All Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="VOID">Void</option>
          </select>
          <input type="date" value={params.get("dateFrom") ?? ""} onChange={(e) => updateFilter("dateFrom", e.target.value)} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white border border-white/10" placeholder="From" />
          <input type="date" value={params.get("dateTo") ?? ""} onChange={(e) => updateFilter("dateTo", e.target.value)} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white border border-white/10" placeholder="To" />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setPayOpen((v) => !v)} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600">Record Manual Payment</button>
          <button onClick={() => router.push("?")} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Clear Filters</button>
        </div>
        {payOpen && (
          <div className="mt-4 rounded-lg border border-white/10 bg-zinc-800/50 p-4 space-y-3">
            <p className="text-xs text-zinc-400">Manual payment — no automated transfer. Amount is allocated FIFO to outstanding commissions for the filtered agency. Select specific commissions below to allocate precisely.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount (INR)" type="number" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white border border-white/10" />
              <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Reference (e.g. UTR / txn id)" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white border border-white/10" />
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note (optional)" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white border border-white/10" />
            </div>
            {payError && <p className="text-xs text-red-400">{payError}</p>}
            {paySuccess && <p className="text-xs text-emerald-400">{paySuccess}</p>}
            <button onClick={handlePay} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">Confirm Manual Payment</button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/50">
        <table className="w-full text-xs" data-testid="agency-commissions-table">
          <thead><tr className="border-b border-white/5 text-zinc-500">
            <th className="px-3 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
            <th className="px-3 py-3 text-left">Agency</th>
            <th className="px-3 py-3 text-left">Creator / Client</th>
            <th className="px-3 py-3 text-left">Order</th>
            <th className="px-3 py-3 text-left">Sale date</th>
            <th className="px-3 py-3 text-right">Gross sale</th>
            <th className="px-3 py-3 text-right">Refunds</th>
            <th className="px-3 py-3 text-right">Eligible revenue</th>
            <th className="px-3 py-3 text-right">Rate</th>
            <th className="px-3 py-3 text-right">Commission earned</th>
            <th className="px-3 py-3 text-right">Paid</th>
            <th className="px-3 py-3 text-right">Outstanding</th>
            <th className="px-3 py-3 text-left">Status</th>
          </tr></thead>
          <tbody>
            {list.items.length === 0 ? (
              <tr><td colSpan={13} className="px-4 py-8 text-center text-zinc-500">No commissions yet. Eligible product sales create commissions automatically.</td></tr>
            ) : list.items.map((c) => (
              <tr key={c.id} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.02]">
                <td className="px-3 py-3"><input type="checkbox" checked={selected.has(c.id)} onChange={(e) => { const s = new Set(selected); if (e.target.checked) s.add(c.id); else s.delete(c.id); setSelected(s); }} /></td>
                <td className="px-3 py-3 truncate max-w-[140px]">{agencyMap[c.agencyId] ?? c.agencyId.slice(0, 8)}</td>
                <td className="px-3 py-3 truncate max-w-[140px]">{tenantMap[c.tenantId]?.name ?? c.tenantId.slice(0, 8)}<span className="text-zinc-500"> · {tenantMap[c.tenantId]?.subdomain ?? ""}</span></td>
                <td className="px-3 py-3 font-mono text-zinc-500">{c.orderId.slice(0, 8)}</td>
                <td className="px-3 py-3 text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-3 text-right font-mono">{formatCurrency(c.grossAmount)}</td>
                <td className="px-3 py-3 text-right font-mono text-red-400">{formatCurrency((c.refundAmount ?? 0) / 100)}</td>
                <td className="px-3 py-3 text-right font-mono">{formatCurrency(c.eligibleRevenue)}</td>
                <td className="px-3 py-3 text-right">{c.commissionRate}%</td>
                <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatCurrency(c.commissionEarned)}</td>
                <td className="px-3 py-3 text-right font-mono">{formatCurrency(c.paidAmount)}</td>
                <td className="px-3 py-3 text-right font-mono text-amber-400">{formatCurrency(c.outstanding)}</td>
                <td className="px-3 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[c.status] ?? ""}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{list.total} commissions · page {list.page} of {list.totalPages}</span>
        <div className="flex gap-2">
          {list.page > 1 && <button onClick={() => updateFilter("page", String(list.page - 1))} className="rounded border border-white/10 px-3 py-1 hover:bg-white/5">Prev</button>}
          {list.page < list.totalPages && <button onClick={() => updateFilter("page", String(list.page + 1))} className="rounded border border-white/10 px-3 py-1 hover:bg-white/5">Next</button>}
        </div>
      </div>
    </div>
  );
}
