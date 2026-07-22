import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ImportHistoryPage() {
  const imports = await prisma.creatorImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const total = await prisma.creatorImport.count();
  const completed = imports.filter((i) => i.status === "COMPLETED").length;
  const failed = imports.filter((i) => i.status === "FAILED").length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Creator Imports</h1>
        <p className="mt-1 text-sm text-zinc-400">Complete import history for every creator onboarding.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total Imports</p>
          <p className="text-2xl font-bold text-white mt-1">{total}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Completed</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{completed}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Failed</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{failed}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Cache Hit Rate</p>
          <p className="text-2xl font-bold text-white mt-1">
            {total > 0 ? `${Math.round((imports.filter((i) => i.cacheHit).length / imports.length) * 100)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Import Table */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase border-b border-white/5">
              <th className="p-3 font-medium">Creator</th>
              <th className="p-3 font-medium">Provider</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Cache</th>
              <th className="p-3 font-medium">Duration</th>
              <th className="p-3 font-medium">Started</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => {
              const errors = imp.errors as string[];
              return (
                <tr key={imp.id} className="border-b border-white/5 text-sm hover:bg-white/[0.02]">
                  <td className="p-3 text-white">{imp.creatorName}</td>
                  <td className="p-3 text-zinc-400">{imp.provider || "—"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      imp.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" :
                      imp.status === "FAILED" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {imp.status}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-500">
                    {imp.provider ? (imp.cacheHit ? "Hit" : "Miss") : "—"}
                  </td>
                  <td className="p-3 text-zinc-400">
                    {imp.durationMs ? `${(imp.durationMs / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="p-3 text-zinc-500 text-xs">
                    {imp.createdAt.toISOString().slice(0, 16)}
                  </td>
                  <td className="p-3">
                    {imp.tenantId && (
                      <div className="flex gap-2">
                        <Link href={`/super-admin/tenants/${imp.tenantId}`} className="text-xs text-s8ul-cyan hover:underline">
                          View
                        </Link>
                        {imp.status === "FAILED" && errors.length > 0 && (
                          <span className="text-xs text-red-500" title={errors.join(", ")}>
                            Error
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {imports.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500 text-sm">
                  No imports yet. Import a creator to see history.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
