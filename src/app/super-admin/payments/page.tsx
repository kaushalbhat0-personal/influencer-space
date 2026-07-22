import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";
import type { Column } from "@/components/data/DataTable";
import { IndianRupee, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

interface PaymentRow { id: string; product: string; amount: number; status: string; fanEmail: string | null; createdAt: Date; }

export default async function PaymentsPage() {
  let payments: PaymentRow[] = [];
  try {
    const raw = await prisma.productOrder.findMany({
      orderBy: { createdAt: "desc" }, take: 200,
      include: { product: { select: { name: true } } },
    });
    payments = raw.map((o) => ({
      id: o.id, product: o.product?.name ?? "—", amount: o.amount,
      status: o.status, fanEmail: o.fanEmail, createdAt: o.createdAt,
    }));
  } catch { /* */ }

  const succeeded = payments.filter((p) => p.status === "COMPLETED" || p.status === "PAID").length;
  const pending = payments.filter((p) => p.status === "PENDING").length;
  const failed = payments.filter((p) => p.status === "FAILED").length;
  const totalAmount = payments.filter((p) => p.status === "COMPLETED" || p.status === "PAID").reduce((s, p) => s + p.amount, 0);

  const cols: Column<PaymentRow>[] = [
    { key: "product", header: "Product", sortable: true, cell: (r) => <span className="text-white text-sm">{r.product}</span> },
    { key: "fanEmail", header: "Customer", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.fanEmail ?? "—"}</span> },
    { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">₹{r.amount}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => <BillingStatusBadge status={r.status} /> },
    { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="mt-1 text-sm text-zinc-400">All payment transactions across the platform.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Revenue" value={`₹${totalAmount.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Succeeded" value={succeeded} icon={CheckCircle2} />
          <MetricCard label="Pending" value={pending} icon={Clock} />
          <MetricCard label="Failed" value={failed} icon={AlertTriangle} />
        </MetricGrid>
      </PageSection>

      <DataTable columns={cols} data={payments} pageSize={25} searchable searchPlaceholder="Search by product or customer..." emptyMessage="No payments recorded." />
    </div>
  );
}
