import { prisma } from "@/lib/prisma";
import type { AssignmentRole } from "./assignment";

export interface AssignmentRecord {
  id: string;
  workspaceId: string;
  tenantId: string;
  userId: string;
  role: string;
  assignedAt: Date;
}

export class AssignmentRepository {
  async findByWorkspace(workspaceId: string): Promise<AssignmentRecord[]> {
    return prisma.clientAssignment.findMany({
      where: { workspaceId },
      orderBy: { assignedAt: "desc" },
    });
  }

  async findByWorkspaceAndUser(workspaceId: string, userId: string): Promise<AssignmentRecord[]> {
    return prisma.clientAssignment.findMany({
      where: { workspaceId, userId },
      orderBy: { assignedAt: "desc" },
    });
  }

  async findOne(workspaceId: string, tenantId: string, userId: string): Promise<AssignmentRecord | null> {
    return prisma.clientAssignment.findUnique({
      where: { workspaceId_tenantId_userId: { workspaceId, tenantId, userId } },
    });
  }

  async upsert(workspaceId: string, tenantId: string, userId: string, role: string): Promise<AssignmentRecord> {
    return prisma.clientAssignment.upsert({
      where: { workspaceId_tenantId_userId: { workspaceId, tenantId, userId } },
      update: { role },
      create: { workspaceId, tenantId, userId, role },
    });
  }

  async delete(workspaceId: string, tenantId: string, userId: string): Promise<void> {
    await prisma.clientAssignment.deleteMany({
      where: { workspaceId, tenantId, userId },
    });
  }

  async deleteByWorkspace(workspaceId: string): Promise<void> {
    await prisma.clientAssignment.deleteMany({ where: { workspaceId } });
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    return prisma.clientAssignment.count({ where: { workspaceId } });
  }
}

export const assignmentRepository = new AssignmentRepository();
