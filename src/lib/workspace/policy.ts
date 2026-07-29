import { prisma } from "@/lib/prisma";
import { workspaceLifecycle, type WorkspaceStatus } from "./lifecycle";

export class WorkspacePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspacePolicyError";
  }
}

export class WorkspacePolicyService {
  async assertCanPublish(workspaceId: string): Promise<void> {
    const status = await this.getStatus(workspaceId);
    if (!workspaceLifecycle.canPublish(status)) {
      throw new WorkspacePolicyError(`Cannot publish: workspace is ${workspaceLifecycle.label(status)}`);
    }
  }

  async assertCanCreateWebsite(workspaceId: string): Promise<void> {
    const status = await this.getStatus(workspaceId);
    if (!workspaceLifecycle.canCreateWebsite(status)) {
      throw new WorkspacePolicyError(`Cannot create website: workspace is ${workspaceLifecycle.label(status)}`);
    }
  }

  async assertCanEdit(workspaceId: string): Promise<void> {
    const status = await this.getStatus(workspaceId);
    if (!workspaceLifecycle.canEdit(status)) {
      throw new WorkspacePolicyError(`Cannot edit: workspace is ${workspaceLifecycle.label(status)}`);
    }
  }

  async assertCanBill(workspaceId: string): Promise<void> {
    const status = await this.getStatus(workspaceId);
    if (!workspaceLifecycle.canBill(status)) {
      throw new WorkspacePolicyError(`Cannot bill: workspace is ${workspaceLifecycle.label(status)}`);
    }
  }

  async getStatus(workspaceId: string): Promise<WorkspaceStatus> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { status: true },
    });
    return (workspace?.status as WorkspaceStatus) ?? "CREATING";
  }

  async assertActive(workspaceId: string): Promise<void> {
    const status = await this.getStatus(workspaceId);
    if (status !== "ACTIVE") {
      throw new WorkspacePolicyError(`Workspace must be ACTIVE, currently ${workspaceLifecycle.label(status)}`);
    }
  }
}

export const workspacePolicy = new WorkspacePolicyService();
