import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { Building, ShoppingBag, Image, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, subdomain: true, customDomain: true, createdAt: true },
  });
  if (!tenant) notFound();

  const [productCount, galleryCount, orderCount] = await Promise.all([
    prisma.product.count({ where: { tenantId: tenant.id } }),
    prisma.galleryImage.count({ where: { tenantId: tenant.id } }),
    prisma.productOrder.count({ where: { tenantId: tenant.id } }),
  ]);

  const orders = await prisma.productOrder.findMany({
    where: { tenantId: tenant.id },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  interface OrderRow { id: string; productName: string; amount: number; status: string; createdAt: string; }
  const orderRows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    productName: o.product?.name ?? "Unknown",
    amount: o.amount,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));
  const orderCols: Column<OrderRow>[] = [
    { key: "productName", header: "Product", sortable: true, cell: (r) => <span className="text-white text-sm">{r.productName}</span> },
    { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">₹{r.amount}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.status}</span> },
    { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/super-admin/tenants" className="text-zinc-500 hover:text-zinc-300 text-sm">← Tenants</Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
      </div>

      <div className="mb-6">
        <MetricGrid>
          <MetricCard label="Products" value={productCount} icon={ShoppingBag} />
          <MetricCard label="Gallery" value={galleryCount} icon={Image} />
          <MetricCard label="Orders" value={orderCount} icon={Users} />
          <MetricCard
            label="Domain"
            value={tenant.customDomain ?? tenant.subdomain ?? "—"}
            icon={Building}
            subtext={tenant.customDomain ? "Custom" : "Subdomain"}
          />
        </MetricGrid>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
      </div>
      <DataTable
        columns={orderCols}
        data={orderRows}
        pageSize={10}
        emptyMessage="No orders yet for this tenant."
      />
    </div>
  );
}
