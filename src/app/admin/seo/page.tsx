import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer } from "@/components/layout";
import { SEOPageClient } from "@/components/seo/SEOPageClient";
import { buildStorefrontUrl } from "@/lib/config/platform";

export const dynamic = "force-dynamic";

export default async function SEOPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subdomain: true, name: true },
  });

  const storeName = tenant?.name ?? "My Store";
  const storefrontUrl = tenant ? buildStorefrontUrl(tenant.subdomain) : "#";

  return <SEOPageClient storeName={storeName} storefrontUrl={storefrontUrl} />;
}
