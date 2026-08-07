import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * VALIDATION-02 H3: gate analytics reads to the session's own tenant, or — for
 * agency/support members without a tenant — to tenants the agency owns.
 * Previously, any user with a null tenantId could read ANY tenant's analytics.
 */
export async function verifyTenantAccess(session: Session | null, tenantId: string): Promise<string | null> {
  if (!session?.user?.id) return "Unauthorized";
  if (!tenantId) return "Tenant ID required";

  if (session.user.tenantId) {
    return session.user.tenantId === tenantId ? null : "Forbidden";
  }

  const role = (session.user as { role?: string }).role;
  if (role === "SUPER_ADMIN") return null;

  const agencyId = (session.user as { agencyId?: string }).agencyId;
  if (!agencyId) return "Forbidden";

  const link = await prisma.agencyTenant.findFirst({
    where: { agencyId, tenantId },
    select: { id: true },
  });
  return link ? null : "Forbidden";
}

export function assertTenantId(session: Session | null): string | null {
  return session?.user?.tenantId ?? null;
}
