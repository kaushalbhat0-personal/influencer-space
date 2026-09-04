import { prisma } from "@/lib/prisma";
import { themeRegistry } from "@/lib/theme/registry-new";
import Link from "next/link";
import { Globe, Activity, Palette, CheckCircle, AlertCircle, Search, Filter } from "lucide-react";
import { WebsiteFilters } from "./_components/website-filters";

export const dynamic = "force-dynamic";

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const query = searchParams.q?.toLowerCase() ?? "";
  const statusFilter = searchParams.status ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = 50;

  // VALIDATION-04: build ONE `where` — the status filter was previously
  // discarded whenever a query was present, so ?status=live filtered nothing.
  const searchWhere = query
    ? {
        OR: [
          { tenant: { name: { contains: query } } },
          { tenant: { subdomain: { contains: query } } },
          { tenant: { customDomain: { contains: query } } },
          { themePackageId: { contains: query } },
        ],
      }
    : {};
  const where = {
    ...searchWhere,
    ...(statusFilter ? { publishStatus: { state: statusFilter } } : {}),
  };

  const [websites, totalCount, statusCounts] = await Promise.all([
    prisma.website.findMany({
      include: {
        tenant: { select: { id: true, name: true, subdomain: true, customDomain: true } },
        publishStatus: { select: { state: true, liveVersion: true, publishedAt: true } },
      },
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.website.count({ where }),
    prisma.publishStatus.groupBy({ by: ["state"], _count: true }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const stateCounts = Object.fromEntries(statusCounts.map((s) => [s.state, s._count]));

  const filteredWebsites = websites.filter((w) => {
    if (query && !w.tenant.name.toLowerCase().includes(query) &&
        !w.tenant.subdomain.toLowerCase().includes(query) &&
        !(w.tenant.customDomain?.toLowerCase() ?? "").includes(query) &&
        !(w.themePackageId?.toLowerCase() ?? "").includes(query)) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Websites</h1>
        <p className="mt-1 text-sm text-zinc-400">{totalCount} websites across all creators</p>
      </div>

      <WebsiteFilters
        totalCount={totalCount}
        stateCounts={stateCounts as Record<string, number>}
        currentQuery={query}
        currentStatus={statusFilter}
      />

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Creator</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Theme</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Publishing</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredWebsites.map((w) => {
              const themeName = w.themePackageId ? themeRegistry.getById(w.themePackageId)?.name ?? w.themePackageId : null;
              return (
                <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/super-admin/tenants/${w.tenant.id}`} className="text-white hover:text-[var(--brand-primary)] transition-colors">
                      {w.tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {w.tenant.customDomain ?? `${w.tenant.subdomain}.localhost`}
                  </td>
                  <td className="px-4 py-3">
                    {themeName ? (
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Palette className="h-3 w-3 text-zinc-500" />
                        {themeName}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {w.publishStatus ? (
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${
                          w.publishStatus.state === "live" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                        }`}>
                          {w.publishStatus.state === "live" ? <CheckCircle className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                          {w.publishStatus.state}
                        </span>
                        {w.publishStatus.liveVersion && <span className="text-[10px] text-zinc-600">v{w.publishStatus.liveVersion}</span>}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/${w.tenant.subdomain}`} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                        <Globe className="h-3 w-3" /> View
                      </Link>
                      <Link href={`/super-admin/tenants/${w.tenant.id}`} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                        <Activity className="h-3 w-3" /> Details
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredWebsites.length === 0 && (
        <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900/50 p-12 text-center">
          <Search className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No websites match your search criteria.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/super-admin/websites?page=${p}${query ? `&q=${query}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                p === page ? "bg-[var(--brand-primary)] text-white" : "text-zinc-400 hover:text-white border border-white/10"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
