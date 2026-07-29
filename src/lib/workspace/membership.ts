import { prisma } from "@/lib/prisma";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import type { WorkspaceRole } from "@/generated/prisma/client";

export class WorkspaceMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceMembershipError";
  }
}

export interface MemberResult {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  joinedAt: Date | null;
}

export class WorkspaceMemberService {
  async listMembers(workspaceId: string): Promise<MemberResult[]> {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    }));
  }

  async updateRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    const member = await workspaceRepository.findMember(workspaceId, userId);
    if (!member) throw new WorkspaceMembershipError("Member not found");

    await workspaceRepository.updateMemberRole(workspaceId, userId, role);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const members = await prisma.workspaceMember.count({ where: { workspaceId, status: "ACTIVE" } });
    if (members <= 1) throw new WorkspaceMembershipError("Cannot remove last active member");

    await workspaceRepository.removeMember(workspaceId, userId);
  }

  async transferOwnership(workspaceId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new WorkspaceMembershipError("Workspace not found");

    const newOwnerMember = await workspaceRepository.findMember(workspaceId, newOwnerId);
    if (!newOwnerMember || newOwnerMember.status !== "ACTIVE") {
      throw new WorkspaceMembershipError("New owner must be an active member");
    }

    await prisma.$transaction([
      prisma.workspaceMember.updateMany({
        where: { workspaceId, userId: currentOwnerId },
        data: { role: "ADMIN" },
      }),
      prisma.workspaceMember.updateMany({
        where: { workspaceId, userId: newOwnerId },
        data: { role: "OWNER" },
      }),
    ]);
  }

  async countActiveMembers(workspaceId: string): Promise<number> {
    return prisma.workspaceMember.count({ where: { workspaceId, status: "ACTIVE" } });
  }
}

export const workspaceMemberService = new WorkspaceMemberService();
