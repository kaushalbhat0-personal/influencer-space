import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { InvoicesTable } from "./_components/invoices-table";
import { FileText, IndianRupee, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  let invoices: { id: string; creator: string; product: string; amount: number; status: string; createdAt: string; }[] = [];
  try {
    const raw = await prisma.productOrder.findMany({
      orderBy: { createdAt: "desc" }, take: 200,
      include: { product: { select: { name: true } }, tenant: { select: { name: true } } },
    });
    invoices = raw.map((o) => ({
      id: o.id, creator: o.tenant?.name ?? "—", product: o.product?.name ?? "—",
      amount: o.amount, status: o.status, createdAt: o.createdAt.toISOString(),
    }));
  } catch { /* */ }

  const paid = invoices.filter((i) => i.status === "COMPLETED" || i.status === "PAID").length;
  const pending = invoices.filter((i) => i.status === "PENDING").length;
  const totalAmount = invoices.filter((i) => i.status === "COMPLETED" || i.status === "PAID").reduce((s, i) => s + i.amount, 0);

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

      <InvoicesTable data={invoices} />
    </div>
  );
}
