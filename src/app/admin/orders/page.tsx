import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OrdersTable } from "./_components/orders-table";
import { fetchOrders } from "@/actions/order.actions";
import { Package, IndianRupee, CheckCircle2, Clock } from "lucide-react";
import { MetricCard } from "@/components/data/MetricCard";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  let orders: Awaited<ReturnType<typeof fetchOrders>> = [];
  try { orders = await fetchOrders(tenantId); } catch { /* handled below */ }

  const paidOrders = orders.filter((o) => o.status === "PAID" || o.status === "COMPLETED");
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.amount, 0);

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
          <MetricCard label="Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Completed" value={paidOrders.length} icon={CheckCircle2} />
          <MetricCard label="Pending" value={pendingOrders.length} icon={Clock} />
        </MetricGrid>
      </div>

      <ErrorBoundary>
        <OrdersTable orders={orders} />
      </ErrorBoundary>
    </ContentContainer>
  );
}
