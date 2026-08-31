import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listAgencyCommissions, getAgencyCommissionSummary } from "@/lib/agency-commission/service";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { AgencyCommissionsClient } from "./_components/agency-commissions-client";

export const dynamic = "force-dynamic";

export default async function AgencyCommissionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/admin/login");

  const agencyId = searchParams.agencyId || undefined;
  const tenantId = searchParams.tenantId || undefined;
  const status = searchParams.status || undefined;
  const dateFrom = searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined;
  const dateTo = searchParams.dateTo ? new Date(searchParams.dateTo) : undefined;
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.limit ?? "20") || 20));

  const [list, summary, agencies, tenants] = await Promise.all([
    listAgencyCommissions({ agencyId, tenantId, status, dateFrom, dateTo, page, limit }),
    getAgencyCommissionSummary(agencyId),
    prisma.websiteAgency.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.tenant.findMany({ select: { id: true, name: true, subdomain: true }, orderBy: { name: "asc" }, take: 200 }),
  ]);

  // Hydrate names for table
  const agencyMap = new Map<string, string>(agencies.map((a) => [a.id, a.name]));
  const tenantMap = new Map<string, { id: string; name: string; subdomain: string }>(tenants.map((t) => [t.id, t]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Agency Commissions</h1>
        <p className="mt-1 text-sm text-zinc-400">Operational accounting view — manual payouts only. No automated transfers.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total Eligible Sales</p>
          <p className="mt-1 text-xl font-bold text-white">{formatCurrency(summary.totalEligibleSales)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total Commission Earned</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{formatCurrency(summary.totalCommissionEarned)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total Commission Paid</p>
          <p className="mt-1 text-xl font-bold text-blue-400">{formatCurrency(summary.totalCommissionPaid)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total Commission Outstanding</p>
          <p className="mt-1 text-xl font-bold text-amber-400">{formatCurrency(summary.totalCommissionOutstanding)}</p>
        </div>
      </div>

      <AgencyCommissionsClient
        list={JSON.parse(JSON.stringify(list))}
        agencies={agencies}
        tenants={tenants}
        agencyMap={Object.fromEntries(agencyMap) as Record<string, string>}
        tenantMap={Object.fromEntries(tenantMap) as Record<string, { id: string; name: string; subdomain: string }>}
        summary={summary}
        currentFilters={{ agencyId: agencyId ?? "", tenantId: tenantId ?? "", status: status ?? "", dateFrom: searchParams.dateFrom ?? "", dateTo: searchParams.dateTo ?? "" }}
      />
    </div>
  );
}
