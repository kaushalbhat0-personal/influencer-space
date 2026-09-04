"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import Link from "next/link";

interface ClientRow {
  id: string;
  name: string;
  subdomain: string | null;
  createdAt: Date;
  plans: number;
  status: string;
  healthScore?: number | null;
  publishState?: string | null;
}

export function ClientsTable({ data }: { data: ClientRow[] }) {
  const cols: Column<ClientRow>[] = [
    {
      key: "name", header: "Client", sortable: true,
      cell: (r) => (
        <Link href={`/agency/clients/${r.id}`} className="text-white hover:text-[var(--brand-primary)] text-sm transition-colors">
          {r.name}
        </Link>
      ),
    },
    {
      key: "publishState", header: "Status", sortable: true,
      cell: (r) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
          r.publishState === "live" ? "bg-emerald-500/10 text-emerald-400" :
          r.publishState === "preview" ? "bg-blue-500/10 text-blue-400" :
          "bg-zinc-800 text-zinc-500"
        }`}>
          {r.publishState ?? "draft"}
        </span>
      ),
    },
    {
      key: "healthScore", header: "Health", sortable: true,
      cell: (r) => (
        r.healthScore != null ? (
          <span className={`text-xs font-medium ${
            r.healthScore >= 80 ? "text-emerald-400" : r.healthScore >= 50 ? "text-amber-400" : "text-red-400"
          }`}>
            {r.healthScore}%
          </span>
        ) : <span className="text-zinc-600">—</span>
      ),
    },
    {
      key: "status", header: "Client Status", sortable: true,
      cell: (r) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
          r.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
          r.status === "lead" ? "bg-blue-500/10 text-blue-400" :
          r.status === "paused" ? "bg-amber-500/10 text-amber-400" :
          "bg-zinc-800 text-zinc-400"
        }`}>
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={cols}
      data={data}
      pageSize={20}
      searchable
      searchPlaceholder="Search clients..."
      emptyMessage="No clients found."
    />
  );
}
