import { prisma } from "@/lib/prisma";
import { workspaceMemberService } from "@/modules/workspace/application/workspace-membership";
import { assignmentRepository } from "./assignment-repository";

export type AssignmentRole = "account_manager" | "designer" | "developer" | "content_editor" | "support";

export interface ClientAssignment {
  tenantId: string;
  userId: string;
  role: AssignmentRole;
  assignedAt: string;
}

export interface AssignmentSummary {
  userId: string;
  userName: string | null;
  userEmail: string;
  role: string;
  clientCount: number;
  clients: Array<{ tenantId: string; businessName: string }>;
}

const LEGACY_SETTING_PREFIX = "client_assignments_";

async function getWorkspaceId(agencyId: string): Promise<string | null> {
  const ws = await prisma.workspace.findFirst({ where: { agencyId }, select: { id: true } });
  return ws?.id ?? null;
}

async function readLegacyAssignments(agencyId: string): Promise<ClientAssignment[]> {
  const setting = await prisma.setting.findUnique({
    where: { tenantId_key: { tenantId: agencyId, key: `${LEGACY_SETTING_PREFIX}${agencyId}` } },
  });
  if (!setting?.value) return [];
  const raw = setting.value as Record<string, unknown>;
  return (raw.assignments as ClientAssignment[]) ?? [];
}

export class AssignmentService {
  async getAssignments(agencyId: string): Promise<ClientAssignment[]> {
    const workspaceId = await getWorkspaceId(agencyId);
    if (!workspaceId) return [];

    const records = await assignmentRepository.findByWorkspace(workspaceId);
    if (records.length > 0) {
      return records.map((r) => ({
        tenantId: r.tenantId,
        userId: r.userId,
        role: r.role as AssignmentRole,
        assignedAt: r.assignedAt.toISOString(),
      }));
    }

    const legacy = await readLegacyAssignments(agencyId);
    if (legacy.length > 0) {
      await this.migrateLegacyToDatabase(agencyId, workspaceId, legacy);
    }
    return legacy;
  }

  async assign(agencyId: string, tenantId: string, userId: string, role: AssignmentRole): Promise<void> {
    const workspaceId = await getWorkspaceId(agencyId);
    if (workspaceId) {
      await assignmentRepository.upsert(workspaceId, tenantId, userId, role);
    }
  }

  async unassign(agencyId: string, tenantId: string, userId: string): Promise<void> {
    const workspaceId = await getWorkspaceId(agencyId);
    if (workspaceId) {
      await assignmentRepository.delete(workspaceId, tenantId, userId);
    }
  }

  async getClientsForMember(agencyId: string, userId: string): Promise<ClientAssignment[]> {
    const all = await this.getAssignments(agencyId);
    return all.filter((a) => a.userId === userId);
  }

  async getTeamSummary(agencyId: string): Promise<AssignmentSummary[]> {
    const [assignments, members, agencyTenants] = await Promise.all([
      this.getAssignments(agencyId),
      workspaceMemberService.listMembers(
        (await prisma.workspace.findFirst({ where: { agencyId }, select: { id: true } }))?.id ?? ""
      ),
      prisma.agencyTenant.findMany({
        where: { agencyId },
        include: { tenant: { select: { name: true } } },
      }),
    ]);

    const tenantNames = new Map(agencyTenants.map((at) => [at.tenantId, at.tenant.name]));

    return members.map((m) => {
      const memberAssignments = assignments.filter((a) => a.userId === m.userId);
      return {
        userId: m.userId,
        userName: m.name,
        userEmail: m.email,
        role: m.role,
        clientCount: memberAssignments.length,
        clients: memberAssignments.map((a) => ({
          tenantId: a.tenantId,
          businessName: tenantNames.get(a.tenantId) ?? "Unknown",
        })),
      };
    });
  }

  async getMemberAssignments(agencyId: string, userId: string): Promise<AssignmentSummary | null> {
    const team = await this.getTeamSummary(agencyId);
    return team.find((t) => t.userId === userId) ?? null;
  }

  private async migrateLegacyToDatabase(agencyId: string, workspaceId: string, legacy: ClientAssignment[]): Promise<void> {
    for (const a of legacy) {
      try {
        await assignmentRepository.upsert(workspaceId, a.tenantId, a.userId, a.role);
      } catch {
        // Skip duplicates silently during migration
      }
    }
    const key = `${LEGACY_SETTING_PREFIX}${agencyId}`;
    await prisma.setting.deleteMany({ where: { tenantId: agencyId, key } }).catch(() => {});
  }
}

export const assignmentService = new AssignmentService();
