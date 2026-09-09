import { requireTenant } from "@/lib/auth/require-tenant";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { getInitialDashboardData } from "@/features/dashboard/actions";
import { YouTubeEnhancementCtaServer } from "@/features/integrations/components/youtube-enhancement-cta.server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireTenant();

  const initialData = await getInitialDashboardData();
  return (
    <>
      <div className="mb-6">
        <YouTubeEnhancementCtaServer />
      </div>
      <DashboardPage initialData={initialData} />
    </>
  );
}
