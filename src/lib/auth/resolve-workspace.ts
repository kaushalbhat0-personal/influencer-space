import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

export interface WorkspaceUser {
  id: string;
  tenantId?: string | null;
  agencyId?: string | null;
  role: string;
}

export async function resolveWorkspace(user: WorkspaceUser) {
  if (user.role === "SUPER_ADMIN") return { workspaceId: null, workspaceType: null, workspaceRole: null };

  if (user.role === "ADMIN" && !user.tenantId) {
    return { workspaceId: null, workspaceType: null, workspaceRole: null };
  }

  const ownerId = user.tenantId || user.agencyId;
  if (!ownerId) return { workspaceId: null, workspaceType: null, workspaceRole: null };

  const workspace = user.tenantId
    ? await workspaceRepository.findByTenantId(user.tenantId)
    : await workspaceRepository.findByAgencyId(user.agencyId!);

  if (workspace) {
    let member = await workspaceRepository.findMember(workspace.id, user.id);
    if (!member) {
      member = await workspaceRepository.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: user.role === "AGENCY_STAFF" ? "MEMBER" : "OWNER",
      });
    }
    return { workspaceId: workspace.id, workspaceType: workspace.type, workspaceRole: member.role };
  }

  if (!user.tenantId && !user.agencyId) {
    return { workspaceId: null, workspaceType: null, workspaceRole: null };
  }

  const created = await workspaceRepository.create({
    type: user.tenantId ? "TENANT" : "AGENCY",
    name: "Workspace",
    slug: `ws_${user.id.slice(0, 8)}`,
    tenantId: user.tenantId ?? undefined,
    agencyId: user.agencyId ?? undefined,
  });

  await workspaceRepository.addMember({
    workspaceId: created.id,
    userId: user.id,
    role: user.role === "AGENCY_STAFF" ? "MEMBER" : "OWNER",
  });

  return { workspaceId: created.id, workspaceType: created.type, workspaceRole: user.role === "AGENCY_STAFF" ? "MEMBER" : "OWNER" };
}
