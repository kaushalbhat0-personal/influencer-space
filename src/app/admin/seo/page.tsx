import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { SEOPage } from "@/features/seo/components/seo-page";
import { seoService } from "@/features/seo/service";

export const dynamic = "force-dynamic";

export default async function AdminSEOPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const data = await seoService.get(tenantId);
  return <SEOPage initialData={data} />;
}
