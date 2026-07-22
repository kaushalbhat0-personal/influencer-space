"use client";

import { DataTable } from "@/components/data/DataTable";
import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/components/data/DataTable";
import type { OrderRow } from "@/actions/order.actions";

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  PAID: "success",
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "default",
};

const columns: Column<OrderRow>[] = [
  { key: "productName", header: "Product", sortable: true, cell: (r) => <span className="text-white text-sm">{r.productName}</span> },
  { key: "fanEmail", header: "Customer", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.fanEmail ?? "—"}</span> },
  { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">{formatINR(r.amount)}</span> },
  {
    key: "status", header: "Status", sortable: true, cell: (r) => (
      <Badge variant={STATUS_VARIANT[r.status] ?? "default"} size="sm">{r.status}</Badge>
    ),
  },
  { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{formatDate(r.createdAt)}</span> },
  { key: "razorpayOrderId", header: "Order ID", cell: (r) => <span className="text-zinc-500 text-xs font-mono">{r.razorpayOrderId.slice(0, 12)}...</span> },
];

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={orders}
      pageSize={15}
      searchable
      searchPlaceholder="Search orders by product or email..."
      emptyMessage="No orders found. Share your storefront to start receiving orders."
    />
  );
}
