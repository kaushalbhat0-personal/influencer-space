import { PlatformRole, WorkspaceRole, Permission, ResourcePolicy } from "../types";

export interface AccessCheck {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly requiredPermissions?: string[];
}

export interface WorkspaceAccessCheck {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly userRole: WorkspaceRole | null;
}

export type { PlatformRole, WorkspaceRole, Permission, ResourcePolicy };
