/**
 * Partner Team Membership Lifecycle (RCCF-53).
 *
 * Reuses the existing WorkspaceMember/workspace-membership primitives as the
 * single membership representation. A dedicated AgencyTeamInvitation row holds
 * the single-use, expiring, workspace/agency-scoped invitation — kept separate
 * from Creator invitations so Creator onboarding and Partner team membership
 * never share an authorization path.
 *
 * Authority model (RCCF-52, unchanged): User.role (AGENCY_ADMIN / AGENCY_STAFF)
 * is the agency authorization authority; WorkspaceMember.role is membership
 * context only. Acceptance derives the target application role server-side from
 * the stored invitation — never from the browser. Capacity is enforced
 * atomically (workspace row FOR UPDATE + ACTIVE member count) so concurrent
 * accepts can never exceed max_team_members.
 */
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { logAgencyAction } from "@/lib/audit";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { capabilityService } from "@/lib/capabilities";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { workspaceMemberService } from "@/modules/workspace/application/workspace-membership";
import { sendCommunication } from "@/modules/communication";

export const TEAM_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TEAM_INVITE_ROLES = ["AGENCY_STAFF", "AGENCY_ADMIN"] as const;
export type TeamInviteRole = (typeof TEAM_INVITE_ROLES)[number];

/**
 * Capability-accurate role labels (RCCF-54 §16). Never overclaim: AGENCY_STAFF
 * is operational/read-only; AGENCY_ADMIN is an agency administrator — neither
 * is ever described as SUPER_ADMIN, billing manager or owner.
 */
export const TEAM_ROLE_LABELS: Record<TeamInviteRole, string> = {
  AGENCY_STAFF: "Team member (operational access)",
  AGENCY_ADMIN: "Agency administrator",
};

/**
 * Canonical application origin (RCCF-54 §4). Reuses the repository's established
 * server-side pattern (`NEXT_PUBLIC_APP_URL` with localhost fallback). Never
 * built from window.location or a client-supplied origin.
 */
export function resolveAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/** Least-privileged PARTNER plan used when a Partner has no resolvable subscription. */
const PARTNER_FALLBACK_PLAN = "partner_free";

export class TeamCapacityError extends Error {
  constructor(
    public used: number,
    public limit: number,
    public planCode: string,
  ) {
    super(`Team capacity reached (${used}/${limit}) for plan ${planCode}. Upgrade your partner plan to add more members.`);
    this.name = "TeamCapacityError";
  }
}

export class TeamMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamMembershipError";
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isTeamRole(role: string): role is TeamInviteRole {
  return TEAM_INVITE_ROLES.includes(role as TeamInviteRole);
}

/**
 * RCCF-55 — resolve actor/target identity for audit metadata. Names are only
 * included when actually persisted; the safe identity (email) is preferred over
 * inventing a display name.
 */
async function resolveUserIdentity(userId: string): Promise<{ email?: string; name?: string; role?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, role: true },
  }).catch(() => null);
  return user ? { email: user.email, name: user.name ?? undefined, role: user.role } : {};
}

/**
 * Resolve the Partner's effective plan + max_team_members from its
 * BillingSubscription (RCCF-40 pattern). Values stay Super-Admin/runtime
 * configurable — never hard-coded in enforcement logic.
 */
export async function resolveTeamCapacity(agencyId: string): Promise<{ planCode: string; limit: number }> {
  const workspace = await prisma.workspace.findUnique({ where: { agencyId }, select: { id: true } });
  const resolved = await resolveActivePlan(workspace?.id, undefined);
  const planCode = resolved.code && resolved.code.startsWith("partner") ? resolved.code : PARTNER_FALLBACK_PLAN;
  const limit = capabilityService.limit(planCode, "max_team_members");
  return { planCode, limit };
}

export interface TeamMemberView {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  joinedAt: Date | null;
  applicationRole: string | null;
}

export interface TeamInviteResult {
  inviteId: string;
  email: string;
  role: TeamInviteRole;
  token: string;
  expiresAt: Date;
}

