import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { PaymentsTable } from "./_components/payments-table";
import { IndianRupee, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const raw = await prisma.productOrder.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { product: { select: { name: true } } } });
  const payments = raw.map((o) => ({ id: o.id, product: o.product?.name ?? "—", amount: o.amount, status: o.status, fanEmail: o.fanEmail, createdAt: o.createdAt }));
  const succeeded = payments.filter((p) => p.status === "COMPLETED" || p.status === "PAID").length;
  const pending = payments.filter((p) => p.status === "PENDING").length;
  const failed = payments.filter((p) => p.status === "FAILED").length;
  const totalAmount = payments.filter((p) => p.status === "COMPLETED" || p.status === "PAID").reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <div className="mb-8"><h1 className="text-2xl font-bold text-white">Payments</h1><p className="mt-1 text-sm text-zinc-400">All payment transactions across the platform.</p></div>
      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Revenue" value={`₹${totalAmount.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Succeeded" value={succeeded} icon={CheckCircle2} />
          <MetricCard label="Pending" value={pending} icon={Clock} />
          <MetricCard label="Failed" value={failed} icon={AlertTriangle} />
        </MetricGrid>
      </PageSection>
      <PaymentsTable payments={payments} />
    </div>
  );
}
