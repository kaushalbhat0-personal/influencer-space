import { requireTenant } from "@/lib/auth/require-tenant";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { getInitialDashboardData } from "@/features/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireTenant();

  const initialData = await getInitialDashboardData();
  return <DashboardPage initialData={initialData} />;
}
