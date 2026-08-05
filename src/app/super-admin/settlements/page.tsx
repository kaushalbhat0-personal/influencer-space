import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { settlementService, type SettlementStatus } from "@/lib/settlement";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUSES: SettlementStatus[] = ["PENDING", "READY", "APPROVED", "PROCESSING", "PAID", "FAILED", "CANCELLED", "ARCHIVED"];
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-zinc-500/20 text-zinc-400", READY: "bg-blue-500/20 text-blue-400",
  APPROVED: "bg-emerald-500/20 text-emerald-400", REJECTED: "bg-red-500/20 text-red-400",
  PROCESSING: "bg-amber-500/20 text-amber-400", PAID: "bg-emerald-600/30 text-emerald-300",
  CANCELLED: "bg-zinc-500/20 text-zinc-500", FAILED: "bg-red-500/20 text-red-400",
  ARCHIVED: "bg-zinc-600/30 text-zinc-500",
};

export default async function SettlementsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;

  const filterStatus = (searchParams.status as SettlementStatus) || undefined;
  const { items, total } = await settlementService.listSettlements({ status: filterStatus, limit: 200 });

  const pendingTotal = items.filter((s) => s.status === "PENDING" || s.status === "READY" || s.status === "APPROVED").reduce((sum, s) => sum + s.netAmount, 0);
  const paidThisMonth = items.filter((s) => s.status === "PAID" && s.paidAt && new Date(s.paidAt) > new Date(Date.now() - 30 * 86400000)).reduce((sum, s) => sum + s.netAmount, 0);

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Settlement Queue</h1><p className="mt-1 text-sm text-zinc-400">{total} settlements</p></div>
          <div className="flex gap-2">
            <Link href="/super-admin/partner-ledger" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Partner Ledger →</Link>
            <Link href="/super-admin/finance" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Finance Dashboard →</Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Outstanding Liability</p><p className="mt-1 text-xl font-bold text-amber-400">₹{pendingTotal.toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Paid This Month</p><p className="mt-1 text-xl font-bold text-emerald-400">₹{paidThisMonth.toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Total Settlements</p><p className="mt-1 text-xl font-bold text-white">{total}</p></div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/super-admin/settlements" className={`rounded-lg px-3 py-1.5 text-xs ${!filterStatus ? "bg-white/10 text-white" : "border border-white/10 text-zinc-400 hover:bg-white/5"}`}>All</Link>
          {STATUSES.map((s) => (
            <Link key={s} href={`/super-admin/settlements?status=${s}`} className={`rounded-lg px-3 py-1.5 text-xs ${filterStatus === s ? "bg-white/10 text-white" : "border border-white/10 text-zinc-400 hover:bg-white/5"}`}>{s}</Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/50">
          <table className="w-full text-xs" data-testid="settlements-table">
            <thead><tr className="border-b border-white/5 text-zinc-500">
              <th className="px-4 py-3 text-left">Ref</th><th className="px-4 py-3 text-left">Partner</th>
              <th className="px-4 py-3 text-left">Amount</th><th className="px-4 py-3 text-left">Entries</th>
              <th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Transfer</th>
              <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Actions</th>
            </tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-zinc-500">No settlements found.</td></tr>
              ) : items.map((s) => (
                <tr key={s.id} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-zinc-500"><Link href={`/super-admin/settlements/${s.id}`} className="text-s8ul-cyan hover:underline">{s.settlementRef}</Link></td>
                  <td className="px-4 py-3">{s.partnerName || s.partnerId.slice(0, 8)}</td>
                  <td className="px-4 py-3">₹{s.netAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">{s.entryCount}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[s.status] ?? ""}`}>{s.status}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{s.transferRef ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{s.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/super-admin/settlements/${s.id}`} className="text-s8ul-cyan hover:underline text-xs">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
