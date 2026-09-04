import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { websiteHealthEngine } from "@/lib/platform/health/engine";
import { themeRegistry } from "@/lib/theme/registry-new";
import { WebsiteReadyClient } from "./_components/website-ready-client";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";

export const dynamic = "force-dynamic";

export default async function WebsiteReadyPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <div className="p-6 text-[var(--text-secondary)]">Please log in.</div>;

  const [tenant, website, brand, publishStatus, health] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, subdomain: true, customDomain: true } }),
    prisma.website.findUnique({ where: { tenantId }, select: { id: true, themePackageId: true } }),
    prisma.brand.findFirst({ where: { website: { tenantId } }, select: { name: true } }),
    prisma.publishStatus.findFirst({ where: { website: { tenantId } }, select: { state: true, liveVersion: true, publishedAt: true } }),
    websiteHealthEngine.evaluate(tenantId),
  ]);

  const themeId = website?.themePackageId ?? "com.creatos.neon-dark";
  const theme = themeRegistry.getById(themeId);
  const templateName = "Creator";

  const storefrontUrl = tenant ? buildStorefrontUrlWithTenant(tenant.customDomain, tenant.subdomain) : "/";

  return (
    <WebsiteReadyClient
      creatorName={tenant?.name ?? session.user?.name ?? "Creator"}
      themeName={theme?.name ?? themeId}
      templateName={templateName}
      healthScore={health.overallScore}
      healthChecks={health.checks}
      topRecommendations={health.topRecommendations}
      publishState={publishStatus?.state ?? "draft"}
      publishedVersion={publishStatus?.liveVersion ?? null}
      storefrontUrl={storefrontUrl}
    />
  );
}
