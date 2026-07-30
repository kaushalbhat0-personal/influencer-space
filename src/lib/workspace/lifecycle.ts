import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";

export type WorkspaceStatus = "CREATING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED" | "DELETED";

const TRANSITIONS: Record<WorkspaceStatus, WorkspaceStatus[]> = {
  CREATING: ["ACTIVE"],
  ACTIVE: ["SUSPENDED", "ARCHIVED"],
  SUSPENDED: ["ACTIVE"],
  ARCHIVED: ["ACTIVE", "DELETED"],
  DELETED: [],
};

export class WorkspaceLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceLifecycleError";
  }
}

export class WorkspaceLifecycleService {
  canTransition(from: WorkspaceStatus, to: WorkspaceStatus): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  assertTransition(from: WorkspaceStatus, to: WorkspaceStatus): void {
    logger.info("assertTransition", "workspace", { operation: "assert_transition", metadata: { from, to } as Record<string, unknown> });
    if (!this.canTransition(from, to)) {
      const error = new WorkspaceLifecycleError(
        `Cannot transition workspace from ${from} to ${to}`
      );
      captureError(error, { service: "workspace", operation: "assert_transition" });
      throw error;
    }
  }

  canPublish(status: WorkspaceStatus): boolean {
    return status === "ACTIVE";
  }

  canCreateWebsite(status: WorkspaceStatus): boolean {
    return status === "ACTIVE";
  }

  canEdit(status: WorkspaceStatus): boolean {
    return status === "ACTIVE" || status === "SUSPENDED";
  }

  canBill(status: WorkspaceStatus): boolean {
    return status === "ACTIVE" || status === "SUSPENDED";
  }

  isActive(status: WorkspaceStatus): boolean {
    return status === "ACTIVE";
  }

  isTerminal(status: WorkspaceStatus): boolean {
    return status === "DELETED";
  }

  isReadOnly(status: WorkspaceStatus): boolean {
    return status === "ARCHIVED";
  }

  label(status: WorkspaceStatus): string {
    const labels: Record<WorkspaceStatus, string> = {
      CREATING: "Creating",
      ACTIVE: "Active",
      SUSPENDED: "Suspended",
      ARCHIVED: "Archived",
      DELETED: "Deleted",
    };
    return labels[status] ?? status;
  }

  badgeColor(status: WorkspaceStatus): string {
    const colors: Record<WorkspaceStatus, string> = {
      CREATING: "bg-blue-500/10 text-blue-400",
      ACTIVE: "bg-emerald-500/10 text-emerald-400",
      SUSPENDED: "bg-amber-500/10 text-amber-400",
      ARCHIVED: "bg-zinc-500/10 text-zinc-400",
      DELETED: "bg-red-500/10 text-red-400",
    };
    return colors[status] ?? "bg-zinc-500/10 text-zinc-400";
  }
}

export const workspaceLifecycle = new WorkspaceLifecycleService();
