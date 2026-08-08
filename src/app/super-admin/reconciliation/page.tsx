import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { partnerLedgerService } from "@/lib/ledger/partner-ledger";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;

  const [commissionEntries, ledgerEntries, settlements] = await Promise.all([
    prisma.commissionEntry.findMany({ orderBy: { createdAt: "desc" }, take: 1000 }),
    partnerLedgerService.getEntries({ limit: 1000 }),
    prisma.settlement.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  // Find orphan commissions (entries not linked to any ledger entry)
  const ledgerCommissionIds = new Set(ledgerEntries.items.filter((e) => e.commissionId).map((e) => e.commissionId));
  const orphanCommissions = commissionEntries.filter((e) => !ledgerCommissionIds.has(e.id));

  // Find negative balances
  const negativeBalances = ledgerEntries.items.filter((e) => e.balanceAfter < 0);

  // Find duplicate settlements (multiple settlements with same commission entries)
  const commissionSettlementMap = new Map<string, string[]>();
  for (const s of settlements) {
    for (const item of s.items) {
      const existing = commissionSettlementMap.get(item.commissionEntryId) || [];
      existing.push(s.id);
      commissionSettlementMap.set(item.commissionEntryId, existing);
    }
  }
  const duplicateSettlements = Array.from(commissionSettlementMap.entries()).filter(([, ids]) => ids.length > 1);

  const partnerIds = Array.from(new Set(ledgerEntries.items.map((e) => e.partnerId)));
  const ledgerImbalances: Array<{ partnerId: string; balance: number; expectedBalance: number }> = [];
  for (const pid of partnerIds) {
    const entries = ledgerEntries.items.filter((e) => e.partnerId === pid);
    const lastBalance = entries[0]?.balanceAfter ?? 0;
    const computedBalance = entries.reduce((sum, e) => sum + e.amount, 0);
    if (Math.abs(lastBalance - computedBalance) > 0.01) {
      ledgerImbalances.push({ partnerId: pid, balance: lastBalance, expectedBalance: computedBalance });
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Reconciliation Center</h1><p className="mt-1 text-sm text-zinc-400">Audit-only · no automatic repairs</p></div>
          <Link href="/super-admin/finance" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5">Finance Dashboard →</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Orphan Commissions</h2>
            <p className="text-xs text-zinc-500 mb-2">Commission entries not linked to any ledger entry</p>
            {orphanCommissions.length === 0 ? (
              <p className="text-xs text-emerald-400">✅ No orphans found</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {orphanCommissions.map((e) => <div key={e.id} className="flex justify-between text-xs text-red-400"><span className="font-mono">{e.id.slice(0, 12)}</span><span>{formatCurrency(e.amount)}</span></div>)}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Negative Balances</h2>
            <p className="text-xs text-zinc-500 mb-2">Partner ledgers with negative running balance</p>
            {negativeBalances.length === 0 ? (
              <p className="text-xs text-emerald-400">✅ No negative balances</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {negativeBalances.map((e) => <div key={e.id} className="flex justify-between text-xs text-red-400"><span className="font-mono">{e.partnerId.slice(0, 8)}</span><span>{formatCurrency(e.balanceAfter)}</span></div>)}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Duplicate Settlements</h2>
            <p className="text-xs text-zinc-500 mb-2">Commission entries in multiple settlements</p>
            {duplicateSettlements.length === 0 ? (
              <p className="text-xs text-emerald-400">✅ No duplicates</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {duplicateSettlements.map(([ceId, ids]) => <div key={ceId} className="flex justify-between text-xs text-red-400"><span className="font-mono">{ceId.slice(0, 12)}</span><span>in {ids.length} settlements</span></div>)}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Ledger Integrity</h2>
            <p className="text-xs text-zinc-500 mb-2">Running balance vs computed balance mismatch</p>
            {ledgerImbalances.length === 0 ? (
              <p className="text-xs text-emerald-400">✅ All ledgers balanced</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {ledgerImbalances.map((lb) => <div key={lb.partnerId} className="flex justify-between text-xs text-red-400"><span className="font-mono">{lb.partnerId.slice(0, 8)}</span><span>last: {formatCurrency(lb.balance)} ≠ computed: {formatCurrency(lb.expectedBalance)}</span></div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
