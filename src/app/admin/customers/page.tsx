import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { fetchCustomers } from "@/actions/order.actions";
import { MetricCard } from "@/components/data/MetricCard";
import { CustomersTable } from "./_components/customers-table";
import { Users, IndianRupee, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  let customers: Awaited<ReturnType<typeof fetchCustomers>> = [];
  try { customers = await fetchCustomers(tenantId); } catch { /* handled below */ }

  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = customers.reduce((s, c) => s + c.orderCount, 0);

  return (
    <ContentContainer>
      <PageHeader
        title="Customers"
        description="View and manage your customers and their purchase history."
        breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Customers" }]}
        status={{ label: `${customers.length} customers`, variant: "success" }}
      />

      <div className="mb-6">
        <MetricGrid>
          <MetricCard label="Total Customers" value={customers.length} icon={Users} />
          <MetricCard label="Total Spent" value={`₹${totalSpent.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Total Orders" value={totalOrders} icon={ShoppingBag} />
          <MetricCard label="Avg. Order Value" value={customers.length > 0 ? `₹${Math.round(totalSpent / totalOrders).toLocaleString("en-IN")}` : "—"} />
        </MetricGrid>
      </div>

      <ErrorBoundary>
        <CustomersTable customers={customers} />
      </ErrorBoundary>
    </ContentContainer>
  );
}
