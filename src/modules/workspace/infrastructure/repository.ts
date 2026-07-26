import { prisma } from "@/lib/prisma";
import type { Prisma, Workspace, WorkspaceMember } from "@/generated/prisma/client";

export interface WorkspaceWithRole extends Workspace {
  role?: string;
}

export class WorkspaceRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Workspace | null> {
    return this.client(tx).workspace.findUnique({ where: { id } });
  }

  async findBySlug(slug: string, tx?: Prisma.TransactionClient): Promise<Workspace | null> {
    return this.client(tx).workspace.findUnique({ where: { slug } });
  }

  async findByTenantId(tenantId: string, tx?: Prisma.TransactionClient): Promise<Workspace | null> {
    return this.client(tx).workspace.findUnique({ where: { tenantId } });
  }

  async findByAgencyId(agencyId: string, tx?: Prisma.TransactionClient): Promise<Workspace | null> {
    return this.client(tx).workspace.findUnique({ where: { agencyId } });
  }

  async findMembershipsByUserId(userId: string): Promise<Array<WorkspaceMember & { workspace: Workspace }>> {
    return prisma.workspaceMember.findMany({
      where: { userId, status: "ACTIVE" },
      include: { workspace: true },
    });
  }

  async findMember(workspaceId: string, userId: string, tx?: Prisma.TransactionClient): Promise<WorkspaceMember | null> {
    return this.client(tx).workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  async create(data: {
    type: "TENANT" | "AGENCY";
    name: string;
    slug: string;
    tenantId?: string;
    agencyId?: string;
  }, tx?: Prisma.TransactionClient): Promise<Workspace> {
    return this.client(tx).workspace.create({ data });
  }

  async addMember(data: {
    workspaceId: string;
    userId: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  }, tx?: Prisma.TransactionClient): Promise<WorkspaceMember> {
    return this.client(tx).workspaceMember.create({
      data: { ...data, joinedAt: new Date() },
    });
  }

  async updateMemberRole(workspaceId: string, userId: string, role: string, tx?: Prisma.TransactionClient): Promise<WorkspaceMember> {
    return this.client(tx).workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: role as never },
    });
  }

  async removeMember(workspaceId: string, userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.client(tx).workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { status: "REMOVED" },
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.client(tx).workspace.delete({ where: { id } });
  }
}

export const workspaceRepository = new WorkspaceRepository();
