"use client";

import { DataTable } from "@/components/data/DataTable";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";
import type { Column } from "@/components/data/DataTable";

interface PaymentRow { id: string; product: string; amount: number; status: string; fanEmail: string | null; createdAt: string; }

const columns: Column<PaymentRow>[] = [
  { key: "product", header: "Product", sortable: true, cell: (r) => <span className="text-white text-sm">{r.product}</span> },
  { key: "fanEmail", header: "Customer", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.fanEmail ?? "—"}</span> },
  { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">₹{r.amount}</span> },
  { key: "status", header: "Status", sortable: true, cell: (r) => <BillingStatusBadge status={r.status} /> },
  { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
];

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  return <DataTable columns={columns} data={payments} pageSize={25} searchable searchPlaceholder="Search by product or customer..." emptyMessage="No payments recorded." />;
}
