import { requireTenant } from "@/lib/auth/require-tenant";
import { SEOPage } from "@/features/seo/components/seo-page";
import { seoService } from "@/features/seo/service";

export const dynamic = "force-dynamic";

export default async function AdminSEOPage() {
  const { tenantId } = await requireTenant();

  const data = await seoService.get(tenantId);
  return <SEOPage initialData={data} />;
}
