import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminLayoutClient } from "./_components/admin-layout-client";

const BASE_URL = process.env.NEXTAUTH_URL
  ? process.env.NEXTAUTH_URL.replace(/https?:\/\//, "")
  : "localhost:3000";

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

    if (tenant?.customDomain) {
      siteUrl = `https://${tenant.customDomain}`;
    } else if (tenant?.subdomain) {
      siteUrl = `https://${tenant.subdomain}.${BASE_URL}`;
    }
  }

  return <AdminLayoutClient siteUrl={siteUrl}>{children}</AdminLayoutClient>;
}
