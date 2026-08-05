import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settlementService } from "@/lib/settlement";
import { partnerLedgerService } from "@/lib/ledger/partner-ledger";
import { revenueService } from "@/modules/billing/application/revenue-service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;

  const [revenue, settlements, allSettlements] = await Promise.all([
    revenueService.getRevenueDashboard().catch(() => null),
    settlementService.listSettlements({ limit: 500 }),
    settlementService.listSettlements({ limit: 500 }),
  ]);

  const pendingTotal = settlements.items.filter((s) => ["PENDING", "READY", "APPROVED"].includes(s.status)).reduce((sum, s) => sum + s.netAmount, 0);
  const processingTotal = settlements.items.filter((s) => s.status === "APPROVED").reduce((sum, s) => sum + s.netAmount, 0);
  const paidThisMonth = settlements.items.filter((s) => s.status === "PAID" && s.paidAt && new Date(s.paidAt) > new Date(Date.now() - 30 * 86400000)).reduce((sum, s) => sum + s.netAmount, 0);
  const avgSettlement = settlements.items.length > 0 ? settlements.items.reduce((sum, s) => sum + s.netAmount, 0) / settlements.items.length : 0;
  const settlementSuccessRate = settlements.items.length > 0 ? (settlements.items.filter((s) => s.status === "PAID" || s.status === "ARCHIVED").length / settlements.items.length * 100) : 0;

  const partnerBalances = await Promise.all(
    Array.from(new Set(allSettlements.items.map((s) => s.partnerId))).map(async (pid) => {
      const bal = await partnerLedgerService.getBalance(pid);
      return { partnerId: pid, available: bal.available };
    })
  );
  const largestPartner = partnerBalances.sort((a, b) => b.available - a.available)[0];
  const totalPartnerLiability = partnerBalances.reduce((sum, p) => sum + p.available, 0);

  const pendingSettlements = settlements.items.filter((s) => s.status === "PENDING").length;
  const approvedAwaiting = settlements.items.filter((s) => s.status === "APPROVED").length;
  const failedCount = settlements.items.filter((s) => s.status === "FAILED").length;

  const commissionCount = await prisma.commissionEntry.count();
  const ledgerCount = (await partnerLedgerService.getEntries({ limit: 1 })).total;

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Finance Dashboard</h1><p className="mt-1 text-sm text-zinc-400">Manual operations · no automatic payouts</p></div>
          <div className="flex gap-2">
            <Link href="/super-admin/settlements" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Settlements →</Link>
            <Link href="/super-admin/partner-ledger" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Ledger →</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Outstanding Liability</p><p className="mt-1 text-xl font-bold text-amber-400">₹{totalPartnerLiability.toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Pending Settlements</p><p className="mt-1 text-xl font-bold text-blue-400">{pendingSettlements}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Approved · Awaiting Transfer</p><p className="mt-1 text-xl font-bold text-amber-400">{approvedAwaiting} · ₹{processingTotal.toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Paid This Month</p><p className="mt-1 text-xl font-bold text-emerald-400">₹{paidThisMonth.toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Avg Settlement</p><p className="mt-1 text-xl font-bold text-white">₹{Math.round(avgSettlement).toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Largest Partner</p><p className="mt-1 text-xl font-bold text-white">{largestPartner ? `₹${Math.round(largestPartner.available).toLocaleString("en-IN")}` : "—"}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Success Rate</p><p className="mt-1 text-xl font-bold text-emerald-400">{Math.round(settlementSuccessRate)}%</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Failed Settlements</p><p className={`mt-1 text-xl font-bold ${failedCount > 0 ? "text-red-400" : "text-zinc-400"}`}>{failedCount}</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Platform Revenue</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-zinc-500">MRR</p><p className="font-bold text-emerald-400">₹{revenue?.mrr?.toLocaleString("en-IN") ?? "0"}</p></div>
              <div><p className="text-zinc-500">ARR</p><p className="font-bold text-emerald-400">₹{revenue?.arr?.toLocaleString("en-IN") ?? "0"}</p></div>
              <div><p className="text-zinc-500">Active Subs</p><p className="font-bold text-white">{revenue?.activeSubscribers ?? 0}</p></div>
              <div><p className="text-zinc-500">ARPC</p><p className="font-bold text-white">₹{revenue?.averageRevenuePerCreator?.toLocaleString("en-IN") ?? "0"}</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Finance Health</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-zinc-500">Commission Entries</p><p className="font-bold text-white">{commissionCount}</p></div>
              <div><p className="text-zinc-500">Ledger Entries</p><p className="font-bold text-white">{ledgerCount}</p></div>
              <div><p className="text-zinc-500">Settlements</p><p className="font-bold text-white">{allSettlements.total}</p></div>
              <div><p className="text-zinc-500">Pending Liability</p><p className="font-bold text-amber-400">₹{pendingTotal.toLocaleString("en-IN")}</p></div>
            </div>
          </div>
        </div>

        {failedCount > 0 && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-red-400">Failed Settlements Requiring Attention</h2>
              <Link href="/super-admin/settlements?status=FAILED" className="text-xs text-red-400 hover:underline">View All →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
