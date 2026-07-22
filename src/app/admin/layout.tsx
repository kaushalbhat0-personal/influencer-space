import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSiteUrlForAdmin } from "@/lib/config/platform";
import { AdminLayoutClient } from "./_components/admin-layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  let siteUrl = "/";

  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true, subdomain: true },
    });

    if (tenant) {
      siteUrl = buildSiteUrlForAdmin(tenant.customDomain, tenant.subdomain);
    }
  }

  return <AdminLayoutClient siteUrl={siteUrl}>{children}</AdminLayoutClient>;
}