export class PartnerTeamService {
  /**
   * Create a single-use invitation for an existing-or-future member. Agency and
   * workspace are server-derived; only the email + target role come from input.
   * Seats are NOT reserved by invitations — capacity is enforced atomically at
   * acceptance (ACTIVE members only).
   */
  async inviteMember(input: { agencyId: string; invitedById: string; email: string; role: string }): Promise<TeamInviteResult> {
    if (!isTeamRole(input.role)) {
      throw new TeamMembershipError("Invalid team role");
    }

    const normalizedEmail = normalizeEmail(input.email);
    if (!normalizedEmail.includes("@")) {
      throw new TeamMembershipError("A valid email is required");
    }

    const workspace = await prisma.workspace.findUnique({ where: { agencyId: input.agencyId }, select: { id: true } });
    if (!workspace) throw new TeamMembershipError("Agency workspace not found");

    const capacity = await resolveTeamCapacity(input.agencyId);
    const active = await prisma.workspaceMember.count({ where: { workspaceId: workspace.id, status: "ACTIVE" } });
    if (capacity.limit !== -1 && active >= capacity.limit) {
      throw new TeamCapacityError(active, capacity.limit, capacity.planCode);
    }

    const existingPending = await prisma.agencyTeamInvitation.findFirst({
      where: { workspaceId: workspace.id, email: normalizedEmail, status: "pending" },
      select: { id: true },
    });
    if (existingPending) {
      throw new TeamMembershipError("A pending invitation already exists for this email");
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + TEAM_INVITE_TTL_MS);
    const invite = await prisma.agencyTeamInvitation.create({
      data: {
        workspaceId: workspace.id,
        agencyId: input.agencyId,
        email: normalizedEmail,
        role: input.role,
        token,
        status: "pending",
        expiresAt,
        invitedById: input.invitedById,
      },
      select: { id: true },
    });

    await logAgencyAction(input.agencyId, "partner:team-invited", { email: normalizedEmail, role: input.role, ...(await resolveUserIdentity(input.invitedById)) }).catch(() => {});
    return { inviteId: invite.id, email: normalizedEmail, role: input.role as TeamInviteRole, token, expiresAt };
  }

  /**
   * RCCF-54 — transactional invitation delivery. Runs AFTER the invitation is
   * committed (never inside a DB transaction or network call). The email is a
   * delivery mechanism only — the token remains the sole invitation credential.
   * The raw token is never written to audit metadata; the accept URL embeds it.
   */
  async deliverInvitationEmail(input: { agencyId: string; email: string; role: TeamInviteRole; token: string; expiresAt: Date; actorUserId?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const agency = await prisma.websiteAgency.findUnique({
        where: { id: input.agencyId },
        select: { name: true },
      });
      const agencyName = agency?.name ?? "your partner workspace";
      const roleLabel = TEAM_ROLE_LABELS[input.role];
      const acceptUrl = `${resolveAppBaseUrl()}/agency/team/accept?token=${input.token}`;
      const expiryDate = input.expiresAt.toISOString().split("T")[0];
      const actor = input.actorUserId ? await resolveUserIdentity(input.actorUserId) : {};

      const result = await sendCommunication(
        "team.invitation",
        { audience: "agency", recipientId: input.agencyId, email: input.email },
        { agencyName, roleLabel, acceptUrl, expiryDate, email: input.email },
      );
      if (!result.success) {
        await logAgencyAction(input.agencyId, "partner:team-invitation-delivery-failed", { email: input.email, role: input.role, error: result.error, ...actor }).catch(() => {});
        return { success: false, error: result.error ?? "Email delivery failed" };
      }
      await logAgencyAction(input.agencyId, "partner:team-invitation-sent", { email: input.email, role: input.role, ...actor }).catch(() => {});
      return { success: true };
    } catch (error) {
      const actor = input.actorUserId ? await resolveUserIdentity(input.actorUserId).catch(() => ({})) : {};
      await logAgencyAction(input.agencyId, "partner:team-invitation-delivery-failed", { email: input.email, role: input.role, error: error instanceof Error ? error.message : "delivery error", ...actor }).catch(() => {});
      return { success: false, error: error instanceof Error ? error.message : "Email delivery failed" };
    }
  }

