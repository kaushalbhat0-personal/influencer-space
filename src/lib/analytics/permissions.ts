import type { Session } from "next-auth";

export function verifyTenantAccess(session: Session | null, tenantId: string): string | null {
  if (!session?.user?.id) return "Unauthorized";
  if (!tenantId) return "Tenant ID required";
  if (session.user.tenantId && session.user.tenantId !== tenantId) return "Forbidden";
  return null;
}

export function assertTenantId(session: Session | null): string | null {
  return session?.user?.tenantId ?? null;
}
