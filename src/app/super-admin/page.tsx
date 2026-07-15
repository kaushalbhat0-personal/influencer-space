import { prisma } from "@/lib/prisma";
import { SuperAdminDashboard } from "@/components/admin/SuperAdminDashboard";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, products: true } },
    },
  });

  return <SuperAdminDashboard tenants={tenants} />;
}
