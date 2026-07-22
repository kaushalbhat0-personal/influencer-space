import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/data/DataTable";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";
import type { Column } from "@/components/data/DataTable";

export const dynamic = "force-dynamic";

interface TxnRow { id: string; type: string; creator: string; amount: string; status: string; createdAt: Date; }

export default async function TransactionsPage() {
  let txns: TxnRow[] = [];
  try {
    const orders = await prisma.productOrder.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      include: { product: { select: { name: true } } },
    });
    txns = orders.map((o) => ({
      id: o.id, type: "order", creator: o.product?.name ?? "—",
      amount: `₹${o.amount}`, status: o.status, createdAt: o.createdAt,
    }));
  } catch { /* */ }

  const cols: Column<TxnRow>[] = [
    { key: "type", header: "Type", sortable: true, cell: (r) => <span className="text-xs font-medium uppercase text-indigo-400">{r.type}</span> },
    { key: "creator", header: "Creator/Product", sortable: true, cell: (r) => <span className="text-white text-sm">{r.creator}</span> },
    { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium">{r.amount}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => <BillingStatusBadge status={r.status} /> },
    { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="mt-1 text-sm text-zinc-400">Unified billing event timeline.</p>
      </div>
      <DataTable columns={cols} data={txns} pageSize={25} emptyMessage="No transactions recorded." />
    </div>
  );
}
