/**
 * Partner Team server actions (RCCF-53).
 *
 * Server-only. Agency and workspace are session-derived; the client never
 * supplies agencyId/workspaceId/role as trusted authority. AGENCY_ADMIN
 * (canMutate) gates all mutations; AGENCY_STAFF and non-members are rejected
 * server-side before any invitation or membership change.
 */
"use server";

import { revalidatePath } from "next/cache";
import { requireAgencyMember, requireAuthenticated, canMutate } from "@/modules/partner/application/authorization";
import { partnerTeamService, resolveAppBaseUrl } from "@/modules/partner/application/team-membership";
import { listTeamAudit, DEFAULT_TEAM_AUDIT_LIMIT, type TeamAuditEventDto } from "@/modules/partner/application/team-audit";

export type InviteTeamMemberResult =
  | { success: true; delivered: boolean; deliveryError?: string; inviteId: string; email: string; role: string; expiresAt: string; token?: string; acceptUrl?: string }
  | { success: false; error: string };

export async function inviteAgencyTeamMember(input: {
  email: string;
  role: string;
}): Promise<InviteTeamMemberResult> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok || !ctx.session || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session.user.role)) return { success: false, error: "Only agency admins can invite team members" };

  try {
    const invite = await partnerTeamService.inviteMember({
      agencyId: ctx.agencyId,
      invitedById: ctx.session.user.id,
      email: input.email,
      role: input.role,
    });
    revalidatePath("/agency/team");

    // Delivery runs AFTER the invitation is committed — never inside a DB
    // transaction, never before persistence. A delivery failure is truthful:
    // the invitation stays pending and the token is returned as a manual
    // fallback so the inviter can still share it.
    const delivery = await partnerTeamService.deliverInvitationEmail({
      agencyId: ctx.agencyId,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt,
      actorUserId: ctx.session.user.id,
    });

    return {
      success: true,
      delivered: delivery.success,
      deliveryError: delivery.success ? undefined : delivery.error,
      inviteId: invite.inviteId,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      ...(delivery.success
        ? {}
        : { token: invite.token, acceptUrl: `${resolveAppBaseUrl()}/agency/team/accept?token=${invite.token}` }),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Invitation failed" };
  }
}

export async function resendAgencyTeamInvitation(input: {
  email: string;
}): Promise<{ success: true; delivered: boolean; deliveryError?: string } | { success: false; error: string }> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok || !ctx.session || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session.user.role)) return { success: false, error: "Only agency admins can resend team invitations" };

  try {
    const res = await partnerTeamService.resendInvitation({ agencyId: ctx.agencyId, email: input.email, actorUserId: ctx.session.user.id });
    revalidatePath("/agency/team");
    if (res.error) {
      return { success: true, delivered: false, deliveryError: res.error };
    }
    return { success: true, delivered: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Resend failed" };
  }
}

/**
 * RCCF-55 — agency-scoped team audit trail. AGENCY_ADMIN read-only; the agency
 * is always session-derived. Read-only: no mutation capability is exposed.
 */
export async function getTeamAuditAction(input: {
  cursor?: string;
}): Promise<{ success: true; items: TeamAuditEventDto[]; nextCursor: string | null } | { success: false; error: string }> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok || !ctx.session || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session.user.role)) return { success: false, error: "Agency staff do not have audit access" };

  try {
    const page = await listTeamAudit(ctx.agencyId, { cursor: input.cursor ?? undefined, limit: DEFAULT_TEAM_AUDIT_LIMIT });
    return { success: true, items: page.items, nextCursor: page.nextCursor };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load team activity" };
  }
}

export async function acceptAgencyTeamInvitation(input: {
  token: string;
}): Promise<{ success: true; workspaceId: string; role: string } | { success: false; error: string }> {
  const ctx = await requireAuthenticated();
  if (!ctx.ok || !ctx.session?.user?.id || !ctx.session.user.email) {
    return { success: false, error: "You must be signed in to accept an invitation" };
  }

  try {
    const result = await partnerTeamService.acceptInvitation({
      token: input.token,
      acceptingUserId: ctx.session.user.id,
      acceptingEmail: ctx.session.user.email,
    });
    revalidatePath("/agency/team");
    return { success: true, workspaceId: result.workspaceId, role: result.role };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Acceptance failed" };
  }
}

export async function removeAgencyTeamMember(input: {
  userId: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok || !ctx.session || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session.user.role)) return { success: false, error: "Only agency admins can remove team members" };

  try {
    await partnerTeamService.removeMember({
      agencyId: ctx.agencyId,
      actorUserId: ctx.session.user.id,
      targetUserId: input.userId,
    });
    revalidatePath("/agency/team");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Removal failed" };
  }
}

export async function changeAgencyTeamRole(input: {
  userId: string;
  role: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok || !ctx.session || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session.user.role)) return { success: false, error: "Only agency admins can change team roles" };

  try {
    await partnerTeamService.changeRole({
      agencyId: ctx.agencyId,
      actorUserId: ctx.session.user.id,
      targetUserId: input.userId,
      role: input.role,
    });
    revalidatePath("/agency/team");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Role change failed" };
  }
}
