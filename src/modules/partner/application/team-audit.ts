/**
 * Partner Team Audit Trail (RCCF-55).
 *
 * Reads persisted AuditLog rows (agency-scoped via agencyId) for the team
 * lifecycle events emitted by team-membership.ts. This is the canonical audit
 * source of truth — history is NEVER reconstructed from WorkspaceMember /
 * AgencyTeamInvitation / CommunicationLog current state. Only the safe DTO is
 * exposed; raw metadata is never returned (no tokens, no internal authority).
 */
import { prisma } from "@/lib/prisma";

export const TEAM_AUDIT_ACTIONS = [
  "partner:team-invited",
  "partner:team-invitation-sent",
  "partner:team-invitation-delivery-failed",
  "partner:team-accepted",
  "partner:team-removed",
  "partner:team-role-changed",
] as const;

export type TeamAuditAction = (typeof TEAM_AUDIT_ACTIONS)[number];

export const DEFAULT_TEAM_AUDIT_LIMIT = 25;
export const MAX_TEAM_AUDIT_LIMIT = 50;

export interface TeamAuditEventDto {
  id: string;
  type: string;
  timestamp: string;
  actorName: string | null;
  actorEmail: string | null;
  targetEmail: string | null;
  description: string;
  previousRole: string | null;
  newRole: string | null;
}

export interface TeamAuditPage {
  items: TeamAuditEventDto[];
  nextCursor: string | null;
}

const ROLE_SHORT_LABELS: Record<string, string> = {
  AGENCY_STAFF: "Team member",
  AGENCY_ADMIN: "Agency administrator",
};

function roleLabel(role: string | null | undefined): string {
  if (!role) return "member";
  return ROLE_SHORT_LABELS[role] ?? role;
}

function actorLabel(actorName: string | null | undefined, actorEmail: string | null | undefined): string {
  if (actorName) return actorName;
  if (actorEmail) return actorEmail;
  return "An agency admin";
}

export function describeTeamAuditEvent(type: string, meta: Record<string, unknown>): string {  const actor = actorLabel(
    typeof meta.actorName === "string" ? meta.actorName : undefined,
    typeof meta.actorEmail === "string" ? meta.actorEmail : undefined,
  );
  const target = typeof meta.targetEmail === "string" ? meta.targetEmail : typeof meta.email === "string" ? meta.email : undefined;

  switch (type) {
    case "partner:team-invited":
      return `${actor} invited ${target ?? "a new member"} to the team.`;
    case "partner:team-invitation-sent":
      return `${actor} sent the team invitation to ${target ?? "the invitee"}.`;
    case "partner:team-invitation-delivery-failed":
      return `${actor}'s invitation to ${target ?? "the invitee"} could not be delivered.`;
    case "partner:team-accepted":
      return `${target ?? "A new member"} accepted the team invitation.`;
    case "partner:team-role-changed": {
      const prev = meta.previousRole != null && meta.previousRole !== null ? roleLabel(String(meta.previousRole)) : null;
      const next = typeof meta.role === "string" ? roleLabel(meta.role) : "a new role";
      return prev ? `${actor} changed ${target ?? "a member"}'s role from ${prev} to ${next}.` : `${actor} changed ${target ?? "a member"}'s role to ${next}.`;
    }
    case "partner:team-removed":
      return `${actor} removed ${target ?? "a member"} from the team.`;
    default:
      return "Team activity.";
  }
}

function toDto(row: { id: string; action: string; createdAt: Date; metadata: unknown }): TeamAuditEventDto {
  const meta = (typeof row.metadata === "object" && row.metadata !== null ? row.metadata : {}) as Record<string, unknown>;
  return {
    id: row.id,
    type: row.action,
    timestamp: row.createdAt.toISOString(),
    actorName: typeof meta.actorName === "string" ? meta.actorName : null,
    actorEmail: typeof meta.actorEmail === "string" ? meta.actorEmail : null,
    targetEmail: typeof meta.targetEmail === "string" ? meta.targetEmail : typeof meta.email === "string" ? meta.email : null,
    description: describeTeamAuditEvent(row.action, meta),
    previousRole: meta.previousRole != null && typeof meta.previousRole === "string" ? meta.previousRole : null,
    newRole: typeof meta.role === "string" ? meta.role : null,
  };
}

/**
 * Agency-scoped, newest-first, cursor-paginated team audit query. The agencyId
 * MUST come from the authenticated session — never from the client. Secondary
 * ordering on id keeps ties deterministic.
 */
export async function listTeamAudit(agencyId: string, params: { limit?: number; cursor?: string } = {}): Promise<TeamAuditPage> {
  const limit = Math.max(1, Math.min(params.limit ?? DEFAULT_TEAM_AUDIT_LIMIT, MAX_TEAM_AUDIT_LIMIT));
  const where = {
    agencyId,
    action: { in: [...TEAM_AUDIT_ACTIONS] },
  };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return {
    items: page.map(toDto),
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
  };
}
