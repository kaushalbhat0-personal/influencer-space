import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export type SessionRole = "SUPER_ADMIN" | "AGENCY_ADMIN" | "AGENCY_STAFF" | "ADMIN";

export interface TenantSession {
  userId: string;
  tenantId: string;
  role: SessionRole;
  agencyId: string | null;
  workspaceId: string | null;
  workspaceType: string | null;
  workspaceRole: string | null;
  email: string | null;
  name: string | null;
}

export async function requireTenant(): Promise<TenantSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const tenantId = session.user.tenantId;
  const role = session.user.role;

  if (!tenantId) {
    if (role === "ADMIN") {
      redirect("/onboarding");
    }
    if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF") {
      redirect("/agency");
    }
    redirect("/onboarding");
  }

  return {
    userId: session.user.id,
    tenantId,
    role,
    agencyId: session.user.agencyId ?? null,
    workspaceId: session.user.workspaceId ?? null,
    workspaceType: session.user.workspaceType ?? null,
    workspaceRole: session.user.workspaceRole ?? null,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}
