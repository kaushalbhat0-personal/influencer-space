import { requireTenant } from "@/lib/auth/require-tenant";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OrdersTable } from "./_components/orders-table";
import { FulfillmentSection } from "./_components/fulfillment-section";
import { fetchOrders } from "@/actions/order.actions";
import { Package, IndianRupee, CheckCircle2, Clock } from "lucide-react";
import { MetricCard } from "@/components/data/MetricCard";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { tenantId } = await requireTenant();

  let orders: Awaited<ReturnType<typeof fetchOrders>> = [];
  try { orders = await fetchOrders(tenantId); } catch { /* handled below */ }

  // RCCF-72.18D.5.2-A: "PAID" was dead ProductOrder vocabulary (never written);
  // COMPLETED is the canonical paid state written by completeProductOrder.
  const paidOrders = orders.filter((o) => o.status === "COMPLETED");
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.amount, 0);

  const statusFilter = searchParams.status;
  const visibleOrders = statusFilter === "paid"
    ? paidOrders
    : statusFilter === "pending"
      ? pendingOrders
      : orders;

  return (
    <ContentContainer>
      <PageHeader
        title="Orders"
        description="Track purchases and manage order fulfillment."
        breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Orders" }]}
        status={{ label: `${orders.length} total`, variant: "success" }}
        tabs={[
          { label: "All Orders", href: "/admin/orders", active: true },
          { label: "Paid", href: "/admin/orders?status=paid" },
          { label: "Pending", href: "/admin/orders?status=pending" },
        ]}
      />

      <div className="mb-6">
        <MetricGrid>
          <MetricCard label="Total Orders" value={orders.length} icon={Package} />
          <MetricCard label="Revenue" value={formatCurrency(totalRevenue)} icon={IndianRupee} />
          <MetricCard label="Completed" value={paidOrders.length} icon={CheckCircle2} />
          <MetricCard label="Pending" value={pendingOrders.length} icon={Clock} />
        </MetricGrid>
      </div>

      <ErrorBoundary>
        <OrdersTable orders={visibleOrders} />
      </ErrorBoundary>

      {/* RCCF-TRACK-01: post-payment fulfillment */}
      <ErrorBoundary>
        <FulfillmentSection />
      </ErrorBoundary>
    </ContentContainer>
  );
}
