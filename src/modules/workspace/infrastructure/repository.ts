import { prisma } from "@/lib/prisma";
import type { Workspace, WorkspaceMember } from "@/generated/prisma/client";

export interface WorkspaceWithRole extends Workspace {
  role?: string;
}

export class WorkspaceRepository {
  async findById(id: string): Promise<Workspace | null> {
    return prisma.workspace.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    return prisma.workspace.findUnique({ where: { slug } });
  }

  async findByTenantId(tenantId: string): Promise<Workspace | null> {
    return prisma.workspace.findUnique({ where: { tenantId } });
  }

  async findByAgencyId(agencyId: string): Promise<Workspace | null> {
    return prisma.workspace.findUnique({ where: { agencyId } });
  }

  async findMembershipsByUserId(userId: string): Promise<Array<WorkspaceMember & { workspace: Workspace }>> {
    return prisma.workspaceMember.findMany({
      where: { userId, status: "ACTIVE" },
      include: { workspace: true },
    });
  }

  async findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  async create(data: {
    type: "TENANT" | "AGENCY";
    name: string;
    slug: string;
    tenantId?: string;
    agencyId?: string;
  }): Promise<Workspace> {
    return prisma.workspace.create({ data });
  }

  async addMember(data: {
    workspaceId: string;
    userId: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  }): Promise<WorkspaceMember> {
    return prisma.workspaceMember.create({
      data: { ...data, joinedAt: new Date() },
    });
  }

  async updateMemberRole(workspaceId: string, userId: string, role: string): Promise<WorkspaceMember> {
    return prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: role as never },
    });
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { status: "REMOVED" },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.workspace.delete({ where: { id } });
  }
}

export const workspaceRepository = new WorkspaceRepository();
