import { prisma } from "@/lib/prisma";
import { TransactionsTable } from "./_components/transactions-table";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  let txns: { id: string; type: string; creator: string; amount: string; status: string; createdAt: string; }[] = [];
  try {
    const orders = await prisma.productOrder.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      include: { product: { select: { name: true } } },
    });
    txns = orders.map((o) => ({
      id: o.id, type: "order", creator: o.product?.name ?? "—",
      amount: `₹${o.amount}`, status: o.status, createdAt: o.createdAt.toISOString(),
    }));
  } catch { /* */ }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="mt-1 text-sm text-zinc-400">Unified billing event timeline.</p>
      </div>
      <TransactionsTable data={txns} />
    </div>
  );
}
