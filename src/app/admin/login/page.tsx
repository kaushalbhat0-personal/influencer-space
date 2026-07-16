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

  if (!tenant && searchParams?.tenant) {
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
          <LoginForm tenantId={lookedUp.id} />
        </Suspense>
      );
    }
  }

  return (
    <Suspense>
      <LoginForm tenantId={tenant?.id ?? null} />
    </Suspense>
  );
}