  /**
   * RCCF-54 §12 — resend an existing pending invitation. Deterministic and safe:
   * reuses the same single-use invitation (no duplicate rows), never consumes a
   * seat, never escalates a role, and returns no token. Only a pending,
   * unexpired invitation can be resent.
   */
  async resendInvitation(input: { agencyId: string; email: string; actorUserId?: string }): Promise<{ success: boolean; error?: string; email?: string; role?: TeamInviteRole; expiresAt?: Date }> {
    const workspace = await prisma.workspace.findUnique({ where: { agencyId: input.agencyId }, select: { id: true } });
    if (!workspace) throw new TeamMembershipError("Agency workspace not found");

    const invite = await prisma.agencyTeamInvitation.findFirst({
      where: { workspaceId: workspace.id, email: normalizeEmail(input.email), status: "pending" },
      select: { id: true, email: true, role: true, token: true, expiresAt: true },
    });
    if (!invite) throw new TeamMembershipError("No pending invitation found for this email");
    if (invite.expiresAt.getTime() < Date.now()) throw new TeamMembershipError("Invitation expired");

    const delivery = await this.deliverInvitationEmail({
      agencyId: input.agencyId,
      email: invite.email,
      role: invite.role as TeamInviteRole,
      token: invite.token,
      expiresAt: invite.expiresAt,
      actorUserId: input.actorUserId,
    });
    if (!delivery.success) {
      return { success: true, error: delivery.error, email: invite.email, role: invite.role as TeamInviteRole, expiresAt: invite.expiresAt };
    }
    return { success: true, email: invite.email, role: invite.role as TeamInviteRole, expiresAt: invite.expiresAt };
  }

