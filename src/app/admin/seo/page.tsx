import { requireTenant } from "@/lib/auth/require-tenant";
import { SEOPage } from "@/features/seo/components/seo-page";
import { seoService } from "@/features/seo/service";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrl } from "@/lib/config/platform";

export const dynamic = "force-dynamic";

export default async function AdminSEOPage() {
  const { tenantId } = await requireTenant();
  const data = await seoService.get(tenantId);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, subdomain: true, customDomain: true } });
  const brand = await prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "brand_config" } } });
  const brandName = (brand?.value as Record<string, unknown>)?.name as string | undefined ?? tenant?.name;
  const domainPreview = tenant?.customDomain ?? (tenant?.subdomain ? `${tenant.subdomain}.example.com` : buildStorefrontUrl(tenant?.subdomain ?? ""));
  return <SEOPage initialData={data} brandName={brandName} domainPreview={domainPreview} />;
}
