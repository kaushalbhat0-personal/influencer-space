import { requireTenant } from "@/lib/auth/require-tenant";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { getDashboardData } from "@/features/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireTenant();

  const data = await getDashboardData();
  return <DashboardPage initialData={data} />;
}
