"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";

interface CustomerRow {
  email: string;
  totalSpent: number;
  orderCount: number;
  lastOrder: string;
}

const columns: Column<CustomerRow>[] = [
  { key: "email", header: "Email", sortable: true, cell: (r) => <span className="text-white text-sm">{r.email}</span> },
  { key: "totalSpent", header: "Total Spent", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">₹{r.totalSpent.toLocaleString("en-IN")}</span> },
  { key: "orderCount", header: "Orders", sortable: true, cell: (r) => <span className="text-zinc-400">{r.orderCount}</span> },
  {
    key: "lastOrder", header: "Last Order", sortable: true, cell: (r) => (
      <span className="text-zinc-500 text-xs">{new Date(r.lastOrder).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
    ),
  },
];

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={customers}
      pageSize={15}
      searchable
      searchPlaceholder="Search customers by email..."
      emptyMessage="No customers yet. Customers appear when someone makes a purchase."
    />
  );
}
