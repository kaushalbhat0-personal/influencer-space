"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";

interface WebsiteRow { name: string; url: string; products: number; isActive: boolean; }

export function WebsitesTable({ data }: { data: WebsiteRow[] }) {
  const cols: Column<WebsiteRow>[] = [
    { key: "name", header: "Creator", sortable: true, cell: (r) => <span className="text-white text-sm">{r.name}</span> },
    { key: "url", header: "URL", sortable: true, cell: (r) => (
      <a href={`https://${r.url}`} target="_blank" rel="noopener noreferrer" className="text-s8ul-cyan hover:underline text-xs font-mono">{r.url}</a>
    )},
    { key: "products", header: "Products", sortable: true, cell: (r) => <span className="text-zinc-300">{r.products}</span> },
    { key: "isActive", header: "Active", sortable: true, cell: (r) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.isActive ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>{r.isActive ? "Active" : "Inactive"}</span>
    )},
  ];

  return <DataTable columns={cols} data={data} pageSize={20} searchable searchPlaceholder="Search websites..." />;
}
