import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceService } from "@/modules/workspace/application/service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

export interface WorkspaceContext {
  workspaceId: string;
  type: "TENANT" | "AGENCY";
  role: string;
  tenantId: string | null;
}

export class WorkspaceContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceContextError";
  }
}

export class WorkspaceContextService {
  async getActive(): Promise<WorkspaceContext | null> {
    const session = await getServerSession(authOptions);

    // RCCF-42: the __workspace cookie is a SELECTOR, never an authorization
    // boundary. It is only honored when it is bound to the authenticated user
    // (uid) AND that user is an ACTIVE member of the workspace. The role always
    // comes from the live membership, never from the cookie.
    const fromCookie = workspaceService.getCurrent();
    if (fromCookie?.id && session?.user?.id) {
      if (fromCookie.uid === session.user.id) {
        const workspace = await workspaceRepository.findById(fromCookie.id);
        const member = workspace ? await workspaceRepository.findMember(workspace.id, session.user.id) : null;
        if (workspace && member?.status === "ACTIVE") {
          return {
            workspaceId: workspace.id,
            type: workspace.type as "TENANT" | "AGENCY",
            role: member.role,
            tenantId: workspace.tenantId,
          };
        }
      }
    }

    if (session?.user?.workspaceId) {
      const workspace = await workspaceRepository.findById(session.user.workspaceId);
      const member = workspace ? await workspaceRepository.findMember(workspace.id, session.user.id) : null;
      if (workspace && member?.status === "ACTIVE") {
        return {
          workspaceId: workspace.id,
          type: workspace.type as "TENANT" | "AGENCY",
          role: member.role,
          tenantId: workspace.tenantId,
        };
      }
    }

    return null;
  }

  async require(): Promise<WorkspaceContext> {
    const ctx = await this.getActive();
    if (!ctx) throw new WorkspaceContextError("No active workspace context");
    return ctx;
  }

  async resolveTenantId(): Promise<string | null> {
    return workspaceService.resolveTenantId();
  }
}

export const workspaceContext = new WorkspaceContextService();
