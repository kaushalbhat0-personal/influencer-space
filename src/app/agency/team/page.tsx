import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users, Building, Activity, UserCheck } from "lucide-react";
import { getWorkspaceByAgencyId } from "@/lib/workspace/adapters";
import { assignmentService } from "@/lib/client/assignment";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgencyTeamPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;

  if (!agencyId) {
    return <ContentContainer><p className="text-red-400">No agency configured</p></ContentContainer>;
  }

  const workspace = await getWorkspaceByAgencyId(agencyId);
  const members = workspace
    ? await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const teamSummary = await assignmentService.getTeamSummary(agencyId);
  const totalClients = teamSummary.reduce((s, m) => s + m.clientCount, 0);
  const assignedMembers = teamSummary.filter((m) => m.clientCount > 0).length;

  return (
    <ContentContainer>
      <PageHeader
        title="Team"
        description="Manage workspace members and their client workload."
        breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Team" }]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Members" value={members.length} icon={Users} />
        <MetricCard label="With Clients" value={assignedMembers} icon={UserCheck} />
        <MetricCard label="Total Assignments" value={totalClients} icon={Building} />
        <MetricCard label="Avg Load" value={members.length > 0 ? Math.round(totalClients / members.length) : 0} icon={Activity} />
      </div>

      {members.length === 0 ? (
        <EmptyState title="No team members" description="Invite members to collaborate on client websites." icon={Users} />
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const workload = teamSummary.find((t) => t.userId === m.user.id);
            return (
              <div key={m.id} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-sm font-medium text-zinc-400">
                        {(m.user.name ?? m.user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.user.name || m.user.email}</p>
                      <p className="text-xs text-zinc-500">{m.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">{m.role}</span>
                    <span className={`text-xs ${m.status === "ACTIVE" ? "text-emerald-400" : "text-zinc-600"}`}>{m.status}</span>
                    {workload && workload.clientCount > 0 && (
                      <span className="rounded bg-s8ul-cyan/10 px-2 py-1 text-[10px] text-s8ul-400">
                        {workload.clientCount} client{workload.clientCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                {workload && workload.clients.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {workload.clients.map((c) => (
                      <Link
                        key={c.tenantId}
                        href={`/agency/clients/${c.tenantId}`}
                        className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:text-white transition-colors"
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