  /**
   * Accept a single-use invitation. The token is the sole authority: workspace,
   * agency and target role are derived from the stored row. The accepting user
   * must be authenticated and their email must match the invitation email.
   * Capacity is enforced atomically under a workspace row lock.
   */
  async acceptInvitation(input: { token: string; acceptingUserId: string; acceptingEmail: string }): Promise<{ workspaceId: string; role: string; agencyId: string }> {
    const invite = await prisma.agencyTeamInvitation.findUnique({
      where: { token: input.token },
      select: { id: true, workspaceId: true, agencyId: true, email: true, role: true, status: true, expiresAt: true },
    });
    if (!invite) throw new TeamMembershipError("Invitation not found");
    if (invite.status !== "pending") throw new TeamMembershipError("Invitation already used");
    if (invite.expiresAt.getTime() < Date.now()) throw new TeamMembershipError("Invitation expired");

    if (normalizeEmail(input.acceptingEmail) !== invite.email) {
      throw new TeamMembershipError("Invitation does not match your account email");
    }

    // Validate the accepting user exists and is not already attached to another
    // tenant/agency (single-owner model — RCCF-53 assumed default).
    const capacity = await resolveTeamCapacity(invite.agencyId);

    return prisma.$transaction(async (tx) => {
      // Row-level lock on the workspace serializes concurrent accepts so two
      // final-slot accepts cannot both pass the ACTIVE count.
      await tx.$queryRaw`SELECT id FROM "workspace" WHERE id = ${invite.workspaceId} FOR UPDATE`;

      const user = await tx.user.findUnique({
        where: { email: invite.email },
        select: { id: true, tenantId: true, agencyId: true, role: true },
      });
      if (!user || user.id !== input.acceptingUserId) {
        throw new TeamMembershipError("Account not found for this invitation");
      }
      if (user.tenantId) {
        throw new TeamMembershipError("This account already owns a creator workspace");
      }
      if (user.agencyId && user.agencyId !== invite.agencyId) {
        throw new TeamMembershipError("This account already belongs to another agency");
      }

      const active = await tx.workspaceMember.count({ where: { workspaceId: invite.workspaceId, status: "ACTIVE" } });
      if (capacity.limit !== -1 && active >= capacity.limit) {
        throw new TeamCapacityError(active, capacity.limit, capacity.planCode);
      }

      await tx.user.update({
        where: { id: user.id },
        data: { agencyId: invite.agencyId, role: invite.role as never },
      });

      const existingMember = await tx.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
        select: { id: true, status: true },
      });
      if (existingMember) {
        await tx.workspaceMember.update({
          where: { id: existingMember.id },
          data: { status: "ACTIVE", role: invite.role === "AGENCY_ADMIN" ? "ADMIN" : "MEMBER", joinedAt: new Date() },
        });
      } else {
        await tx.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: user.id,
            role: invite.role === "AGENCY_ADMIN" ? "ADMIN" : "MEMBER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        });
      }

      await tx.agencyTeamInvitation.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      });

      await logAgencyAction(invite.agencyId, "partner:team-accepted", { email: invite.email, role: invite.role, ...(await resolveUserIdentity(input.acceptingUserId).catch(() => ({}))) }).catch(() => {});
      return { workspaceId: invite.workspaceId, role: invite.role, agencyId: invite.agencyId };
    });
  }

  /**
   * Remove an ACTIVE member (existing workspaceRepository.removeMember sets
   * status REMOVED). Admin-only at the action layer. Reuses the workspace
   * membership primitive; capacity is reclaimed immediately (REMOVED is not
   * counted).
   */
  async removeMember(input: { agencyId: string; actorUserId: string; targetUserId: string }): Promise<void> {
    if (input.actorUserId === input.targetUserId) {
      throw new TeamMembershipError("You cannot remove yourself");
    }
    const workspace = await prisma.workspace.findUnique({ where: { agencyId: input.agencyId }, select: { id: true } });
    if (!workspace) throw new TeamMembershipError("Agency workspace not found");

    const member = await workspaceRepository.findMember(workspace.id, input.targetUserId);
    if (!member) throw new TeamMembershipError("Member not found in this agency");
    if (member.status !== "ACTIVE") throw new TeamMembershipError("Member is not active");
    if (member.role === "OWNER") throw new TeamMembershipError("The agency owner cannot be removed");

    const [actor, target] = await Promise.all([
      resolveUserIdentity(input.actorUserId),
      resolveUserIdentity(input.targetUserId),
    ]);

    await workspaceMemberService.removeMember(workspace.id, input.targetUserId);
    await logAgencyAction(input.agencyId, "partner:team-removed", { userId: input.targetUserId, targetEmail: target.email, previousRole: target.role, ...actor }).catch(() => {});
  }

  /**
   * Change an ACTIVE member's team role. The target application role is
   * validated against {AGENCY_STAFF, AGENCY_ADMIN} and applied to BOTH the
   * User.role (authority) and the WorkspaceMember.role (context). This is an
   * explicit admin action — it does not grant any capability beyond the
   * selected Partner role, and it never derives authority from the
   * WorkspaceMember role alone.
   */
  async changeRole(input: { agencyId: string; actorUserId: string; targetUserId: string; role: string }): Promise<void> {
    if (!isTeamRole(input.role)) {
      throw new TeamMembershipError("Invalid team role");
    }
    const workspace = await prisma.workspace.findUnique({ where: { agencyId: input.agencyId }, select: { id: true } });
    if (!workspace) throw new TeamMembershipError("Agency workspace not found");

    const member = await workspaceRepository.findMember(workspace.id, input.targetUserId);
    if (!member) throw new TeamMembershipError("Member not found in this agency");
    if (member.status !== "ACTIVE") throw new TeamMembershipError("Member is not active");
    if (member.role === "OWNER") throw new TeamMembershipError("The agency owner's role cannot be changed");

    // Capture the PREVIOUS application role before mutation — the audit trail
    // must record historical roles, never re-derive them from current state.
    const [actor, target] = await Promise.all([
      resolveUserIdentity(input.actorUserId),
      resolveUserIdentity(input.targetUserId),
    ]);
    const previousRole = target.role ?? null;

    const contextRole = input.role === "AGENCY_ADMIN" ? "ADMIN" : "MEMBER";
    await prisma.$transaction([
      prisma.user.update({
        where: { id: input.targetUserId },
        data: { role: input.role as never, agencyId: input.agencyId },
      }),
      prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: input.targetUserId } },
        data: { role: contextRole as never },
      }),
    ]);
    await logAgencyAction(input.agencyId, "partner:team-role-changed", { userId: input.targetUserId, targetEmail: target.email, previousRole, role: input.role, ...actor }).catch(() => {});
  }

  /** List ACTIVE + INVITED + REMOVED members for the team screen. */
  async listTeam(workspaceId: string): Promise<TeamMemberView[]> {
    return workspaceMemberService.listMembers(workspaceId);
  }

  /** ACTIVE member count (seat usage — the owner is an ACTIVE member). */
  async countActiveMembers(workspaceId: string): Promise<number> {
    return workspaceMemberService.countActiveMembers(workspaceId);
  }
}

export const partnerTeamService = new PartnerTeamService();
