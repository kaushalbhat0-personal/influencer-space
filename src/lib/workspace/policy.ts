import { prisma } from "@/lib/prisma";
import { workspaceLifecycle, type WorkspaceStatus } from "./lifecycle";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";

export class WorkspacePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspacePolicyError";
  }
}

export class WorkspacePolicyService {
  async assertCanPublish(workspaceId: string): Promise<void> {
    const start = Date.now();
    logger.info("assertCanPublish started", "workspace", { operation: "assert_can_publish", metadata: { workspaceId } as Record<string, unknown> });
    const status = await this.getStatus(workspaceId);
    if (!workspaceLifecycle.canPublish(status)) {
      const error = new WorkspacePolicyError(`Cannot publish: workspace is ${workspaceLifecycle.label(status)}`);
      captureError(error, { service: "workspace", operation: "assert_can_publish" });
      throw error;
    }
    logger.info("assertCanPublish completed", "workspace", { operation: "assert_can_publish", duration: Date.now() - start, metadata: { result: "success", workspaceId } as Record<string, unknown> });
  }

  async assertCanCreateWebsite(workspaceId: string): Promise<void> {
    const start = Date.now();
    logger.info("assertCanCreateWebsite started", "workspace", { operation: "assert_can_create_website", metadata: { workspaceId } as Record<string, unknown> });
    const status = await this.getStatus(workspaceId);
    if (!workspaceLifecycle.canCreateWebsite(status)) {
      const error = new WorkspacePolicyError(`Cannot create website: workspace is ${workspaceLifecycle.label(status)}`);
      captureError(error, { service: "workspace", operation: "assert_can_create_website" });
      throw error;
    }
    logger.info("assertCanCreateWebsite completed", "workspace", { operation: "assert_can_create_website", duration: Date.now() - start, metadata: { result: "success", workspaceId } as Record<string, unknown> });
  }

  async assertCanEdit(workspaceId: string): Promise<void> {
    const start = Date.now();
    logger.info("assertCanEdit started", "workspace", { operation: "assert_can_edit", metadata: { workspaceId } as Record<string, unknown> });
    const status = await this.getStatus(workspaceId);
    if (!workspaceLifecycle.canEdit(status)) {
      const error = new WorkspacePolicyError(`Cannot edit: workspace is ${workspaceLifecycle.label(status)}`);
      captureError(error, { service: "workspace", operation: "assert_can_edit" });
      throw error;
    }
    logger.info("assertCanEdit completed", "workspace", { operation: "assert_can_edit", duration: Date.now() - start, metadata: { result: "success", workspaceId } as Record<string, unknown> });
  }

  async assertCanBill(workspaceId: string): Promise<void> {
    const start = Date.now();
    logger.info("assertCanBill started", "workspace", { operation: "assert_can_bill", metadata: { workspaceId } as Record<string, unknown> });
    const status = await this.getStatus(workspaceId);
    if (!workspaceLifecycle.canBill(status)) {
      const error = new WorkspacePolicyError(`Cannot bill: workspace is ${workspaceLifecycle.label(status)}`);
      captureError(error, { service: "workspace", operation: "assert_can_bill" });
      throw error;
    }
    logger.info("assertCanBill completed", "workspace", { operation: "assert_can_bill", duration: Date.now() - start, metadata: { result: "success", workspaceId } as Record<string, unknown> });
  }

  async getStatus(workspaceId: string): Promise<WorkspaceStatus> {
    const start = Date.now();
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { status: true },
    });
    const result = (workspace?.status as WorkspaceStatus) ?? "CREATING";
    logger.info("getStatus completed", "workspace", { operation: "get_status", duration: Date.now() - start, metadata: { workspaceId, status: result } as Record<string, unknown> });
    return result;
  }

  async assertActive(workspaceId: string): Promise<void> {
    const start = Date.now();
    logger.info("assertActive started", "workspace", { operation: "assert_active", metadata: { workspaceId } as Record<string, unknown> });
    const status = await this.getStatus(workspaceId);
    if (status !== "ACTIVE") {
      const error = new WorkspacePolicyError(`Workspace must be ACTIVE, currently ${workspaceLifecycle.label(status)}`);
      captureError(error, { service: "workspace", operation: "assert_active" });
      throw error;
    }
    logger.info("assertActive completed", "workspace", { operation: "assert_active", duration: Date.now() - start, metadata: { result: "success", workspaceId } as Record<string, unknown> });
  }
}

export const workspacePolicy = new WorkspacePolicyService();
