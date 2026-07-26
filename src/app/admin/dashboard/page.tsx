import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { getDashboardData } from "@/features/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const data = await getDashboardData();
  return <DashboardPage initialData={data} />;
}
