"use client";

import { useState, useMemo, useCallback } from "react";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, formatInvoiceStatus } from "@/lib/billing";
import type { BillingInvoice } from "@/lib/billing";
import type { InvoiceStatus } from "@/lib/billing/constants";
import { FileText, Download, Search, ArrowUpDown } from "lucide-react";

interface InvoiceCenterProps {
  invoices: BillingInvoice[];
  loading?: boolean;
  error?: string;
  onDownload?: (invoiceId: string) => void;
}

export function InvoiceCenter({ invoices, loading, error, onDownload }: InvoiceCenterProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = [...invoices];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((inv) =>
        inv.id.toLowerCase().includes(q) ||
        inv.planCode.toLowerCase().includes(q) ||
        inv.planName.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "ALL") {
      list = list.filter((inv) => inv.status === statusFilter);
    }

    list.sort((a, b) => {
      const dateA = new Date(a.issuedAt).getTime();
      const dateB = new Date(b.issuedAt).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [invoices, search, statusFilter, sortAsc]);

  const toggleSort = useCallback(() => setSortAsc((prev) => !prev), []);

  if (invoices.length === 0 && !loading && !error) {
    return <DashboardWidget title="Invoices" icon={FileText} empty emptyMessage="No invoices yet. Invoices will appear after your first payment."><></></DashboardWidget>;
  }

  return (
    <DashboardWidget
      title="Invoices"
      icon={FileText}
      description={`${invoices.length} total invoices`}
      loading={loading}
      error={error}
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input pl-8 py-1.5 text-xs w-40"
              aria-label="Search invoices"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "ALL")}
            className="admin-input py-1.5 text-xs w-28"
            aria-label="Filter by status"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-label="Invoice list">
          <thead>
            <tr className="border-b border-white/10">
              <th scope="col" className="text-left py-2.5 px-2 text-xs text-zinc-500 font-medium">
                <button onClick={toggleSort} className="flex items-center gap-1 hover:text-zinc-300" aria-label={`Sort by date ${sortAsc ? "descending" : "ascending"}`}>
                  Date <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                </button>
              </th>
              <th scope="col" className="text-left py-2.5 px-2 text-xs text-zinc-500 font-medium">Invoice</th>
              <th scope="col" className="text-left py-2.5 px-2 text-xs text-zinc-500 font-medium">Plan</th>
              <th scope="col" className="text-right py-2.5 px-2 text-xs text-zinc-500 font-medium">Amount</th>
              <th scope="col" className="text-center py-2.5 px-2 text-xs text-zinc-500 font-medium">Status</th>
              <th scope="col" className="text-right py-2.5 px-2 text-xs text-zinc-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const st = formatInvoiceStatus(inv.status);
              return (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-2 text-xs text-zinc-400 whitespace-nowrap">{formatDate(inv.issuedAt)}</td>
                  <td className="py-2.5 px-2 text-xs text-zinc-300 font-mono">{inv.id.slice(0, 8)}...</td>
                  <td className="py-2.5 px-2 text-xs text-zinc-300">{inv.planCode.replace(/_/g, " ")}</td>
                  <td className="py-2.5 px-2 text-xs text-zinc-300 text-right">{formatCurrency(inv.total, inv.currency)}</td>
                  <td className="py-2.5 px-2 text-center">
                    <Badge variant={st.variant} size="sm">{st.label}</Badge>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    {inv.invoiceUrl && (
                      <Button size="sm" variant="ghost" onClick={() => onDownload?.(inv.id)} aria-label={`Download invoice ${inv.id.slice(0, 8)}`}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-4">No invoices match your filter criteria.</p>
      )}
    </DashboardWidget>
  );
}
