"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import Link from "next/link";

interface ClientRow { id: string; name: string; subdomain: string | null; createdAt: Date; plans: number; status: string; }

export function ClientsTable({ data }: { data: ClientRow[] }) {
  const cols: Column<ClientRow>[] = [
    { key: "name", header: "Name", sortable: true, cell: (r) => (
      <Link href={`/super-admin/tenants/${r.id}`} className="text-s8ul-cyan hover:underline text-sm">{r.name}</Link>
    )},
    { key: "subdomain", header: "Domain", sortable: true, cell: (r) => <span className="text-zinc-400 text-xs font-mono">{r.subdomain ?? "—"}</span> },
    { key: "createdAt", header: "Created", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>{r.status}</span>
    )},
  ];

  return <DataTable columns={cols} data={data} pageSize={20} searchable searchPlaceholder="Search clients..." emptyMessage="No clients found." />;
}
