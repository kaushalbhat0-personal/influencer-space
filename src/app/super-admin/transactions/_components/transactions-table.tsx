"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";

export interface TxnRow { id: string; type: string; creator: string; amount: string; status: string; createdAt: string; }

const columns: Column<TxnRow>[] = [
  { key: "type", header: "Type", sortable: true, cell: (r) => <span className="text-xs font-medium uppercase text-indigo-400">{r.type}</span> },
  { key: "creator", header: "Creator/Product", sortable: true, cell: (r) => <span className="text-white text-sm">{r.creator}</span> },
  { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium">{r.amount}</span> },
  { key: "status", header: "Status", sortable: true, cell: (r) => <BillingStatusBadge status={r.status} /> },
  { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
];

export function TransactionsTable({ data }: { data: TxnRow[] }) {
  return <DataTable columns={columns} data={data} pageSize={25} emptyMessage="No transactions recorded." />;
}
