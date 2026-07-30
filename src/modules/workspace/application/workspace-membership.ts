import { prisma } from "@/lib/prisma";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";

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
    logger.info("removeMembership started", "workspace", { operation: "remove_membership", metadata: { workspaceId, userId } as Record<string, unknown> });
    const members = await prisma.workspaceMember.count({ where: { workspaceId, status: "ACTIVE" } });
    if (members <= 1) {
      const error = new WorkspaceMembershipError("Cannot remove last active member");
      captureError(error, { service: "workspace", operation: "remove_membership" });
      throw error;
    }

    await workspaceRepository.removeMember(workspaceId, userId);
    logger.info("removeMembership completed", "workspace", { operation: "remove_membership", metadata: { result: "success", workspaceId, userId } as Record<string, unknown> });
  }

  async transferOwnership(workspaceId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    logger.info("transferOwnership started", "workspace", { operation: "transfer_ownership", metadata: { workspaceId, currentOwnerId, newOwnerId } as Record<string, unknown> });
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      const error = new WorkspaceMembershipError("Workspace not found");
      captureError(error, { service: "workspace", operation: "transfer_ownership" });
      throw error;
    }

    const newOwnerMember = await workspaceRepository.findMember(workspaceId, newOwnerId);
    if (!newOwnerMember || newOwnerMember.status !== "ACTIVE") {
      const error = new WorkspaceMembershipError("New owner must be an active member");
      captureError(error, { service: "workspace", operation: "transfer_ownership" });
      throw error;
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
    logger.info("transferOwnership completed", "workspace", { operation: "transfer_ownership", metadata: { result: "success", workspaceId } as Record<string, unknown> });
  }

  async countActiveMembers(workspaceId: string): Promise<number> {
    return prisma.workspaceMember.count({ where: { workspaceId, status: "ACTIVE" } });
  }
}

export const workspaceMemberService = new WorkspaceMemberService();
