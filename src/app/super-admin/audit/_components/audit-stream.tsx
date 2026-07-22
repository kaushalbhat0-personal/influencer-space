"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

interface LogRow {
  id: string;
  tenantId: string;
  action: string;
  metadata: unknown;
  createdAt: string;
  tenant: { name: string; subdomain: string } | null;
}

export function AuditStream({
  logs,
  tenants,
  page,
  totalPages,
}: {
  logs: LogRow[];
  tenants: { id: string; name: string }[];
  page: number;
  totalPages: number;
}) {
  const router = useRouter();

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by action..."
          className="admin-input w-64"
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            params.set("action", e.target.value);
            params.delete("page");
            router.push(`?${params.toString()}`);
          }}
        />
        <select
          className="admin-input w-48"
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            if (e.target.value) params.set("tenant", e.target.value);
            else params.delete("tenant");
            params.delete("page");
            router.push(`?${params.toString()}`);
          }}
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>Time</th>
              <th>Tenant</th>
              <th>Action</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="text-xs text-zinc-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="text-xs text-zinc-400">
                  {log.tenant?.name || log.tenantId.slice(0, 8)}
                </td>
                <td>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-s8ul-cyan">
                    {log.action}
                  </span>
                </td>
                <td className="max-w-xs truncate font-mono text-[11px] text-zinc-600">
                  {typeof log.metadata === "object" && log.metadata !== null
                    ? JSON.stringify(log.metadata)
                    : String(log.metadata ?? "")}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-zinc-600 py-8">
                  No audit entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <Link
              key={i}
              href={`?page=${i + 1}`}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                page === i + 1
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-zinc-600 hover:text-zinc-300"
              }`}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
