import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgencyTeamPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;

  if (!agencyId) {
    return (
      <ContentContainer>
        <p className="text-red-400">No agency configured</p>
      </ContentContainer>
    );
  }

  const workspace = await prisma.workspace.findFirst({ where: { agencyId } });
  const members = workspace
    ? await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <ContentContainer>
      <PageHeader
        title="Team"
        description="Manage workspace members and their roles."
        breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Team" }]}
      />
      {members.length === 0 ? (
        <EmptyState title="No team members" description="Invite members to collaborate on client websites." icon={Users} />
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <div>
                <p className="text-sm font-medium text-white">{m.user.name || m.user.email}</p>
                <p className="text-xs text-zinc-500">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">{m.role}</span>
                <span className={`text-xs ${m.status === "ACTIVE" ? "text-emerald-400" : "text-zinc-600"}`}>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ContentContainer>
  );
}
