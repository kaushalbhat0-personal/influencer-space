import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { FileText, IndianRupee, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { revenueService } from "@/modules/billing/application/revenue-service";
import { InvoicesClient } from "./_components/invoices-client";

export const dynamic = "force-dynamic";

/**
 * IMPLEMENTATION-39: Invoices read Billing v2 (BillingInvoice) — not ProductOrder.
 */
export default async function InvoicesPage() {
  const data = await revenueService.listInvoicesAdmin({ page: 1, pageSize: 50 });

  const paid = data.rows.filter((i) => i.status === "PAID").length;
  const pending = data.rows.filter((i) => i.status === "PENDING").length;
  const failed = data.rows.filter((i) => i.status === "FAILED").length;
  const paidAmount = data.rows.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="mt-1 text-sm text-zinc-400">Platform invoices from Billing v2 (BillingInvoice).</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Paid (this page)" value={`₹${paidAmount.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Paid" value={paid} icon={CheckCircle2} />
          <MetricCard label="Pending" value={pending} icon={Clock} />
          <MetricCard label="Failed" value={failed} icon={AlertTriangle} />
          <MetricCard label="Total Invoices" value={data.total} icon={FileText} />
        </MetricGrid>
      </PageSection>

      <InvoicesClient initial={data} />
    </div>
  );
}
