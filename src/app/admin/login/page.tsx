import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { tenant?: string };
}) {
  const tenant = await getTenantContext().catch(() => null);

  const preselectedTenantId = tenant?.id ?? null;

  // If no tenant context (platform domain), fetch all tenants for a dropdown
  const allTenants = !preselectedTenantId
    ? await prisma.tenant.findMany({ select: { id: true, name: true, subdomain: true } })
    : [];

  // If ?tenant= query param is provided on platform domain, use it
  if (!preselectedTenantId && searchParams?.tenant) {
    const lookedUp = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain: searchParams.tenant },
          { customDomain: searchParams.tenant },
        ],
      },
      select: { id: true },
    });
    if (lookedUp) {
      return (
        <Suspense>
          <LoginForm tenantId={lookedUp.id} tenants={allTenants} />
        </Suspense>
      );
    }
  }

  return (
    <Suspense>
      <LoginForm tenantId={preselectedTenantId} tenants={allTenants} />
    </Suspense>
  );
}
