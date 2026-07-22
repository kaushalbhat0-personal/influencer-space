"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";

export interface WebhookRow { id: string; action: string; metadata: string; createdAt: string; }

const columns: Column<WebhookRow>[] = [
  { key: "action", header: "Event", sortable: true, cell: (r) => <span className="text-indigo-400 text-sm font-medium">{r.action}</span> },
  { key: "metadata", header: "Details", cell: (r) => <span className="text-zinc-500 text-xs font-mono">{r.metadata}...</span> },
  { key: "createdAt", header: "Received", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")} {new Date(r.createdAt).toLocaleTimeString("en-IN")}</span> },
];

export function WebhooksTable({ data }: { data: WebhookRow[] }) {
  return <DataTable columns={columns} data={data} pageSize={25} emptyMessage="No webhook events recorded." />;
}
