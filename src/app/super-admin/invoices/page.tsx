import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";
import type { Column } from "@/components/data/DataTable";
import { FileText, IndianRupee, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

interface InvoiceRow { id: string; creator: string; product: string; amount: number; status: string; createdAt: Date; }

export default async function InvoicesPage() {
  let invoices: InvoiceRow[] = [];
  try {
    const raw = await prisma.productOrder.findMany({
      orderBy: { createdAt: "desc" }, take: 200,
      include: { product: { select: { name: true } }, tenant: { select: { name: true } } },
    });
    invoices = raw.map((o) => ({
      id: o.id, creator: o.tenant?.name ?? "—", product: o.product?.name ?? "—",
      amount: o.amount, status: o.status, createdAt: o.createdAt,
    }));
  } catch { /* */ }

  const paid = invoices.filter((i) => i.status === "COMPLETED" || i.status === "PAID").length;
  const pending = invoices.filter((i) => i.status === "PENDING").length;
  const totalAmount = invoices.filter((i) => i.status === "COMPLETED" || i.status === "PAID").reduce((s, i) => s + i.amount, 0);

  const cols: Column<InvoiceRow>[] = [
    { key: "creator", header: "Creator", sortable: true, cell: (r) => <span className="text-white text-sm">{r.creator}</span> },
    { key: "product", header: "Product", sortable: true, cell: (r) => <span className="text-zinc-300 text-sm">{r.product}</span> },
    { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">₹{r.amount}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => <BillingStatusBadge status={r.status} /> },
    { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="mt-1 text-sm text-zinc-400">All platform invoices and payment records.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Invoiced" value={`₹${totalAmount.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Paid" value={paid} icon={CheckCircle2} />
          <MetricCard label="Pending" value={pending} icon={Clock} />
          <MetricCard label="Total Invoices" value={invoices.length} icon={FileText} />
        </MetricGrid>
      </PageSection>

      <DataTable columns={cols} data={invoices} pageSize={25} searchable searchPlaceholder="Search by creator or product..." emptyMessage="No invoices recorded." />
    </div>
  );
}
