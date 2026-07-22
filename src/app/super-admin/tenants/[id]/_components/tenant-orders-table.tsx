"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";

export interface OrderRow { id: string; productName: string; amount: number; status: string; createdAt: string; }

const columns: Column<OrderRow>[] = [
  { key: "productName", header: "Product", sortable: true, cell: (r) => <span className="text-white text-sm">{r.productName}</span> },
  { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">₹{r.amount}</span> },
  { key: "status", header: "Status", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.status}</span> },
  { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
];

export function TenantOrdersTable({ data }: { data: OrderRow[] }) {
  return <DataTable columns={columns} data={data} pageSize={10} emptyMessage="No orders yet for this tenant." />;
}
