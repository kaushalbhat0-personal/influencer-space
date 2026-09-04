import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users, Building, Activity, UserCheck } from "lucide-react";
import { getWorkspaceByAgencyId } from "@/lib/workspace/adapters";
import { assignmentService } from "@/lib/client/assignment";
import Link from "next/link";
import { requireAgencyMember, canMutate } from "@/modules/partner/application/authorization";
import { partnerTeamService, resolveTeamCapacity } from "@/modules/partner/application/team-membership";
import { listTeamAudit, DEFAULT_TEAM_AUDIT_LIMIT } from "@/modules/partner/application/team-audit";
import { TeamInviteForm } from "./invite-form";
import { TeamMemberControls } from "./member-controls";
import { TeamActivity } from "./team-activity";

export const dynamic = "force-dynamic";

export default async function AgencyTeamPage() {
  const session = await getServerSession(authOptions);
  const auth = await requireAgencyMember();
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;

  if (!auth.ok || !agencyId) {
    return <ContentContainer><p className="text-red-400">{auth.error ?? "No agency configured"}</p></ContentContainer>;
  }

  const isAdmin = canMutate(session?.user?.role);
  const currentUserId = session?.user?.id as string;

  const workspace = await getWorkspaceByAgencyId(agencyId);
  const members = workspace ? await partnerTeamService.listTeam(workspace.id) : [];
  const capacity = await resolveTeamCapacity(agencyId);
  const activeCount = workspace ? await partnerTeamService.countActiveMembers(workspace.id) : 0;

  const teamSummary = await assignmentService.getTeamSummary(agencyId);
  const totalClients = teamSummary.reduce((s, m) => s + m.clientCount, 0);
  const assignedMembers = teamSummary.filter((m) => m.clientCount > 0).length;

  // RCCF-55 — admin-only, agency-scoped team audit trail (session-derived agency).
  const audit = isAdmin && workspace ? await listTeamAudit(agencyId, { limit: DEFAULT_TEAM_AUDIT_LIMIT }) : null;

  return (
    <ContentContainer>
      <PageHeader
        title="Team"
        description="Invite team members, manage roles and member access."
        breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Team" }]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Team Members" value={`${activeCount} / ${capacity.limit === -1 ? "Unlimited" : capacity.limit}`} icon={Users} />
        <MetricCard label="With Clients" value={assignedMembers} icon={UserCheck} />
        <MetricCard label="Total Assignments" value={totalClients} icon={Building} />
        <MetricCard label="Avg Load" value={members.length > 0 ? Math.round(totalClients / members.length) : 0} icon={Activity} />
      </div>

      {isAdmin && <div className="mb-6"><TeamInviteForm /></div>}

      {isAdmin && audit && (
        <div className="mb-6">
          <TeamActivity initialItems={audit.items} initialCursor={audit.nextCursor} />
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState title="No team members" description="Invite members to collaborate on client websites." icon={Users} />
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const workload = teamSummary.find((t) => t.userId === m.userId);
            const isOwner = m.role === "OWNER";
            return (
              <div key={m.id} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">
                        {(m.name ?? m.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.name || m.email}</p>
                      <p className="text-xs text-[var(--text-muted)]">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {m.applicationRole ?? m.role}
                    </span>
                    <span className={`text-xs ${m.status === "ACTIVE" ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>{m.status}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                    </span>
                    {isAdmin && m.status === "ACTIVE" && m.userId !== currentUserId && (
                      <TeamMemberControls
                        userId={m.userId}
                        currentRole={m.applicationRole ?? m.role}
                        isOwner={isOwner}
                      />
                    )}
                  </div>
                </div>
                {workload && workload.clients.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {workload.clients.map((c) => (
                      <Link
                        key={c.tenantId}
                        href={`/agency/clients/${c.tenantId}`}
                        className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {c.businessName}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ContentContainer>
  );
}
