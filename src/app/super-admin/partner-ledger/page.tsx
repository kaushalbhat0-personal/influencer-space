import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { partnerLedgerService } from "@/lib/ledger/partner-ledger";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_COLORS: Record<string, string> = {
  COMMISSION_EARNED: "text-emerald-400",
  COMMISSION_ADJUSTMENT: "text-amber-400",
  COMMISSION_REVERSED: "text-red-400",
  SETTLEMENT_CREATED: "text-blue-400",
  SETTLEMENT_PAID: "text-emerald-300",
  SETTLEMENT_CANCELLED: "text-zinc-500",
  MANUAL_CREDIT: "text-emerald-400",
  MANUAL_DEBIT: "text-red-400",
  RECONCILIATION: "text-indigo-400",
};

export default async function PartnerLedgerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;
  }

  const { items, total } = await partnerLedgerService.getEntries({ limit: 200 });

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Partner Ledger</h1>
            <p className="mt-1 text-sm text-zinc-400">{total} entries · append-only accounting</p>
          </div>
          <div className="flex gap-2">
            <Link href="/super-admin/settlements" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Settlement Queue →</Link>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/50">
          <table className="w-full text-xs" data-testid="partner-ledger-table">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Partner</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Balance</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No ledger entries yet. Entries appear when commission is earned and settlements are processed.</td></tr>
              ) : (
                items.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{e.createdAt.toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{e.partnerId.slice(0, 8)}</td>
                    <td className={`px-4 py-3 font-semibold ${TYPE_COLORS[e.type] ?? "text-zinc-400"}`}>{e.type}</td>
                    <td className={`px-4 py-3 font-mono ${e.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>{e.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(e.amount))}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{formatCurrency(e.balanceAfter)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{e.reference?.slice(0, 24) ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 truncate max-w-[200px]">{e.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
