"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";

interface ClientRow { id: string; name: string; subdomain: string | null; products: number; status: string; }

export function AgencyClientsTable({ data }: { data: ClientRow[] }) {
  const cols: Column<ClientRow>[] = [
    { key: "name", header: "Client", sortable: true, cell: (r) => <span className="text-white text-sm">{r.name}</span> },
    { key: "subdomain", header: "Domain", sortable: true, cell: (r) => <span className="text-zinc-400 text-xs font-mono">{r.subdomain ?? "—"}</span> },
    { key: "products", header: "Products", sortable: true, cell: (r) => <span className="text-zinc-300">{r.products}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>{r.status}</span>
    )},
  ];

  return <DataTable columns={cols} data={data} pageSize={15} searchable searchPlaceholder="Search clients..." emptyMessage="No clients found." />;
}
