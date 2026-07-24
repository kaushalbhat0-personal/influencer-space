import { workspaceService } from "../application/service";
import type { ActiveWorkspace } from "../application/service";

export type Permission =
  | "workspace:manage"
  | "workspace:delete"
  | "billing:read"
  | "billing:manage"
  | "members:invite"
  | "members:remove"
  | "members:change-role"
  | "clients:create"
  | "clients:manage"
  | "clients:delete"
  | "websites:create"
  | "websites:manage"
  | "content:edit"
  | "content:publish"
  | "analytics:view"
  | "settings:read"
  | "settings:write"
  | "ai:generate"
  | "ai:manage"
  | "domains:manage"
  | "assets:upload";

const ROLE_PERMISSIONS: Record<string, Set<Permission>> = {
  OWNER: new Set<Permission>([
    "workspace:manage", "workspace:delete",
    "billing:read", "billing:manage",
    "members:invite", "members:remove", "members:change-role",
    "clients:create", "clients:manage", "clients:delete",
    "websites:create", "websites:manage",
    "content:edit", "content:publish",
    "analytics:view",
    "settings:read", "settings:write",
    "ai:generate", "ai:manage",
    "domains:manage",
    "assets:upload",
  ]),
  ADMIN: new Set<Permission>([
    "clients:create", "clients:manage",
    "websites:create", "websites:manage",
    "content:edit", "content:publish",
    "analytics:view",
    "settings:read", "settings:write",
    "ai:generate", "ai:manage",
    "assets:upload",
  ]),
  MEMBER: new Set<Permission>([
    "content:edit",
    "analytics:view",
    "assets:upload",
  ]),
  VIEWER: new Set<Permission>([
    "analytics:view",
  ]),
};

export class AuthorizationError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "AuthorizationError";
  }
}

class AuthorizationService {
  /** Check if the current user has a specific permission in the active workspace. */
  can(permission: Permission, workspace?: ActiveWorkspace | null): boolean {
    const ws = workspace ?? workspaceService.getCurrent();
    if (!ws) return false;
    const permissions = ROLE_PERMISSIONS[ws.role];
    if (!permissions) return false;
    return permissions.has(permission);
  }

  /** Assert — throws if not authorized. Use in server actions. */
  require(permission: Permission): void {
    if (!this.can(permission)) {
      throw new AuthorizationError(permission);
    }
  }

  /** Get all permissions for a given role. */
  getPermissionsForRole(role: string): Permission[] {
    return Array.from(ROLE_PERMISSIONS[role] ?? []);
  }
}

export const authorizationService = new AuthorizationService();
