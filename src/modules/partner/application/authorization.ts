/**
 * Partner/Agency authorization (IMPLEMENTATION-41) — server-authoritative,
 * membership-checked, no URL trust, no IDOR. Every agency surface verifies:
 * authenticated → agency role → active agency → active workspace membership →
 * (for tenant-scoped ops) AgencyTenant ownership.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AuthResult {
  ok: boolean;
  error?: string;
  session?: { user: { id: string; email?: string | null; agencyId?: string | null; role?: string | null } };
}

export async function requireAuthenticated(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  return { ok: true, session };
}

export async function requireAgencyRole(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  if (role !== "AGENCY_ADMIN" && role !== "AGENCY_STAFF") return { ok: false, error: "Agency role required" };
  if (!session.user.agencyId) return { ok: false, error: "No agency configured" };
  return { ok: true, session };
}

/** Validate active agency + active workspace membership for the session user. */
export async function assertAgencyMembership(sessionUserId: string, agencyId: string): Promise<AuthResult> {
  const agency = await prisma.websiteAgency.findUnique({
    where: { id: agencyId },
    select: { status: true },
  });
  if (!agency) return { ok: false, error: "Agency not found" };
  if (agency.status !== "ACTIVE" && agency.status !== "TRIAL") return { ok: false, error: "Agency is not active" };

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: sessionUserId,
      workspace: { agencyId },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!membership) return { ok: false, error: "Not a member of this agency" };
  return { ok: true };
}

/** Full guard: authenticated + agency role + active agency + active membership. */
export async function requireAgencyMember(): Promise<AuthResult & { agencyId?: string }> {
  const base = await requireAgencyRole();
  if (!base.ok || !base.session) return base;
  const agencyId = base.session.user.agencyId as string;
  const membership = await assertAgencyMembership(base.session.user.id, agencyId);
  if (!membership.ok) return membership;
  return { ...base, agencyId };
}

/**
 * RCCF-39 — authorize a tenant-provisioning actor. SUPER_ADMIN always; an
 * AGENCY_ADMIN only when their agency is ACTIVE/TRIAL and they hold an active
 * workspace membership. Prevents a suspended agency's admin from minting
 * (orphan) tenants through confirmProvision/analyzeUrl.
 */
export async function requireProvisioningActor(): Promise<AuthResult & { role?: string; userId?: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  if (role === "SUPER_ADMIN") return { ok: true, session, role, userId: session.user.id };
  if (role === "AGENCY_ADMIN") {
    const agencyId = session.user.agencyId as string | undefined;
    if (!agencyId) return { ok: false, error: "No agency configured" };
    const membership = await assertAgencyMembership(session.user.id, agencyId);
    if (!membership.ok) return membership;
    return { ok: true, session, role, userId: session.user.id };
  }
  return { ok: false, error: "Unauthorized" };
}

/** Verify the session user's agency manages the given tenant (IDOR guard). */
export async function assertAgencyOwnsTenant(sessionUserId: string, agencyId: string, tenantId: string): Promise<AuthResult> {
  const link = await prisma.agencyTenant.findFirst({
    where: { agencyId, tenantId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!link) return { ok: false, error: "Creator not managed by this agency" };
  const membership = await assertAgencyMembership(sessionUserId, agencyId);
  if (!membership.ok) return membership;
  return { ok: true };
}

/** Whether the role may mutate tenant/creator data (SUPPORT/READ_ONLY cannot). */
export function canMutate(role?: string | null): boolean {
  return role === "SUPER_ADMIN" || role === "AGENCY_ADMIN" || role === "ADMIN";
}

/**
 * RCCF-62 — mutation gate for Agency operations. Same as requireAgencyMember,
 * plus a server-side PLATFORM_LOCK check: an expired free-trial Agency cannot
 * operate the platform (provision/offboard clients, manage team, branding,
 * capacity, billing). The lock is access state — financial/account identity is
 * preserved. No client-supplied flag can bypass it.
 */
export async function requireAgencyActive(): Promise<AuthResult & { agencyId?: string; locked?: boolean }> {
  const base = await requireAgencyMember();
  if (!base.ok || !base.agencyId) return base;
  const { resolveAgencyAccess, PLATFORM_LOCKED_MESSAGE } = await import("@/modules/partner/application/access-lock");
  const access = await resolveAgencyAccess(base.agencyId);
  if (access.platformLocked) {
    return { ok: false, error: PLATFORM_LOCKED_MESSAGE, locked: true };
  }
  return { ...base, agencyId: base.agencyId };
}

/** View roles (SUPPORT/READ_ONLY) get read access to creators/billing/operations. */
export function isViewRole(role?: string | null): boolean {
  return role === "SUPPORT" || role === "READ_ONLY";
}
