"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";

export interface InvoiceRow { id: string; creator: string; product: string; amount: number; status: string; createdAt: string; }

const columns: Column<InvoiceRow>[] = [
  { key: "creator", header: "Creator", sortable: true, cell: (r) => <span className="text-white text-sm">{r.creator}</span> },
  { key: "product", header: "Product", sortable: true, cell: (r) => <span className="text-zinc-300 text-sm">{r.product}</span> },
  { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">₹{r.amount}</span> },
  { key: "status", header: "Status", sortable: true, cell: (r) => <BillingStatusBadge status={r.status} /> },
  { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
];

export function InvoicesTable({ data }: { data: InvoiceRow[] }) {
  return <DataTable columns={columns} data={data} pageSize={25} searchable searchPlaceholder="Search by creator or product..." emptyMessage="No invoices recorded." />;
}
