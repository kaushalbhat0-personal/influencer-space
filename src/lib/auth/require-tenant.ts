import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { lifecycleService, LifecycleState } from "@/lib/lifecycle";
import type { LifecycleData } from "@/lib/lifecycle";

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

export interface TenantSessionWithLifecycle extends TenantSession {
  lifecycle: LifecycleData;
}

function isAuthenticated(lifecycle: LifecycleData): lifecycle is LifecycleData & { role: string } {
  return lifecycle.state !== LifecycleState.VISITOR && !!lifecycle.role;
}

export async function requireTenant(): Promise<TenantSession> {
  const { session, lifecycle } = await resolveSession();

  if (lifecycle.state === LifecycleState.VISITOR) {
    redirect("/admin/login");
  }

  if (lifecycle.state === LifecycleState.AUTHENTICATED) {
    if (session?.role === "AGENCY_ADMIN" || session?.role === "AGENCY_STAFF") {
      redirect("/agency");
    }
    redirect("/onboarding");
  }

  if (!lifecycle.hasOnboardingCompleted) {
    if (session?.role === "AGENCY_ADMIN" || session?.role === "AGENCY_STAFF") {
      redirect("/agency");
    }
    redirect("/onboarding");
  }

  return session!;
}

export async function requireTenantWithLifecycle(): Promise<TenantSessionWithLifecycle> {
  const { session, lifecycle } = await resolveSession();

  if (lifecycle.state === LifecycleState.VISITOR) {
    redirect("/admin/login");
  }

  if (lifecycle.state === LifecycleState.AUTHENTICATED) {
    if (session?.role === "AGENCY_ADMIN" || session?.role === "AGENCY_STAFF") {
      redirect("/agency");
    }
    redirect("/onboarding");
  }

  return { ...session!, lifecycle };
}

async function resolveSession(): Promise<{
  session: TenantSession | null;
  lifecycle: LifecycleData;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      session: null,
      lifecycle: {
        state: LifecycleState.VISITOR,
        userId: null, tenantId: null, workspaceId: null, role: null,
        hasOnboardingCompleted: false, hasWebsite: false, hasPublishedSnapshot: false,
      },
    };
  }

  const tenantId = session.user.tenantId ?? null;
  const role = (session.user.role ?? "ADMIN") as SessionRole;

  const baseSession: TenantSession = {
    userId: session.user.id,
    tenantId: tenantId ?? "",
    role,
    agencyId: session.user.agencyId ?? null,
    workspaceId: session.user.workspaceId ?? null,
    workspaceType: session.user.workspaceType ?? null,
    workspaceRole: session.user.workspaceRole ?? null,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };

  const lifecycle = await lifecycleService.resolve({
    userId: session.user.id,
    tenantId,
    role,
    workspaceId: session.user.workspaceId ?? null,
  });

  return { session: baseSession, lifecycle };
}
