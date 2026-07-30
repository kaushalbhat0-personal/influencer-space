import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSiteUrlForAdmin } from "@/lib/config/platform";
import { AdminLayoutClient } from "./_components/admin-layout-client";
import { redirect } from "next/navigation";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  const tenantId = session?.user?.tenantId;

  let siteUrl = "/";
  let publishStatus: PublishStatusValue = "unavailable";

  if (tenantId) {
    const [tenant, website] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { customDomain: true, subdomain: true },
      }),
      prisma.website.findUnique({
        where: { tenantId },
        select: {
          publishStatus: { select: { state: true, liveVersion: true } },
        },
      }),
    ]);

    if (tenant) {
      siteUrl = buildSiteUrlForAdmin(tenant.customDomain, tenant.subdomain);
    }

    const dbState = website?.publishStatus?.state;
    const liveVersion = website?.publishStatus?.liveVersion;
    if (dbState === "live") publishStatus = "published";
    else if (dbState === "preview") publishStatus = "preview";
    else if (dbState === "draft" && liveVersion && liveVersion > 0) publishStatus = "outdated";
    else publishStatus = "draft";
  }

  return <AdminLayoutClient siteUrl={siteUrl} publishStatus={publishStatus}>{children}</AdminLayoutClient>;
}
