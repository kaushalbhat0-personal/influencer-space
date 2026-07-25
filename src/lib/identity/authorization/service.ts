import { PlatformRole, WorkspaceRole } from "../types";
import { AuthorizationError, ResourceOwnershipError, TenantIsolationError } from "../errors";
import { RoleRegistry } from "../roles/registry";
import { AccessCheck, WorkspaceAccessCheck } from "./types";
import { validateWorkspaceScope, validateOwnership } from "./policies";

export interface AuthorizationContext {
  readonly userId: string;
  readonly platformRole: PlatformRole;
  readonly workspaceRole: WorkspaceRole | null;
  readonly workspaceId: string | null;
}

export class AuthorizationService {
  constructor(private readonly roleRegistry: RoleRegistry) {}

  checkPlatformPermission(
    context: AuthorizationContext,
    permission: string
  ): AccessCheck {
    const hasPermission = this.roleRegistry.hasPermission(context.platformRole, permission);
    return {
      allowed: hasPermission,
      reason: hasPermission ? undefined : `Missing platform permission: ${permission}`,
      requiredPermissions: [permission],
    };
  }

  checkAnyPlatformPermission(
    context: AuthorizationContext,
    permissions: string[]
  ): AccessCheck {
    const hasAny = this.roleRegistry.hasAnyPermission(context.platformRole, permissions);
    return {
      allowed: hasAny,
      reason: hasAny ? undefined : `Missing any of: ${permissions.join(", ")}`,
      requiredPermissions: permissions,
    };
  }

  checkAllPlatformPermissions(
    context: AuthorizationContext,
    permissions: string[]
  ): AccessCheck {
    const hasAll = this.roleRegistry.hasAllPermissions(context.platformRole, permissions);
    return {
      allowed: hasAll,
      reason: hasAll ? undefined : `Missing all of: ${permissions.join(", ")}`,
      requiredPermissions: permissions,
    };
  }

  checkWorkspaceAccess(
    context: AuthorizationContext,
    targetWorkspaceId: string
  ): WorkspaceAccessCheck {
    const isSuperAdmin = context.platformRole === "super_admin";
    if (isSuperAdmin) {
      return { allowed: true, userRole: context.workspaceRole };
    }

    if (!context.workspaceId || context.workspaceId !== targetWorkspaceId) {
      return { allowed: false, reason: "Cross-workspace access denied", userRole: context.workspaceRole };
    }

    return { allowed: true, userRole: context.workspaceRole };
  }

  requirePlatformPermission(context: AuthorizationContext, permission: string): void {
    const check = this.checkPlatformPermission(context, permission);
    if (!check.allowed) {
      throw new AuthorizationError(check.reason);
    }
  }

  requireWorkspaceAccess(context: AuthorizationContext, targetWorkspaceId: string): void {
    const check = this.checkWorkspaceAccess(context, targetWorkspaceId);
    if (!check.allowed) {
      throw new TenantIsolationError();
    }
  }

  requireResourceAccess(
    context: AuthorizationContext,
    resourceType: string,
    resource: Record<string, unknown>,
    permission: string
  ): void {
    this.requirePlatformPermission(context, permission);

    const workspaceId = resource.workspaceId as string | undefined;
    if (workspaceId && context.workspaceId) {
      if (!validateWorkspaceScope(resourceType, resource, context.workspaceId)) {
        throw new TenantIsolationError();
      }
    }

    if (context.platformRole !== "super_admin" && resource.userId) {
      if (!validateOwnership(resourceType, resource, context.userId)) {
        throw new ResourceOwnershipError();
      }
    }
  }
}
