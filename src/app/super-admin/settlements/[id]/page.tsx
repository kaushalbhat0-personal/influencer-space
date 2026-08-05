import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { settlementService } from "@/lib/settlement";
import { partnerLedgerService } from "@/lib/ledger/partner-ledger";
import { commissionService } from "@/lib/commission";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-zinc-500/20 text-zinc-400", READY: "bg-blue-500/20 text-blue-400",
  APPROVED: "bg-emerald-500/20 text-emerald-400", REJECTED: "bg-red-500/20 text-red-400",
  PROCESSING: "bg-amber-500/20 text-amber-400", PAID: "bg-emerald-600/30 text-emerald-300",
  CANCELLED: "bg-zinc-500/20 text-zinc-500", FAILED: "bg-red-500/20 text-red-400",
  ARCHIVED: "bg-zinc-600/30 text-zinc-500",
};

export default async function SettlementDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;

  const settlement = await settlementService.getSettlement(params.id);
  if (!settlement) notFound();

  const ledgerEntries = await partnerLedgerService.getEntries({ limit: 100 });
  const settlementLedger = ledgerEntries.items.filter((e) => e.settlementId === params.id);

  const commissionEntries = settlement.items.map((item) => {
    const entry = commissionService.getEntry(item.commissionEntryId);
    return { id: item.id, commissionEntryId: item.commissionEntryId, amount: item.amount, status: item.status, planCode: entry?.planCode ?? "—", invoiceId: entry?.invoiceId ?? "—" };
  });

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/super-admin/settlements" className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 block">← Back to Settlements</Link>
            <h1 className="text-2xl font-bold text-white">{settlement.settlementRef}</h1>
            <p className="mt-1 text-sm text-zinc-400">{settlement.partnerName || settlement.partnerId.slice(0, 8)}</p>
          </div>
          <span className={`rounded px-3 py-1 text-sm font-semibold ${STATUS_COLORS[settlement.status]}`}>{settlement.status}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Total Amount</p><p className="mt-1 text-lg font-bold text-white">₹{settlement.totalAmount.toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Fee</p><p className="mt-1 text-lg font-bold text-white">₹{settlement.feeAmount.toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Net Amount</p><p className="mt-1 text-lg font-bold text-emerald-400">₹{settlement.netAmount.toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Entries</p><p className="mt-1 text-lg font-bold text-white">{settlement.entryCount}</p></div>
        </div>

        {settlement.transferRef && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs text-emerald-400 font-semibold">Transfer Reference</p>
            <p className="mt-1 text-sm font-mono text-emerald-300">{settlement.transferRef}</p>
            {settlement.transferMethod && <p className="text-xs text-zinc-500 mt-1">Method: {settlement.transferMethod}</p>}
            {settlement.paidAt && <p className="text-xs text-zinc-500">Paid: {settlement.paidAt.toLocaleString()}</p>}
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Commission Entries</h2>
          <div className="space-y-2">
            {commissionEntries.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800/30 px-3 py-2 text-xs">
                <div>
                  <p className="text-zinc-300">{item.planCode || "—"} {item.invoiceId ? `· ${item.invoiceId}` : ""}</p>
                </div>
                <span className="font-mono text-emerald-400">₹{item.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>

        {settlementLedger.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Ledger Entries</h2>
            <div className="space-y-1">
              {settlementLedger.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{e.type}</span>
                  <span className="font-mono">₹{e.amount.toLocaleString("en-IN")}</span>
                  <span className="text-zinc-600">{e.createdAt.toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {settlement.notes && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-white">Notes</h2>
            <p className="text-sm text-zinc-400">{settlement.notes}</p>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Timeline</h2>
          <div className="space-y-2 text-xs text-zinc-500">
            <p>Created: {settlement.createdAt.toLocaleString()}</p>
            {settlement.approvedAt && <p>Approved: {settlement.approvedAt.toLocaleString()} by {settlement.approvedBy || "—"}</p>}
            {settlement.processedAt && <p>Processed: {settlement.processedAt.toLocaleString()}</p>}
            {settlement.paidAt && <p>Paid: {settlement.paidAt.toLocaleString()}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
