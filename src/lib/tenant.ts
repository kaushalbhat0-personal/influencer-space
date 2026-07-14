import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Tenant } from "@/generated/prisma/client";

export const getTenantContext = cache(async (): Promise<Tenant | null> => {
  let tenantHost: string | null = null;

  try {
    const headersList = headers();
    tenantHost = headersList.get("x-tenant-host");
  } catch {
    return null;
  }

  if (!tenantHost) {
    return null;
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { subdomain: tenantHost },
        { customDomain: tenantHost },
      ],
    },
  });

  return tenant;
});
