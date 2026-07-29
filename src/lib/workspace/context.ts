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
    const fromCookie = workspaceService.getCurrent();
    if (fromCookie?.id) {
      const workspace = await workspaceRepository.findById(fromCookie.id);
      if (workspace) {
        return {
          workspaceId: workspace.id,
          type: workspace.type as "TENANT" | "AGENCY",
          role: fromCookie.role,
          tenantId: workspace.tenantId,
        };
      }
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.workspaceId) {
      const workspace = await workspaceRepository.findById(session.user.workspaceId);
      if (workspace) {
        return {
          workspaceId: workspace.id,
          type: workspace.type as "TENANT" | "AGENCY",
          role: session.user.workspaceRole ?? "",
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
